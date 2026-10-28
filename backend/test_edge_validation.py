import pytest
from fastapi import HTTPException

import ai_api
from ai_models import EdgeModel, NodeModel, ValidateEdgeRequest


def make_request() -> ValidateEdgeRequest:
    return ValidateEdgeRequest(
        edge=EdgeModel(source="source", target="target"),
        source_node=NodeModel(id="source", text="Source claim"),
        target_node=NodeModel(id="target", text="Target claim"),
    )


def test_validate_edge_parses_reasoning_and_removes_model_diagnostic(monkeypatch):
    monkeypatch.setattr(
        ai_api,
        "run_llm",
        lambda messages, mcp: (
            "Evaluation: support\n"
            "Reasoning: The source gives direct support.\n"
            "It makes the target more likely.\n"
            "Implicit Assumptions: The claims refer to the same subject.\n"
            "Score: 0.75\n"
            "[Dynamic Model Used] Gpt-6-luna"
        ),
    )

    response = ai_api.validate_edge(make_request())

    assert response.evaluation == "support"
    assert response.confidence == 0.75
    assert response.reasoning == "The source gives direct support. It makes the target more likely."
    assert "Dynamic Model Used" not in response.reasoning


def test_validate_edge_rejects_incomplete_llm_response(monkeypatch):
    monkeypatch.setattr(
        ai_api,
        "run_llm",
        lambda messages, mcp: "[Dynamic Model Used] Gpt-6-luna",
    )

    with pytest.raises(HTTPException) as error:
        ai_api.validate_edge(make_request())

    assert error.value.status_code == 502