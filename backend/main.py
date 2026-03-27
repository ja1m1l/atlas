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
import io
import uuid
import logging
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from apscheduler.schedulers.background import BackgroundScheduler

from backend.supabase_client import get_supabase_client
from backend.graph.workflow import create_workflow
from backend.graph.nodes.publishing import publishing_node

# --- Pydantic Models for Compliance Management ---
class TermRequest(BaseModel):
    policy_id: str
    term: str

class PolicyRequest(BaseModel):
    organization_id: str
    name: str
    schema_json: dict
    is_active: bool = True

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Global catch: {e}")
        logger.error(traceback.format_exc())
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

class ApproveRequest(BaseModel):
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
        logger.info(f"[Pipeline] Completed for job {state['job_id']} \u2192 approval_status={result.get('approval_status')}")
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
        
        try:
            supabase.storage.get_bucket("mission-assets")
        except:
            supabase.storage.create_bucket("mission-assets", options={"public": True})

        res = supabase.storage.from_("mission-assets").upload(
            storage_path,
            file_bytes,
            file_options={"content-type": file.content_type or "image/png"}
        )
        
        public_url = supabase.storage.from_("mission-assets").get_public_url(storage_path)
        return {"url": public_url, "path": storage_path}
    except Exception as e:
        logger.error(f"[Upload] Critical failure: {e}")
        return {"error": str(e)}

@app.post("/api/pipeline/start", response_model=PipelineStartResponse)
async def start_pipeline(req: PipelineStartRequest, background_tasks: BackgroundTasks):
    try:
        supabase = get_supabase_client()
        job_id = str(uuid.uuid4())
        existing = supabase.table("jobs").select("id", count="exact").eq("organization_id", req.organization_id).execute()
        seq = (existing.count or 0) + 1
        display_id = f"JOB-{seq:03d}"

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

        supabase.table("audit_logs").insert({
            "organization_id": req.organization_id,
            "job_id": job_id,
            "job_display_id": display_id,
            "topic": req.topic,
            "action": "INITIATED",
            "actor": "SYSTEM_ROUTER",
            "status": "success",
        }).execute()

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

        background_tasks.add_task(run_pipeline, initial_state)
        return PipelineStartResponse(job_id=job_id, display_id=display_id, status="Drafting")
    except Exception as e:
        logger.error(f"Startup Failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/publer")
async def publer_webhook(payload: PublerWebhookPayload):
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
    return {"received": True}

@app.post("/api/extract-pdf")
async def extract_pdf_text(file: UploadFile = File(...)):
    try:
        import pdfplumber
        file_bytes = await file.read()
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        extracted = text.strip()
        if not extracted:
            return {"text": "", "warning": "No text could be extracted from this PDF."}
        return {"text": extracted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {str(e)}")

@app.post("/api/jobs/{job_id}/approve")
async def approve_job(job_id: str, background_tasks: BackgroundTasks, req: Optional[ApproveRequest] = None):
    supabase = get_supabase_client()
    job_res = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job_res.data:
        return {"error": "Job not found"}
    
    job_data = job_res.data
    supabase.table("jobs").update({"status": "Publishing", "progress": 90}).eq("id", job_id).execute()

    supabase.table("audit_logs").insert({
        "job_id": job_id,
        "organization_id": job_data["organization_id"],
        "job_display_id": job_data.get("display_id"),
        "action": "GATE_PASSED",
        "actor": "HUMAN_APPROVER",
        "status": "success",
    }).execute()

    content = (
        supabase.table("job_content")
        .select("body")
        .eq("job_id", job_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    if req and req.channel_variants:
        supabase.table("agent_logs").insert({
            "job_id": job_id,
            "organization_id": job_data["organization_id"],
            "agent_name": "Gatekeeper",
            "message": "Human operator revised and authorized variants. Sending to Edge.",
            "severity": "info",
        }).execute()
        
        supabase.table("jobs").update({
            "output_content": req.channel_variants
        }).eq("id", job_id).execute()

    state = {
        "job_id": job_id,
        "org_id": job_data["organization_id"],
        "topic": job_data.get("topic", ""),
        "objective": job_data.get("objective", ""),
        "audience": job_data.get("audience", ""),
        "channels": job_data.get("channels", []),
        "target_languages": job_data.get("languages", ["EN"]),
        "spec_text": "",
        "draft_text": content.data[0]["body"] if content.data else "",
        "image_url": job_data.get("image_url", ""),
        "channel_variants": req.channel_variants if req and req.channel_variants else (job_data.get("output_content") or {}),
        "compliance_result": {},
        "compliance_retries": 0,
        "localized_variants": {},
        "approval_status": "approved",
        "audit_log": [],
    }
    
    background_tasks.add_task(publishing_node, state)
    return {"job_id": job_id, "status": "Publishing"}

@app.get("/api/compliance/policies")
async def list_policies():
    supabase = get_supabase_client()
    res = supabase.table("compliance_policies").select("*").execute()
    return res.data

@app.post("/api/compliance/policies")
async def create_policy(req: PolicyRequest):
    supabase = get_supabase_client()
    res = supabase.table("compliance_policies").insert({
        "organization_id": req.organization_id,
        "name": req.name,
        "schema_json": req.schema_json,
        "is_active": req.is_active
    }).execute()
    return res.data

@app.get("/api/compliance/terms")
async def list_blocked_terms():
    supabase = get_supabase_client()
    res = supabase.table("blocked_terms").select("*").execute()
    return res.data

@app.post("/api/compliance/terms")
async def add_blocked_term(req: TermRequest):
    supabase = get_supabase_client()
    res = supabase.table("blocked_terms").insert({
        "policy_id": req.policy_id,
        "term": req.term
    }).execute()
    return res.data

@app.delete("/api/compliance/terms/{term_id}")
async def delete_blocked_term(term_id: str):
    supabase = get_supabase_client()
    res = supabase.table("blocked_terms").delete().eq("id", term_id).execute()
    return {"status": "deleted", "id": term_id}
