from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db, Version, Process
from models.schemas import VersionCreate, VersionResponse

router = APIRouter()


@router.post("/publish", response_model=VersionResponse)
def publish_version(payload: VersionCreate, db: Session = Depends(get_db)):
    process = db.query(Process).filter(Process.id == payload.process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")

    version = Version(
        process_id=payload.process_id,
        version_tag=payload.version_tag,
        flow_json=process.flow_json,
        author=payload.author,
        process_name=payload.process_name or process.name,
        sector=payload.sector,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/process/{process_id}", response_model=List[VersionResponse])
def list_versions(process_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Version)
        .filter(Version.process_id == process_id)
        .order_by(Version.published_at.desc())
        .all()
    )


@router.get("/{version_id}", response_model=VersionResponse)
def get_version(version_id: int, db: Session = Depends(get_db)):
    v = db.query(Version).filter(Version.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return v


@router.post("/{version_id}/restore")
def restore_version(version_id: int, db: Session = Depends(get_db)):
    """Restore a past version as the current flow of its process."""
    v = db.query(Version).filter(Version.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    process = db.query(Process).filter(Process.id == v.process_id).first()
    process.flow_json = v.flow_json
    db.commit()
    return {"message": f"Restored to {v.version_tag}"}
