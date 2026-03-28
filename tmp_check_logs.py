from backend.supabase_client import get_supabase_client
supabase = get_supabase_client()
res = supabase.table('agent_logs').select('*').order('created_at', desc=True).limit(10).execute()
for l in res.data or []:
    print(f"[{l['created_at']}] {l['agent_name']}: {l['message']}")
