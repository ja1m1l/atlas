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
        ("system", "You are an expert B2B content creator. Your goal is to generate high-engagement, professional social media posts. "
                   "Each post (LinkedIn, Instagram, Threads) should be a detailed, comprehensive update of approximately 80-100 words. "
                   "Focus on tactical value, use a professional yet slightly italic/modern tone, and include relevant emojis and hashtags. "
                   "Generate the response in strictly valid JSON format without markdown code blocks."),
        ("user", "Mission Title: {topic}\nObjective: {objective}\nTarget Audience: {audience}\nContext Spec: {spec}\n\n"
         "Return a JSON object with these exact keys:\n"
         "- 'draft_text': (string) The main long-form B2B analysis (300+ words).\n"
         "- 'linkedin_post': (string) A comprehensive LinkedIn post (80-100 words).\n"
         "- 'instagram_post': (string) An engaging Instagram caption with hashtags (80-100 words).\n"
         "- 'threads_post': (string) A thoughtful Threads-format update (80-100 words).\n"
         "- 'tweet': (string) A punchy, high-impact tweet (max 280 chars).\n"
         "- 'email_subject': (string) A compelling email subject line.")
    ])

    chain = prompt | llm
    
    feedback = ""
    if state.get("compliance_result") and state["compliance_result"].get("status") == "fail":
        feedback = f"\n\nPrevous attempt failed compliance. Please closely follow this feedback to fix the issues: {state['compliance_result'].get('feedback')}"

    response = chain.invoke({
        "spec": state.get("spec_text", "") + feedback,
        "topic": state.get("topic", ""),
        "objective": state.get("objective", ""),
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

    supabase.table("audit_logs").insert({
        "organization_id": state["org_id"],
        "job_id": state["job_id"],
        "actor": "Drafting Protocol",
        "action": "Draft Generated",
        "status": "success",
        "topic": state.get("topic", "Mission Drafting")
    }).execute()

    return state
