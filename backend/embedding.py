"""Text embedding helpers for the document retrieval pipeline."""

from __future__ import annotations

import os
from collections.abc import Sequence
from typing import Any, Callable


MODEL_NAME = "jinaai/jina-embeddings-v5-text-nano"
EMBEDDING_DIMENSION = 768
DEVICE_MODE = "cuda" if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu"
EMBEDDING_DEVICE = os.getenv("EMBEDDING_DEVICE", DEVICE_MODE)

_embedding_model: Any | None = None


def _create_embedding_model() -> Any:
	"""Create the model only when the first embedding is requested."""
	try:
		from sentence_transformers import SentenceTransformer
	except ImportError as error:
		raise RuntimeError(
			"Embedding support requires sentence-transformers. "
			"Install backend/requirements.txt before requesting embeddings."
		) from error

	return SentenceTransformer(
		MODEL_NAME,
		device=EMBEDDING_DEVICE,
		trust_remote_code=True,
	)


def get_embedding_model(
	model_factory: Callable[[], Any] | None = None,
) -> Any:
	"""Return the cached embedding model, creating it on first use."""
	global _embedding_model

	if _embedding_model is None:
		_embedding_model = (model_factory or _create_embedding_model)()
	return _embedding_model


def _validate_text(text: str, *, field_name: str = "text") -> str:
	if not isinstance(text, str):
		raise ValueError(f"{field_name} must be a string")

	normalized_text = text.strip()
	if not normalized_text:
		raise ValueError(f"{field_name} must not be blank")
	return normalized_text


def _validate_texts(texts: Sequence[str]) -> list[str]:
	if isinstance(texts, (str, bytes)):
		raise ValueError("texts must be a sequence of strings, not a single string")

	return [
		_validate_text(text, field_name=f"texts[{index}]")
		for index, text in enumerate(texts)
	]


def _as_float_vectors(values: Any) -> list[list[float]]:
	if hasattr(values, "detach"):
		values = values.detach().cpu()
	if hasattr(values, "tolist"):
		values = values.tolist()

	vectors = [[float(value) for value in vector] for vector in values]
	if any(len(vector) != EMBEDDING_DIMENSION for vector in vectors):
		raise ValueError(
			f"Expected {EMBEDDING_DIMENSION}-dimensional embeddings, "
			"but the model returned an incompatible dimension"
		)
	return vectors


def _encode(texts: Sequence[str], *, prompt_name: str) -> list[list[float]]:
	model = get_embedding_model()
	encoded = model.encode(
		list(texts),
		task="retrieval",
		prompt_name=prompt_name,
		normalize_embeddings=True,
		convert_to_numpy=True,
		show_progress_bar=False,
	)
	return _as_float_vectors(encoded)


def embed_query(text: str) -> list[float]:
	"""Embed one user query for cosine-similarity retrieval."""
	return _encode([_validate_text(text)], prompt_name="query")[0]


def embed_document(text: str) -> list[float]:
	"""Embed one document chunk for cosine-similarity retrieval."""
	return _encode([_validate_text(text)], prompt_name="document")[0]


def embed_documents(texts: Sequence[str]) -> list[list[float]]:
	"""Embed document chunks in input order for later persistence."""
	validated_texts = _validate_texts(texts)
	if not validated_texts:
		return []
	return _encode(validated_texts, prompt_name="document")
