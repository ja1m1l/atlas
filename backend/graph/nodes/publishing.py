import os
import json
import requests
from datetime import datetime
from backend.supabase_client import get_supabase_client
from backend.graph.state import ContentOpsState


def _get_buffer_profiles(access_token: str) -> list:
    """Fetch all connected Buffer profiles (social accounts) via GraphQL."""
    url = "https://api.buffer.com"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    query = """
    query GetChannels {
      account {
        channels {
          id
          name
          service
        }
      }
    }
    """
    try:
        resp = requests.post(url, headers=headers, json={"query": query}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            channels = data.get("data", {}).get("account", {}).get("channels", [])
            print(f"[Buffer] Found {len(channels)} channels: {[c['service'] for c in channels]}")
            return channels
    except Exception as e:
        print(f"[Buffer] Error fetching profiles: {e}")
    return []


def _publish_to_buffer_graphql(access_token: str, channel_id: str, text: str, service: str, image_url: str = "") -> dict:
    """Create a post on Buffer via GraphQL API."""
    url = "https://api.buffer.com"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    # Full mutation with ALL error types from PostActionPayload union
    mutation = """
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
          }
        }
        ... on NotFoundError {
          message
        }
        ... on UnauthorizedError {
          message
        }
        ... on UnexpectedError {
          message
        }
        ... on RestProxyError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on InvalidInputError {
          message
        }
      }
    }
    """
    
    input_data = {
        "text": text,
        "channelId": channel_id,
        "mode": "shareNow",
        "schedulingType": "automatic"
    }
    
    # Platform-specific adjustments
    if image_url:
        print(f"[Buffer] Attaching image to {service} post: {image_url}")
        input_data["assets"] = {
            "images": [{"url": image_url}]
        }
    elif service == "instagram":
        # Instagram requires an image — log a warning if none provided
        print(f"[Buffer] WARNING: No image provided for Instagram post. Instagram requires an image.")

    if service == "instagram":
        input_data["metadata"] = {
            "instagram": {"type": "post", "shouldShareToFeed": True}
        }
    elif service == "threads":
        input_data["metadata"] = {
            "threads": {"type": "post"}
        }

    try:
        resp = requests.post(url, headers=headers, json={"query": mutation, "variables": {"input": input_data}}, timeout=30)
        result = resp.json()
        print(f"[Buffer] {service} ({channel_id}): status={resp.status_code}, response={json.dumps(result)[:300]}")
        return result
    except Exception as e:
        print(f"[Buffer] {service} ({channel_id}): error={e}")
        return {"error": str(e)}


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


def _log_deployment(state: dict, message: str, severity: str = "info"):
    """Internal helper to log deployment status."""
    try:
        supabase = get_supabase_client()
        supabase.table("agent_logs").insert({
            "job_id": state["job_id"],
            "organization_id": state["org_id"],
            "agent_name": "Deployment Auth",
            "message": message,
            "severity": severity,
        }).execute()
    except Exception as e:
        print(f"[Log] Failed to write agent log: {e}")


def publishing_node(state: ContentOpsState) -> ContentOpsState:
    """Node 5: Publishing
    
    - Buffer GraphQL: Post to Instagram, Threads via connected profiles.
    - Contentful CMS: Push long-form blog post.
    """
    supabase = get_supabase_client()
    buffer_token = os.environ.get("BUFFER_ACCESS_TOKEN", "")

    _log_deployment(state, "Approval confirmed. Initiating multi-channel deployment...")

    published_channels = []
    failed_channels = []
    variants = state.get("channel_variants", {})
    user_image_url = state.get("image_url", "")
    print(f"[Buffer] Image URL from pipeline state: '{user_image_url}'")
    _log_deployment(state, f"Image URL for publishing: {user_image_url or '(none)'}")


    # ── Buffer: Social Media Publishing ──
    if buffer_token:
        profiles = _get_buffer_profiles(buffer_token)
        
        if profiles:
            _log_deployment(state, f"Buffer sync complete. Found {len(profiles)} channel(s): {', '.join([p['service'] for p in profiles])}.")
            
            # Separate profiles by service
            instagram_profiles = [p for p in profiles if p.get("service") == "instagram"]
            threads_profiles = [p for p in profiles if p.get("service") == "threads"]
            twitter_profiles = [p for p in profiles if p.get("service") == "twitter"]
            
            # Determine content for each platform from variants
            # Fallback to draft_text if specific variant is missing
            instagram_text = variants.get("instagram", variants.get("linkedin", state.get("draft_text", "")))
            threads_text = variants.get("threads", variants.get("twitter", state.get("draft_text", "")))
            twitter_text = variants.get("twitter", state.get("draft_text", ""))
            
            # ── Post to Instagram ──
            for profile in instagram_profiles:
                cid = profile["id"]
                _log_deployment(state, f"Dispatching to Instagram ({cid})...")
                result = _publish_to_buffer_graphql(buffer_token, cid, instagram_text, "instagram", user_image_url)
                
                create_post = result.get("data", {}).get("createPost", {})
                if create_post and create_post.get("id"):
                    published_channels.append("instagram")
                    _log_deployment(state, f"Instagram post PUBLISHED.")
                elif result.get("errors"):
                     _log_deployment(state, f"Instagram FAILED: {result['errors'][0].get('message')}", "error")
                else:
                    published_channels.append("instagram")
                    _log_deployment(state, "Instagram post queued.")

            # ── Post to Threads ──
            for profile in threads_profiles:
                cid = profile["id"]
                _log_deployment(state, f"Dispatching to Threads ({cid})...")
                result = _publish_to_buffer_graphql(buffer_token, cid, threads_text, "threads", user_image_url)
                
                create_post = result.get("data", {}).get("createPost", {})
                if create_post and create_post.get("id"):
                    published_channels.append("threads")
                    _log_deployment(state, f"Threads post PUBLISHED.")
                else:
                    published_channels.append("threads")
                    _log_deployment(state, "Threads post queued.")
            
            # ── Post to Twitter (X) ──
            for profile in twitter_profiles:
                cid = profile["id"]
                _log_deployment(state, f"Dispatching to X/Twitter ({cid})...")
                result = _publish_to_buffer_graphql(buffer_token, cid, twitter_text, "twitter", user_image_url)
                
                create_post = result.get("data", {}).get("createPost", {})
                if create_post and create_post.get("id"):
                    published_channels.append("twitter")
                    _log_deployment(state, f"X/Twitter post PUBLISHED.")
                else:
                    published_channels.append("twitter")
                    _log_deployment(state, "X/Twitter post queued.")
        else:
            _log_deployment(state, "No Buffer channels found. Skipping social publishing.", "warn")
    else:
        _log_deployment(state, "BUFFER_ACCESS_TOKEN not set. Social publishing skipped.", "warn")

    # ── Contentful CMS ──
    contentful_result = _publish_to_contentful(state)
    if contentful_result:
        published_channels.append("contentful")
        _log_deployment(state, f"Contentful entry created: {contentful_result.get('contentful_entry_id')}")

    # ── Finalize ──
    channel_summary = ', '.join(published_channels) if published_channels else 'none'
    failed_summary = ', '.join(failed_channels) if failed_channels else 'none'
    
    _log_deployment(state, f"TRANSMISSION COMPLETE. Published to: [{channel_summary}]. Failed: [{failed_summary}].")

    # Persist final state
    try:
        supabase.table("jobs").update({
            "status": "Published",
            "progress": 100
        }).eq("id", state["job_id"]).execute()
    except Exception as e:
        _log_deployment(state, f"Failed to persist final job state: {str(e)}", "error")

    # Audit log with details
    try:
        supabase.table("audit_logs").insert({
            "organization_id": state["org_id"],
            "job_id": state["job_id"],
            "action": "PUBLISH_COMPLETE",
            "actor": "AGENT_PUBLISH",
            "status": "success",
            "topic": state.get("topic", ""),
        }).execute()
    except Exception as e:
        print(f"[Audit] Failed to write audit log: {e}")

    # Store results in state for downstream use
    state["published_channels"] = published_channels
    state["failed_channels"] = failed_channels

    return state
