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
import json
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
    UnifiedEvidenceRequest,  # NEW
    UnifiedEvidenceResponse,  # NEW
    ValidateEdgeRequest,  # NEW
    ValidateEdgeResponse,  # NEW
    ClassifyClaimTypeRequest,  # NEW
    ClassifyClaimTypeResponse,  # NEW
    NodeCredibilityRequest,  # NEW
    NodeCredibilityResponse,  # NEW
    GenerateAssumptionsRequest,  # NEW
    GenerateAssumptionsResponse,  # NEW
    Assumption,  # NEW
    CritiqueGraphRequest,  # NEW
    CritiqueGraphResponse,  # NEW
    ArgumentFlaw,  # NEW
    PatternMatch,  # NEW
    GenerateComprehensiveReportRequest,  # NEW
    GenerateComprehensiveReportResponse,  # NEW
    ChatMessage,  # NEW
    ChatRequest,  # NEW
    ChatResponse  # NEW
)
from llm_manager import run_llm, DEFAULT_MCP, ModelControlProtocol
from datetime import datetime

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
    Compute credibility scores for claims using a network propagation algorithm.

    Evidence term (intrinsic score):
    - For each node i, the intrinsic score E_i is taken from the node's unified
      `evidence_score` field (a single score produced by aggregating ALL attached
      evidence together).
    - E_i is clamped to [evidence_min, evidence_max] (defaults to [-1.0, 1.0]).
    - If `evidence_score` is missing for a node, E_i defaults to 0.0.

    Update rule:
    - Initialize c_i^(0) = E_i
    - Iteratively update: c_i^(t+1) = tanh(λ * E_i + Σ_j (w_ji * c_j^(t)))
    - Continue until convergence (max change < epsilon) or max_iterations reached

    Notes on edge contributions:
    - Support edges (w > 0) contribute |w| * source_score
    - Attack edges (w < 0) contribute -|w| * |source_score|
    - Zero-weight edges contribute 0

    The tanh squashing function keeps scores in [-1, 1]. The λ (lambda) parameter
    balances how much intrinsic evidence vs. network influence affects each node.
    """
    print(f"DEBUG: Received request with {len(data.nodes)} nodes and {len(data.edges)} edges")
    
    # Step 1: Compute E_i (initial evidence score) strictly from unified evidence_score
    E = {}
    for node in data.nodes:
        min_val = data.evidence_min if data.evidence_min is not None else -1.0
        max_val = data.evidence_max if data.evidence_max is not None else 1.0
        score = getattr(node, "evidence_score", None)
        if score is None:
            E[node.id] = 0.0
            print(f"DEBUG: Node {node.id} evidence_score missing -> using 0.0")
        else:
            clamped = max(min(score, max_val), min_val)
            E[node.id] = clamped
            print(f"DEBUG: Node {node.id} using unified evidence_score {score} -> clamped {clamped}")

    # Verify final evidence scores
    print("DEBUG: Final evidence scores:")
    for node_id, score in E.items():
        print(f"DEBUG: Node {node_id}: {score}")

    # Step 2: Initialize credibility scores c_i^(0) = E_i
    c_prev = {node.id: E[node.id] for node in data.nodes}
    iterations = [c_prev.copy()]

    # Handle empty graph safely
    if len(data.nodes) == 0:
        print("DEBUG: No nodes in request; returning empty scores")
        return CredibilityPropagationResponse(
            initial_evidence=E,
            iterations=iterations,
            final_scores=c_prev,
        )

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
                # Check if there are any meaningful edge contributions
                meaningful_edges = []
                total_edge_contribution = 0.0
                
                for edge in incoming_edges[node_id]:
                    print(f"DEBUG: ===== EDGE CONTRIBUTION CALCULATION =====")
                    print(f"DEBUG: Processing edge from {edge.target} to {node_id}")
                    print(f"DEBUG: Raw edge weight: {edge.weight}")
                    
                    # Fix 1: Handle 0.0 weights properly
                    if edge.weight == 0.0:
                        print(f"DEBUG: Edge has 0.0 weight - treating as neutral (no contribution)")
                        continue
                    else:
                        # Handle null/undefined weight as 1.0, but keep 0 as 0
                        weight = 1.0 if edge.weight is None else edge.weight
                        strength = abs(weight)
                        is_support = weight > 0
                        source_score = c_prev[edge.target]
                        
                        print(f"DEBUG: Processed weight: {weight}")
                        print(f"DEBUG: Calculated strength: {strength}")
                        print(f"DEBUG: Is support edge: {is_support}")
                        print(f"DEBUG: Source node score: {source_score}")
                        
                        if is_support:
                            # For support edges, use raw source score
                            edge_contribution = strength * source_score
                            print(f"DEBUG: SUPPORT edge calculation:")
                            print(f"DEBUG:   edge_contribution = strength * source_score")
                            print(f"DEBUG:   edge_contribution = {strength} * {source_score}")
                            print(f"DEBUG:   edge_contribution = {edge_contribution}")
                        else:
                            # For attack edges, use absolute value of source score
                            source_strength = abs(source_score)
                            edge_contribution = -strength * source_strength
                            print(f"DEBUG: ATTACK edge calculation:")
                            print(f"DEBUG:   source_strength = abs({source_score}) = {source_strength}")
                            print(f"DEBUG:   edge_contribution = -strength * source_strength")
                            print(f"DEBUG:   edge_contribution = -{strength} * {source_strength}")
                            print(f"DEBUG:   edge_contribution = {edge_contribution}")
                    
                    total_edge_contribution += edge_contribution
                    if abs(edge_contribution) > 0.001:  # Consider meaningful if > 0.001
                        meaningful_edges.append(edge)
                    
                    print(f"DEBUG: Updated total_edge_contribution = {total_edge_contribution}")
                    print(f"DEBUG: ===== END EDGE CONTRIBUTION =====")
                    print(f"DEBUG: Edge from {edge.target} contributes {edge_contribution} (weight={edge.weight}, source_score={c_prev[edge.target]})")
                
                # Fix 2: Only apply lambda reduction when there are meaningful edge contributions
                if meaningful_edges:
                    # Apply lambda to evidence when there are meaningful network influences
                    Z = data.lambda_ * E[node_id] + total_edge_contribution
                    print(f"DEBUG: Node {node_id} has meaningful edges - applying lambda reduction")
                    print(f"DEBUG: Z = {data.lambda_} * {E[node_id]} + {total_edge_contribution} = {Z}")
                    c_new[node_id] = math.tanh(Z)
                    print(f"DEBUG: Target node {node_id} final Z={Z}, new score={c_new[node_id]}")
                else:
                    # No meaningful edges - keep the previous score unchanged
                    print(f"DEBUG: Node {node_id} has no meaningful edges - keeping previous score {c_prev[node_id]}")
                    c_new[node_id] = c_prev[node_id]
        
        iterations.append(c_new.copy())
        print(f"DEBUG: Iteration {iteration + 1} scores: {c_new}")
        
        # Check for convergence
        # Guard against empty node set (avoids max() on empty sequence)
        if not c_new or max(abs(c_new[nid] - c_prev[nid]) for nid in c_new) < data.epsilon:
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
Evaluation: <Supports|Contradicts|unsure|unrelated>
Reasoning: <your explanation. Keep it to 2-4 sentences, focusing on the evidence and the claim.>
Score: <a number between -1 and 1 giving the evidence a score of how well the evidence supports or contradicts the claim. -1 means fully contradicts, 1 means fully supports, 0 means neutral/ irrelevant. Score can be any number in between this range.>
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
    # def format_evidence(evidence_list):
    #     if not evidence_list:
    #         return "None"
    #     # If evidence is a list of floats, just print the scores
    #     if all(isinstance(ev, (int, float)) for ev in evidence_list):
    #         return "Evidence scores: " + ", ".join([str(ev) for ev in evidence_list])
    #     # Otherwise, assume it's a list of objects with title/excerpt
    #     return "\n".join([
    #         f"- Title: {getattr(ev, 'title', 'N/A')}\n  Excerpt: {getattr(ev, 'excerpt', str(ev))}" for ev in evidence_list
    #     ])

    # Edge weight is now optional and not required in the prompt
    prompt = f"""You are an expert in logical analysis. Your task is to determine how one claim logically relates to another claim, focusing ONLY on their content.

Here are examples of excellent logical relationship analyses:

EXAMPLE 1:
Source Claim: "All birds have feathers"
Target Claim: "Eagles have feathers"
Evaluation: support
Reasoning: The source claim makes a universal statement about birds having feathers. Since eagles are birds, the source claim logically necessitates the target claim. This is a deductive relationship - if the source is true, the target must be true.
Score: 0.95
Implicit Assumptions: Eagles are birds.

EXAMPLE 2:
Source Claim: "The city's population decreased by 5% in 2023"
Target Claim: "The city experienced record population growth in 2023"
Evaluation: attack
Reasoning: These claims make directly contradictory statements about the same metric in the same time period. A decrease of 5% and record growth cannot both be true - they are logically incompatible.
Score: -0.98
Implicit Assumptions: Both claims refer to the same city and same measurement method.

EXAMPLE 3:
Source Claim: "Regular meditation reduces stress levels"
Target Claim: "Exercise improves cardiovascular health"
Evaluation: neutral
Reasoning: While both claims relate to health benefits, they address entirely different aspects of health with no logical connection between them. One claim being true or false has no bearing on the other.
Score: 0
Implicit Assumptions: None needed - claims are logically independent.

EXAMPLE 4:
Source Claim: "Higher education leads to increased earning potential"
Target Claim: "College graduates earn 50% more than non-graduates"
Evaluation: support
Reasoning: The source claim establishes a general relationship between education and earnings, while the target claim provides a specific quantification. The source claim provides strong logical support for the target's more specific assertion.
Score: 0.75
Implicit Assumptions: College education qualifies as higher education. The earnings comparison is measuring the relationship described in the source claim.

EXAMPLE 5:
Source Claim: "The software has critical security vulnerabilities"
Target Claim: "The software is safe to use in production"
Evaluation: attack
Reasoning: Critical security vulnerabilities directly undermine the claim of production safety. The presence of critical vulnerabilities is incompatible with a system being safe for production use.
Score: -0.85
Implicit Assumptions: Production safety requires absence of critical security vulnerabilities.

Now analyze these claims:

SOURCE CLAIM: {getattr(data.target_node, 'text', '')}
TARGET CLAIM: {getattr(data.source_node, 'text', '')}

SCORING GUIDELINES:

Support (+0.1 to +1.0):
+1.0 to +0.9: Deductive/Necessary Support
- Source logically guarantees the target claim
- If source is true, target MUST be true
- Example: "All mammals are warm-blooded" → "Dogs are warm-blooded"

+0.8 to +0.6: Strong Support
- Source provides direct, specific support for target
- Very few assumptions needed to connect claims
- Example: "90% of students passed the exam" → "Most students performed well on the test"

+0.5 to +0.3: Moderate Support
- Source partially supports or makes target more likely
- Requires some reasonable assumptions
- Example: "The company's revenue grew 20%" → "The company had a successful year"

+0.2 to +0.1: Weak Support
- Source provides indirect or partial support
- Multiple assumptions needed
- Example: "More people are working from home" → "Urban traffic will decrease"

Attack (-0.1 to -1.0):
-1.0 to -0.9: Direct Contradiction
- Claims are logically incompatible
- Both cannot be true simultaneously
- Example: "It's raining" → "The sky is completely clear"

-0.8 to -0.6: Strong Attack
- Source strongly undermines target
- Few assumptions needed to show conflict
- Example: "The project is severely over budget" → "The project is well-managed"

-0.5 to -0.3: Moderate Attack
- Source partially contradicts or weakens target
- Some assumptions needed to show conflict
- Example: "User complaints increased" → "Customer satisfaction improved"

-0.2 to -0.1: Weak Attack
- Source slightly undermines target
- Multiple assumptions needed to show conflict
- Example: "Some employees are dissatisfied" → "The company has excellent morale"

Neutral (0):
- Claims are logically independent
- No meaningful inferential connection
- Connection would require unreasonable assumptions
- Claims address different subjects, time periods, or aspects
- One claim being true/false has no bearing on the other, (ie both can be true simultaneously)
- Example: "Coffee prices increased" → "Solar panels are efficient"
- Example: "Messi won a world cup" → "Messi won a Ballon d'Or award"

IMPORTANT SCORING PRINCIPLES:
1. Logical Necessity: Higher scores (±0.9 to ±1.0) reserved for deductive relationships
2. Directness: Fewer required assumptions = stronger score
3. Specificity: More specific, relevant connections = stronger score
4. Independence: Truly unrelated claims = exactly 0

IMPORTANT:
- Focus ONLY on the logical relationship between claim contents
- Ignore any external evidence or context
- Consider only what is explicitly stated or necessarily implied
- Identify only the assumptions needed for the logical relationship

Respond in this format:
Evaluation: <attack|support|neutral>
Reasoning: <2-3 sentences explaining the LOGICAL relationship between the claims>
Implicit Assumptions: <List 1-2 key assumptions needed for this logical relationship>
Score: <float between -1 and 1, following the scoring guide above>
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
            if line.lower().startswith("score:"):
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

@router.post("/api/ai/generate-assumptions", response_model=GenerateAssumptionsResponse)
def generate_assumptions(data: GenerateAssumptionsRequest = Body(...)):
    """
    Generate 3 implicit assumptions that would strengthen the support relationship between two claims.
    
    This endpoint analyzes what assumptions must be true for the target claim to provide
    stronger support for the source claim. The assumptions are purely based on the logical
    relationship between the claim contents, not on external evidence.
    
    The function identifies hidden premises that, if true, would increase the strength
    of the support relationship between the claims.
    """
    print(f"[ai_api] generate_assumptions: Function started for edge {data.edge.source} -> {data.edge.target}")
    print(f"[ai_api] generate_assumptions: Source claim (to be supported): {data.source_node.text}")
    print(f"[ai_api] generate_assumptions: Target claim (providing support): {data.target_node.text}")
    
    # Determine edge type based on weight or default to support
    edge_type = "support"
    if data.edge.weight is not None:
        if data.edge.weight < 0:
            edge_type = "attack"
        elif data.edge.weight > 0:
            edge_type = "support"
        else:
            edge_type = "neutral"
    
    # Build the improved prompt for assumption generation with few-shot learning
    prompt = f"""
You are an expert in logical argument analysis. Your task is to identify exactly 3 implicit assumptions that, if true, would STRENGTHEN the support relationship between two claims.

CLAIM TO BE SUPPORTED: {data.source_node.text}
SUPPORTING CLAIM: {data.target_node.text}

TASK: Identify assumptions "p" such that if "p" is true, then "{data.target_node.text}" provides STRONGER support for "{data.source_node.text}".

EXAMPLES:

Example 1:
CLAIM TO BE SUPPORTED: "John should exercise regularly"
SUPPORTING CLAIM: "Exercise reduces the risk of heart disease"

Assumption 1: John wants to reduce his risk of heart disease
Reasoning 1: Without this desire/goal, the health benefit doesn't provide a reason for John to exercise
Importance 1: 0.9

Assumption 2: John is capable of exercising regularly
Reasoning 2: If John cannot exercise due to physical limitations, the benefit becomes irrelevant to him
Importance 2: 0.7

Assumption 3: The heart disease risk reduction applies to people like John
Reasoning 3: The supporting claim is stronger if the research applies to John's demographic/health profile
Importance 3: 0.6

Example 2:
CLAIM TO BE SUPPORTED: "The company should invest in renewable energy"
SUPPORTING CLAIM: "Renewable energy costs have decreased significantly"

Assumption 1: The company's goal includes cost reduction or financial efficiency
Reasoning 1: Cost decreases only matter if the company cares about reducing expenses
Importance 1: 0.8

Assumption 2: The cost decreases apply to the scale and type of energy the company needs
Reasoning 2: The supporting claim is stronger if the cost benefits are relevant to the company's specific energy requirements
Importance 2: 0.7

Assumption 3: The company has the capital and capability to make such investments
Reasoning 3: Cost benefits are irrelevant if the company cannot actually make the investment
Importance 3: 0.6

Now analyze the given claims:

IMPORTANT GUIDELINES:
- Focus ONLY on the logical relationship between the claim contents
- Do NOT consider external evidence or documentation
- Each assumption should be a specific, testable statement
- Higher importance = more critical for strengthening the support relationship
- Generate exactly 3 assumptions

Respond in this format:
Relationship Type: {edge_type}

Assumption 1: <specific assumption that would strengthen the support>
Reasoning 1: <explain how this assumption strengthens the relationship>
Importance 1: <float 0.0-1.0 - how critical is this for strengthening support>

Assumption 2: <specific assumption that would strengthen the support>
Reasoning 2: <explain how this assumption strengthens the relationship>
Importance 2: <float 0.0-1.0 - how critical is this for strengthening support>

Assumption 3: <specific assumption that would strengthen the support>
Reasoning 3: <explain how this assumption strengthens the relationship>
Importance 3: <float 0.0-1.0 - how critical is this for strengthening support>

Summary: <2-3 sentences explaining what these assumptions collectively accomplish>
"""
    
    print(f"[ai_api] generate_assumptions: Calling LLM for assumption generation...")
    
    try:
        # Create a custom MCP with higher token limit for assumption generation
        assumption_mcp = ModelControlProtocol(
            model_name="gpt-4o-mini",
            temperature=0.2,
            max_tokens=1024,  # Increased from 256 to 1024 for longer responses
            system_prompt=DEFAULT_MCP.system_prompt
        )
        
        content = run_llm([
            {"role": "user", "content": prompt}
        ], assumption_mcp)
        
        print(f"[ai_api] generate_assumptions: LLM response received, length: {len(content)} characters")
        
        # Check if response might be truncated
        if len(content) < 200:  # Very short response might indicate truncation
            print(f"[ai_api] generate_assumptions: Warning: Response seems very short, might be truncated")
        elif len(content) > 900:  # Close to token limit
            print(f"[ai_api] generate_assumptions: Warning: Response is close to token limit ({len(content)} chars)")
        
        # Parse the response
        relationship_type = edge_type
        overall_confidence = 0.8  # Fixed value since we're not using it
        assumptions = []
        summary = ""
        
        lines = content.splitlines()
        current_assumption = None
        current_reasoning = ""
        current_importance = 0.5
        current_confidence = 0.8  # Default confidence since we're not using it
        
        for line in lines:
            line_lower = line.lower().strip()
            
            if line_lower.startswith("relationship type:"):
                relationship_type = line.split(":", 1)[1].strip().lower()
            # Skip overall confidence parsing since we're not using it
            elif line_lower.startswith("assumption"):
                # Save previous assumption if exists
                if current_assumption:
                    assumptions.append(Assumption(
                        assumption_text=current_assumption,
                        reasoning=current_reasoning.strip(),
                        importance=current_importance,
                        confidence=current_confidence
                    ))
                
                # Start new assumption
                current_assumption = line.split(":", 1)[1].strip()
                current_reasoning = ""
                current_importance = 0.5
                current_confidence = 0.5
            elif line_lower.startswith("reasoning"):
                current_reasoning = line.split(":", 1)[1].strip()
            elif line_lower.startswith("importance"):
                try:
                    current_importance = float(line.split(":", 1)[1].strip())
                    current_importance = min(max(current_importance, 0.0), 1.0)
                except Exception:
                    current_importance = 0.5
            elif line_lower.startswith("confidence"):
                try:
                    current_confidence = float(line.split(":", 1)[1].strip())
                    current_confidence = min(max(current_confidence, 0.0), 1.0)
                except Exception:
                    current_confidence = 0.5
            elif line_lower.startswith("summary:"):
                summary = line.split(":", 1)[1].strip()
        
        # Add the last assumption
        if current_assumption:
            assumptions.append(Assumption(
                assumption_text=current_assumption,
                reasoning=current_reasoning.strip(),
                importance=current_importance,
                confidence=current_confidence
            ))
        
        # Ensure we have exactly 3 assumptions
        if len(assumptions) != 3:
            print(f"[ai_api] generate_assumptions: Warning: {len(assumptions)} assumptions generated, adjusting to exactly 3")
            if len(assumptions) < 3:
                while len(assumptions) < 3:
                    assumptions.append(Assumption(
                        assumption_text=f"Additional bridging assumption needed to strengthen the {edge_type} relationship",
                        reasoning="This assumption would help establish a stronger logical connection between the supporting claim and the claim being supported.",
                        importance=0.5,
                        confidence=0.8
                    ))
            elif len(assumptions) > 3:
                assumptions = assumptions[:3]
        
        print(f"[ai_api] generate_assumptions: Generated exactly 3 assumptions")
        
        response = GenerateAssumptionsResponse(
            edge_id=f"{data.edge.source}-{data.edge.target}",
            source_node_id=data.source_node.id,
            target_node_id=data.target_node.id,
            source_node_text=data.source_node.text,
            target_node_text=data.target_node.text,
            edge_type=edge_type,
            relationship_type=relationship_type,
            assumptions=assumptions,
            summary=summary if summary else f"Generated 3 assumptions that would strengthen how '{data.target_node.text}' supports '{data.source_node.text}'",
            overall_confidence=overall_confidence
        )
        
        print(f"[ai_api] generate_assumptions: Function completed successfully")
        return response
        
    except Exception as e:
        print(f"[ai_api] generate_assumptions: Error during assumption generation: {str(e)}")
        print(f"[ai_api] generate_assumptions: Error type: {type(e).__name__}")
        import traceback
        print(f"[ai_api] generate_assumptions: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Assumption generation failed: {str(e)}")

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

@router.post("/api/ai/critique-graph", response_model=CritiqueGraphResponse)
def critique_graph(data: CritiqueGraphRequest = Body(...)):
    """
    Provide comprehensive critique of argument structure.
    
    This endpoint analyzes the entire graph to:
    1. Identify argument flaws and weaknesses
    2. Match patterns from the argument patterns bank
    3. Provide overall assessment and recommendations
    
    The analysis considers:
    - Structural issues (circular reasoning, contradictions, etc.)
    - Semantic problems (logical fallacies, weak connections)
    - Dialectical issues (straw man, ad hominem, etc.)
    - Pattern matches from the argument patterns bank
    """
    print(f"[ai_api] critique_graph: Function started for graph with {len(data.nodes)} nodes and {len(data.edges)} edges")
    
    if not OPENAI_API_KEY:
        print("[ai_api] critique_graph: No OpenAI API key configured.")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    try:
        openai.api_key = OPENAI_API_KEY
        
        # Format the graph data for analysis
        nodes_text = "\n".join([f"Node {node.id}: {node.text} (Type: {node.type})" for node in data.nodes])
        edges_text = "\n".join([f"Edge {edge.source} -> {edge.target} (Weight: {edge.weight})" for edge in data.edges])
        evidence_text = "\n".join([f"Evidence {ev.id}: {ev.title} - {ev.excerpt}" for ev in data.evidence])
        
        # Create node ID to text mapping for detailed pattern matching
        node_id_to_text = {node.id: node.text for node in data.nodes}
        edge_id_to_details = {f"{edge.source}->{edge.target}": f"{edge.source}->{edge.target} (weight: {edge.weight})" for edge in data.edges}
        
        # Load argument patterns from YAML
        import yaml
        import os
        import json  # Ensure json is available in this scope
        
        yaml_path = os.path.join(os.path.dirname(__file__), "upload", "argument_patterns_bank.yaml")
        with open(yaml_path, 'r') as file:
            patterns = yaml.safe_load(file)
        
        # Create a comprehensive prompt for analysis
        prompt = f"""
        Analyze this argument graph for flaws and pattern matches.

        GRAPH DATA:
        Nodes:
        {nodes_text}
        
        Edges:
        {edges_text}
        
        Evidence:
        {evidence_text}
        
        ARGUMENT PATTERNS BANK:
        {yaml.dump(patterns, default_flow_style=False)}
        
        NODE ID TO TEXT MAPPING:
        {json.dumps(node_id_to_text, indent=2)}
        
        EDGE ID TO DETAILS MAPPING:
        {json.dumps(edge_id_to_details, indent=2)}
        
        Please provide a comprehensive analysis with:
        
        1. ARGUMENT FLAWS: Identify specific argument flaws with:
           - flaw_type: Type of flaw (e.g., "Circular Reasoning", "Straw Man", "False Cause")
           - description: Clear description of the flaw
           - affected_nodes: List of node IDs involved
           - affected_edges: List of edge IDs involved  
           - severity: "low", "medium", "high", or "critical"
           - reasoning: Detailed explanation of why this is a flaw
        
        2. PATTERN MATCHES: Match against the argument patterns bank:
           - pattern_name: Name of the matched pattern from the YAML subtypes
           - category: Category from the patterns bank (fallacious, good_argument, absurd, etc.)
           - description: Description from the patterns bank
           - graph_pattern: The pattern description from YAML
           - graph_implication: The implication description from YAML
           - matched_nodes: List of node IDs that match this pattern
           - matched_node_texts: List of actual claim texts from the matched nodes (use the node_id_to_text mapping)
           - matched_edges: List of edge IDs that match this pattern
           - matched_edge_details: List of edge details (source->target with weights) from the edge_id_to_details mapping
           - pattern_details: Specific details about how the pattern was matched and why
           - severity: "low", "medium", "high", or "critical" based on pattern type (fallacious patterns are usually high/critical)
        
        3. OVERALL ASSESSMENT: Provide a general assessment of the argument's quality
        
        4. RECOMMENDATIONS: List specific suggestions for improving the argument
        
        Format your response as raw JSON (no markdown formatting) with these exact fields:
        {{
            "argument_flaws": [
                {{
                    "flaw_type": "string",
                    "description": "string", 
                    "affected_nodes": ["node_id1", "node_id2"],
                    "affected_edges": ["edge_id1", "edge_id2"],
                    "severity": "low|medium|high|critical",
                    "reasoning": "string"
                }}
            ],
            "pattern_matches": [
                {{
                    "pattern_name": "string",
                    "category": "string",
                    "description": "string",
                    "graph_pattern": "string",
                    "graph_implication": "string",
                    "matched_nodes": ["node_id1", "node_id2"],
                    "matched_node_texts": ["actual claim text 1", "actual claim text 2"],
                    "matched_edges": ["edge_id1", "edge_id2"],
                    "matched_edge_details": ["source_id->target_id (weight)", "source_id->target_id (weight)"],
                    "pattern_details": "string",
                    "severity": "low|medium|high|critical"
                }}
            ],
            "overall_assessment": "string",
            "recommendations": ["string1", "string2", "string3"]
        }}
        
        IMPORTANT: Return only the JSON object, no markdown formatting, no code blocks.
        """
        
        print(f"[ai_api] critique_graph: Sending request to OpenAI")
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert argument analyst and critical thinking specialist. Analyze argument graphs for logical flaws, fallacies, and pattern matches."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        result = response.choices[0].message.content
        print(f"[ai_api] critique_graph: Received response from OpenAI")
        
        # Parse the JSON response
        import json
        import re
        
        # Clean the response - remove markdown code blocks if present
        cleaned_result = result.strip()
        if cleaned_result.startswith("```json"):
            cleaned_result = cleaned_result[7:]  # Remove ```json
        if cleaned_result.startswith("```"):
            cleaned_result = cleaned_result[3:]  # Remove ```
        if cleaned_result.endswith("```"):
            cleaned_result = cleaned_result[:-3]  # Remove trailing ```
        
        cleaned_result = cleaned_result.strip()
        
        try:
            analysis = json.loads(cleaned_result)
        except json.JSONDecodeError as e:
            print(f"[ai_api] critique_graph: JSON parsing error: {e}")
            print(f"[ai_api] critique_graph: Raw response: {result}")
            print(f"[ai_api] critique_graph: Cleaned response: {cleaned_result}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response")
        
        # Convert to Pydantic models
        argument_flaws = [ArgumentFlaw(**flaw) for flaw in analysis.get("argument_flaws", [])]
        pattern_matches = [PatternMatch(**match) for match in analysis.get("pattern_matches", [])]
        
        return CritiqueGraphResponse(
            argument_flaws=argument_flaws,
            pattern_matches=pattern_matches,
            overall_assessment=analysis.get("overall_assessment", ""),
            recommendations=analysis.get("recommendations", [])
        )
        
    except Exception as e:
        print(f"[ai_api] critique_graph: Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/ai/generate-comprehensive-report", response_model=GenerateComprehensiveReportResponse)
def generate_comprehensive_report(data: GenerateComprehensiveReportRequest = Body(...)):
    """
    Generate a comprehensive argument analysis report combining multiple AI analyses.
    
    This endpoint:
    1. Takes results from evidence evaluation, edge validation, assumptions analysis, and graph critique
    2. Analyzes the complete graph structure and content
    3. Generates a professional report following intelligence analysis standards
    4. Returns structured content for PDF generation
    """
    print(f"[ai_api] generate_comprehensive_report: Function started")
    print(f"[ai_api] generate_comprehensive_report: Processing {len(data.nodes)} nodes, {len(data.edges)} edges, {len(data.evidence)} evidence items")
    
    if not OPENAI_API_KEY:
        print("[ai_api] generate_comprehensive_report: No OpenAI API key configured.")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    try:
        openai.api_key = OPENAI_API_KEY
        
        # Prepare graph data for analysis
        graph_data = {
            "nodes": [{"id": node.id, "text": node.text, "type": node.type} for node in data.nodes],
            "edges": [{"source": edge.source, "target": edge.target, "weight": edge.weight} for edge in data.edges],
            "evidence": [{"id": ev.id, "title": ev.title, "excerpt": ev.excerpt, "confidence": ev.confidence} for ev in data.evidence],
            "supporting_documents": [{"id": doc.id, "name": doc.name, "type": doc.type} for doc in data.supportingDocuments]
        }
        
        # Prepare analysis results
        analysis_results = {
            "evidence_evaluation": data.evidence_evaluation_results or {},
            "edge_validation": data.edge_validation_results or {},
            "assumptions": data.assumptions_results or {},
            "critique": data.critique_results or {}
        }
        
        # Create comprehensive prompt for report generation
        prompt = f"""
        You are an expert intelligence analyst tasked with creating a comprehensive argument analysis report. 
        
        GRAPH DATA:
        Nodes: {json.dumps([{"id": node.id, "text": node.text, "type": node.type} for node in data.nodes], indent=2)}
        Edges: {json.dumps([{"source": edge.source, "target": edge.target, "weight": edge.weight} for edge in data.edges], indent=2)}
        Evidence: {json.dumps([{"id": ev.id, "title": ev.title, "excerpt": ev.excerpt, "confidence": ev.confidence} for ev in data.evidence], indent=2)}
        Supporting Documents: {json.dumps([{"id": doc.id, "name": doc.name, "type": doc.type} for doc in data.supportingDocuments], indent=2)}
        
        ANALYSIS RESULTS:
        Evidence Evaluation: {json.dumps(data.evidence_evaluation_results or {}, indent=2)}
        Edge Validation: {json.dumps(data.edge_validation_results or {}, indent=2)}
        Assumptions Analysis: {json.dumps(data.assumptions_results or {}, indent=2)}
        Graph Critique: {json.dumps(data.critique_results or {}, indent=2)}
        
        GRAPH TITLE: {data.graph_title or "Argument Analysis"}
        ANALYST: {data.analyst_name or "IntelliProof AI"}
        CONTACT: {data.analyst_contact or "ai@intelliproof.com"}
        DATE: {datetime.now().strftime("%B %d, %Y")}
        
        Create a detailed, professional intelligence analysis report. Each section should be substantial and informative:
        
        1. COVER PAGE: Professional cover with title, date, analyst info, and brief description
        2. EXECUTIVE SUMMARY: 3-5 paragraph overview of key findings, argument structure, and main conclusions
        3. SCOPE & OBJECTIVES: Detailed description of what was analyzed, why it matters, and investigation goals
        4. METHODOLOGY: Comprehensive description of analysis approach, tools used, and evaluation criteria
        5. FINDINGS: Detailed structured results including:
           - Node-by-node analysis with evidence evaluation
           - Edge validation results and logical connections
           - Assumptions identified and their implications
           - Graph structure analysis and patterns
        6. ANALYSIS: In-depth insights including:
           - Argument strength assessment
           - Logical flow analysis
           - Evidence quality evaluation
           - Potential weaknesses and counter-arguments
           - Recommendations for improvement
        7. CONCLUSION: Comprehensive summary of key takeaways, argument effectiveness, and final assessment
        8. APPENDIX: Raw data, detailed logs, timestamps, and supporting information
        
        IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, explanations, or other text outside the JSON.
        
        Format the response as a JSON object with these exact keys. Each section should be substantial (400-800 words):
        {{
            "cover_page": "Professional cover page content with title, date, analyst info",
            "executive_summary": "Detailed 2-3 paragraph executive summary",
            "scope_objectives": "Comprehensive scope and objectives section", 
            "methodology": "Detailed methodology description",
            "findings": "Comprehensive findings with structured analysis. Include a summary of node arguments, evidence and relationships between nodes and edges",
            "analysis": "In-depth analysis with insights and recommendations",
            "conclusion": "Detailed conclusion with key takeaways. Include potential weaknesss, shortfalls and ways to improve the overall argument.",
            "appendix": "Comprehensive appendix with raw data and details",
            "report_metadata": {{
                "title": "{data.graph_title or "Argument Analysis"}",
                "date": "{datetime.now().strftime("%B %d, %Y")}",
                "analyst": "{data.analyst_name or "IntelliProof AI"}",
                "contact": "{data.analyst_contact or "ai@intelliproof.com"}"
            }}
        }}
        
        Make each section detailed, professional, and actionable. Include specific insights from the analysis results. The report should be comprehensive and provide valuable intelligence analysis.
        
        RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT OR FORMATTING.
        """
        
        print(f"[ai_api] generate_comprehensive_report: Sending request to OpenAI")
        
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert intelligence analyst specializing in argument analysis and critical thinking. Create professional, detailed reports that follow intelligence analysis standards. Be comprehensive and thorough in your analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=8000,
            temperature=0.3
        )
        
        result = response.choices[0].message.content
        print(f"[ai_api] generate_comprehensive_report: Received response from OpenAI")
        print(f"[ai_api] generate_comprehensive_report: Response length: {len(result)} characters")
        print(f"[ai_api] generate_comprehensive_report: Response preview: {result[:200]}...")
        
        # Check if response is empty or too short
        if not result or len(result.strip()) < 100:
            print(f"[ai_api] generate_comprehensive_report: Response too short or empty, using fallback")
            fallback_report = {
                "cover_page": f"# {data.graph_title or 'Argument Analysis Report'}\n\nDate: {datetime.now().strftime('%Y-%m-%d')}\nAnalyst: {data.analyst_name or 'IntelliProof AI'}\nContact: {data.analyst_contact or 'ai@intelliproof.com'}",
                "executive_summary": "Analysis of argument structure and evidence quality.",
                "scope_objectives": "Comprehensive evaluation of argument validity and strength.",
                "methodology": "AI-powered analysis using evidence evaluation, edge validation, and graph critique.",
                "findings": f"Analyzed {len(data.nodes)} claims and {len(data.edges)} relationships with {len(data.evidence)} evidence items.",
                "analysis": "Detailed analysis of argument structure and evidence quality.",
                "conclusion": "Summary of key findings and recommendations.",
                "appendix": "Technical details and raw analysis data.",
                "report_metadata": {
                    "title": data.graph_title or "Argument Analysis Report",
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "analyst": data.analyst_name or "IntelliProof AI",
                    "contact": data.analyst_contact or "ai@intelliproof.com"
                }
            }
            return GenerateComprehensiveReportResponse(**fallback_report)
        
        # Parse the JSON response
        try:
            report_data = json.loads(result)
            print(f"[ai_api] generate_comprehensive_report: Successfully parsed report data")
            return GenerateComprehensiveReportResponse(**report_data)
        except json.JSONDecodeError as e:
            print(f"[ai_api] generate_comprehensive_report: JSON parsing error: {e}")
            print(f"[ai_api] generate_comprehensive_report: Raw response: {result}")
            
            # Try to extract JSON from the response if it's wrapped in markdown
            try:
                # Look for JSON between ```json and ``` markers
                import re
                json_match = re.search(r'```json\s*(.*?)\s*```', result, re.DOTALL)
                if json_match:
                    json_content = json_match.group(1)
                    report_data = json.loads(json_content)
                    print(f"[ai_api] generate_comprehensive_report: Successfully extracted JSON from markdown")
                    return GenerateComprehensiveReportResponse(**report_data)
            except Exception as extract_error:
                print(f"[ai_api] generate_comprehensive_report: JSON extraction failed: {extract_error}")
            
            # Fallback: create a detailed report structure based on available data
            node_summary = "\n".join([f"- {node.text} (Type: {node.type})" for node in data.nodes])
            edge_summary = "\n".join([f"- {edge.source} → {edge.target} (Weight: {edge.weight})" for edge in data.edges])
            evidence_summary = "\n".join([f"- {ev.title}: {ev.excerpt[:100]}..." for ev in data.evidence])
            
            fallback_report = {
                "cover_page": f"IntelliProof Argument Analysis Report\n\nCase: {data.graph_title or 'Argument Analysis'}\nDate: {datetime.now().strftime('%B %d, %Y')}\nAnalyst: {data.analyst_name or 'IntelliProof AI'}\nContact: {data.analyst_contact or 'ai@intelliproof.com'}\n\nThis report provides a comprehensive analysis of the argument structure, evidence quality, and logical relationships.",
                "executive_summary": f"This analysis examined an argument consisting of {len(data.nodes)} claims connected by {len(data.edges)} relationships, supported by {len(data.evidence)} evidence items. The argument structure was evaluated using AI-powered analysis tools to assess evidence quality, logical connections, and overall argument strength. Key findings indicate the argument's effectiveness and areas for potential improvement.",
                "scope_objectives": f"The scope of this analysis encompassed a comprehensive evaluation of argument validity, evidence quality, and logical structure. The objective was to provide an intelligence-style assessment of the argument's strength, identify potential weaknesses, and offer recommendations for improvement. The analysis examined {len(data.nodes)} claims across different types and {len(data.edges)} logical connections.",
                "methodology": "This analysis employed AI-powered tools including evidence evaluation algorithms, edge validation systems, assumptions generation, and graph critique functions. The methodology combined automated analysis with structured evaluation criteria to assess argument quality, evidence reliability, and logical coherence. Multiple analysis techniques were applied to ensure comprehensive coverage.",
                "findings": f"Analysis Results:\n\nClaims Analyzed ({len(data.nodes)}):\n{node_summary}\n\nRelationships Evaluated ({len(data.edges)}):\n{edge_summary}\n\nEvidence Reviewed ({len(data.evidence)}):\n{evidence_summary}\n\nThe analysis revealed patterns in argument structure and evidence quality that inform the overall assessment.",
                "analysis": "The argument demonstrates varying levels of evidence support and logical coherence. Key insights include the distribution of claim types, strength of evidence connections, and overall argument structure. Areas of strength and potential weaknesses were identified through systematic evaluation. Recommendations focus on improving evidence quality and logical flow.",
                "conclusion": "This comprehensive analysis provides valuable insights into argument structure and effectiveness. The findings support evidence-based assessment of argument quality and offer actionable recommendations for improvement. The analysis methodology proved effective for evaluating complex argument structures.",
                "appendix": f"Technical Details:\n- Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n- Total Claims: {len(data.nodes)}\n- Total Relationships: {len(data.edges)}\n- Total Evidence Items: {len(data.evidence)}\n- Analysis Tools: AI-powered evaluation systems\n- Report Generated By: IntelliProof AI System",
                "report_metadata": {
                    "title": data.graph_title or "Argument Analysis Report",
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "analyst": data.analyst_name or "IntelliProof AI",
                    "contact": data.analyst_contact or "ai@intelliproof.com"
                }
            }
            return GenerateComprehensiveReportResponse(**fallback_report)
            
    except Exception as e:
        print(f"[ai_api] generate_comprehensive_report: Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

@router.post("/api/ai/check-unified-evidence", response_model=UnifiedEvidenceResponse)
def check_unified_evidence(data: UnifiedEvidenceRequest = Body(...)):
    """
    Evaluate ALL evidence attached to a claim together and return a single
    unified score in [-1, 1], along with a brief evaluation label and reasoning.
    If no evidence is attached, returns score 0.0 with a neutral explanation.
    """
    node = data.node

    evidence_ids = node.evidenceIds or []
    if len(evidence_ids) == 0:
        return UnifiedEvidenceResponse(
            node_id=node.id,
            score=0.0,
            evaluation="Neutral",
            reasoning="No evidence attached to this claim.",
        )

    evidences_text: list[str] = []
    for eid in evidence_ids:
        ev = next((e for e in data.evidence if e.id == eid), None)
        if not ev:
            continue
        doc = next((d for d in (data.supportingDocuments or []) if d.id == ev.supportingDocId), None)
        doc_info = f"Name: {doc.name}\nType: {doc.type}\nURL: {doc.url}\n" if doc else ""
        evidences_text.append(
            f"- Title: {ev.title}\n- Content: {ev.excerpt}\n- Supporting Document: {doc_info}"
        )

    if len(evidences_text) == 0:
        return UnifiedEvidenceResponse(
            node_id=node.id,
            score=0.0,
            evaluation="Neutral",
            reasoning="No valid evidence found for this claim.",
        )

    prompt = f"""
You are evaluating how well the entire set of evidence supports a specific claim, considering ALL pieces together.

CLAIM:
"{node.text}"

EVIDENCE SET:
{chr(10).join(evidences_text)}

TASK:
Provide a single overall evaluation for how well the EVIDENCE SET supports or contradicts the CLAIM.

Respond in this exact format:
Evaluation: <Supports|Contradicts|Neutral|Irrelevant|Unsure>
Reasoning: <2-4 sentences explaining your overall assessment>
Score: <a single number between -1.0 and 1.0 (negative = contradicts, positive = supports)>
"""

    try:
        content = run_llm([{"role": "user", "content": prompt}], DEFAULT_MCP)

        evaluation = "Unsure"
        reasoning = content
        score = 0.0

        for line in content.splitlines():
            if line.lower().startswith("evaluation:"):
                evaluation = line.split(":", 1)[1].strip()
            if line.lower().startswith("reasoning:"):
                reasoning = line.split(":", 1)[1].strip()
            if line.lower().startswith("score:"):
                try:
                    score = float(line.split(":", 1)[1].strip())
                    score = max(min(score, 1.0), -1.0)
                except Exception:
                    score = 0.0

        return UnifiedEvidenceResponse(
            node_id=node.id,
            score=score,
            evaluation=evaluation,
            reasoning=reasoning,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unified evidence evaluation failed: {str(e)}")

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
You are evaluating how well a piece of evidence supports a specific claim. Focus ONLY on the claim content provided.

CLAIM TO EVALUATE: "{node.text}"

EVIDENCE TO ANALYZE:
- Title: {evidence.title}
- Content: {evidence.excerpt}
- Supporting Document: {doc_info}

TASK: Evaluate how well this evidence supports or contradicts the specific claim above.

IMPORTANT: 
- Only consider the claim content: "{node.text}"
- Do not make assumptions about what the claim might mean
- Do not evaluate against other claims or broader topics
- Focus solely on whether this evidence directly supports or contradicts the stated claim

Respond in this exact format:
Evaluation: <Supports|Contradicts|Neutral|Irrelevant|Unsure>
Reasoning: <your explanation. Keep it to 2-4 sentences, focusing specifically on how this evidence relates to the claim: "{node.text}">
Score: <a precise number between -1.0 and 1.0 giving the evidence a score of how well the evidence supports or contradicts the claim. Use the full range with decimal precision. Examples: 0.8 (strongly supports), -0.3 (weakly contradicts), 0.0 (neutral), 0.45 (moderately supports), -0.9 (strongly contradicts).>
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
                if line.lower().startswith("score:"):
                    try:
                        confidence_val = float(line.split(":", 1)[1].strip())
                        confidence_val = min(max(confidence_val, -1.0), 1.0)
                    except Exception:
                        confidence_val = 0.0
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


def get_affected_nodes(target_node_id: str, nodes: List[NodeModel], edges: List[EdgeModel]) -> set[str]:
    """
    Find all nodes that would be affected by a change to the target node.
    
    A node is affected if:
    1. It is the target node itself
    2. It has an outgoing edge TO another node (other node depends on this one)
    3. Any node that depends on this node is also affected (transitive dependency)
    
    Example: If we have A → B → C, and we modify A:
    - A is affected (target node)
    - B is affected (A has outgoing arrow to B)
    - C is affected (A has outgoing arrow to C through B)
    
    When we modify C:
    - C is affected (target node)
    - Nothing else is affected (C has no outgoing arrows)
    
    Returns a set of node IDs that need credibility recalculation.
    """
    print(f"[ai_api] get_affected_nodes: Finding nodes affected by changes to {target_node_id}")
    
    # Start with the target node
    affected_nodes = {target_node_id}
    nodes_to_check = {target_node_id}
    
    # Keep track of all node IDs for validation
    all_node_ids = {node.id for node in nodes}
    
    # Build adjacency list for efficient traversal
    # dependency_graph[node_id] = list of nodes that depend on this node
    # If A → B, then A depends on B, so when B changes, A is affected
    dependency_graph = {}
    for edge in edges:
        if edge.target not in dependency_graph:
            dependency_graph[edge.target] = []
        dependency_graph[edge.target].append(edge.source)
    
    print(f"[ai_api] get_affected_nodes: Dependency graph (when source changes, target is affected): {dependency_graph}")
    
    # BFS to find all affected nodes (follow dependencies downstream)
    while nodes_to_check:
        current_node = nodes_to_check.pop()
        print(f"[ai_api] get_affected_nodes: Checking node {current_node}")
        
        # Find all nodes that depend on this node
        if current_node in dependency_graph:
            for dependent_node in dependency_graph[current_node]:
                if dependent_node not in affected_nodes:
                    print(f"[ai_api] get_affected_nodes: Node {dependent_node} depends on {current_node}, adding to affected set")
                    affected_nodes.add(dependent_node)
                    nodes_to_check.add(dependent_node)
    
    print(f"[ai_api] get_affected_nodes: Final affected nodes: {affected_nodes}")
    return affected_nodes


@router.post("/api/ai/get-node-credibility", response_model=NodeCredibilityResponse)
def get_node_credibility(data: NodeCredibilityRequest = Body(...)):
    """
    Compute credibility scores for a specific node and all nodes that depend on it.
    
    This is a selective version of the credibility propagation that only calculates
    scores for nodes that would be affected by changes to the target node.
    
    Algorithm:
    1. Find all nodes that depend on the target node (outgoing edges)
    2. Build the complete affected subgraph
    3. Calculate credibility only for nodes in this subgraph
    """
    print(f"[ai_api] get_node_credibility: Function started for target node {data.target_node_id}")
    print(f"[ai_api] get_node_credibility: Total nodes in graph: {len(data.nodes)}")
    print(f"[ai_api] get_node_credibility: Total edges in graph: {len(data.edges)}")
    
    # Step 1: Find all affected nodes
    affected_node_ids = get_affected_nodes(data.target_node_id, data.nodes, data.edges)
    print(f"[ai_api] get_node_credibility: Affected nodes: {affected_node_ids}")
    
    # Step 2: Filter nodes and edges to only include affected subgraph
    affected_nodes = [node for node in data.nodes if node.id in affected_node_ids]
    affected_edges = [edge for edge in data.edges if edge.source in affected_node_ids and edge.target in affected_node_ids]
    
    print(f"[ai_api] get_node_credibility: Affected subgraph has {len(affected_nodes)} nodes and {len(affected_edges)} edges")
    
    # Step 3: Calculate initial evidence scores for affected nodes
    E = {}
    for node in affected_nodes:
        E[node.id] = 0.0
        print(f"[ai_api] get_node_credibility: Initially set Node {node.id} E_i = 0.0")

        evidence = node.evidence or []
        print(f"[ai_api] get_node_credibility: Node {node.id} has evidence: {evidence}")

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
                print(f"[ai_api] get_node_credibility: Updated Node {node.id} E_i to {E[node.id]} (from {N_i} evidence items)")
    
    target_node = next((node for node in affected_nodes if node.id == data.target_node_id), None)
    if target_node:
        # Check if this node has any incoming edges (other nodes point TO this node)
        has_incoming_edges = any(edge.target == data.target_node_id for edge in data.edges)
        # Check if this node has any outgoing edges (this node points TO other nodes)
        has_outgoing_edges = any(edge.source == data.target_node_id for edge in data.edges)
        
        is_isolated = not has_outgoing_edges
        # not has_incoming_edges
        
        if is_isolated:
            print(f"[ai_api] get_node_credibility: Target node {data.target_node_id} is isolated (source node)")
            print(f"[ai_api] get_node_credibility: Returning evidence score as intrinsic score: {E[data.target_node_id]}")
            
            # For isolated nodes, return the evidence score as the final intrinsic score
            # Skip the iterative process since isolated nodes are not updated during iterations
            return NodeCredibilityResponse(
                target_node_id=data.target_node_id,
                affected_nodes=[data.target_node_id],
                initial_evidence={data.target_node_id: E[data.target_node_id]},
                iterations=[{data.target_node_id: E[data.target_node_id]}],  # Single iteration with evidence score
                final_scores={data.target_node_id: E[data.target_node_id]}
            )

    # Step 4: Initialize credibility scores
    c = {node.id: E[node.id] for node in affected_nodes}
    print(f"[ai_api] get_node_credibility: Initial credibility scores: {c}")
    
    # Step 5: Build adjacency list for efficient computation
    incoming_edges = {}
    for edge in affected_edges:
        if edge.target not in incoming_edges:
            incoming_edges[edge.source] = []
        incoming_edges[edge.source].append((edge.target, edge.weight or 1.0))
    
    print(f"[ai_api] get_node_credibility: Incoming edges: {incoming_edges}")
    
    # Step 6: Iterative credibility propagation
    iterations = [c.copy()]
    converged = False
    iteration_count = 0
    
    while not converged and iteration_count < data.max_iterations:
        iteration_count += 1
        c_new = {}
        max_change = 0.0
        
        for node in affected_nodes:
            node_id = node.id
            
            # Calculate new score for target node
            Z = data.lambda_ * E[node_id]
            print(f"[ai_api] get_node_credibility: Node {node_id} initial Z = {Z} (lambda={data.lambda_} * evidence={E[node_id]})")
            
            # Add contributions from incoming edges
            if node_id in incoming_edges:
                for source_id, weight in incoming_edges[node_id]:
                    if source_id in c:  # Only consider edges from nodes in our subgraph
                        contribution = weight * c[source_id]
                        Z += contribution
                        print(f"[ai_api] get_node_credibility: Adding contribution from {source_id}: {weight} * {c[source_id]} = {contribution}")
            
            # Apply tanh squashing function
            c_new[node_id] = math.tanh(Z)
            change = abs(c_new[node_id] - c[node_id])
            max_change = max(max_change, change)
            
            print(f"[ai_api] get_node_credibility: Node {node_id} new score: {c_new[node_id]} (change: {change})")
        
        # Update scores
        c = c_new
        iterations.append(c.copy())
        
        # Check convergence
        if max_change < data.epsilon:
            converged = True
            print(f"[ai_api] get_node_credibility: Converged after {iteration_count} iterations (max change: {max_change})")
        else:
            print(f"[ai_api] get_node_credibility: Iteration {iteration_count}, max change: {max_change}")
    
    if not converged:
        print(f"[ai_api] get_node_credibility: Warning: Did not converge after {data.max_iterations} iterations")
    
    print(f"[ai_api] get_node_credibility: Final credibility scores: {c}")
    print(f"[ai_api] get_node_credibility: Function completed successfully")
    
    return NodeCredibilityResponse(
        target_node_id=data.target_node_id,
        affected_nodes=list(affected_node_ids),
        initial_evidence=E,
        iterations=iterations,
        final_scores=c
    )


@router.post("/api/ai/chat", response_model=ChatResponse)
def chat_about_graph(data: ChatRequest = Body(...)):
    """
    AI chat endpoint that answers questions about the graph.
    
    This endpoint allows users to ask natural language questions about their
    argument graph and receive intelligent responses based on the graph structure,
    evidence, and relationships.
    """
    try:
        # Prepare context about the graph
        nodes = data.graph_data.get("nodes", [])
        edges = data.graph_data.get("edges", [])
        evidence = data.graph_data.get("evidence", [])
        documents = data.graph_data.get("supportingDocuments", [])
        
        # Create a comprehensive system prompt with few-shot learning
        system_prompt = f"""You are an expert argument analyst with deep knowledge of logical reasoning, evidence evaluation, and argument structure. You provide intelligent, professional analysis while maintaining a conversational flow that weaves information naturally into prose rather than using lists or bullet points.

You have access to their argument graph with this information:

NODES ({len(nodes)} total):
{chr(10).join([f"- {node.get('id', 'Unknown')}: {node.get('text', 'No text')} (Type: {node.get('type', 'Unknown')})" for node in nodes])}

EDGES ({len(edges)} total):
{chr(10).join([f"- {edge.get('source', 'Unknown')} → {edge.get('target', 'Unknown')} (Weight: {edge.get('weight', 0)})" for edge in edges])}

EVIDENCE ({len(evidence)} total):
{chr(10).join([f"- {ev.get('title', 'No title')}: {ev.get('excerpt', 'No excerpt')[:100]}..." for ev in evidence])}

SUPPORTING DOCUMENTS ({len(documents)} total):
{chr(10).join([f"- {doc.get('name', 'No name')} ({doc.get('type', 'Unknown type')})" for doc in documents])}

**FEW-SHOT EXAMPLES - Learn from these response styles:**

User: "What's the main argument here?"
Assistant: "Your argument centers on the claim that renewable energy adoption is economically viable, supported by evidence demonstrating significant cost reductions in solar technology and substantial job creation in the green energy sector. The logical structure flows effectively from economic feasibility to broader policy implications, creating a coherent narrative that addresses both practical concerns and strategic benefits."

User: "Are there any weaknesses in my argument?"
Assistant: "While your argument demonstrates strong evidence for the economic benefits of renewable energy, there's a notable gap regarding transition costs and infrastructure requirements. The evidence you've presented focuses primarily on positive outcomes without adequately addressing the practical challenges of implementation. Incorporating claims about manageable transition costs or offsetting long-term benefits would strengthen your position against common counterarguments."

User: "How do these claims relate to each other?"
Assistant: "The relationship between your claims forms a logical progression from technological advancement to economic viability to policy justification. Your evidence about solar panel cost reductions directly supports the economic feasibility claim, which in turn strengthens the broader policy argument. The weight distribution in your edges suggests you've appropriately prioritized the most critical supporting evidence."

**YOUR ROLE:**
- Answer questions about their argument structure and logic
- Identify gaps, weaknesses, and strengths
- Suggest improvements and missing evidence
- Explain how claims relate to each other
- Give practical, actionable advice and information
- Do not answer anything that is not related to the argument or the graph

**RESPONSE STYLE:**
- Be direct and to the point (2-3 sentences max)
- Speak like an experienced consultant who is knowledgeable about the argument
- Give specific, actionable insights and information
- Be encouraging but honest about weaknesses
- Use natural, flowing prose (no lists or bullet points)"""

        # Prepare conversation history
        messages = []
        for msg in data.chat_history[-5:]:  # Keep last 5 messages for context
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add the current user message
        messages.append({"role": "user", "content": data.user_message})
        
        # Create a specialized MCP for chat
        chat_mcp = ModelControlProtocol(
            model_name="gpt-4o-mini",
            temperature=0.7,  # Increased for more conversational and varied responses
            max_tokens=500,
            system_prompt=system_prompt
        )
        
        # Get AI response
        response = run_llm(messages, chat_mcp)
        
        return ChatResponse(
            assistant_message=response,
            reasoning="Generated based on graph analysis",
            confidence=0.8,
            suggested_actions=[
                "Check evidence for claims",
                "Validate edge relationships", 
                "Generate assumptions",
                "Analyze argument structure"
            ]
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")