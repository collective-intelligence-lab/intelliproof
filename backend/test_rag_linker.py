from types import SimpleNamespace

import rag_linker


class FakeSupabase:
    def __init__(self):
        self.calls = []

    def rpc(self, name, payload):
        self.calls.append((name, payload))
        self.result = SimpleNamespace(
            data=[
                {
                    "id": "chunk-1",
                    "document_id": "doc-1",
                    "content": "Exact supporting passage.",
                    "metadata": {"document_name": "Paper.pdf"},
                    "similarity": 0.91,
                },
                {
                    "id": "chunk-2",
                    "document_id": "doc-1",
                    "content": "Another exact passage.",
                    "metadata": {"document_name": "Paper.pdf"},
                    "similarity": 0.78,
                },
            ]
        )
        return self

    def execute(self):
        return self.result


def test_run_rag_linker_retrieves_graph_scoped_candidates(monkeypatch):
    supabase = FakeSupabase()
    monkeypatch.setattr(rag_linker, "embed_documents", lambda texts: [[0.1] * 768 for _ in texts])

    result = rag_linker.run_rag_linker(
        graph_id="graph-1",
        user_id="user-1",
        nodes=[{"id": "node-1", "text": "The claim text", "type": "factual"}],
        supabase=supabase,
        selector=lambda prompt: '{"selections":[{"node_id":"node-1","candidate_ids":["chunk-1","chunk-2"]}]}',
    )

    assert result.unmatched_node_ids == []
    assert [item.excerpt for item in result.links[0].evidence_items] == [
        "Exact supporting passage.",
        "Another exact passage.",
    ]
    name, payload = supabase.calls[0]
    assert name == "match_graph_document_chunks"
    assert payload["p_user_id"] == "user-1"
    assert payload["p_graph_id"] == "graph-1"
    assert payload["match_threshold"] == 0.65
    assert payload["match_count"] == 4


def test_run_rag_linker_rejects_unreturned_candidate_ids(monkeypatch):
    monkeypatch.setattr(rag_linker, "embed_documents", lambda texts: [[0.1] * 768 for _ in texts])

    result = rag_linker.run_rag_linker(
        graph_id="graph-1",
        user_id="user-1",
        nodes=[{"id": "node-1", "text": "The claim text"}],
        supabase=FakeSupabase(),
        selector=lambda prompt: '{"selections":[{"node_id":"node-1","candidate_ids":["not-a-real-chunk"]}]}',
    )

    assert result.links[0].evidence_items == []
    assert result.unmatched_node_ids == ["node-1"]