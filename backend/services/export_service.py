"""
Export Service — generates a .docx from the current flow JSON.
Pure Python implementation using only stdlib (zipfile + xml).
No dependency on lxml, python-docx, or any DLL.
"""
from __future__ import annotations

import json
import os
import tempfile
import zipfile
from textwrap import dedent
from typing import Any
from xml.sax.saxutils import escape as xml_escape


# ── OOXML namespace helpers ────────────────────────────────────────────────────
NS = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14"'


def _para(text: str, style: str = "Normal", bold: bool = False, size_pt: int | None = None) -> str:
    """Return a single <w:p> paragraph XML string."""
    t = xml_escape(str(text))
    rpr = "<w:rPr>"
    if bold:
        rpr += "<w:b/><w:bCs/>"
    if size_pt:
        sz = size_pt * 2  # half-points
        rpr += f"<w:sz w:val=\"{sz}\"/><w:szCs w:val=\"{sz}\"/>"
    rpr += "</w:rPr>"
    return (
        f'<w:p>'
        f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>'
        f'<w:r>{rpr}<w:t xml:space="preserve">{t}</w:t></w:r>'
        f'</w:p>'
    )


def _heading(text: str, level: int = 1) -> str:
    style = f"Heading{level}"
    return _para(text, style=style, bold=(level <= 2))


def _empty_para() -> str:
    return '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>'


def _build_document_xml(paragraphs: list[str]) -> str:
    body = "\n".join(paragraphs)
    return dedent(f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document {NS}>
          <w:body>
            {body}
            <w:sectPr>
              <w:pgSz w:w="12240" w:h="15840"/>
              <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"
                       w:header="720" w:footer="720" w:gutter="0"/>
            </w:sectPr>
          </w:body>
        </w:document>
    """)


_CONTENT_TYPES = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml"
    ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>
"""

_RELS = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"
    Target="docProps/core.xml"/>
</Relationships>
"""

_WORD_RELS = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>
"""

_STYLES = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/>
      <w:color w:val="2E3A8C"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/>
      <w:color w:val="4F46E5"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="caption"/>
    <w:rPr><w:i/><w:iCs/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr>
  </w:style>
</w:styles>
"""


def _core_xml(title: str) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    t = xml_escape(title)
    return dedent(f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <cp:coreProperties
          xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:dcterms="http://purl.org/dc/terms/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <dc:title>{t}</dc:title>
          <dc:creator>ProcessGuide AI</dc:creator>
          <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
          <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
        </cp:coreProperties>
    """)


# ── Public API ─────────────────────────────────────────────────────────────────
def export_process_docx(process_name: str, flow_json: str) -> str:
    """
    Build a .docx from the process flow graph.
    Returns the path to the generated temp file.
    Uses only Python stdlib — no lxml / python-docx DLLs required.
    """
    try:
        flow: dict[str, Any] = json.loads(flow_json)
    except json.JSONDecodeError:
        flow = {"nodes": [], "edges": []}

    nodes: list[dict] = flow.get("nodes", [])
    edges: list[dict] = flow.get("edges", [])

    # Build edge map: source_id → target_id
    edge_map: dict[str, str] = {e.get("source", ""): e.get("target", "") for e in edges}

    # ── Build paragraph list ───────────────────────────────────────────────────
    paras: list[str] = []

    # Title
    paras.append(_heading(process_name, level=1))
    paras.append(_para(
        "Documento gerado automaticamente pelo ProcessGuide AI a partir do diagrama de processo atual.",
        size_pt=9
    ))
    paras.append(_empty_para())

    # Summary line
    paras.append(_para(
        f"Total de etapas: {len(nodes)}  |  Total de transições: {len(edges)}",
        bold=True, size_pt=9
    ))
    paras.append(_empty_para())

    # Steps
    paras.append(_heading("Etapas do Processo", level=1))

    for idx, node in enumerate(nodes, start=1):
        data = node.get("data", {})
        label       = data.get("label", f"Etapa {idx}")
        step        = data.get("step",  f"Etapa {idx:02d}")
        description = data.get("description", "")
        bpmn        = data.get("bpmnType", "task")

        bpmn_labels = {"start": "Início", "end": "Fim", "gateway": "Decisão", "task": "Tarefa"}
        bpmn_label  = bpmn_labels.get(bpmn, "Tarefa")

        paras.append(_heading(f"{step} — {label}", level=2))
        paras.append(_para(f"Tipo BPMN: {bpmn_label}", size_pt=9))

        if description:
            paras.append(_para(description))

        # Next step
        next_id   = edge_map.get(node.get("id", ""))
        next_node = next((n for n in nodes if n.get("id") == next_id), None)
        if next_node:
            next_label = next_node.get("data", {}).get("label", "Próxima etapa")
            paras.append(_para(f"▶ Avança para: {next_label}", size_pt=9))

        paras.append(_empty_para())

    # Metadata table as plain paragraphs
    paras.append(_heading("Informações do Documento", level=1))
    paras.append(_para(f"Gerado por: ProcessGuide AI"))
    paras.append(_para(f"Processo: {xml_escape(process_name)}"))
    paras.append(_para(f"Total de etapas: {len(nodes)}"))
    paras.append(_para(f"Total de transições: {len(edges)}"))

    # ── Assemble .docx ZIP ─────────────────────────────────────────────────────
    doc_xml = _build_document_xml(paras)

    tmp = tempfile.NamedTemporaryFile(
        delete=False, suffix=".docx", prefix="processguide_"
    )
    tmp.close()

    with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml",          _CONTENT_TYPES)
        zf.writestr("_rels/.rels",                  _RELS)
        zf.writestr("word/document.xml",            doc_xml)
        zf.writestr("word/_rels/document.xml.rels", _WORD_RELS)
        zf.writestr("word/styles.xml",              _STYLES)
        zf.writestr("docProps/core.xml",            _core_xml(process_name))

    return tmp.name
