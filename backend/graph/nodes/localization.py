import os
import requests
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

# Language code → full name for better LLM prompts
LANG_NAMES = {
    "HI": "Hindi", "MR": "Marathi", "TA": "Tamil",
    "FR": "French", "DE": "German", "ES": "Spanish",
    "JP": "Japanese", "KO": "Korean",
}

def localization_node(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    languages = state.get("target_languages", [])
    
    if not languages or len(languages) == 0 or languages == ["EN"]:
        supabase.table("jobs").update({"status": "Pending", "progress": 80}).eq("id", state["job_id"]).execute()
        state["localized_variants"] = {}
        return state

    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "L10N Network",
        "message": f"Starting concurrent translation streams for languages: {languages}.",
        "severity": "info"
    }).execute()

    translated = {}
    draft = state.get("draft_text", "")
    
    for lang in languages:
        if lang == "EN":
            continue
        
        lang_name = LANG_NAMES.get(lang, lang)
        used_method = "claude"
            
        # ── Indic languages: try IndicTrans2 (HuggingFace) first ──
        if lang in ["HI", "MR", "TA"]:
            hf_token = os.environ.get("HF_TOKEN", "")
            if hf_token:
                try:
                    API_URL = "https://api-inference.huggingface.co/models/ai4bharat/indictrans2-en-indic-1B"
                    headers = {"Authorization": f"Bearer {hf_token}"}
                    response = requests.post(API_URL, headers=headers, json={"inputs": draft[:1000]}, timeout=30)
                    res_val = response.json()
                    if isinstance(res_val, list) and len(res_val) > 0 and "translation_text" in res_val[0]:
                        translated[lang] = res_val[0]["translation_text"]
                        used_method = "indictrans2"
                except Exception:
                    pass  # Falls through to Claude below

        # ── All languages: Claude fallback (replaces DeepL for FR/DE) ──
        if lang not in translated:
            try:
                llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0.3)
                prompt = ChatPromptTemplate.from_messages([
                    ("system",
                     f"You are a professional native {lang_name} translator and cultural adapter. "
                     f"Translate the content accurately, preserving B2B tone, formatting, and cultural nuances for {lang_name}-speaking markets. "
                     f"Return ONLY the translated text."),
                    ("user", draft)
                ])
                result = (prompt | llm).invoke({})
                translated[lang] = str(result.content)
                used_method = "claude"
            except Exception as e:
                translated[lang] = f"[Translation error for {lang_name}: {str(e)}]"
                used_method = "error"

        # Log which method was used
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "L10N Network",
            "message": f"Translated to {lang_name} ({lang}) via {used_method}.",
            "severity": "info"
        }).execute()

        # Persist to Supabase localizations table
        supabase.table("localizations").upsert({
            "job_id": state["job_id"],
            "language_code": lang,
            "translated_body": translated.get(lang, ""),
            "status": "completed"
        }, on_conflict="job_id,language_code").execute()

    state["localized_variants"] = translated
    
    supabase.table("jobs").update({"status": "Pending", "progress": 80}).eq("id", state["job_id"]).execute()
    supabase.table("agent_logs").insert({
        "job_id": state["job_id"],
        "organization_id": state["org_id"],
        "agent_name": "L10N Network",
        "message": f"Translation Matrix completed ({len(translated)} languages). Moving to Gate.",
        "severity": "info"
    }).execute()

    return state
