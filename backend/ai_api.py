"""
AI API Router for Intelliproof

This module handles AI-powered features including:
- Claim credibility propagation analysis
- Evidence evaluation against claims
- Text extraction from images
- Future AI features (placeholders)

Dependencies:
- OpenAI API for GPT-4 powered analysis
- FastAPI for REST endpoints
- Pydantic for data validation
"""

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import math
import openai
import os
from dotenv import load_dotenv
import time
from ai_models import (
    NodeModel,
    EdgeModel,
    CredibilityPropagationRequest,
    CredibilityPropagationResponse,
    EvidenceModel,
    SupportingDocumentModel,
    NodeWithEvidenceModel,
    CheckEvidenceRequest,
    EvidenceEvaluation,
    CheckEvidenceResponse
)
from llm_manager import run_llm, DEFAULT_MCP

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Create FastAPI router for AI endpoints
router = APIRouter()

# =============================================================================
# PYDANTIC MODELS - Data validation and serialization
# =============================================================================

# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/api/ai/get-claim-credibility", response_model=CredibilityPropagationResponse)
def get_claim_credibility(data: CredibilityPropagationRequest):
    """
    Compute credibility scores for claims using network propagation algorithm.
    
    Algorithm Overview:
    1. Calculate initial evidence scores (E_i) for each node
    2. Initialize credibility scores c_i^(0) = E_i  
    3. Iteratively update scores using: c_i^(t+1) = tanh(λ * E_i + Σ(w_ji * c_j^(t)))
    4. Continue until convergence or max iterations reached
    
    The tanh squashing function keeps scores in [-1, 1] range.
    Lambda parameter balances evidence vs. network influence.
    """
    print(f"DEBUG: Received request with {len(data.nodes)} nodes and {len(data.edges)} edges")
    
    # Step 1: Compute E_i (initial evidence score) for each node
    E = {}
    for node in data.nodes:
        evidence = node.evidence or []
        print(f"DEBUG: Node {node.id} has evidence: {evidence}")
        
        # Use per-node min/max if provided, else global, else default
        min_val = node.evidence_min if node.evidence_min is not None else data.evidence_min
        max_val = node.evidence_max if node.evidence_max is not None else data.evidence_max
        
        # Clamp evidence values to valid range
        clamped_evidence = [
            max(min(ev, max_val), min_val) for ev in evidence
        ]
        
        # Calculate average evidence score
        N_i = len(clamped_evidence)
        E[node.id] = sum(clamped_evidence) / N_i if N_i > 0 else 0.0
        print(f"DEBUG: Node {node.id} E_i = {E[node.id]} (from {N_i} evidence items)")

    # Step 2: Initialize credibility scores c_i^(0) = E_i
    c_prev = {node.id: E[node.id] for node in data.nodes}
    iterations = [c_prev.copy()]

    # Build incoming edges map for efficient lookup during iteration
    incoming_edges = {node.id: [] for node in data.nodes}
    for edge in data.edges:
        incoming_edges[edge.target].append(edge)

    # Step 3: Iterative credibility propagation
    print(f"DEBUG: Starting iterations with initial scores: {c_prev}")
    for iteration in range(data.max_iterations):
        c_new = {}
        
        for node in data.nodes:
            # Start with evidence contribution (weighted by lambda)
            Z = data.lambda_ * E[node.id]
            
            # Add contributions from incoming edges (neighbor influence)
            for edge in incoming_edges[node.id]:
                c_j = c_prev[edge.source]  # Current score of source node
                Z += edge.weight * c_j     # Weighted influence
            
            # Apply tanh squashing function to keep scores in [-1, 1]
            c_new[node.id] = math.tanh(Z)
        
        iterations.append(c_new.copy())
        print(f"DEBUG: Iteration {iteration + 1}: {c_new}")
        
        # Check for convergence (if changes are below epsilon threshold)
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
    """
    Convert textual evaluation to numerical confidence score.
    
    Mapping:
    - "yes": 1.0 (strong support)
    - "no": 0.0 (contradicts claim)  
    - "unsure": 0.5 (neutral/unclear)
    - "unrelated": 0.1 (not relevant)
    """
    mapping = {
        "yes": 1.0,
        "no": 0.0,
        "unsure": 0.5,
        "unrelated": 0.1,
    }
    return mapping.get(evaluation.lower(), 0.5)

@router.post("/api/ai/check-evidence", response_model=CheckEvidenceResponse)
def check_evidence(data: CheckEvidenceRequest = Body(...)):
    print("[ai_api] check_evidence: Function started.")
    results = []
    for node in data.nodes:
        for eid in node.evidenceIds or []:
            evidence = next((e for e in data.evidence if e.id == eid), None)
            if not evidence:
                continue
            doc = next((d for d in (data.supportingDocuments or []) if d.id == evidence.supportingDocId), None)
            doc_info = f"Name: {doc.name}\nType: {doc.type}\nURL: {doc.url}\n" if doc else ""
            prompt = f"""
Claim: {node.text}
Evidence: {evidence.excerpt}\nTitle: {evidence.title}\nSupporting Document: {doc_info}

Question: Does the above evidence support the claim?
Respond in this format:
Evaluation: <yes|no|unsure|unrelated>
Reasoning: <your explanation>
Confidence: <a number between 0 and 1 representing your confidence in the evidence's support for the claim>
"""
            try:
                content = run_llm(
                    [{"role": "user", "content": prompt}],
                    DEFAULT_MCP
                )
                eval_val = "unsure"
                reasoning = content
                confidence_val = 0.5
                for line in content.splitlines():
                    if line.lower().startswith("evaluation:"):
                        eval_val = line.split(":", 1)[1].strip().lower()
                    if line.lower().startswith("reasoning:"):
                        reasoning = line.split(":", 1)[1].strip()
                    if line.lower().startswith("confidence:"):
                        try:
                            confidence_val = float(line.split(":", 1)[1].strip())
                            confidence_val = min(max(confidence_val, 0.0), 1.0)
                        except Exception:
                            confidence_val = 0.5
                results.append(EvidenceEvaluation(
                    node_id=node.id,
                    evidence_id=evidence.id,
                    evaluation=eval_val,
                    reasoning=reasoning,
                    confidence=confidence_val
                ))
            except Exception as e:
                results.append(EvidenceEvaluation(
                    node_id=node.id,
                    evidence_id=evidence.id,
                    evaluation="unsure",
                    reasoning=f"Error: {str(e)}",
                    confidence=0.5
                ))
    print("[ai_api] check_evidence: Function finished.")
    return CheckEvidenceResponse(results=results)

# =============================================================================
# FUTURE AI ENDPOINTS - Placeholder implementations
# =============================================================================

@router.post("/api/ai/classify-claim-type")
def classify_claim_type():
    """
    TODO: Classify claims into types (factual, causal, normative, etc.)
    This will help apply appropriate evaluation criteria.
    """
    pass

@router.post("/api/ai/validate-edge")
def validate_edge():
    """
    TODO: Validate logical relationships between claims.
    Check if proposed edges represent valid logical connections.
    """
    pass

@router.post("/api/ai/generate-assumptions")
def generate_assumptions():
    """
    TODO: Generate implicit assumptions underlying arguments.
    Help identify hidden premises that need to be evaluated.
    """
    pass

@router.post("/api/ai/eval-assumption")
def eval_assumption():
    """
    TODO: Evaluate the validity of identified assumptions.
    Rate assumptions on dimensions like plausibility and necessity.
    """
    pass

@router.post("/api/ai/score-all-edges")
def score_all_edges():
    """
    TODO: Automatically score edge weights based on logical strength.
    Use AI to assess how strongly premises support conclusions.
    """
    pass

@router.post("/api/ai/critique-graph")
def critique_graph():
    """
    TODO: Provide overall critique of argument structure.
    Identify weaknesses, gaps, and improvement suggestions.
    """
    pass

@router.post("/api/ai/export-report")
def export_report():
    """
    TODO: Generate formatted reports of argument analysis.
    Export results in various formats (PDF, Word, etc.).
    """
    pass 

@router.post("/api/ai/extract-text-from-image")
async def extract_text_from_image(
    url: str = Body(..., embed=True),
    summarize: bool = Query(False)
):
    print(f"[ai_api] extract_text_from_image: Function started. url={url}, summarize={summarize}")
    if not OPENAI_API_KEY:
        print("[ai_api] extract_text_from_image: No OpenAI API key configured.")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    try:
        openai.api_key = OPENAI_API_KEY
        prompt = "Extract all readable text from this image. If no text is present, describe the image in detail in 3-6 sentences."
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert OCR and summarizer."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": url}}
                    ]
                }
            ],
            max_tokens=512
        )
        result = response.choices[0].message.content
        print(f"[ai_api] extract_text_from_image: Function finished.")
        return {"text": result}
    except Exception as e:
        print(f"[ai_api] extract_text_from_image: Error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 