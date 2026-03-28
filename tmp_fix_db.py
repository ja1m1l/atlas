from backend.supabase_client import get_supabase_client
supabase = get_supabase_client()

sql_commands = [
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_languages TEXT[] DEFAULT ARRAY['en']",
    "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS localized_variants JSONB DEFAULT '{}'",
    "ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'localization_review'"
]

for cmd in sql_commands:
    try:
        # Most Supabase setups with Service Role Key allow running arbitrary SQL via this RPC if provided
        # If not, this will fail and we'll have to ask the user.
        res = supabase.rpc('admin_exec_sql', {'query': cmd}).execute()
        print(f"Success: {cmd}")
    except Exception as e:
        print(f"Failed to run SQL '{cmd}': {e}")
