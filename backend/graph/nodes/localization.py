import os
import json
import logging
import traceback
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

logger = logging.getLogger("atlasops")

LANG_NAMES = {
    'hi': 'Hindi',
    'mr': 'Marathi',
}

def log_audit(job_id, agent, action, status, org_id="02c4a65c-bad2-41b4-8e69-9aed1b2cca4a"):
    try:
        supabase = get_supabase_client()
        supabase.table('audit_logs').insert({
            'job_id': job_id,
            'organization_id': org_id,
            'actor': agent,
            'action': action,
            'status': status
        }).execute()
    except:
        pass

async def translate_with_gemini(text: str, target_lang: str, topic: str, audience: str) -> str:
    """
    Uses Gemini 1.5 Flash to translate and culturally adapt content.
    This is much more reliable and faster than local/HF models for this use case.
    """
    # Sanitize API Key
    raw_key = os.environ.get("GOOGLE_API_KEY", "")
    api_key = raw_key.split("#")[0].strip() if raw_key else None

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=api_key,
        temperature=0.3
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert localization agent specializing in Indian regional languages. "
                   "Your task is to translate and culturally adapt the input English text into {lang}. "
                   "Maintain the professional tone, formatting (like emojis or hashtags in social posts), and "
                   "ensure it resonates with the local demographic in India. "
                   "Return ONLY the translated text."),
        ("user", "Context Topic: {topic}\nTarget Audience: {audience}\n\nText to translate:\n{text}")
    ])
    
    chain = prompt | llm
    response = await chain.ainvoke({
        "lang": LANG_NAMES.get(target_lang.lower(), target_lang),
        "topic": topic,
        "audience": audience,
        "text": text
    })
    
    return response.content.strip()

async def localization_node_async(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    job_id = state['job_id']
    org_id = state.get('org_id', "02c4a65c-bad2-41b4-8e69-9aed1b2cca4a")
    topic = state.get('topic', '')
    audience = state.get('audience', '')
    
    # Step 1 — Update log
    supabase.table("agent_logs").insert({
        "job_id": job_id,
        "organization_id": org_id,
        "agent_name": "L10N Protocol",
        "message": "Initializing localization and cultural adaptation sequence.",
        "severity": "info"
    }).execute()
    
    # Step 2 — Filter languages (exclude English)
    selected = state.get('target_languages', ['en'])
    selected = [l.lower() for l in selected]
    langs_to_translate = [l for l in selected if l != 'en']
    
    # Step 3 — If only English, transition straight to Pending
    if not langs_to_translate:
        logger.info(f"[L10N] No target languages outside English. Skipping.")
        supabase.table('jobs').update({'status': 'Pending', 'progress': 80}).eq('id', job_id).execute()
        state['localized_variants'] = {}
        return state
    
    # Step 4 — Translation Loop (Batched for Rate-Limit Safety)
    import asyncio
    localized = {}
    draft_text = state.get('draft_text', '')
    channel_variants = state.get('channel_variants', {})
    
    for lang in langs_to_translate:
        try:
            logger.info(f"[L10N] Batch translating to {lang} for job {job_id}")
            lang_name = LANG_NAMES.get(lang, lang)
            
            # Sanitization of API Key
            raw_key = os.environ.get("GOOGLE_API_KEY", "")
            api_key = raw_key.split("#")[0].strip() if raw_key else None

            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash", 
                google_api_key=api_key,
                temperature=0.3
            )
            
            # BATCH PROMPT
            prompt = ChatPromptTemplate.from_messages([
                ("system", f"You are a localization expert for {lang_name}. "
                           "Translate and culturally adapt the provided content. "
                           "Return ONLY a strictly valid JSON object with the exact same keys. "
                           "Maintain all emojis, hashtags, and formatting. No markdown blocks."),
                ("user", "Mission Topic: {topic}\nTarget Audience: {audience}\n\n"
                         "Content to translate (JSON format):\n{content_json}")
            ])
            
            content_to_translate = {"blog": draft_text}
            for k, v in channel_variants.items():
                if k != "email_subject":
                    content_to_translate[k] = v
            
            chain = prompt | llm
            max_retries = 2
            variant = None
            for attempt in range(max_retries + 1):
                try:
                    response = await chain.ainvoke({
                        "topic": topic,
                        "audience": state.get('audience', ''),
                        "content_json": json.dumps(content_to_translate)
                    })
                    
                    raw_content = response.content.strip()
                    if "```json" in raw_content:
                        raw_content = raw_content.split("```json")[1].split("```")[0]
                    elif "```" in raw_content:
                        raw_content = raw_content.split("```")[1].split("```")[0]
                        
                    variant = json.loads(raw_content)
                    break 
                except Exception as loop_e:
                    if "429" in str(loop_e) and attempt < max_retries:
                        logger.warning(f"[L10N] Rate limited on {lang}. Retrying in 5s... (Attempt {attempt+1})")
                        await asyncio.sleep(5)
                    else:
                        raise loop_e

            if variant:
                localized[lang] = variant
            
            # Sync to localizations table
            supabase.table('localizations').upsert({
                "job_id": job_id,
                "language_code": lang,
                "translated_body": json.dumps(variant),
                "status": "completed"
            }, on_conflict="job_id,language_code").execute()
            
            log_audit(job_id, 'localization', f'translate_{lang}', 'success', org_id)
            
        except Exception as e:
            logger.error(f"[L10N] Failed to translate to {lang}: {e}")
            error_variant = {'blog': '', 'error': str(e)}
            localized[lang] = error_variant
            
            supabase.table('localizations').upsert({
                "job_id": job_id,
                "language_code": lang,
                "translated_body": json.dumps(error_variant),
                "status": "error"
            }, on_conflict="job_id,language_code").execute()
            
            log_audit(job_id, 'localization', f'translate_{lang}', f'FAILED: {e}', org_id)

    # Step 5 — Move Job to Localization Status with PROGRESS 80 (Awaiting Review)
    # The DB enum lacks 'localization_review', so we use 'Localization' at 80% progress.
    supabase.table('jobs').update({
        'status': 'Localization',
        'progress': 80
    }).eq('id', job_id).execute()
    
    supabase.table("agent_logs").insert({
        "job_id": job_id,
        "organization_id": org_id,
        "agent_name": "L10N Protocol",
        "message": f"Localization complete for {len(langs_to_translate)} languages. Awaiting human verification of regional variants.",
        "severity": "info"
    }).execute()
    
    state['localized_variants'] = localized
    return state

import asyncio
def localization_node(state: ContentOpsState) -> ContentOpsState:
    """Synchronous wrapper for async localization logic."""
    try:
        # Check if we are already in an event loop (FastAPI case)
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # This is tricky in FastAPI/LangGraph. Usually we want it async from the start.
            # But uvicorn/LangChain might already have a loop.
            import threading
            from concurrent.futures import ThreadPoolExecutor
            
            with ThreadPoolExecutor() as executor:
                return executor.submit(lambda: asyncio.run(localization_node_async(state))).result()
        return asyncio.run(localization_node_async(state))
    except RuntimeError:
        return asyncio.run(localization_node_async(state))
