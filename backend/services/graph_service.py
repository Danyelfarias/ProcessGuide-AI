"""
Graph Service — Text→Flow JSON  |  Flow Diff  |  Node SOP Suggestion
"""
from __future__ import annotations

import json
import os
import re
import uuid
from typing import List, Optional

from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

TEXT_TO_FLOW_PROMPT = """Você é um especialista em processos de negócio e arquitetura de sistemas.
Converta o texto do documento abaixo em um grafo React Flow representado como JSON.

Retorne APENAS JSON válido (sem blocos markdown, sem explicações) com esta estrutura exata:
{{
  "nodes": [
    {{
      "id": "1",
      "type": "custom",
      "position": {{"x": 250, "y": 0}},
      "data": {{
        "label": "Nome da Etapa",
        "step": "Etapa 01",
        "description": "Descrição breve desta etapa",
        "state": "production"
      }}
    }}
  ],
  "edges": [
    {{
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": ""
    }}
  ]
}}

Regras:
- Cada nó representa uma etapa distinta do processo.
- Posicione os nós verticalmente: x=250, y aumenta 180 por nó.
- Use labels curtos e orientados a ação (verbo + substantivo), em português.
- Inclua no máximo 3 a 10 nós; agrupe etapas menores.
- Mantenha as descrições com no máximo 120 caracteres, em português.
- O campo state deve ser sempre "production".
- Todos os textos (label, step, description) devem estar em português brasileiro.

Texto do documento:
{text}"""

DIFF_PROMPT = """You are an expert business process analyst.
Compare the existing process flow (JSON) with the new document text and identify discrepancies.

Return ONLY valid JSON (no markdown fences) with this structure:
{{
  "changes": [
    {{
      "id": "change-uuid",
      "action": "ADD",
      "node_id": null,
      "title": "New Step Name",
      "description": "Why this step is being added based on the new document",
      "new_data": {{
        "label": "New Step Name",
        "step": "Etapa X",
        "description": "Step description",
        "state": "simulation"
      }}
    }}
  ]
}}

action values: ADD | UPDATE | DELETE
- ADD: new step found in new doc not in current flow
- UPDATE: existing step with changed content/wording
- DELETE: step in current flow not found in new doc

Existing flow JSON:
{flow_json}

New document text:
{new_text}"""

SUGGEST_NODE_PROMPT = """You are a corporate process documentation expert.
Generate a Standard Operating Procedure (SOP) for the following process step.

Return ONLY valid JSON (no markdown fences):
{{
  "description": "One-sentence description of this step",
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "risks": ["Risk 1", "Risk 2"],
  "sop_text": "Full SOP paragraph (3-5 sentences) explaining how to execute this step correctly, who is responsible, and what constitutes completion."
}}

Process step: {node_title}
Process context: {process_context}"""


def _extract_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


class GraphService:
    def __init__(self):
        self._llm = None

    def _get_llm(self):
        if self._llm is None:
            api_key = os.getenv("GOOGLE_API_KEY") or GOOGLE_API_KEY
            if not api_key:
                raise RuntimeError(
                    "GOOGLE_API_KEY is not set. Add it to backend/.env or set it as an environment variable."
                )
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=api_key,
                temperature=0.1,
            )
        return self._llm

    def text_to_flow(self, text: str) -> dict:
        prompt = TEXT_TO_FLOW_PROMPT.format(text=text[:6000])
        llm = self._get_llm()
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, "content") else str(response)
        try:
            return _extract_json(raw)
        except json.JSONDecodeError:
            # Return minimal fallback so the frontend doesn't crash
            return {"nodes": [], "edges": []}

    def diff_flow(self, flow_json: str, new_text: str) -> list:
        prompt = DIFF_PROMPT.format(flow_json=flow_json[:3000], new_text=new_text[:4000])
        llm = self._get_llm()
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, "content") else str(response)
        try:
            data = _extract_json(raw)
            changes = data.get("changes", [])
            # Ensure each change has a unique id
            for c in changes:
                if not c.get("id"):
                    c["id"] = f"change-{uuid.uuid4().hex[:8]}"
            return changes
        except json.JSONDecodeError:
            return []

    def suggest_node_sop(self, node_title: str, process_context: str) -> dict:
        prompt = SUGGEST_NODE_PROMPT.format(
            node_title=node_title, process_context=process_context[:1000]
        )
        llm = self._get_llm()
        response = llm.invoke(prompt)
        raw = response.content if hasattr(response, "content") else str(response)
        try:
            return _extract_json(raw)
        except json.JSONDecodeError:
            return {
                "description": node_title,
                "responsibilities": [],
                "risks": [],
                "sop_text": "SOP could not be generated. Please try again.",
            }
