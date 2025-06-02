# IntelliProof API Contract Spec
# Format: FastAPI-style REST interface (extendable to WebSockets if needed)

from typing import List, Optional, Dict
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# =======================
# Data Models
# =======================

class Evidence(BaseModel):
    id: str
    title: str
    content: str
    source: str
    type: str  # e.g., "video", "memo", "news"
    confidence: str  # Low, Medium, High
    linked_claims: Optional[List[str]] = []
    date: Optional[str]
    preview: Optional[str]

class Claim(BaseModel):
    id: str
    text: str
    claim_type: str  # Factual, Value, Policy
    evidence: List[Evidence]

class Edge(BaseModel):
    from_id: str
    to_id: str
    type: str  # supports, attacks

class ArgumentGraph(BaseModel):
    nodes: List[Claim]
    edges: List[Edge]

# =======================
# Core Endpoints
# =======================

@app.post("/query_evidence")
def query_evidence(question: str) -> List[Evidence]:
    """
    Return a list of relevant evidence objects for a user query.
    """
    pass

@app.post("/classify_claim")
def classify_claim(text: str) -> str:
    """
    Auto-classify a claim into Factual, Value, or Policy.
    """
    pass

@app.post("/validate_edge")
def validate_edge(from_type: str, to_type: str) -> Optional[str]:
    """
    Return warning if edge violates claim-type compatibility.
    """
    pass

@app.post("/analyze_node")
def analyze_node_strength(node: Claim, evidence: List[Evidence]) -> str:
    """
    Return a strength/confidence score and rationale for a node.
    """
    pass

@app.post("/detect_assumptions")
def detect_assumptions(claim: str, context: List[str]) -> List[str]:
    """
    Detect missing assumptions or warrants underlying a claim.
    """
    pass

@app.post("/critique_graph")
def critique_graph(graph: ArgumentGraph) -> List[str]:
    """
    Return structural or logical critiques of an argument graph.
    """
    pass

@app.post("/detect_fallacies")
def detect_fallacies(graph: ArgumentGraph) -> List[Dict]:
    """
    Identify fallacy patterns present in the graph.
    """
    pass

@app.post("/compare_to_ground_truth")
def compare_to_ground_truth(user_graph: ArgumentGraph) -> Dict:
    """
    Compare user graph to expert model and return coverage/match report.
    """
    pass

@app.post("/summarize_argument")
def summarize_argument(graph: ArgumentGraph) -> str:
    """
    Generate a natural-language summary of the graph's main theory.
    """
    pass

@app.post("/compare_graphs")
def compare_graphs(graph1: ArgumentGraph, graph2: ArgumentGraph) -> Dict:
    """
    Return areas of agreement, divergence, and unshared insights.
    """
    pass

@app.post("/recommend_cross_user_evidence")
def recommend_cross_user_evidence(
    graph1: ArgumentGraph,
    graph2: ArgumentGraph,
    evidence_pool: List[Evidence]
) -> List[Evidence]:
    """
    Suggest useful evidence seen by one user and not the other.
    """
    pass

