from langgraph.graph import StateGraph, END
from backend.graph.state import ContentOpsState
from backend.graph.nodes.drafting import drafting_node
from backend.graph.nodes.compliance import compliance_node
from backend.graph.nodes.localization import localization_node
from backend.graph.nodes.approval import approval_node
from backend.graph.nodes.publishing import publishing_node

def check_compliance_status(state: ContentOpsState):
    res = state.get("compliance_result", {})
    if res.get("status") == "fail":
        if state.get("compliance_retries", 0) >= 3:
            return "localization"
        return "drafting"
    return "localization"

def create_workflow():
    workflow = StateGraph(ContentOpsState)
    
    workflow.add_node("drafting", drafting_node)
    workflow.add_node("compliance", compliance_node)
    workflow.add_node("localization", localization_node)
    workflow.add_node("approval", approval_node)
    workflow.add_node("publishing", publishing_node)
    
    workflow.set_entry_point("drafting")
    workflow.add_edge("drafting", "compliance")
    
    workflow.add_conditional_edges("compliance", check_compliance_status, {
        "drafting": "drafting",
        "localization": "localization"
    })
    
    workflow.add_edge("localization", END)
    
    return workflow.compile()
