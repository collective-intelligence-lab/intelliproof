from ai_api import (
    PENDING_EVIDENCE_SCORE,
    _normalized_evidence_score,
    get_claim_credibility,
    get_node_credibility,
)
from ai_models import (
    CredibilityPropagationRequest,
    EdgeModel,
    NodeCredibilityRequest,
    NodeModel,
)


def make_node(node_id: str, evidence=None) -> NodeModel:
    return NodeModel(id=node_id, evidence=evidence)


def test_missing_and_zero_evidence_use_pending_score():
    assert _normalized_evidence_score(make_node("missing"), -1.0, 1.0) == PENDING_EVIDENCE_SCORE
    assert _normalized_evidence_score(make_node("zero", [0.0]), -1.0, 1.0) == PENDING_EVIDENCE_SCORE


def test_nonzero_evidence_is_preserved_and_clamped():
    node = make_node("mixed", [0.8, -0.4])

    assert _normalized_evidence_score(node, -1.0, 1.0) == 0.2
    assert _normalized_evidence_score(node, 0.0, 0.5) == 0.25


def test_full_credibility_returns_nonzero_score_without_evidence():
    request = CredibilityPropagationRequest(
        nodes=[make_node("claim")],
        edges=[],
        lambda_=0.7,
        evidence_min=-1.0,
        evidence_max=1.0,
    )

    response = get_claim_credibility(request)

    assert response.initial_evidence["claim"] == PENDING_EVIDENCE_SCORE
    assert response.final_scores["claim"] == PENDING_EVIDENCE_SCORE


def test_full_credibility_propagates_pending_score_through_nonzero_edge():
    request = CredibilityPropagationRequest(
        nodes=[make_node("source"), make_node("target")],
        edges=[EdgeModel(source="source", target="target", weight=0.5)],
        lambda_=0.7,
        evidence_min=-1.0,
        evidence_max=1.0,
    )

    response = get_claim_credibility(request)

    assert response.initial_evidence["source"] == PENDING_EVIDENCE_SCORE
    assert response.initial_evidence["target"] == PENDING_EVIDENCE_SCORE
    assert response.final_scores["source"] > 0
    assert response.final_scores["target"] == PENDING_EVIDENCE_SCORE


def test_selective_credibility_keeps_zero_edge_weight_neutral():
    request = NodeCredibilityRequest(
        target_node_id="target",
        nodes=[make_node("source", [0.4]), make_node("target", [0.9])],
        edges=[EdgeModel(source="source", target="target", weight=0.0)],
        lambda_=0.7,
        evidence_min=-1.0,
        evidence_max=1.0,
    )

    response = get_node_credibility(request)

    assert response.initial_evidence["target"] == 0.9
    assert response.final_scores["target"] == 0.9