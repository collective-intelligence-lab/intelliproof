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


class NodeModel(BaseModel):
    """
    Represents a node in the argument graph for credibility analysis.
    
    Attributes:
        id: Unique identifier for the node
        evidence: List of evidence scores (0.0 to 1.0) supporting this node
        evidence_min: Minimum evidence value for this node (optional)
        evidence_max: Maximum evidence value for this node (optional)
    """
    id: str
    evidence: Optional[List[float]] = None
    evidence_min: Optional[float] = None
    evidence_max: Optional[float] = None


class EdgeModel(BaseModel):
    """
    Represents a directed edge between nodes in the argument graph.
    
    Attributes:
        source: ID of the source node
        target: ID of the target node  
        weight: Influence weight of the edge (-1.0 to 1.0)
    """
    source: str
    target: str
    weight: float


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
    lambda_: float = Field(default=0.5, description="Weight parameter for evidence vs. neighbor influence")
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