"""Document download, embedding, and Supabase persistence for local RAG."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any

import requests
from tqdm import tqdm

from document_ingestion import (
    CHUNK_TOKEN_OVERLAP,
    CHUNK_TOKEN_SIZE,
    DocumentChunk,
    chunk_text,
    extract_document_text,
)
from embedding import EMBEDDING_DIMENSION, MODEL_NAME, embed_documents, get_embedding_model


DEFAULT_DOWNLOAD_TIMEOUT_SECONDS = 20
DEFAULT_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
DEFAULT_EMBEDDING_BATCH_SIZE = 32
ProgressCallback = Callable[[int, str], None]


def _download_document(
    url: str,
    *,
    timeout: int = DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
    max_bytes: int = DEFAULT_MAX_DOCUMENT_BYTES,
    request_get: Callable[..., Any] = requests.get,
) -> tuple[bytes, str]:
    response = request_get(url, timeout=timeout, stream=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    data = bytearray()
    for part in response.iter_content(chunk_size=64 * 1024):
        if not part:
            continue
        data.extend(part)
        if len(data) > max_bytes:
            raise ValueError("Document exceeds the maximum indexing size")
    return bytes(data), content_type


def _get_model_tokenizer() -> Any:
    model = get_embedding_model()
    tokenizer = getattr(model, "tokenizer", None)
    if tokenizer is not None:
        return tokenizer

    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)


def _chunk_rows(
    chunks: Iterable[DocumentChunk],
    embeddings: list[list[float]],
    *,
    document_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    rows = []
    for chunk, embedding in zip(chunks, embeddings, strict=True):
        rows.append(
            {
                "document_id": document_id,
                "user_id": user_id,
                "chunk_index": chunk.index,
                "content": chunk.content,
                "metadata": chunk.metadata,
                "embedding": embedding,
            }
        )
    return rows


def ingest_document(
    *,
    document_id: str,
    user_id: str,
    document_url: str,
    document_name: str,
    document_type: str,
    supabase: Any,
    request_get: Callable[..., Any] = requests.get,
    embedder: Callable[[list[str]], list[list[float]]] = embed_documents,
    tokenizer: Any | None = None,
    batch_size: int = DEFAULT_EMBEDDING_BATCH_SIZE,
    chunk_size: int = CHUNK_TOKEN_SIZE,
    chunk_overlap: int = CHUNK_TOKEN_OVERLAP,
    progress_callback: ProgressCallback | None = None,
) -> int:
    """Extract, embed, and atomically persist one document's chunks."""
    if batch_size <= 0:
        raise ValueError("batch_size must be greater than zero")

    progress = tqdm(total=100, desc=f"[rag] {document_id}", unit="%")
    last_progress = 0

    def report(value: int, stage: str) -> None:
        nonlocal last_progress
        bounded_value = max(last_progress, min(value, 100))
        progress.update(bounded_value - last_progress)
        last_progress = bounded_value
        print(f"[rag] {stage} ({bounded_value}%) for document {document_id}")
        if progress_callback:
            progress_callback(bounded_value, stage)

    try:
        report(0, "Starting ingestion")
        print(f"[rag] Downloading document {document_id} from {document_url}")
        data, content_type = _download_document(document_url, request_get=request_get)
        print(f"[rag] Downloaded {len(data)} bytes for document {document_id}")
        report(5, "Downloaded document")
        extracted = extract_document_text(
            data,
            content_type=content_type or document_type,
            document_name=document_name,
        )
        print(f"[rag] Extracted {len(extracted.text)} characters from document {document_id}")
        report(10, "Extracted text")
        chunks = chunk_text(
            extracted.text,
            tokenizer or _get_model_tokenizer(),
            chunk_size=chunk_size,
            overlap=chunk_overlap,
            base_metadata={"document_name": document_name, **extracted.metadata},
        )
        if not chunks:
            raise ValueError("Document produced no searchable chunks")
        print(f"[rag] Created {len(chunks)} chunks for document {document_id}")
        report(15, f"Created {len(chunks)} chunks")

        embeddings: list[list[float]] = []
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        for start in range(0, len(chunks), batch_size):
            batch_number = start // batch_size + 1
            batch = chunks[start : start + batch_size]
            print(f"[rag] Embedding batch {batch_number}/{total_batches} ({len(batch)} chunks) for document {document_id}")
            embeddings.extend(embedder([chunk.content for chunk in batch]))
            report(15 + int(70 * batch_number / total_batches), f"Embedded batch {batch_number}/{total_batches}")
        if len(embeddings) != len(chunks):
            raise ValueError("Embedding count does not match chunk count")
        embedding_dimension = len(embeddings[0]) if embeddings else 0
        print(f"[rag] Embedding dimension is {embedding_dimension} for document {document_id}")
        if any(len(embedding) != EMBEDDING_DIMENSION for embedding in embeddings):
            raise ValueError(
                f"Expected {EMBEDDING_DIMENSION}-dimensional embeddings before persistence"
            )

        rows = _chunk_rows(chunks, embeddings, document_id=document_id, user_id=user_id)
        report(90, "Persisting chunks")
        result = supabase.rpc(
            "ingest_document_chunks",
            {
                "p_document_id": document_id,
                "p_user_id": user_id,
                "p_chunks": rows,
            },
        ).execute()
        if getattr(result, "error", None):
            raise RuntimeError(f"Failed to persist document chunks: {result.error}")
        print(f"[rag] Persisted {len(rows)} chunks for document {document_id}")
        report(100, f"Persisted {len(rows)} chunks")
        return len(rows)
    finally:
        progress.close()