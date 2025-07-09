from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import math
import openai
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

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
    lambda_: float = Field(default=0.5, description="Weight parameter for evidence vs. neighbor influence")
    max_iterations: int = Field(default=100, description="Maximum number of iterations")
    epsilon: float = Field(default=1e-6, description="Convergence threshold")
    evidence_min: Optional[float] = Field(default=0.0, description="Global minimum evidence value")
    evidence_max: Optional[float] = Field(default=1.0, description="Global maximum evidence value")

class CredibilityPropagationResponse(BaseModel):
    initial_evidence: Dict[str, float]
    iterations: List[Dict[str, float]]
    final_scores: Dict[str, float]

class EvidenceModel(BaseModel):
    id: str
    title: str
    supportingDocId: str
    supportingDocName: str
    excerpt: str
    confidence: float

class SupportingDocumentModel(BaseModel):
    id: str
    name: str
    type: str
    url: str
    size: Optional[float] = None
    uploadDate: Optional[str] = None
    uploader: Optional[str] = None
    metadata: Optional[dict] = None

class NodeWithEvidenceModel(BaseModel):
    id: str
    text: str
    type: str
    evidenceIds: Optional[List[str]] = []

class CheckEvidenceRequest(BaseModel):
    nodes: List[NodeWithEvidenceModel]
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []

class EvidenceEvaluation(BaseModel):
    node_id: str
    evidence_id: str
    evaluation: str  # yes, no, unsure, unrelated
    reasoning: str
    confidence: float

class CheckEvidenceResponse(BaseModel):
    results: List[EvidenceEvaluation]


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

def map_evaluation_to_confidence(evaluation: str) -> float:
    mapping = {
        "yes": 1.0,
        "no": 0.0,
        "unsure": 0.5,
        "unrelated": 0.1,
    }
    return mapping.get(evaluation.lower(), 0.5)

@router.post("/api/ai/check-evidence", response_model=CheckEvidenceResponse)
def check_evidence(data: CheckEvidenceRequest = Body(...)):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    openai.api_key = OPENAI_API_KEY
    results = []
    for node in data.nodes:
        for eid in node.evidenceIds or []:
            evidence = next((e for e in data.evidence if e.id == eid), None)
            if not evidence:
                continue
            doc = next((d for d in (data.supportingDocuments or []) if d.id == evidence.supportingDocId), None)
            prompt = f"""
Claim: {node.text}
Evidence: {evidence.excerpt}\nTitle: {evidence.title}\nSupporting Document: {doc.name if doc else ''}\n
Question: Does the above evidence support the claim?\nRespond with one of: yes, no, unsure, or unrelated.\nThen explain your reasoning in 1-2 sentences.\nFormat:\nEvaluation: <yes|no|unsure|unrelated>\nReasoning: <your explanation>
"""
            try:
                response = openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert fact-checker and argument analyst."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=256
                )
                content = response.choices[0].message.content.strip()
                eval_val = "unsure"
                reasoning = content
                for line in content.splitlines():
                    if line.lower().startswith("evaluation:"):
                        eval_val = line.split(":", 1)[1].strip().lower()
                    if line.lower().startswith("reasoning:"):
                        reasoning = line.split(":", 1)[1].strip()
                confidence = map_evaluation_to_confidence(eval_val)
                results.append(EvidenceEvaluation(
                    node_id=node.id,
                    evidence_id=evidence.id,
                    evaluation=eval_val,
                    reasoning=reasoning,
                    confidence=confidence
                ))
            except Exception as e:
                results.append(EvidenceEvaluation(
                    node_id=node.id,
                    evidence_id=evidence.id,
                    evaluation="unsure",
                    reasoning=f"Error: {str(e)}",
                    confidence=0.5
                ))
    return CheckEvidenceResponse(results=results)

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

@router.post("/api/ai/extract-text-from-image")
async def extract_text_from_image(
    file: UploadFile = File(...),
    summarize: bool = False
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    try:
        # Read image bytes
        image_bytes = await file.read()
        # Use OpenAI Vision API (GPT-4-vision-preview)
        openai.api_key = OPENAI_API_KEY
        prompt = "Extract all readable text from this image." if not summarize else "Summarize the content of this image."
        response = openai.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {"role": "system", "content": "You are an expert OCR and summarizer."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"data": image_bytes}}
                    ]
                }
            ],
            max_tokens=512
        )
        result = response.choices[0].message.content
        return {"text": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 