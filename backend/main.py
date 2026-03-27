"""
AtlasOps Backend — FastAPI Application
=======================================
Endpoints:
  POST /api/pipeline/start   → Create job & trigger LangGraph pipeline
  POST /webhook/publer        → Receive Publer callback with published URLs
  GET  /health                → Healthcheck

Background:
  APScheduler polls Supabase every 5 min for approved jobs → triggers Publishing node.
"""

import os
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler

from backend.supabase_client import get_supabase_client
from backend.graph.workflow import create_workflow
from backend.graph.nodes.publishing import publishing_node

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("atlasops")

# ---------------------------------------------------------------------------
# APScheduler — poll for approved jobs
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler()

def poll_for_approved_jobs():
    """Every 5 minutes, check Supabase for jobs with status 'Pending' that have
    been manually approved.  When found, run the Publishing node to complete
    the lifecycle."""
    try:
        supabase = get_supabase_client()
        # Look for jobs whose status has been flipped to 'Publishing' by the
        # approval action in the frontend / API.
        jobs = (
            supabase.table("jobs")
            .select("id, organization_id, topic, audience, languages")
            .eq("status", "Publishing")
            .execute()
        )
        for job in jobs.data or []:
            logger.info(f"[Scheduler] Publishing approved job {job['id']}")
            state = {
                "job_id": job["id"],
                "org_id": job["organization_id"],
                "topic": job.get("topic", ""),
                "objective": job.get("objective", ""),
                "audience": job.get("audience", ""),
                "channels": job.get("channels", []),
                "target_languages": job.get("languages", ["EN"]),
                "spec_text": "",
                "draft_text": "",
                "image_url": "",
                "channel_variants": {},
                "compliance_result": {},
                "compliance_retries": 0,
                "localized_variants": {},
                "approval_status": "approved",
                "audit_log": [],
            }
            # Fetch latest content body
            content = (
                supabase.table("job_content")
                .select("body")
                .eq("job_id", job["id"])
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            if content.data:
                state["draft_text"] = content.data[0]["body"]

            publishing_node(state)
    except Exception as e:
        logger.error(f"[Scheduler] Error polling approved jobs: {e}")


# ---------------------------------------------------------------------------
# Lifespan — start / stop the scheduler with the app
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(poll_for_approved_jobs, "interval", minutes=5, id="approval_poll")
    scheduler.start()
    logger.info("APScheduler started — polling every 5 min for approved jobs.")
    yield
    scheduler.shutdown()
    logger.info("APScheduler shut down.")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AtlasOps Backend",
    description="Enterprise Content Lifecycle Automation — API & Agent Pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in prod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

import traceback
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Global catch: {e}")
        logger.error(traceback.format_exc())
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "traceback": traceback.format_exc()}
        )


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class PipelineStartRequest(BaseModel):
    organization_id: str
    topic: str
    objective: str
    audience: str
    channels: List[str] = Field(default=["Instagram", "Threads", "LinkedIn", "Twitter"])
    languages: List[str] = Field(default=["EN"])
    spec_text: str = ""
    image_url: str = ""

class PipelineStartResponse(BaseModel):
    job_id: str
    display_id: str
    status: str


class ApproveJobRequest(BaseModel):
    channel_variants: Optional[dict] = None


class PublerWebhookPayload(BaseModel):
    job_id: Optional[str] = None
    published_urls: Optional[dict] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Pipeline runner (executed in background)
# ---------------------------------------------------------------------------
def run_pipeline(state: dict):
    """Invoke the full LangGraph pipeline in a background thread."""
    try:
        logger.info(f"[Pipeline] Starting for job {state['job_id']}")
        workflow = create_workflow()
        result = workflow.invoke(state)
        logger.info(f"[Pipeline] Completed for job {state['job_id']} → approval_status={result.get('approval_status')}")
    except Exception as e:
        logger.error(f"[Pipeline] Failed for job {state.get('job_id', '?')}: {e}")
        try:
            supabase = get_supabase_client()
            supabase.table("agent_logs").insert({
                "job_id": state["job_id"],
                "organization_id": state["org_id"],
                "agent_name": "System",
                "message": f"Pipeline error: {str(e)}",
                "severity": "critical",
            }).execute()
        except:
            pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "atlasops-backend", "ts": datetime.utcnow().isoformat()}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file to Supabase Storage and return its public URL."""
    try:
        supabase = get_supabase_client()
        file_bytes = await file.read()
        ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        storage_path = f"uploads/{uuid.uuid4()}.{ext}"
        
        logger.info(f"[Upload] Bucket: mission-assets, File: {file.filename}, Type: {file.content_type}")
        
        # Check if bucket exists
        try:
            supabase.storage.get_bucket("mission-assets")
        except:
            logger.info("[Upload] Creating missing bucket: mission-assets")
            supabase.storage.create_bucket("mission-assets", options={"public": True})

        res = supabase.storage.from_("mission-assets").upload(
            storage_path,
            file_bytes,
            file_options={"content-type": file.content_type or "image/png"}
        )
        
        if hasattr(res, 'error') and res.error:
            logger.error(f"[Upload] Supabase Error: {res.error}")
            return {"error": str(res.error)}

        public_url = supabase.storage.from_("mission-assets").get_public_url(storage_path)
        logger.info(f"[Upload] File uploaded successfully: {public_url}")
        return {"url": public_url, "path": storage_path}
    except Exception as e:
        logger.error(f"[Upload] Critical failure: {e}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}


@app.post("/api/pipeline/start", response_model=PipelineStartResponse)
async def start_pipeline(req: PipelineStartRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Pipeline Start Request: {req.topic}")
        supabase = get_supabase_client()

        # Generate IDs
        job_id = str(uuid.uuid4())

        # Count existing jobs in org to generate display_id
        existing = supabase.table("jobs").select("id", count="exact").eq("organization_id", req.organization_id).execute()
        seq = (existing.count or 0) + 1
        display_id = f"JOB-{seq:03d}"

        # Insert job row
        supabase.table("jobs").insert({
            "id": job_id,
            "organization_id": req.organization_id,
            "display_id": display_id,
            "topic": req.topic,
            "audience": req.audience,
            "languages": req.languages,
            "status": "Drafting",
            "progress": 0,
            "compliance_issues": 0,
        }).execute()

        # Insert initial audit log
        supabase.table("audit_logs").insert({
            "organization_id": req.organization_id,
            "job_id": job_id,
            "job_display_id": display_id,
            "topic": req.topic,
            "action": "INITIATED",
            "actor": "SYSTEM_ROUTER",
            "status": "success",
        }).execute()

        # Build initial graph state
        initial_state = {
            "job_id": job_id,
            "org_id": req.organization_id,
            "topic": req.topic,
            "objective": req.objective,
            "audience": req.audience,
            "channels": req.channels,
            "target_languages": req.languages,
            "spec_text": req.spec_text,
            "draft_text": "",
            "image_url": req.image_url,
            "channel_variants": {},
            "compliance_result": {},
            "compliance_retries": 0,
            "localized_variants": {},
            "approval_status": "",
            "audit_log": [],
        }

        # Fire-and-forget: run the full pipeline in background
        background_tasks.add_task(run_pipeline, initial_state)

        return PipelineStartResponse(job_id=job_id, display_id=display_id, status="Drafting")

    except Exception as e:
        logger.error(f"Startup Failure: {e}")
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/publer")
async def publer_webhook(payload: PublerWebhookPayload):
    """Receive Publer's callback after social posts are published."""
    if not payload.job_id:
        return {"received": True, "warning": "No job_id in payload"}

    supabase = get_supabase_client()

    update = {}
    if payload.published_urls:
        update["metadata"] = {"published_urls": payload.published_urls}
    if payload.status == "published":
        update["status"] = "Published"
        update["progress"] = 100

    if update:
        supabase.table("jobs").update(update).eq("id", payload.job_id).execute()

    supabase.table("audit_logs").insert({
        "job_id": payload.job_id,
        "action": "PUBLER_CALLBACK",
        "actor": "WEBHOOK_PUBLER",
        "status": "success",
        "metadata": payload.model_dump(),
    }).execute()

    logger.info(f"[Webhook/Publer] Processed callback for job {payload.job_id}")
    return {"received": True}


@app.post("/api/jobs/{job_id}/approve")
async def approve_job(job_id: str, background_tasks: BackgroundTasks, req: Optional[ApproveJobRequest] = None):
    """Manual approval endpoint — sets status to Publishing and triggers the
    publishing node via the scheduler (or immediately)."""
    supabase = get_supabase_client()

    # Fetch job first to get organization_id
    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    
    supabase.table("jobs").update({"status": "Publishing", "progress": 90}).eq("id", job_id).execute()

    if job.data:
        supabase.table("audit_logs").insert({
            "job_id": job_id,
            "organization_id": job.data["organization_id"],
            "action": "GATE_PASSED",
            "actor": "HUMAN_APPROVER",
            "status": "success",
        }).execute()

    # Also immediately trigger publishing in background
    if job.data:
        content = (
            supabase.table("job_content")
            .select("body")
            .eq("job_id", job_id)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        state = {
            "job_id": job_id,
            "org_id": job.data["organization_id"],
            "topic": job.data.get("topic", ""),
            "objective": job.data.get("objective", ""),
            "audience": job.data.get("audience", ""),
            "channels": job.data.get("channels", []),
            "target_languages": job.data.get("languages", ["EN"]),
            "spec_text": "",
            "draft_text": content.data[0]["body"] if content.data else "",
            "image_url": "",
            "channel_variants": req.channel_variants if req and req.channel_variants else {},
            "compliance_result": {},
            "compliance_retries": 0,
            "approval_status": "approved",
            "audit_log": [],
        }
        
        # Save the edited variants so the frontend UI correctly displays the final versions
        if req and req.channel_variants:
            supabase.table("agent_logs").insert({
                "job_id": job_id,
                "organization_id": job.data["organization_id"],
                "agent_name": "Gatekeeper",
                "message": "Human operator revised and authorized variants. Sending to Edge.",
                "severity": "info",
                "metadata": {"variants": req.channel_variants}
            }).execute()
            
        background_tasks.add_task(publishing_node, state)

    return {"job_id": job_id, "status": "Publishing"}
