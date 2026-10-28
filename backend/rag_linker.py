"""Graph-scoped vector retrieval and validated RAG evidence selection."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Callable

from ai_models import LinkerEvidenceItem, LinkerNodeLinks, LinkerResponse
from embedding import embed_documents
from llm_manager import MODEL_LUNA, ModelControlProtocol, run_llm


RAG_MATCH_THRESHOLD = 0.65
RAG_MATCH_COUNT = 4


@dataclass(frozen=True)
class RAGCandidate:
    id: str
    document_id: str
    content: str
    document_name: str
    similarity: float


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(value) for value in vector) + "]"


def _retrieve_candidates(
    supabase: Any,
    *,
    embedding: list[float],
    user_id: str,
    graph_id: str,
) -> list[RAGCandidate]:
    result = supabase.rpc(
        "match_graph_document_chunks",
        {
            "query_embedding": _vector_literal(embedding),
            "match_threshold": RAG_MATCH_THRESHOLD,
            "match_count": RAG_MATCH_COUNT,
            "p_user_id": user_id,
            "p_graph_id": graph_id,
        },
    ).execute()
    if getattr(result, "error", None):
        raise RuntimeError(f"RAG retrieval failed: {result.error}")

    candidates = []
    for row in result.data or []:
        metadata = row.get("metadata") or {}
        candidates.append(
            RAGCandidate(
                id=str(row["id"]),
                document_id=str(row["document_id"]),
                content=str(row["content"]),
                document_name=str(metadata.get("document_name") or "Supporting document"),
                similarity=float(row["similarity"]),
            )
        )
    return candidates


def _extract_json(raw_response: str) -> dict[str, Any]:
    cleaned = re.sub(r"\s*\[Dynamic Model Used\].*$", "", raw_response, flags=re.IGNORECASE | re.DOTALL).strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("RAG selector returned invalid JSON")
        parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("RAG selector returned an invalid object")
    return parsed


def _select_candidates(
    nodes: list[dict[str, Any]],
    candidates_by_node: dict[str, list[RAGCandidate]],
    *,
    selector: Callable[[str], str],
) -> dict[str, list[str]]:
    candidate_payload = {
        node_id: [
            {
                "id": candidate.id,
                "document_name": candidate.document_name,
                "similarity": round(candidate.similarity, 4),
                "content": candidate.content,
            }
            for candidate in candidates
        ]
        for node_id, candidates in candidates_by_node.items()
        if candidates
    }
    if not candidate_payload:
        return {}

    node_payload = [
        {"id": str(node["id"]), "text": str(node.get("text") or "")}
        for node in nodes
        if str(node["id"]) in candidate_payload
    ]
    prompt = f"""
You select supporting passages for argument claims.

CLAIMS:
{json.dumps(node_payload, ensure_ascii=False)}

CANDIDATE PASSAGES:
{json.dumps(candidate_payload, ensure_ascii=False)}

For each claim, select zero or more candidate IDs that directly support, challenge, or contextualize it.
Only select IDs listed for that claim. Do not write excerpts or invent IDs.
Return only JSON in this exact shape:
{{"selections": [{{"node_id": "claim-id", "candidate_ids": ["chunk-id"]}}]}}
"""
    parsed = _extract_json(selector(prompt))
    selections = parsed.get("selections", [])
    if not isinstance(selections, list):
        raise ValueError("RAG selector returned invalid selections")

    valid_by_node = {
        node_id: {candidate.id for candidate in candidates}
        for node_id, candidates in candidates_by_node.items()
    }
    selected_by_node: dict[str, list[str]] = {}
    for selection in selections:
        if not isinstance(selection, dict):
            continue
        node_id = str(selection.get("node_id", ""))
        candidate_ids = selection.get("candidate_ids", [])
        if node_id not in valid_by_node or not isinstance(candidate_ids, list):
            continue
        selected_by_node[node_id] = [
            str(candidate_id)
            for candidate_id in candidate_ids
            if str(candidate_id) in valid_by_node[node_id]
        ]
    return selected_by_node


def run_rag_linker(
    *,
    graph_id: str,
    user_id: str,
    nodes: list[dict[str, Any]],
    supabase: Any,
    selector: Callable[[str], str] | None = None,
) -> LinkerResponse:
    """Retrieve graph-local candidates and return exact, validated evidence links."""
    usable_nodes = [node for node in nodes if str(node.get("text") or "").strip()]
    if not usable_nodes:
        return LinkerResponse(links=[], summary="No claims with text were available for RAG search.")

    embeddings = embed_documents([str(node["text"]) for node in usable_nodes])
    candidates_by_node: dict[str, list[RAGCandidate]] = {}
    for node, embedding in zip(usable_nodes, embeddings, strict=True):
        node_id = str(node["id"])
        candidates_by_node[node_id] = _retrieve_candidates(
            supabase,
            embedding=embedding,
            user_id=user_id,
            graph_id=graph_id,
        )

    selector = selector or (
        lambda prompt: run_llm(
            [{"role": "user", "content": prompt}],
            ModelControlProtocol(
                model_name=MODEL_LUNA,
                temperature=0.0,
                max_completion_tokens=2048,
                dynamic_model_selection=False,
            ),
        )
    )
    try:
        selected_by_node = _select_candidates(usable_nodes, candidates_by_node, selector=selector)
    except Exception as error:
        print(f"[rag-linker] Candidate selection failed: {error}")
        selected_by_node = {}

    links: list[LinkerNodeLinks] = []
    unmatched_node_ids: list[str] = []
    for node in usable_nodes:
        node_id = str(node["id"])
        candidates = candidates_by_node.get(node_id, [])
        candidates_by_id = {candidate.id: candidate for candidate in candidates}
        selected_ids = selected_by_node.get(node_id, [])
        if not selected_ids:
            unmatched_node_ids.append(node_id)
        evidence_items = [
            LinkerEvidenceItem(
                id=f"rag_{node_id}_{candidate_id}",
                supportingDocId=candidates_by_id[candidate_id].document_id,
                supportingDocName=candidates_by_id[candidate_id].document_name,
                title="Relevant passage",
                excerpt=candidates_by_id[candidate_id].content,
                confidence=max(0.0, min(1.0, candidates_by_id[candidate_id].similarity)),
            )
            for candidate_id in selected_ids
        ]
        links.append(LinkerNodeLinks(node_id=node_id, evidence_items=evidence_items))

    matched_count = sum(bool(node_link.evidence_items) for node_link in links)
    summary = f"RAG search found evidence for {matched_count} of {len(usable_nodes)} claims."
    if unmatched_node_ids:
        summary += f" No qualifying passage was selected for {len(unmatched_node_ids)} claim(s)."
    return LinkerResponse(links=links, unmatched_node_ids=unmatched_node_ids, summary=summary)