from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import math

router = APIRouter()

# --- Models ---
class NodeModel(BaseModel):
    id: str
    evidence: Optional[List[float]] = None
    evidence_min: Optional[float] = None
    evidence_max: Optional[float] = None

class EdgeModel(BaseModel):
    source: str
    target: str
    weight: float

class CredibilityPropagationRequest(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    lambda_: Optional[float] = Field(0.7, alias="lambda")
    epsilon: Optional[float] = 0.01
    max_iterations: Optional[int] = 20
    evidence_min: Optional[float] = -1.0
    evidence_max: Optional[float] = 1.0

class CredibilityPropagationResponse(BaseModel):
    initial_evidence: Dict[str, float]
    iterations: List[Dict[str, float]]
    final_scores: Dict[str, float]

# --- Endpoints ---
@router.post("/api/ai/get-claim-credibility", response_model=CredibilityPropagationResponse)
def get_claim_credibility(data: CredibilityPropagationRequest):
    print(f"DEBUG: Received request with {len(data.nodes)} nodes and {len(data.edges)} edges")
    
    # Step 1: Compute E_i for each node, using per-node or global evidence_min and evidence_max
    E = {}
    for node in data.nodes:
        evidence = node.evidence or []
        print(f"DEBUG: Node {node.id} has evidence: {evidence}")
        
        # Use per-node min/max if provided, else global, else default
        min_val = node.evidence_min if node.evidence_min is not None else data.evidence_min
        max_val = node.evidence_max if node.evidence_max is not None else data.evidence_max
        clamped_evidence = [
            max(min(ev, max_val), min_val) for ev in evidence
        ]
        N_i = len(clamped_evidence)
        E[node.id] = sum(clamped_evidence) / N_i if N_i > 0 else 0.0
        print(f"DEBUG: Node {node.id} E_i = {E[node.id]} (from {N_i} evidence items)")

    # Step 2: Initialize c_i^(0) = E_i
    c_prev = {node.id: E[node.id] for node in data.nodes}
    iterations = [c_prev.copy()]

    # Build incoming edges map for each node
    incoming_edges = {node.id: [] for node in data.nodes}
    for edge in data.edges:
        incoming_edges[edge.target].append(edge)

    # Step 3: Iterative update
    print(f"DEBUG: Starting iterations with initial scores: {c_prev}")
    for iteration in range(data.max_iterations):
        c_new = {}
        for node in data.nodes:
            Z = data.lambda_ * E[node.id]
            for edge in incoming_edges[node.id]:
                # edge.source influences node.id
                c_j = c_prev[edge.source]
                Z += edge.weight * c_j
            # Squash function: tanh
            c_new[node.id] = math.tanh(Z)
        iterations.append(c_new.copy())
        print(f"DEBUG: Iteration {iteration + 1}: {c_new}")
        # Check for convergence
        if max(abs(c_new[nid] - c_prev[nid]) for nid in c_new) < data.epsilon:
            print(f"DEBUG: Converged after {iteration + 1} iterations")
            break
        c_prev = c_new

    final_scores = iterations[-1]
    return CredibilityPropagationResponse(
        initial_evidence=E,
        iterations=iterations,
        final_scores=final_scores
    )

# --- Placeholders for other endpoints ---
@router.post("/api/ai/check-evidence")
def check_evidence():
    pass

@router.post("/api/ai/classify-claim-type")
def classify_claim_type():
    pass

@router.post("/api/ai/validate-edge")
def validate_edge():
    pass

@router.post("/api/ai/generate-assumptions")
def generate_assumptions():
    pass

@router.post("/api/ai/eval-assumption")
def eval_assumption():
    pass

@router.post("/api/ai/score-all-edges")
def score_all_edges():
    pass

@router.post("/api/ai/critique-graph")
def critique_graph():
    pass

@router.post("/api/ai/export-report")
def export_report():
    pass 