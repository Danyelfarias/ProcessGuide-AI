from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Workspace ──────────────────────────────────────────────
class WorkspaceCreate(BaseModel):
    name: str
    icon: Optional[str] = "🏢"


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    icon: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Process ────────────────────────────────────────────────
class ProcessCreate(BaseModel):
    name: str
    sector: Optional[str] = None
    workspace_id: Optional[int] = None


class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    flow_json: Optional[str] = None
    source_doc: Optional[str] = None
    updated_by: Optional[str] = None


class ProcessResponse(BaseModel):
    id: int
    name: str
    sector: Optional[str] = None
    workspace_id: Optional[int]
    flow_json: str
    source_doc: Optional[str]
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Version ────────────────────────────────────────────────
class VersionCreate(BaseModel):
    process_id: int
    version_tag: str
    author: Optional[str] = "User"
    process_name: Optional[str] = None
    sector: Optional[str] = None


class VersionResponse(BaseModel):
    id: int
    process_id: int
    version_tag: str
    flow_json: str
    author: str
    process_name: Optional[str] = None
    sector: Optional[str] = None
    published_at: datetime

    class Config:
        from_attributes = True


# ── AI / Chat ──────────────────────────────────────────────
class ChatRequest(BaseModel):
    process_id: Optional[int] = None
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


class GenerateFlowRequest(BaseModel):
    process_id: int
    text: Optional[str] = None
    document_id: Optional[int] = None


class FlowData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class DiffRequest(BaseModel):
    process_id: int
    document_id: int


class DiffChange(BaseModel):
    id: str
    action: str          # ADD | UPDATE | DELETE
    node_id: Optional[str] = None
    title: str
    description: str
    new_data: Optional[Dict[str, Any]] = None


class DiffResponse(BaseModel):
    changes: List[DiffChange]


class SuggestNodeRequest(BaseModel):
    node_title: str
    process_context: Optional[str] = None


class SuggestNodeResponse(BaseModel):
    description: str
    responsibilities: List[str]
    risks: List[str]
    sop_text: str
