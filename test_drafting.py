import sys, traceback
sys.path.append('.')
from backend.graph.nodes.drafting import drafting_node
from backend.graph.state import ContentOpsState

state = ContentOpsState(
    job_id="2b602d97-f8a5-4c59-864c-d24f4f0c9440",
    org_id="02c4a65c-bad2-41b4-8e69-9aed1b2cca4a",
    topic="Test topic",
    objective="Test objective",
    audience="developers",
    target_languages=["EN"],
    channels=["Instagram"],
    spec_text="Test spec",
    draft_text="",
    image_url="",
    channel_variants={},
    compliance_result={}
)

try:
    drafting_node(state)
    print("Drafting Node SUCCESS!")
except Exception as e:
    print("Drafting Node FAILED:")
    traceback.print_exc()
