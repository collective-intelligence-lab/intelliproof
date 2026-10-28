import pytest

from document_ingestion import chunk_text, extract_document_text
from rag_ingestion import ingest_document


class CharacterTokenizer:
    def encode(self, text, *, add_special_tokens=False):
        return list(text)

    def decode(self, tokens, *, skip_special_tokens=True):
        return "".join(tokens)


class Response:
    headers = {"content-type": "text/plain"}

    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        pass

    def iter_content(self, chunk_size):
        yield self.content


class RpcResult:
    error = None


class FakeSupabase:
    def __init__(self):
        self.calls = []

    def rpc(self, name, payload):
        self.calls.append((name, payload))
        return self

    def execute(self):
        return RpcResult()


def test_chunk_text_respects_limit_and_overlap():
    chunks = chunk_text(
        "abcdefghij",
        CharacterTokenizer(),
        chunk_size=4,
        overlap=1,
    )

    assert [chunk.content for chunk in chunks] == ["abcd", "defg", "ghij"]
    assert [chunk.token_count for chunk in chunks] == [4, 4, 4]
    assert [chunk.metadata["chunk_index"] for chunk in chunks] == [0, 1, 2]


def test_chunk_text_rejects_invalid_configuration():
    with pytest.raises(ValueError):
        chunk_text("text", CharacterTokenizer(), chunk_size=0)
    with pytest.raises(ValueError):
        chunk_text("text", CharacterTokenizer(), chunk_size=4, overlap=4)


def test_extract_plain_text():
    extracted = extract_document_text(
        b"first line\nsecond line",
        content_type="text/plain; charset=utf-8",
        document_name="notes.txt",
    )

    assert extracted.text == "first line\nsecond line"
    assert extracted.metadata["format"] == "txt"


def test_extract_rejects_unsupported_content():
    with pytest.raises(ValueError, match="Unsupported document type"):
        extract_document_text(b"binary", content_type="image/png", document_name="image.png")


def test_ingest_document_batches_embeddings_and_calls_rpc():
    supabase = FakeSupabase()
    response = Response(b"abcdefghij")
    embedded_batches = []

    def embedder(texts):
        embedded_batches.append(texts)
        return [[float(index)] * 768 for index, _ in enumerate(texts)]

    count = ingest_document(
        document_id="doc-1",
        user_id="user-1",
        document_url="https://example.test/doc.txt",
        document_name="doc.txt",
        document_type="text/plain",
        supabase=supabase,
        request_get=lambda *args, **kwargs: response,
        embedder=embedder,
        tokenizer=CharacterTokenizer(),
        batch_size=2,
        chunk_size=4,
        chunk_overlap=1,
    )

    assert count == 3
    assert len(embedded_batches) == 2
    rpc_name, payload = supabase.calls[0]
    assert rpc_name == "ingest_document_chunks"
    assert payload["p_document_id"] == "doc-1"
    assert payload["p_user_id"] == "user-1"
    assert len(payload["p_chunks"]) == 3


def test_ingest_document_rejects_wrong_embedding_dimension():
    with pytest.raises(ValueError, match="Expected 768-dimensional embeddings"):
        ingest_document(
            document_id="doc-1",
            user_id="user-1",
            document_url="https://example.test/doc.txt",
            document_name="doc.txt",
            document_type="text/plain",
            supabase=FakeSupabase(),
            request_get=lambda *args, **kwargs: Response(b"text"),
            embedder=lambda texts: [[0.0] * 1536 for _ in texts],
            tokenizer=CharacterTokenizer(),
        )
