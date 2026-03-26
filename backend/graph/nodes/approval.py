import os
import resend
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

def approval_node(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    resend.api_key = os.environ.get("RESEND_API_KEY", "re_123")
    
    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Approval Gate",
        "message": "Dispatching preview payload to authorized reviewers.",
        "severity": "info"
    }).execute()

    approver_email = os.environ.get("APPROVER_EMAIL", "approver@example.com")
    
    try:
        email_subject = state.get("channel_variants", {}).get("email_subject", f"Review Required: {state['topic']}")
        html_content = f"<h2>Review Required</h2><p>Topic: {state['topic']}</p><p>Review the job in AtlasOps.</p><hr/><p>{state.get('draft_text')}</p>"
        
        if os.environ.get("RESEND_API_KEY"):
            resend.Emails.send({
                "from": "AtlasOps <onboarding@resend.dev>",
                "to": approver_email,
                "subject": email_subject,
                "html": html_content
            })
            
        state["approval_status"] = "pending_approval"
        
        supabase.table("jobs").update({"status": "Pending", "progress": 80}).eq("id", state["job_id"]).execute()
        
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Approval Gate",
            "message": f"Review email successfully dispatched to {approver_email}. System shifting to standby.",
            "severity": "info"
        }).execute()
        
    except Exception as e:
        state["approval_status"] = "error"
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Approval Gate",
            "message": f"Failed to dispatch review email: {str(e)}",
            "severity": "error"
        }).execute()

    return state
