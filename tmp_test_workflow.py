from backend.graph.workflow import create_workflow
try:
    workflow = create_workflow()
    print("Workflow creation SUCCESS.")
except Exception as e:
    import traceback
    print(f"Workflow creation FAILED: {e}")
    traceback.print_exc()
