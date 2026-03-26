import os
import json
import requests
from datetime import datetime
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

BUFFER_API_BASE = "https://api.bufferapp.com/1"


def _get_buffer_profiles(access_token: str) -> list:
    """Fetch all connected Buffer profiles (social accounts)."""
    try:
        resp = requests.get(
            f"{BUFFER_API_BASE}/profiles.json",
            params={"access_token": access_token},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return []


def _publish_to_buffer(access_token: str, profile_ids: list, text: str, now: bool = True) -> dict:
    """Create an update on Buffer for the given profile IDs.
    
    Buffer API: POST /updates/create.json
    - profile_ids[]: array of profile IDs to post to
    - text: the post content
    - now: if True, share immediately instead of adding to queue
    """
    try:
        data = {
            "text": text,
            "now": str(now).lower(),
            "access_token": access_token,
        }
        # Buffer expects profile_ids as repeated form fields: profile_ids[]=x&profile_ids[]=y
        for pid in profile_ids:
            data[f"profile_ids[]"] = pid  # single profile per call for reliability

        resp = requests.post(
            f"{BUFFER_API_BASE}/updates/create.json",
            data=data,
            timeout=15,
        )
        return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def _publish_to_buffer_multi(access_token: str, profile_ids: list, text: str, now: bool = True) -> list:
    """Post to multiple profiles individually for reliability."""
    results = []
    for pid in profile_ids:
        try:
            data = {
                "text": text,
                "now": str(now).lower(),
                "access_token": access_token,
                "profile_ids[]": pid,
            }
            resp = requests.post(
                f"{BUFFER_API_BASE}/updates/create.json",
                data=data,
                timeout=15,
            )
            results.append({"profile_id": pid, "response": resp.json()})
        except Exception as e:
            results.append({"profile_id": pid, "error": str(e)})
    return results


def _publish_to_contentful(state: ContentOpsState) -> dict:
    """Push long-form content to Contentful CMS."""
    space_id = os.environ.get("CONTENTFUL_SPACE_ID", "")
    cma_token = os.environ.get("CONTENTFUL_MANAGEMENT_TOKEN", "")

    if not space_id or not cma_token:
        return {}

    try:
        url = f"https://api.contentful.com/spaces/{space_id}/environments/master/entries"
        headers = {
            "Authorization": f"Bearer {cma_token}",
            "Content-Type": "application/vnd.contentful.management.v1+json",
            "X-Contentful-Content-Type": "blogPost",
        }
        payload = {
            "fields": {
                "title": {"en-US": state.get("topic", "Untitled")},
                "body": {"en-US": state.get("draft_text", "")},
                "audience": {"en-US": state.get("audience", "")},
                "publishedAt": {"en-US": datetime.utcnow().isoformat()},
            }
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        if resp.status_code in (200, 201):
            entry_id = resp.json().get("sys", {}).get("id", "")
            return {
                "contentful_entry_id": entry_id,
                "contentful_url": f"https://app.contentful.com/spaces/{space_id}/entries/{entry_id}",
            }
    except Exception:
        pass
    return {}


def publishing_node(state: ContentOpsState) -> ContentOpsState:
    """Node 5: Publishing
    
    - Buffer API: Post LinkedIn/Twitter content via connected profiles.
    - Contentful CMS: Push long-form blog post (free tier).
    """
    supabase = get_supabase_client()
    buffer_token = os.environ.get("BUFFER_ACCESS_TOKEN", "")

    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Deployment Auth",
        "message": "Approval confirmed. Initiating multi-channel deployment...",
        "severity": "info",
    }).execute()

    published_urls = {}
    variants = state.get("channel_variants", {})

    # ── Buffer: Social Media Publishing ──
    if buffer_token:
        profiles = _get_buffer_profiles(buffer_token)

        # Separate profiles by service
        twitter_profiles = [p["id"] for p in profiles if p.get("service") in ("twitter", "x")]
        linkedin_profiles = [p["id"] for p in profiles if p.get("service") == "linkedin"]

        # Post LinkedIn variant
        if linkedin_profiles and variants.get("linkedin"):
            results = _publish_to_buffer_multi(buffer_token, linkedin_profiles, variants["linkedin"])
            for r in results:
                if r.get("response", {}).get("success"):
                    published_urls["linkedin"] = "Published via Buffer"
                    supabase.table("agent_logs").insert({
                        "job_id": state["job_id"],
                        "organization_id": state["org_id"],
                        "agent_name": "Deployment Auth",
                        "message": f"LinkedIn post dispatched via Buffer (profile {r['profile_id']}).",
                        "severity": "info",
                    }).execute()

        # Post Twitter variant
        if twitter_profiles and variants.get("twitter"):
            results = _publish_to_buffer_multi(buffer_token, twitter_profiles, variants["twitter"])
            for r in results:
                if r.get("response", {}).get("success"):
                    published_urls["twitter"] = "Published via Buffer"
                    supabase.table("agent_logs").insert({
                        "job_id": state["job_id"],
                        "organization_id": state["org_id"],
                        "agent_name": "Deployment Auth",
                        "message": f"Twitter/X post dispatched via Buffer (profile {r['profile_id']}).",
                        "severity": "info",
                    }).execute()

        if not profiles:
            supabase.table("agent_logs").insert({
                "job_id": state["job_id"],
                "organization_id": state["org_id"],
                "agent_name": "Deployment Auth",
                "message": "No Buffer profiles connected. Skipping social publishing.",
                "severity": "warn",
            }).execute()
    else:
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Deployment Auth",
            "message": "BUFFER_ACCESS_TOKEN not set. Social publishing skipped.",
            "severity": "warn",
        }).execute()

    # ── Contentful CMS ──
    contentful_result = _publish_to_contentful(state)
    if contentful_result:
        published_urls["contentful"] = contentful_result.get("contentful_url", "")
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Deployment Auth",
            "message": f"Contentful entry created: {contentful_result.get('contentful_entry_id')}",
            "severity": "info",
        }).execute()

    # ── Finalize ──
    supabase.table("jobs").update({
        "status": "Published",
        "progress": 100,
    }).eq("id", state["job_id"]).execute()

    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Deployment Auth",
        "message": f"Transmission verified. Content live on {len(published_urls)} channel(s): {', '.join(published_urls.keys()) or 'none'}.",
        "severity": "info",
    }).execute()

    supabase.table("audit_logs").insert({
        "organization_id": state["org_id"],
        "job_id": state["job_id"],
        "action": "PUBLISH_COMPLETE",
        "actor": "AGENT_PUBLISH",
        "status": "success",
        "metadata": json.dumps({"published_urls": published_urls}),
    }).execute()

    return state
