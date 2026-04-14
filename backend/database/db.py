from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./processguide.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), default="🏢")
    created_at = Column(DateTime, default=utcnow)


class Process(Base):
    __tablename__ = "processes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sector = Column(String(100), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    flow_json = Column(Text, default='{"nodes":[],"edges":[]}')
    source_doc = Column(String(200), nullable=True)
    updated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow)


class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=False)
    version_tag = Column(String(20), nullable=False)
    flow_json = Column(Text, nullable=False)
    author = Column(String(100), default="User")
    process_name = Column(String(200), nullable=True)
    sector = Column(String(100), nullable=True)
    published_at = Column(DateTime, default=utcnow)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    filename = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
