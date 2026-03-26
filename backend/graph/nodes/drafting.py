import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

def drafting_node(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    
    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Drafting Protocol",
        "message": f"Draft generation started (Attempt {state.get('compliance_retries', 0) + 1}).",
        "severity": "info"
    }).execute()

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert B2B content creator. Generate a comprehensive drafting response in strictly valid JSON format without markdown code blocks."),
        ("user", "Spec: {spec}\nTopic: {topic}\nAudience: {audience}\n\n"
         "Return a JSON object with these exact keys:\n"
         "- 'draft_text': (string) The main long-form B2B blog post.\n"
         "- 'linkedin_post': (string) A LinkedIn format post.\n"
         "- 'instagram_post': (string) An Instagram caption with hashtags.\n"
         "- 'threads_post': (string) A Threads format post.\n"
         "- 'tweet': (string) A short tweet.\n"
         "- 'email_subject': (string) An email subject line.")
    ])

    chain = prompt | llm
    
    feedback = ""
    if state.get("compliance_result") and state["compliance_result"].get("status") == "fail":
        feedback = f"\n\nPrevous attempt failed compliance. Please closely follow this feedback to fix the issues: {state['compliance_result'].get('feedback')}"

    response = chain.invoke({
        "spec": state.get("spec_text", "") + feedback,
        "topic": state.get("topic", ""),
        "audience": state.get("audience", "")
    })
    
    try:
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        data = json.loads(content.strip())
        
        state["draft_text"] = data.get("draft_text", "")
        state["channel_variants"] = {
            "linkedin": data.get("linkedin_post", ""),
            "instagram": data.get("instagram_post", ""),
            "threads": data.get("threads_post", ""),
            "twitter": data.get("tweet", ""),
            "email_subject": data.get("email_subject", "")
        }
    except Exception as e:
        print(f"AI Drafting failed: {e}")
        raise e  # Fail the pipeline as requested, no mock fallback.
        
    # Update Supabase
    supabase.table("jobs").update({
        "status": "Compliance",
        "progress": 20
    }).eq("id", state["job_id"]).execute()
    
    supabase.table("job_content").insert({
        "job_id": state["job_id"],
        "version": state.get("compliance_retries", 0) + 1,
        "body": state["draft_text"]
    }).execute()

    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "Drafting Protocol",
        "message": "Drafting complete. Content payload constructed.",
        "severity": "info"
    }).execute()

    return state
