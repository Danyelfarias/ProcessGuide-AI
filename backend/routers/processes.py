from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from database.db import get_db, Process, Workspace, Document, Version
from models.schemas import (
    ProcessCreate, ProcessUpdate, ProcessResponse,
    WorkspaceCreate, WorkspaceResponse
)

router = APIRouter()


# ── Workspaces ─────────────────────────────────────────────
@router.post("/workspaces", response_model=WorkspaceResponse)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)):
    ws = Workspace(name=payload.name, icon=payload.icon)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


@router.get("/workspaces", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).all()


# ── Processes ──────────────────────────────────────────────
@router.post("/", response_model=ProcessResponse)
def create_process(payload: ProcessCreate, db: Session = Depends(get_db)):
    p = Process(name=payload.name, sector=payload.sector, workspace_id=payload.workspace_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/", response_model=List[ProcessResponse])
def list_processes(workspace_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Process)
    if workspace_id:
        q = q.filter(Process.workspace_id == workspace_id)
    return q.order_by(Process.updated_at.desc()).all()


@router.get("/{process_id}", response_model=ProcessResponse)
def get_process(process_id: int, db: Session = Depends(get_db)):
    p = db.query(Process).filter(Process.id == process_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Process not found")
    return p


@router.put("/{process_id}", response_model=ProcessResponse)
def update_process(process_id: int, payload: ProcessUpdate, db: Session = Depends(get_db)):
    p = db.query(Process).filter(Process.id == process_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Process not found")
    if payload.name is not None:
        p.name = payload.name
    if payload.sector is not None:
        p.sector = payload.sector
    if payload.flow_json is not None:
        p.flow_json = payload.flow_json
    if payload.source_doc is not None:
        p.source_doc = payload.source_doc
    if payload.updated_by is not None:
        p.updated_by = payload.updated_by
    p.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{process_id}")
def delete_process(process_id: int, db: Session = Depends(get_db)):
    p = db.query(Process).filter(Process.id == process_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Process not found")
    # Cascade: remove all documents and versions for this process
    db.query(Document).filter(Document.process_id == process_id).delete()
    db.query(Version).filter(Version.process_id == process_id).delete()
    db.delete(p)
    db.commit()
    return {"message": "deleted"}
