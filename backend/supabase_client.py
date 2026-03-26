import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load the project root .env (one level above /backend)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Support both frontend-style and backend-style env var names
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_client: Client | None = None

def get_supabase_client() -> Client:
    """Return a singleton Supabase client using the Service Role Key (bypasses RLS)."""
    global _client
    if _client is not None:
        return _client
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env. "
            "The backend needs the Service Role Key to bypass RLS."
        )
    print(f"[Supabase] Connecting to {SUPABASE_URL}")
    print(f"[Supabase] Using Key starting with: {SUPABASE_SERVICE_ROLE_KEY[:10]}...")
    _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client
