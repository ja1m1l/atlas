import sys, json
sys.path.append('.')
from backend.supabase_client import get_supabase_client

client = get_supabase_client()
job = client.table('jobs').select('id, status, progress, display_id').eq('display_id', 'JOB-004').execute().data[0]
job_id = job['id']

print("JOB:", json.dumps(job, indent=2))

logs = client.table('agent_logs').select('agent_name, message').eq('job_id', job_id).order('created_at').execute().data
print("LOGS:", json.dumps(logs, indent=2))

content = client.table('job_content').select('version, body').eq('job_id', job_id).execute().data
print("CONTENT VERSIONS:", len(content))
