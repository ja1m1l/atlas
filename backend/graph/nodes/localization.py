import os
import json
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
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
    
    from concurrent.futures import ThreadPoolExecutor
    
    def translate_lang(lang):
        lang_name = LANG_NAMES.get(lang, lang)
        used_method = "claude"
        trans_text = ""
            
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
                        trans_text = res_val[0]["translation_text"]
                        used_method = "indictrans2"
                except Exception:
                    pass  # Falls through to Claude below

        # ── All languages: Claude fallback ──
        if not trans_text:
            try:
                llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
                prompt = ChatPromptTemplate.from_messages([
                    ("system",
                     f"You are a professional native {lang_name} translator and cultural adapter. "
                     f"Translate the content accurately, preserving B2B tone, formatting, and cultural nuances for {lang_name}-speaking markets. "
                     f"Return ONLY the translated text."),
                    ("user", draft)
                ])
                result = (prompt | llm).invoke({})
                trans_text = str(result.content)
                used_method = "claude"
            except Exception as e:
                trans_text = f"[Translation error for {lang_name}: {str(e)}]"
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
            "translated_body": trans_text,
            "status": "completed"
        }, on_conflict="job_id,language_code").execute()
        
        return lang, trans_text

    # Run in parallel
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(translate_lang, [l for l in languages if l != "EN"]))
        for lang, text in results:
            translated[lang] = text

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
