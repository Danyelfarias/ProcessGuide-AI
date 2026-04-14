"""
RAG Service — ChromaDB + LangChain + Gemini 1.5 Flash
"""
from __future__ import annotations

import os
import json
from typing import List, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

SYSTEM_PROMPT = """You are ProcessGuide AI, an intelligent assistant for Business Process Management.
You help users understand, analyse, and improve corporate processes based on official manuals.
Always be concise, professional, and reference source documents when available.
Answer in the same language the user writes in."""

CHAT_PROMPT = """{system}

--- Relevant context from the company manuals ---
{context}

--- Current process flow (JSON summary) ---
{flow_summary}

--- User question ---
{question}

Provide a clear, structured answer. If the context references a specific procedure, quote it briefly."""


class RagService:
    def __init__(self):
        self._llm = None
        self._embeddings = None

    def _get_llm(self):
        if self._llm is None:
            api_key = os.getenv("GOOGLE_API_KEY") or GOOGLE_API_KEY
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.3,
            )
        return self._llm

    def _get_embeddings(self):
        if self._embeddings is None:
            api_key = os.getenv("GOOGLE_API_KEY") or GOOGLE_API_KEY
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            self._embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key,
            )
        return self._embeddings

    def _chunk_texts(self, texts: List[str]) -> List[str]:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)
        chunks = []
        for t in texts:
            chunks.extend(splitter.split_text(t))
        return chunks

    def _retrieve_context(self, query: str, doc_texts: List[str]) -> Tuple[str, List[str]]:
        if not doc_texts:
            return "", []

        chunks = self._chunk_texts(doc_texts)
        if not chunks:
            return "", []

        try:
            from langchain_chroma import Chroma
            from langchain_core.documents import Document as LCDoc

            lc_docs = [LCDoc(page_content=c) for c in chunks]
            vectorstore = Chroma.from_documents(
                lc_docs,
                embedding=self._get_embeddings(),
                persist_directory=CHROMA_PERSIST_DIR,
            )
            results = vectorstore.similarity_search(query, k=4)
            context = "\n\n".join(r.page_content for r in results)
            sources = list({r.metadata.get("source", "manual") for r in results})
            return context, sources
        except Exception:
            # Fallback: use first 3000 chars
            context = "\n\n".join(chunks[:5])[:3000]
            return context, ["manual"]

    def query(
        self,
        question: str,
        doc_texts: List[str],
        context_hint: str = "",
        flow_json: Optional[str] = None,
    ) -> Tuple[str, List[str]]:
        context, sources = self._retrieve_context(question, doc_texts)

        if context_hint:
            context = f"[Transition context: {context_hint}]\n\n{context}"

        flow_summary = "No flow data available."
        if flow_json:
            try:
                flow = json.loads(flow_json)
                node_labels = [n.get("data", {}).get("label", "") for n in flow.get("nodes", [])]
                flow_summary = " → ".join(n for n in node_labels if n)
            except Exception:
                pass

        prompt = CHAT_PROMPT.format(
            system=SYSTEM_PROMPT,
            context=context or "No document context available.",
            flow_summary=flow_summary,
            question=question,
        )

        llm = self._get_llm()
        response = llm.invoke(prompt)
        answer = response.content if hasattr(response, "content") else str(response)
        return answer, sources
