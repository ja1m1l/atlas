import json
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

def compliance_node(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    state.setdefault("compliance_retries", 0)
    
    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Compliance Engine",
        "message": "Initializing structured compliance review...",
        "severity": "info"
    }).execute()

    # Fetch rules
    policies = supabase.table("compliance_policies").select("*").eq("organization_id", state["org_id"]).eq("is_active", True).execute()
    rules_text = ""
    if policies.data:
        rules_text += json.dumps([p["schema_json"] for p in policies.data])
        
    # Fetch blocked terms
    if policies.data:
        policy_ids = [p["id"] for p in policies.data]
        blocked = supabase.table("blocked_terms").select("term").in_("policy_id", policy_ids).execute()
        if blocked.data:
            rules_text += f"\n\nBlocked terms: {[b['term'] for b in blocked.data]}"

    llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a strict compliance reviewer. Return strictly formatted JSON without any markdown code block wrapper."),
        ("user", "Review the following content against the provided rules.\n\n"
         "Rules:\n{rules}\n\nContent:\n{content}\n\n"
         "Return a JSON object with:\n"
         "- 'status': (string) 'pass' or 'fail'\n"
         "- 'feedback': (string) detailed explanation of violations if blocked terms or rules are violated (empty if pass).")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "rules": rules_text if rules_text else "No specific compliance rules provided. Ensure general brand safety.",
        "content": state.get("draft_text", "")
    })
    
    try:
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        result = json.loads(content.strip())
    except Exception as e:
        result = {"status": "fail", "feedback": "Failed to parse compliance response."}

    state["compliance_result"] = result
    
    if result.get("status") == "fail":
        state["compliance_retries"] += 1
        issues = 1
        
        # Increase compliance issues count in job
        job_res = supabase.table("jobs").select("compliance_issues").eq("id", state["job_id"]).execute()
        if job_res.data:
            issues = job_res.data[0]["compliance_issues"] + 1
            supabase.table("jobs").update({"compliance_issues": issues}).eq("id", state["job_id"]).execute()
            
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Compliance Engine",
            "message": f"Compliance violations detected. Feedback: {result.get('feedback')}. Retrying (Attempt {state['compliance_retries']}).",
            "severity": "warn"
        }).execute()
        
        # We will let the Graph conditional edge decide to retry or fail permanently.
    else:
        # Success
        supabase.table("jobs").update({"status": "Localization", "progress": 40}).eq("id", state["job_id"]).execute()
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Compliance Engine",
            "message": "Validation SUCCESS. Zero constraints blocked. Sending to Localization.",
            "severity": "info"
        }).execute()

    return state
