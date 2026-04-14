from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from sqlalchemy import text, inspect as sa_inspect

load_dotenv()

from database.db import engine, Base
from routers import processes, versions, documents, ai_router


def _run_migrations():
    """Add new columns to existing tables without breaking old installations."""
    with engine.connect() as conn:
        insp = sa_inspect(conn)
        # versions table: sector + process_name
        try:
            existing = {c["name"] for c in insp.get_columns("versions")}
            if "sector" not in existing:
                conn.execute(text("ALTER TABLE versions ADD COLUMN sector VARCHAR(100)"))
            if "process_name" not in existing:
                conn.execute(text("ALTER TABLE versions ADD COLUMN process_name VARCHAR(200)"))
            conn.commit()
        except Exception:
            pass
        try:
            existing_p = {c["name"] for c in insp.get_columns("processes")}
            if "sector" not in existing_p:
                conn.execute(text("ALTER TABLE processes ADD COLUMN sector VARCHAR(100)"))
            if "updated_by" not in existing_p:
                conn.execute(text("ALTER TABLE processes ADD COLUMN updated_by VARCHAR(100)"))
            conn.commit()
        except Exception:
            pass


def _seed_workspaces():
    """Create default workspaces if none exist."""
    from database.db import SessionLocal, Workspace
    db = SessionLocal()
    try:
        if db.query(Workspace).count() == 0:
            db.add_all([
                Workspace(name="Logística Operacional", icon="🚚"),
                Workspace(name="Recursos Humanos", icon="👥"),
                Workspace(name="Financeiro", icon="💰"),
                Workspace(name="TI / Tecnologia", icon="💻"),
            ])
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    _seed_workspaces()
    yield


app = FastAPI(
    title="ProcessGuide AI",
    description="RAG-based Business Process Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(processes.router, prefix="/api/processes", tags=["Processes"])
app.include_router(versions.router, prefix="/api/versions", tags=["Versions"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI"])


@app.get("/")
def root():
    return {"status": "ProcessGuide AI is running", "docs": "/docs"}
