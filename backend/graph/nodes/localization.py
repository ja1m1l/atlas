import os
import json
import asyncio
import httpx
import logging
import traceback
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState

logger = logging.getLogger("atlasops")

# HF Key detection (TEST 6 requirement)
HF_TOKEN = (
    os.getenv('HUGGINGFACE_API_KEY') or
    os.getenv('HF_TOKEN') or
    os.getenv('HF_API_KEY') or
    os.getenv('HUGGING_FACE_TOKEN')
)

INDIAN_LANGS = {
    'hi': 'hin_Deva',
    'mr': 'mar_Deva',
}
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

async def translate_indictrans2(text: str, lang_code: str) -> str:
    if not HF_TOKEN:
        raise EnvironmentError('No HuggingFace API key found in .env')
        
    tgt = INDIAN_LANGS[lang_code]
    url = 'https://api-inference.huggingface.co/models/' \
          'ai4bharat/indictrans2-en-indic-dist-200M'
    
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                resp = await client.post(url,
                    headers={'Authorization': f'Bearer {HF_TOKEN}'},
                    json={'inputs': text[:2000],
                        'parameters': {
                            'src_lang': 'eng_Latn',
                            'tgt_lang': tgt
                        }})
                
            if resp.status_code != 200:
                data = resp.json()
                if isinstance(data, dict) and 'loading' in data.get('error',''):
                    logger.info(f"[L10N] Model loading, attempt {attempt+1}/3...")
                    await asyncio.sleep(20)
                    continue
                raise ValueError(f'Bad status {resp.status_code}: {data}')

            data = resp.json()
            if isinstance(data, list) and len(data) > 0 and 'translation_text' in data[0]:
                return data[0]['translation_text']
            
            raise ValueError(f'Unexpected response format: {data}')
        except Exception as e:
            if attempt == 2:
                raise e
            logger.warning(f"[L10N] Translation attempt {attempt+1} failed: {e}")
            await asyncio.sleep(2)
            
    raise TimeoutError('Model did not load after 3 attempts')

async def adapt_culturally(text: str, lang_name: str) -> str:
    # Placeholder for cultural adaptation logic via LLM
    # In a real scenario, this would call Gemini/Claude
    return text # For now return as is, or can add a prefix for demo

async def trim_tweet(text: str, lang_name: str) -> str:
    # Basic trim for tweet length
    if len(text) > 240:
        return text[:237] + "..."
    return text

async def localization_node_async(state: ContentOpsState) -> ContentOpsState:
    supabase = get_supabase_client()
    job_id = state['job_id']
    org_id = state.get('org_id', "02c4a65c-bad2-41b4-8e69-9aed1b2cca4a")
    
    # Step 1 — update status immediately
    supabase.table('jobs').update({'status': 'Localization'}).eq('id', job_id).execute()
    
    # Step 2 — read what user selected, filter out English
    selected = state.get('target_languages', ['en'])
    # Handle cases where it might be uppercase from legacy
    selected = [l.lower() for l in selected]
    langs_to_translate = [l for l in selected if l != 'en']
    
    # Step 3 — if English only, skip translation entirely
    if not langs_to_translate:
        logger.info(f"[L10N] Only English selected for {job_id}. Skipping translation.")
        supabase.table('jobs').update({
            'status': 'Pending', # Skip straight to Pending (Awaiting Approval)
            'progress': 80
        }).eq('id', job_id).execute()
        state['localized_variants'] = {}
        return state
    
    # Step 4 — translate only selected languages
    localized = {}
    draft_text = state.get('draft_text', '')
    linkedin_post = state.get('channel_variants', {}).get('linkedin', '')
    tweet_post = state.get('channel_variants', {}).get('twitter', '')
    
    for lang in langs_to_translate:
        if lang not in INDIAN_LANGS:
            logger.warning(f"[L10N] Unsupported language requested: {lang}")
            continue
            
        try:
            logger.info(f"[L10N] Translating to {lang} for job {job_id}")
            lang_name = LANG_NAMES[lang]
            variant = {}
            
            # 1. Translate the main Blog/Draft content (mandatory)
            if draft_text:
                blog_tr = await translate_indictrans2(draft_text, lang)
                variant['blog'] = await adapt_culturally(blog_tr, lang_name)
            
            # 2. Iterate over social channels from drafting
            for chan, content in state.get("channel_variants", {}).items():
                if chan == "email_subject": continue # skip subject translation for now or include if needed
                
                logger.debug(f"[L10N] Translating channel '{chan}' to {lang}")
                translated = await translate_indictrans2(content, lang)
                adapted = await adapt_culturally(translated, lang_name)
                
                # Apply channel-specific constraints (like tweet length)
                if chan == "twitter" and len(adapted) > 240:
                    adapted = await trim_tweet(adapted, lang_name)
                
                variant[chan] = adapted

            localized[lang] = variant
            localized[lang] = variant
            
            # Use localizations table as per schema
            supabase.table('localizations').upsert({
                "job_id": job_id,
                "language_code": lang,
                "translated_body": json.dumps(variant),
                "status": "completed"
            }, on_conflict="job_id,language_code").execute()
            
            log_audit(job_id, 'localization', f'translate_{lang}', 'success', org_id)
        
        except Exception as e:
            logger.error(f"[L10N] Failed to translate to {lang}: {e}")
            error_variant = {'blog': '', 'linkedin': '', 'tweet': '', 'error': str(e)}
            localized[lang] = error_variant
            
            supabase.table('localizations').upsert({
                "job_id": job_id,
                "language_code": lang,
                "translated_body": json.dumps(error_variant),
                "status": "review"
            }, on_conflict="job_id,language_code").execute()
            
            log_audit(job_id, 'localization', f'translate_{lang}', f'FAILED: {e}', org_id)
    
    # Pause pipeline - Use 'Localization' + 80 progress since enum is missing 'localization_review'
    supabase.table('jobs').update({
        'status': 'Localization',
        'progress': 80
    }).eq('id', job_id).execute()
    
    state['localized_variants'] = localized
    return state

def localization_node(state: ContentOpsState) -> ContentOpsState:
    """Synchronous wrapper for async localization logic."""
    return asyncio.run(localization_node_async(state))
