import sys, traceback, json
sys.path.append('.')
from backend.supabase_client import get_supabase_client
from backend.graph.nodes.compliance import compliance_node
from backend.graph.state import ContentOpsState

client = get_supabase_client()
job_id = "2b602d97-f8a5-4c59-864c-d24f4f0c9440"
content_res = client.table("job_content").select("body").eq("job_id", job_id).order("version", desc=True).execute()
draft_text = content_res.data[0]["body"] if content_res.data else ""

state = ContentOpsState(
    job_id=job_id,
    org_id="02c4a65c-bad2-41b4-8e69-9aed1b2cca4a",
    topic="Test topic",
    objective="Test objective",
    audience="developers",
    target_languages=["EN"],
    channels=["Instagram"],
    spec_text="Test spec",
    draft_text=draft_text,
    image_url="",
    channel_variants={},
    compliance_result={}
)

try:
    print("Running compliance_node...")
    res = compliance_node(state)
    print("Compliance Node SUCCESS!")
    print(json.dumps(res["compliance_result"], indent=2))
except Exception as e:
    print("Compliance Node FAILED:")
    traceback.print_exc()
