"""
AI Models for Intelliproof

This module contains all Pydantic models used by the AI API endpoints.
These models handle data validation and serialization for:
- Credibility propagation analysis
- Evidence evaluation
- Graph structure representation

Dependencies:
- Pydantic for data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class EvidenceModel(BaseModel):
    """
    Represents a piece of evidence supporting or refuting a claim.
    """
    id: str
    title: str
    supportingDocId: str
    supportingDocName: str
    excerpt: str
    confidence: float


class NodeModel(BaseModel):
    """
    Represents a node in the argument graph for credibility analysis.
    
    Attributes:
        id: Unique identifier for the node
        text: The claim or statement of the node
        type: The type of claim (factual, value, policy, etc.)
        evidence: List of evidence scores (floats) or objects supporting this node (optional)
        evidence_min: Optional per-node minimum evidence value
        evidence_max: Optional per-node maximum evidence value
    """
    id: str
    text: Optional[str] = None
    type: Optional[str] = None
    evidence: Optional[List[float]] = None  # Accept list of floats for this endpoint
    evidence_min: Optional[float] = None
    evidence_max: Optional[float] = None


class EdgeModel(BaseModel):
    """
    Represents a directed edge between nodes in the argument graph.
    
    Attributes:
        source: ID of the source node
        target: ID of the target node
        weight: Weight of the edge (influence strength)
    """
    source: str
    target: str
    weight: Optional[float] = None  # Made optional for AI endpoints


class CredibilityPropagationRequest(BaseModel):
    """
    Request model for credibility propagation algorithm.
    
    This implements a network-based credibility scoring system where:
    - Nodes represent claims/arguments
    - Edges represent logical relationships
    - Evidence scores influence initial credibility
    - Iterative propagation spreads credibility through the network
    """
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    lambda_: float = Field(default=0.5, alias="lambda", description="Weight parameter for evidence vs. neighbor influence")
    max_iterations: int = Field(default=100, description="Maximum number of iterations")
    epsilon: float = Field(default=1e-6, description="Convergence threshold")
    evidence_min: Optional[float] = Field(default=0.0, description="Global minimum evidence value")
    evidence_max: Optional[float] = Field(default=1.0, description="Global maximum evidence value")


class CredibilityPropagationResponse(BaseModel):
    """
    Response model containing results of credibility propagation.
    
    Attributes:
        initial_evidence: Initial evidence scores for each node
        iterations: Score progression through each iteration
        final_scores: Final credibility scores after convergence
    """
    initial_evidence: Dict[str, float]
    iterations: List[Dict[str, float]]
    final_scores: Dict[str, float]


class SupportingDocumentModel(BaseModel):
    """
    Represents a document containing evidence.
    """
    id: str
    name: str
    type: str
    url: str
    size: Optional[float] = None
    uploadDate: Optional[str] = None
    uploader: Optional[str] = None
    metadata: Optional[dict] = None


class NodeWithEvidenceModel(BaseModel):
    """
    Node model that includes associated evidence IDs.
    """
    id: str
    text: str
    type: str
    evidenceIds: Optional[List[str]] = []


class CheckEvidenceRequest(BaseModel):
    """
    Request model for AI-powered evidence evaluation.
    """
    nodes: List[NodeWithEvidenceModel]
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []


class EvidenceEvaluation(BaseModel):
    """
    AI evaluation result for how well evidence supports a claim.
    """
    node_id: str
    evidence_id: str
    evaluation: str  # yes, no, unsure, unrelated
    reasoning: str
    confidence: float


class CheckEvidenceResponse(BaseModel):
    """
    Response containing AI evaluations of evidence-claim relationships.
    """
    results: List[EvidenceEvaluation] 


class ValidateEdgeRequest(BaseModel):
    """
    Request model for validating an edge between two nodes.
    Includes the edge, and the full contents of the source and target nodes.
    """
    edge: EdgeModel
    source_node: NodeModel
    target_node: NodeModel

class ValidateEdgeResponse(BaseModel):
    """
    Response model for edge validation.
    evaluation: 'attack' or 'support'
    reasoning: 3-5 sentence explanation
    confidence: float in [-1, 1] (negative = attack, positive = support)
    """
    evaluation: str
    reasoning: str
    confidence: float


class ClassifyClaimTypeRequest(BaseModel):
    """
    Request model for claim type classification.
    """
    node_id: str
    node_text: str
    evidence: Optional[List[EvidenceModel]] = []
    claim_type_descriptions: Dict[str, str] = Field(
        default={
            "factual": "Verifiable by observation or empirical data.",
            "value": "Expresses judgments, ethics, or aesthetics; cannot be verified empirically.",
            "policy": "Proposes actions or changes; includes normative statements like 'should' or 'must'."
        },
        description="Descriptions of each claim type for AI classification"
    )


class ClassifyClaimTypeResponse(BaseModel):
    """
    Response model for claim type classification.
    """
    node_id: str
    node_text: str
    evaluation: str  # factual, value, policy, or unknown
    reasoning: str
    confidence: float 