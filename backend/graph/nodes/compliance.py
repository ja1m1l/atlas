import json
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

logger = logging.getLogger("atlasops")

def fetch_compliance_rules(supabase):
    """
    CHECK 2 — LIVE FETCH: Fetches the active compliance rules JSON from Supabase.
    Currently attempts to fetch from 'compliance_rules' (id=1) as per target spec.
    Falls back to 'compliance_policies' if the target table is missing or empty.
    """
    try:
        # User specified: SELECT * FROM compliance_rules WHERE id=1;
        res = supabase.table("compliance_rules").select("rules").eq("id", 1).execute()
        if res.data and res.data[0].get("rules"):
            return res.data[0]["rules"]
    except Exception as e:
        logger.warning(f"Could not fetch from 'compliance_rules': {e}. Falling back to policies.")
        
    try:
        # Fallback to existing policies table if the new one isn't ready
        policies = supabase.table("compliance_policies").select("schema_json").eq("is_active", True).execute()
        if policies.data:
            return {
                "policies": [p["schema_json"] for p in policies.data],
                "forbidden_words": [] # Will be merged from blocked_terms if needed
            }
    except Exception as e:
        logger.error(f"Critical failure fetching rules: {e}")
    
    return {}

def build_compliance_prompt(content, rules):
    """
    CHECK 3 — RULES IN PROMPT: Builds the system/user prompt for Gemini.
    Ensures human-readable rules JSON is embedded and instructions are clear.
    """
    rules_str = json.dumps(rules, indent=2)
    
    prompt_text = f"""Review the following content against the provided enterprise compliance rules.

Rules (JSON Map):
{rules_str}

Content to Review:
{content}

Instructions:
1. Identify any matched forbidden words, tone violations, or missing disclaimers.
2. For each violation, identify the exact sentence and suggest a compliant rewrite.
3. Return ONLY valid JSON. 

Return a JSON object with this exact structure:
{{
  "status": "pass" | "fail",
  "issues": [
    {{
      "sentence": "the problematic text",
      "violation": "the rule that was broken",
      "severity": "high" | "medium" | "low",
      "suggestion": "improved version"
    }}
  ],
  "feedback": "Overall summary"
}}
"""
    return prompt_text

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

    # --- CHECK 2 & 3: Fetch Rules Live and Build Prompt ---
    rules = fetch_compliance_rules(supabase)
    
    # Also fetch blocked terms as a secondary source if we are using the policies fallback
    if "policies" in rules:
        try:
           blocked = supabase.table("blocked_terms").select("term").execute()
           if blocked.data:
               rules["forbidden_words"] = [b['term'] for b in blocked.data]
        except:
           pass

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    
    prompt_content = build_compliance_prompt(state.get("draft_text", ""), rules)
    
    # Escape any curly braces in the content so LangChain doesn't treat them as a template
    safe_prompt = prompt_content.replace("{", "{{").replace("}", "}}")
    
    # We use a simple system message and the built prompt as user message
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a strict compliance reviewer. Return strictly formatted JSON without any markdown code block wrapper."),
        ("user", safe_prompt)
    ])

    chain = prompt | llm
    response = chain.invoke({})
    
    try:
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        result = json.loads(content.strip())
    except Exception as e:
        logger.error(f"Compliance parse failed: {e}")
        # Default to a generic error result to avoid crashing the pipeline
        result = {"status": "fail", "issues": [], "feedback": "Parse error in compliance output."}

    state["compliance_result"] = result
    
    if result.get("status") == "fail":
        state["compliance_retries"] += 1
        
        # --- CHECK 5: Update compliance_issues only ---
        # Note: metadata/compliance_details is stored in the AGENT_LOGS instead for this job
        supabase.table("jobs").update({
            "compliance_issues": len(result.get("issues", [])),
        }).eq("id", state["job_id"]).execute()
            
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Compliance Engine",
            "message": f"Compliance violations detected: {len(result.get('issues', []))} items flagged. Feedback: {result.get('feedback')}. Retrying (Attempt {state['compliance_retries']}).",
            "severity": "warn",
            "metadata": {
                "compliance_details": result.get("issues", []),
                "compliance_retries": state["compliance_retries"]
            }
        }).execute()
        
        supabase.table("audit_logs").insert({
            "organization_id": state["org_id"],
            "job_id": state["job_id"],
            "actor": "Compliance Engine",
            "action": "Compliance REJECTED",
            "status": "fail",
            "topic": state.get("topic", "Mission Compliance")
        }).execute()
    else:
        # Success
        supabase.table("jobs").update({
            "status": "Localization", 
            "progress": 40,
            "compliance_issues": 0
        }).eq("id", state["job_id"]).execute()
        
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Compliance Engine",
            "message": "Validation SUCCESS. Zero constraints blocked. Sending to Localization.",
            "severity": "info"
        }).execute()

        supabase.table("audit_logs").insert({
            "organization_id": state["org_id"],
            "job_id": state["job_id"],
            "actor": "Compliance Engine",
            "action": "Compliance CLEARED",
            "status": "success",
            "topic": state.get("topic", "Mission Compliance")
        }).execute()

    return state

