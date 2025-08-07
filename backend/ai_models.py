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


class GenerateAssumptionsRequest(BaseModel):
    """
    Request model for generating implicit assumptions required by an edge relationship.
    
    This endpoint analyzes the relationship between two nodes connected by an edge
    and identifies the implicit assumptions that must be true for the relationship to be valid.
    """
    edge: EdgeModel
    source_node: NodeWithEvidenceModel
    target_node: NodeWithEvidenceModel
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []


class Assumption(BaseModel):
    """
    Represents a single implicit assumption required by an edge relationship.
    """
    assumption_text: str
    reasoning: str
    importance: float  # 0.0 to 1.0, indicating how critical this assumption is
    confidence: float  # 0.0 to 1.0, indicating AI confidence in this assumption


class GenerateAssumptionsResponse(BaseModel):
    """
    Response model containing generated assumptions for an edge relationship.
    """
    edge_id: str
    source_node_id: str
    target_node_id: str
    source_node_text: str  # Text content of source node
    target_node_text: str  # Text content of target node
    edge_type: str  # "support", "attack", or "neutral"
    relationship_type: str  # "support", "attack", or "neutral"
    assumptions: List[Assumption]
    summary: str  # Brief explanation of what assumptions are needed and why
    overall_confidence: float  # 0.0 to 1.0, indicating AI confidence in the overall analysis


class NodeCredibilityRequest(BaseModel):
    """
    Request model for selective node credibility calculation.
    
    This endpoint calculates credibility for a specific node and all nodes
    that depend on it (nodes that would be affected by changes to this node).
    """
    target_node_id: str
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    lambda_: float = Field(default=0.5, alias="lambda", description="Weight parameter for evidence vs. neighbor influence")
    max_iterations: int = Field(default=100, description="Maximum number of iterations")
    epsilon: float = Field(default=1e-6, description="Convergence threshold")
    evidence_min: Optional[float] = Field(default=0.0, description="Global minimum evidence value")
    evidence_max: Optional[float] = Field(default=1.0, description="Global maximum evidence value")


class NodeCredibilityResponse(BaseModel):
    """
    Response model for selective node credibility calculation.
    
    Contains credibility scores only for the affected nodes (target node and its dependents).
    """
    target_node_id: str
    affected_nodes: List[str]  # List of node IDs that were affected
    initial_evidence: Dict[str, float]  # Initial evidence scores for affected nodes
    iterations: List[Dict[str, float]]  # Score progression for affected nodes
    final_scores: Dict[str, float]  # Final credibility scores for affected nodes


class CritiqueGraphRequest(BaseModel):
    """
    Request model for graph critique analysis.
    
    This endpoint analyzes the entire graph structure and content to identify
    argument flaws and match patterns from the argument patterns bank.
    """
    nodes: List[NodeWithEvidenceModel]
    edges: List[EdgeModel]
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []


class ArgumentFlaw(BaseModel):
    """
    Represents a specific argument flaw identified in the graph.
    """
    flaw_type: str
    description: str
    affected_nodes: List[str]  # Node IDs involved in this flaw
    affected_edges: List[str]  # Edge IDs involved in this flaw
    severity: str  # "low", "medium", "high", "critical"
    reasoning: str


class PatternMatch(BaseModel):
    """
    Represents a pattern match from the argument patterns bank.
    """
    pattern_name: str
    category: str
    description: str
    graph_pattern: str  # The pattern description from YAML
    graph_implication: str  # The implication description from YAML
    matched_nodes: List[str]  # Node IDs that match this pattern
    matched_node_texts: List[str]  # The actual text/claims of matched nodes
    matched_edges: List[str]  # Edge IDs that match this pattern
    matched_edge_details: List[str]  # Details about matched edges (source->target)
    pattern_details: str  # Specific details about how the pattern was matched
    severity: str  # "low", "medium", "high", "critical" based on pattern type


class CritiqueGraphResponse(BaseModel):
    """
    Response model for graph critique analysis.
    """
    argument_flaws: List[ArgumentFlaw]
    pattern_matches: List[PatternMatch]
    overall_assessment: str  # General assessment of the graph's argument quality
    recommendations: List[str]  # Suggestions for improving the argument 


class GenerateComprehensiveReportRequest(BaseModel):
    """
    Request model for generating a comprehensive argument analysis report.
    
    This endpoint combines multiple AI analyses into a single comprehensive report:
    - Evidence evaluation results
    - Edge validation results  
    - Assumptions analysis
    - Graph critique results
    - Graph structure and content
    """
    nodes: List[NodeWithEvidenceModel]
    edges: List[EdgeModel]
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []
    evidence_evaluation_results: Optional[dict] = None
    edge_validation_results: Optional[dict] = None
    assumptions_results: Optional[dict] = None
    critique_results: Optional[dict] = None
    graph_title: Optional[str] = None
    analyst_name: Optional[str] = None
    analyst_contact: Optional[str] = None

class GenerateComprehensiveReportResponse(BaseModel):
    """
    Response model for comprehensive report generation.
    
    Contains the complete report content structured for PDF generation.
    """
    cover_page: str
    executive_summary: str
    scope_objectives: str
    methodology: str
    findings: str
    analysis: str
    conclusion: str
    appendix: str
    report_metadata: dict 


class ChatMessage(BaseModel):
    """
    Represents a single message in the chat conversation.
    """
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """
    Request model for AI chat about the graph.
    """
    user_message: str
    chat_history: List[ChatMessage] = []
    graph_data: Dict[str, Any] = Field(
        description="Complete graph data including nodes, edges, evidence, and documents"
    )


class ChatResponse(BaseModel):
    """
    Response model for AI chat.
    """
    assistant_message: str
    reasoning: Optional[str] = None
    confidence: Optional[float] = None
    suggested_actions: Optional[List[str]] = None