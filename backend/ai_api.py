from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# --- Models ---
class EvidenceAggregationRequest(BaseModel):
    evidence: Optional[List[float]] = None  # List of evidence scores in [-1, 1]

class EvidenceAggregationResponse(BaseModel):
    E_i: float
    N_i: int

# --- Endpoints ---
@router.post("/api/ai/get-claim-credibility", response_model=EvidenceAggregationResponse)
def get_claim_credibility(data: EvidenceAggregationRequest):
    evidence = data.evidence or []
    N_i = len(evidence)
    if N_i > 0:
        E_i = sum(evidence) / N_i
    else:
        E_i = 0.0
    return EvidenceAggregationResponse(E_i=E_i, N_i=N_i)

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