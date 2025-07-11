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

from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import math
import openai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Create FastAPI router for AI endpoints
router = APIRouter()

# =============================================================================
# PYDANTIC MODELS - Data validation and serialization
# =============================================================================

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
    """
    Use GPT-4 to evaluate how well pieces of evidence support claims.
    
    For each claim-evidence pair:
    1. Format a structured prompt with claim text and evidence
    2. Send to GPT-4 for analysis
    3. Parse response for evaluation, reasoning, and confidence
    4. Return structured results for frontend processing
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    openai.api_key = OPENAI_API_KEY
    results = []
    
    # Process each node and its associated evidence
    for node in data.nodes:
        for eid in node.evidenceIds or []:
            # Find the evidence object by ID
            evidence = next((e for e in data.evidence if e.id == eid), None)
            if not evidence:
                continue
            
            # Find supporting document info
            doc = next((d for d in (data.supportingDocuments or []) if d.id == evidence.supportingDocId), None)
            doc_info = f"Name: {doc.name}\nType: {doc.type}\nURL: {doc.url}\n" if doc else ""
            
            # Construct prompt for GPT-4 analysis
            prompt = f"""
Claim: {node.text}
Evidence: {evidence.excerpt}\nTitle: {evidence.title}\nSupporting Document: {doc_info}

Question: Does the above evidence support the claim?\nRespond in this format:\nEvaluation: <yes|no|unsure|unrelated>\nReasoning: <your explanation>\nConfidence: <a number between 0 and 1 representing your confidence in the evidence's support for the claim>
"""
            
            try:
                # Call OpenAI GPT-4 for evidence evaluation
                response = openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert fact-checker and argument analyst."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=256
                )
                
                # Parse GPT-4 response
                content = response.choices[0].message.content.strip()
                eval_val = "unsure"
                reasoning = content
                confidence_val = 0.5
                
                # Extract structured information from response
                for line in content.splitlines():
                    if line.lower().startswith("evaluation:"):
                        eval_val = line.split(":", 1)[1].strip().lower()
                    if line.lower().startswith("reasoning:"):
                        reasoning = line.split(":", 1)[1].strip()
                    if line.lower().startswith("confidence:"):
                        try:
                            confidence_val = float(line.split(":", 1)[1].strip())
                            confidence_val = min(max(confidence_val, 0.0), 1.0)  # Clamp to [0,1]
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
                # Handle API errors gracefully
                results.append(EvidenceEvaluation(
                    node_id=node.id,
                    evidence_id=evidence.id,
                    evaluation="unsure",
                    reasoning=f"Error: {str(e)}",
                    confidence=0.5
                ))
    
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
    file: UploadFile = File(...),
    summarize: bool = False
):
    """
    Extract text from uploaded images using GPT-4 Vision API.
    
    This endpoint allows users to upload images containing text (documents,
    screenshots, handwritten notes, etc.) and get the text content extracted.
    
    Args:
        file: Uploaded image file
        summarize: If True, summarize content instead of raw OCR
        
    Returns:
        Dictionary with extracted/summarized text
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    try:
        # Read image file as bytes
        image_bytes = await file.read()
        
        # Configure OpenAI client
        openai.api_key = OPENAI_API_KEY
        
        # Choose prompt based on operation mode
        prompt = "Extract all readable text from this image." if not summarize else "Summarize the content of this image."
        
        # Call GPT-4 Vision API
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