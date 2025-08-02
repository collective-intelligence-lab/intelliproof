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
import requests
import fitz  # PyMuPDF
import io
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
    CheckEvidenceResponse,
    ValidateEdgeRequest,  # NEW
    ValidateEdgeResponse,  # NEW
    ClassifyClaimTypeRequest,  # NEW
    ClassifyClaimTypeResponse  # NEW
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
        # Explicitly initialize to 0.0
        E[node.id] = 0.0
        print(f"DEBUG: Initially set Node {node.id} E_i = 0.0")

        evidence = node.evidence or []
        print(f"DEBUG: Node {node.id} has evidence: {evidence}")

        # Only update E if there is actual evidence
        if evidence:
            min_val = node.evidence_min if node.evidence_min is not None else data.evidence_min
            max_val = node.evidence_max if node.evidence_max is not None else data.evidence_max
            
            clamped_evidence = [
                max(min(ev, max_val), min_val) for ev in evidence
            ]
            
            N_i = len(clamped_evidence)
            if N_i > 0:
                E[node.id] = sum(clamped_evidence) / N_i
                print(f"DEBUG: Updated Node {node.id} E_i to {E[node.id]} (from {N_i} evidence items)")

    # Verify final evidence scores
    print("DEBUG: Final evidence scores:")
    for node_id, score in E.items():
        print(f"DEBUG: Node {node_id}: {score}")

    # Step 2: Initialize credibility scores c_i^(0) = E_i
    c_prev = {node.id: E[node.id] for node in data.nodes}
    iterations = [c_prev.copy()]

    # For single node with no edges, return immediately
    if len(data.nodes) == 1 and len(data.edges) == 0:
        print("DEBUG: Single node with no edges, returning initial score")
        return CredibilityPropagationResponse(
            initial_evidence=E,
            iterations=iterations,
            final_scores=c_prev
        )

    # Build incoming edges map for efficient lookup during iteration
    incoming_edges = {node.id: [] for node in data.nodes}
    for edge in data.edges:
        # Reverse source and target to match graph visualization
        incoming_edges[edge.source].append(edge)
        print(f"DEBUG: Added edge to {edge.source} from {edge.target} with weight {edge.weight}")

    # First identify all source nodes (nodes that only have outgoing edges)
    source_nodes = set()
    for node in data.nodes:
        if not incoming_edges[node.id]:
            source_nodes.add(node.id)
            print(f"DEBUG: Identified {node.id} as a source node")

    # Step 3: Iterative credibility propagation
    print(f"DEBUG: Starting iterations with initial scores: {c_prev}")
    for iteration in range(data.max_iterations):
        # Start by copying previous scores
        c_new = c_prev.copy()
        
        # Only update target nodes
        for node_id in incoming_edges:
            if node_id not in source_nodes and incoming_edges[node_id]:
                # Calculate new score for target node
                Z = data.lambda_ * E[node_id]
                print(f"DEBUG: Node {node_id} initial Z = {Z} (lambda={data.lambda_} * evidence={E[node_id]})")
                
                # Add contributions from incoming edges
                for edge in incoming_edges[node_id]:
                    edge_contribution = edge.weight * c_prev[edge.target]
                    Z += edge_contribution
                    print(f"DEBUG: Edge from {edge.target} contributes {edge_contribution} (weight={edge.weight} * source_score={c_prev[edge.target]})")
                
                c_new[node_id] = math.tanh(Z)
                print(f"DEBUG: Target node {node_id} final Z={Z}, new score={c_new[node_id]}")
        
        iterations.append(c_new.copy())
        print(f"DEBUG: Iteration {iteration + 1} scores: {c_new}")
        
        # Check for convergence
        if max(abs(c_new[nid] - c_prev[nid]) for nid in c_new) < data.epsilon:
            print(f"DEBUG: Converged after {iteration + 1} iterations")
            break
            
        c_prev = c_new

    final_scores = iterations[-1]
    print("DEBUG: Final scores:")
    for node_id, score in final_scores.items():
        print(f"DEBUG: Node {node_id}: {score}")

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

@router.post("/api/ai/classify-claim-type", response_model=ClassifyClaimTypeResponse)
def classify_claim_type(data: ClassifyClaimTypeRequest = Body(...)):
    """
    Classify claims into types (factual, value, policy) based on their content.
    This helps apply appropriate evaluation criteria for different types of claims.
    
    Triggered when a new node is created and the user has finished typing the claim text.
    """
    print(f"[ai_api] classify_claim_type: Function started for node {data.node_id}")
    print(f"[ai_api] classify_claim_type: Node text: '{data.node_text}'")
    print(f"[ai_api] classify_claim_type: Number of evidence items: {len(data.evidence)}")
    
    # Log evidence details if present
    if data.evidence:
        print(f"[ai_api] classify_claim_type: Evidence details:")
        for i, ev in enumerate(data.evidence):
            print(f"[ai_api] classify_claim_type: Evidence {i+1}: ID={ev.id}, Title='{ev.title}', Excerpt='{ev.excerpt[:100]}...'")
    
    # Format evidence information if present
    evidence_info = ""
    if data.evidence:
        evidence_info = "\nEvidence:\n" + "\n".join([
            f"- Title: {ev.title}\n  Excerpt: {ev.excerpt}" for ev in data.evidence
        ])
        print(f"[ai_api] classify_claim_type: Formatted evidence info length: {len(evidence_info)} characters")
    
    # Build the prompt with claim type descriptions
    type_descriptions = "\n".join([
        f"- {claim_type.upper()}: {description}" 
        for claim_type, description in data.claim_type_descriptions.items()
    ])
    print(f"[ai_api] classify_claim_type: Using claim type descriptions: {list(data.claim_type_descriptions.keys())}")
    
    prompt = f"""
You are an expert in argument analysis and claim classification. Given a claim statement, classify it into one of the following types:

{type_descriptions}

Claim to classify:
Node ID: {data.node_id}
Text: {data.node_text}{evidence_info}

Instructions:
1. Analyze the claim text carefully
2. Consider any provided evidence that might help determine the claim type
3. Choose the most appropriate classification from: factual, value, policy, or unknown
4. Provide clear reasoning for your classification
5. Assign a confidence score between 0 and 1

Respond in this format:
Evaluation: <factual|value|policy|unknown>
Reasoning: <3-5 sentences explaining your classification reasoning>
Confidence: <float between 0 and 1 representing your confidence in the classification>
"""
    
    print(f"[ai_api] classify_claim_type: Generated prompt length: {len(prompt)} characters")
    print(f"[ai_api] classify_claim_type: Calling LLM for classification...")
    
    try:
        content = run_llm([
            {"role": "user", "content": prompt}
        ], DEFAULT_MCP)
        
        print(f"[ai_api] classify_claim_type: LLM response received, length: {len(content)} characters")
        print(f"[ai_api] classify_claim_type: Raw LLM response: {content}")
        
        evaluation = "unknown"
        reasoning = content
        confidence = 0.5
        
        # Parse the response
        print(f"[ai_api] classify_claim_type: Parsing LLM response...")
        for line in content.splitlines():
            line_lower = line.lower().strip()
            if line_lower.startswith("evaluation:"):
                evaluation = line.split(":", 1)[1].strip().lower()
                print(f"[ai_api] classify_claim_type: Found evaluation: '{evaluation}'")
            elif line_lower.startswith("reasoning:"):
                reasoning = line.split(":", 1)[1].strip()
                print(f"[ai_api] classify_claim_type: Found reasoning: '{reasoning[:100]}...'")
            elif line_lower.startswith("confidence:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                    confidence = min(max(confidence, 0.0), 1.0)
                    print(f"[ai_api] classify_claim_type: Found confidence: {confidence}")
                except Exception as e:
                    print(f"[ai_api] classify_claim_type: Error parsing confidence: {e}, using default 0.5")
                    confidence = 0.5
        
        # Validate evaluation is one of the expected types
        if evaluation not in ["factual", "value", "policy", "unknown"]:
            print(f"[ai_api] classify_claim_type: Invalid evaluation '{evaluation}', defaulting to 'unknown'")
            evaluation = "unknown"
        
        print(f"[ai_api] classify_claim_type: Final classification - Node {data.node_id}: {evaluation} (confidence: {confidence})")
        print(f"[ai_api] classify_claim_type: Reasoning: {reasoning}")
        
        response = ClassifyClaimTypeResponse(
            node_id=data.node_id,
            node_text=data.node_text,
            evaluation=evaluation,
            reasoning=reasoning,
            confidence=confidence
        )
        
        print(f"[ai_api] classify_claim_type: Function completed successfully")
        return response
        
    except Exception as e:
        print(f"[ai_api] classify_claim_type: Error during classification: {str(e)}")
        print(f"[ai_api] classify_claim_type: Error type: {type(e).__name__}")
        import traceback
        print(f"[ai_api] classify_claim_type: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@router.post("/api/ai/validate-edge", response_model=ValidateEdgeResponse)
def validate_edge(data: ValidateEdgeRequest = Body(...)):
    """
    Validate logical relationship between two nodes via an edge.
    Determines if the edge represents an attack or support, provides reasoning, and a confidence value in [-1, 1].
    """
    def format_evidence(evidence_list):
        if not evidence_list:
            return "None"
        # If evidence is a list of floats, just print the scores
        if all(isinstance(ev, (int, float)) for ev in evidence_list):
            return "Evidence scores: " + ", ".join([str(ev) for ev in evidence_list])
        # Otherwise, assume it's a list of objects with title/excerpt
        return "\n".join([
            f"- Title: {getattr(ev, 'title', 'N/A')}\n  Excerpt: {getattr(ev, 'excerpt', str(ev))}" for ev in evidence_list
        ])

    # Edge weight is now optional and not required in the prompt
    prompt = f"""
You are an expert in argument analysis. Given the following two nodes and their connecting edge, determine whether the source node ATTACKS, SUPPORTS, or is NEUTRAL to the target node. 

- If you choose 'attack', it means the source claim attacks, contradicts, or undermines the target claim.
- If you choose 'support', it means the source claim supports, strengthens, or provides evidence for the target claim.
- If you choose 'neutral', it means there is no clear relation between the source and target claims.

The output confidence value should match the evaluation:
- -1 means strong attack
- +1 means strong support
- 0 means neutral or no relation

Respond in this format:
Evaluation: <attack|support|neutral>
Reasoning: <3-5 sentences explaining your reasoning>
Implicit Assumptions: <2-3 sentences explaining the most important necessary implicit assumptions underlying the argument>
Confidence: <float between -1 and 1, matching the evaluation>

Source Node:
ID: {data.source_node.id}
Text: {getattr(data.source_node, 'text', '')}
Evidence:
{format_evidence(getattr(data.source_node, 'evidence', None))}

Target Node:
ID: {data.target_node.id}
Text: {getattr(data.target_node, 'text', '')}
Evidence:
{format_evidence(getattr(data.target_node, 'evidence', None))}

Edge:
Source: {data.edge.source}
Target: {data.edge.target}
"""
    try:
        content = run_llm([
            {"role": "user", "content": prompt}
        ], DEFAULT_MCP)
        evaluation = "unsure"
        reasoning = content
        confidence = 0.0
        for line in content.splitlines():
            if line.lower().startswith("evaluation:"):
                evaluation = line.split(":", 1)[1].strip().lower()
            if line.lower().startswith("reasoning:"):
                reasoning = line.split(":", 1)[1].strip()
            if line.lower().startswith("confidence:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                    confidence = min(max(confidence, -1.0), 1.0)
                except Exception:
                    confidence = 0.0
        return ValidateEdgeResponse(
            evaluation=evaluation,
            reasoning=reasoning,
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

class SuggestEvidenceTextRequest(BaseModel):
    document_url: str
    node_type: str
    node_content: str
    node_description: str

class SuggestEvidenceTextResponse(BaseModel):
    suggested_text: str
    reasoning: str

class ExtractAllTextRequest(BaseModel):
    document_url: str

class ExtractAllTextResponse(BaseModel):
    extracted_text: str
    page_count: int
    total_characters: int

@router.post("/api/ai/suggest-evidence-text", response_model=SuggestEvidenceTextResponse)
def suggest_evidence_text(data: SuggestEvidenceTextRequest = Body(...)):
    """
    AI-powered evidence suggestion that analyzes a document and returns text that supports a specific claim/node.
    
    This endpoint:
    1. Downloads and extracts text from the document at the given URL
    2. Analyzes the text content to find supporting evidence for the claim
    3. Returns the most relevant supporting text with reasoning
    """
    print(f"[ai_api] suggest_evidence_text: Function started for node type '{data.node_type}'")
    print(f"[ai_api] suggest_evidence_text: Node content: '{data.node_content[:100]}...'")
    print(f"[ai_api] suggest_evidence_text: Document URL: {data.document_url}")
    
    if not OPENAI_API_KEY:
        print("[ai_api] suggest_evidence_text: No OpenAI API key configured.")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    try:
        openai.api_key = OPENAI_API_KEY
        
        # STEP 1: Download the document
        print(f"[ai_api] suggest_evidence_text: Downloading document from URL...")
        response = requests.get(data.document_url)
        response.raise_for_status()  # Raise an exception for bad status codes
        document_data = response.content
        print(f"[ai_api] suggest_evidence_text: Document downloaded, size: {len(document_data)} bytes")
        
        # STEP 2: Extract text from PDF
        print(f"[ai_api] suggest_evidence_text: Extracting text from PDF...")
        doc = fitz.open(stream=io.BytesIO(document_data), filetype="pdf")
        pdf_text = ""
        for page in doc:
            pdf_text += page.get_text()
        
        # Close the document
        doc.close()
        
        print(f"[ai_api] suggest_evidence_text: Text extracted, length: {len(pdf_text)} characters")
        
        # STEP 3: Truncate if it's too long for OpenAI
        max_chars = 12000  # adjust based on token limits
        if len(pdf_text) > max_chars:
            pdf_text = pdf_text[:max_chars]
            print(f"[ai_api] suggest_evidence_text: Text truncated to {max_chars} characters")
        
        # STEP 4: Build the prompt for evidence suggestion
        prompt = f"""
You are an expert at analyzing documents and identifying supporting evidence for claims.

TASK: Analyze the following document content and find all text passages that support the given claim.

CLAIM DETAILS:
- Type: {data.node_type}
- Content: {data.node_content}
- Description: {data.node_description}

DOCUMENT CONTENT:
{pdf_text}

INSTRUCTIONS:
1. Carefully read through the document content above
2. Identify all text passages that directly support or provide evidence for the claim
3. Extract the most relevant supporting text
4. Provide clear reasoning for why this text supports the claim
5. Focus on factual, verifiable information that strengthens the claim
6. If no relevant supporting evidence is found, indicate this clearly

Respond in this format:
Suggested Text: <extract the most relevant supporting text from the document>
Reasoning: <explain why this text supports the claim, including how it relates to the claim type and content>
"""
        
        print(f"[ai_api] suggest_evidence_text: Calling OpenAI API...")
        
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert document analyst and evidence finder."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        result = response.choices[0].message.content
        print(f"[ai_api] suggest_evidence_text: OpenAI response received, length: {len(result)} characters")
        
        # Parse the response
        suggested_text = ""
        reasoning = result
        
        for line in result.splitlines():
            line_lower = line.lower().strip()
            if line_lower.startswith("suggested text:"):
                suggested_text = line.split(":", 1)[1].strip()
                print(f"[ai_api] suggest_evidence_text: Found suggested text: '{suggested_text[:100]}...'")
            elif line_lower.startswith("reasoning:"):
                reasoning = line.split(":", 1)[1].strip()
                print(f"[ai_api] suggest_evidence_text: Found reasoning: '{reasoning[:100]}...'")
        
        # If no structured response, use the full response as suggested text
        if not suggested_text:
            suggested_text = result
            reasoning = "AI analyzed the document and provided supporting evidence."
        
        print(f"[ai_api] suggest_evidence_text: Function completed successfully")
        return SuggestEvidenceTextResponse(
            suggested_text=suggested_text,
            reasoning=reasoning
        )
        
    except requests.RequestException as e:
        print(f"[ai_api] suggest_evidence_text: Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")
    except Exception as e:
        print(f"[ai_api] suggest_evidence_text: Error during analysis: {str(e)}")
        print(f"[ai_api] suggest_evidence_text: Error type: {type(e).__name__}")
        import traceback
        print(f"[ai_api] suggest_evidence_text: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Evidence suggestion failed: {str(e)}")

@router.post("/api/ai/extract-all-text", response_model=ExtractAllTextResponse)
def extract_all_text(data: ExtractAllTextRequest = Body(...)):
    """
    Extract all text from a PDF document at the given URL.
    
    This endpoint:
    1. Downloads the PDF from the provided URL
    2. Extracts all text from all pages using PyMuPDF
    3. Returns the complete text content with metadata
    """
    print(f"[ai_api] extract_all_text: Function started")
    print(f"[ai_api] extract_all_text: Document URL: {data.document_url}")
    
    try:
        # STEP 1: Download the document
        print(f"[ai_api] extract_all_text: Downloading document from URL...")
        response = requests.get(data.document_url)
        response.raise_for_status()  # Raise an exception for bad status codes
        document_data = response.content
        print(f"[ai_api] extract_all_text: Document downloaded, size: {len(document_data)} bytes")
        
        # STEP 2: Extract text from PDF
        print(f"[ai_api] extract_all_text: Extracting text from PDF...")
        doc = fitz.open(stream=io.BytesIO(document_data), filetype="pdf")
        
        pdf_text = ""
        page_count = len(doc)
        
        for page_num in range(page_count):
            page = doc.load_page(page_num)
            page_text = page.get_text()
            pdf_text += page_text
            
            # Add page separator for better readability
            if page_num < page_count - 1:
                pdf_text += f"\n\n--- Page {page_num + 1} ---\n\n"
        
        # Close the document
        doc.close()
        
        total_characters = len(pdf_text)
        print(f"[ai_api] extract_all_text: Text extracted, {page_count} pages, {total_characters} characters")
        
        print(f"[ai_api] extract_all_text: Function completed successfully")
        return ExtractAllTextResponse(
            extracted_text=pdf_text,
            page_count=page_count,
            total_characters=total_characters
        )
        
    except requests.RequestException as e:
        print(f"[ai_api] extract_all_text: Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")
    except Exception as e:
        print(f"[ai_api] extract_all_text: Error during text extraction: {str(e)}")
        print(f"[ai_api] extract_all_text: Error type: {type(e).__name__}")
        import traceback
        print(f"[ai_api] extract_all_text: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

class CheckNodeEvidenceRequest(BaseModel):
    node: NodeWithEvidenceModel
    evidence: List[EvidenceModel]
    supportingDocuments: Optional[List[SupportingDocumentModel]] = []

@router.post("/api/ai/check-node-evidence", response_model=CheckEvidenceResponse)
def check_node_evidence(data: CheckNodeEvidenceRequest = Body(...)):
    print("[ai_api] check_node_evidence: Function started.")
    results = []
    node = data.node
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
    print("[ai_api] check_node_evidence: Function finished.")
    return CheckEvidenceResponse(results=results) 