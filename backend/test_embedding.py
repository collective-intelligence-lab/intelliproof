import pytest

import embedding


class FakeEmbeddingModel:
    def __init__(self):
        self.calls = []

    def encode(self, texts, **kwargs):
        self.calls.append((texts, kwargs))
        return [[float(index)] * embedding.EMBEDDING_DIMENSION for index, _ in enumerate(texts)]


@pytest.fixture
def fake_model(monkeypatch):
    model = FakeEmbeddingModel()
    monkeypatch.setattr(embedding, "_embedding_model", model)
    return model


def test_embed_query_uses_query_retrieval_settings(fake_model):
    vector = embedding.embed_query("  What is evidence? ")

    assert len(vector) == embedding.EMBEDDING_DIMENSION
    assert fake_model.calls == [
        (
            ["What is evidence?"],
            {
                "task": "retrieval",
                "prompt_name": "query",
                "normalize_embeddings": True,
                "convert_to_numpy": True,
                "show_progress_bar": False,
            },
        )
    ]


def test_embed_documents_preserves_order(fake_model):
    vectors = embedding.embed_documents(["first", "second"])

    assert len(vectors) == 2
    assert vectors[0][0] == 0.0
    assert vectors[1][0] == 1.0
    assert fake_model.calls[0][1]["prompt_name"] == "document"


def test_empty_document_batch_does_not_load_model(monkeypatch):
    monkeypatch.setattr(embedding, "_embedding_model", None)

    assert embedding.embed_documents([]) == []
    assert embedding._embedding_model is None


@pytest.mark.parametrize("value", ["", "   ", None, 42])
def test_embed_query_rejects_invalid_text(value):
    with pytest.raises(ValueError):
        embedding.embed_query(value)


def test_embedding_dimension_is_validated(monkeypatch):
    class WrongDimensionModel:
        def encode(self, texts, **kwargs):
            return [[0.0] * 3 for _ in texts]

    monkeypatch.setattr(embedding, "_embedding_model", WrongDimensionModel())

    with pytest.raises(ValueError, match="768-dimensional"):
        embedding.embed_query("query")


def test_model_is_created_once(monkeypatch):
    models = []

    def factory():
        model = FakeEmbeddingModel()
        models.append(model)
        return model

    monkeypatch.setattr(embedding, "_embedding_model", None)
    assert embedding.get_embedding_model(factory) is embedding.get_embedding_model(factory)
    assert len(models) == 1