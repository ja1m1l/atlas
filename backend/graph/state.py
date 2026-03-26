from typing import TypedDict, List, Dict, Any, Annotated
import operator

class ContentOpsState(TypedDict):
    job_id: str
    org_id: str
    topic: str
    objective: str
    audience: str
    target_languages: List[str]
    channels: List[str]
    spec_text: str
    draft_text: str
    image_url: str
    channel_variants: Dict[str, Any]
    compliance_result: Dict[str, Any]
    compliance_retries: int
    localized_variants: Dict[str, Any]
    approval_status: str
    audit_log: Annotated[List[str], operator.add]
