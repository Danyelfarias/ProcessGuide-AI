from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db, Process, Document
from models.schemas import (
    ChatRequest, ChatResponse,
    GenerateFlowRequest, FlowData,
    DiffRequest, DiffResponse,
    SuggestNodeRequest, SuggestNodeResponse,
)
from services.rag_service import RagService
from services.graph_service import GraphService

router = APIRouter()

_rag: RagService | None = None
_graph: GraphService | None = None


def get_rag() -> RagService:
    global _rag
    if _rag is None:
        _rag = RagService()
    return _rag


def get_graph() -> GraphService:
    global _graph
    if _graph is None:
        _graph = GraphService()
    return _graph


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    rag = get_rag()
    context_hint = payload.context or ""

    if payload.process_id:
        process = db.query(Process).filter(Process.id == payload.process_id).first()
        if not process:
            raise HTTPException(status_code=404, detail="Process not found")

        docs = (
            db.query(Document)
            .filter(Document.process_id == payload.process_id)
            .all()
        )
        doc_texts = [d.content for d in docs if d.content]
        answer, sources = rag.query(
            payload.message, doc_texts, context_hint, process.flow_json
        )
    else:
        answer, sources = rag.query(payload.message, [], context_hint, None)

    return ChatResponse(answer=answer, sources=sources)


@router.post("/generate-flow", response_model=FlowData)
def generate_flow(payload: GenerateFlowRequest, db: Session = Depends(get_db)):
    graph = get_graph()

    if payload.document_id:
        doc = db.query(Document).filter(Document.id == payload.document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        text = doc.content or ""
    elif payload.text:
        text = payload.text
    else:
        raise HTTPException(status_code=400, detail="Provide document_id or text")

    flow = graph.text_to_flow(text)

    # Persist generated flow
    process = db.query(Process).filter(Process.id == payload.process_id).first()
    if process:
        import json
        process.flow_json = json.dumps(flow)
        db.commit()

    return FlowData(**flow)


@router.post("/diff", response_model=DiffResponse)
def diff_document(payload: DiffRequest, db: Session = Depends(get_db)):
    graph = get_graph()

    process = db.query(Process).filter(Process.id == payload.process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    doc = db.query(Document).filter(Document.id == payload.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    changes = graph.diff_flow(process.flow_json, doc.content or "")
    return DiffResponse(changes=changes)


@router.post("/suggest-node", response_model=SuggestNodeResponse)
def suggest_node(payload: SuggestNodeRequest, db: Session = Depends(get_db)):
    graph = get_graph()
    return graph.suggest_node_sop(payload.node_title, payload.process_context or "")
