"""Document extraction and token-aware chunking for RAG ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


CHUNK_TOKEN_SIZE = 1024
CHUNK_TOKEN_OVERLAP = 128


class Tokenizer(Protocol):
    def encode(self, text: str, *, add_special_tokens: bool = False) -> list[int]: ...

    def decode(self, tokens: list[int], *, skip_special_tokens: bool = True) -> str: ...


@dataclass(frozen=True)
class ExtractedDocument:
    text: str
    metadata: dict[str, Any]


@dataclass(frozen=True)
class DocumentChunk:
    index: int
    content: str
    token_count: int
    metadata: dict[str, Any]


def chunk_text(
    text: str,
    tokenizer: Tokenizer,
    *,
    chunk_size: int = CHUNK_TOKEN_SIZE,
    overlap: int = CHUNK_TOKEN_OVERLAP,
    base_metadata: dict[str, Any] | None = None,
) -> list[DocumentChunk]:
    """Split text into ordered, overlapping chunks measured in model tokens."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be between zero and chunk_size - 1")

    normalized_text = " ".join(text.split())
    if not normalized_text:
        return []

    tokens = tokenizer.encode(normalized_text, add_special_tokens=False)
    if not tokens:
        return []

    step = chunk_size - overlap
    chunks: list[DocumentChunk] = []
    for index, start in enumerate(range(0, len(tokens), step)):
        chunk_tokens = tokens[start : start + chunk_size]
        content = tokenizer.decode(chunk_tokens, skip_special_tokens=True).strip()
        if content:
            metadata = dict(base_metadata or {})
            metadata.update({"chunk_index": index, "token_count": len(chunk_tokens)})
            chunks.append(
                DocumentChunk(
                    index=index,
                    content=content,
                    token_count=len(chunk_tokens),
                    metadata=metadata,
                )
            )
        if start + chunk_size >= len(tokens):
            break
    return chunks


def extract_document_text(
    document_data: bytes,
    *,
    content_type: str = "",
    document_name: str = "",
) -> ExtractedDocument:
    """Extract text from supported PDF and plain-text document formats."""
    normalized_type = content_type.lower().split(";", 1)[0].strip()
    suffix = document_name.lower().rsplit(".", 1)[-1] if "." in document_name else ""

    if normalized_type == "application/pdf" or suffix == "pdf":
        import fitz

        pdf = fitz.open(stream=document_data, filetype="pdf")
        try:
            pages = [page.get_text().strip() for page in pdf]
        finally:
            pdf.close()
        text = "\n\n".join(page for page in pages if page)
        metadata = {"page_count": len(pages), "format": "pdf"}
    elif normalized_type.startswith("text/") or suffix in {"txt", "md", "csv"}:
        text = document_data.decode("utf-8", errors="replace")
        metadata = {"format": suffix or normalized_type}
    else:
        raise ValueError("Unsupported document type; only PDF and plain-text files are indexed")

    if not text.strip():
        raise ValueError("Document contains no extractable text")
    return ExtractedDocument(text=text, metadata=metadata)