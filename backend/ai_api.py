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
    PatternMatch  # NEW
)
from llm_manager import run_llm, DEFAULT_MCP, ModelControlProtocol

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
                print(f"DEBUG: Node {node_id} initial Z = {Z} (lambda={data.lambda_} * evidence={E[node.id]})")
                
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

@router.post("/api/ai/generate-assumptions", response_model=GenerateAssumptionsResponse)
def generate_assumptions(data: GenerateAssumptionsRequest = Body(...)):
    """
    Generate 3-5 implicit assumptions required by an edge relationship to be valid.
    
    This endpoint analyzes the relationship between two nodes connected by an edge
    and identifies the implicit assumptions that must be true for the relationship to be valid.
    
    The function considers:
    - Edge direction (support vs attack)
    - Node content and evidence
    - Logical relationships between claims
    - Hidden premises that strengthen or weaken the connection
    """
    print(f"[ai_api] generate_assumptions: Function started for edge {data.edge.source} -> {data.edge.target}")
    
    def format_evidence_for_node(node: NodeWithEvidenceModel) -> str:
        """Format evidence for a specific node."""
        if not node.evidenceIds:
            return "No evidence provided"
        
        evidence_texts = []
        for eid in node.evidenceIds:
            evidence = next((e for e in data.evidence if e.id == eid), None)
            if evidence:
                doc = next((d for d in (data.supportingDocuments or []) if d.id == evidence.supportingDocId), None)
                doc_info = f" (from {doc.name})" if doc else ""
                evidence_texts.append(f"- {evidence.title}: {evidence.excerpt}{doc_info}")
        
        return "\n".join(evidence_texts) if evidence_texts else "No evidence provided"
    
    # Format evidence for both nodes
    source_evidence = format_evidence_for_node(data.source_node)
    target_evidence = format_evidence_for_node(data.target_node)
    
    # Determine edge type based on weight or default to support
    edge_type = "support"
    if data.edge.weight is not None:
        if data.edge.weight < 0:
            edge_type = "attack"
        elif data.edge.weight > 0:
            edge_type = "support"
        else:
            edge_type = "neutral"
    
    # Build the prompt for assumption generation
    prompt = f"""
You are an expert in argument analysis. Identify 3-5 implicit assumptions required for this {edge_type} relationship to be valid.

EDGE: {data.source_node.text} → {data.target_node.text}
SOURCE: {data.source_node.text} (Type: {data.source_node.type})
TARGET: {data.target_node.text} (Type: {data.target_node.type})
EVIDENCE: {source_evidence[:500]}... (source) | {target_evidence[:500]}... (target)

TASK: Generate 3-5 assumptions that must be true for this {edge_type} relationship.

Respond in this format:
Relationship Type: <support|attack|neutral>
Overall Confidence: <float 0.0-1.0>

Assumption 1: <specific assumption>
Reasoning 1: <brief explanation>
Importance 1: <float 0.0-1.0>
Confidence 1: <float 0.0-1.0>

[Continue for 3-5 assumptions]

Summary: <2-3 sentences>
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
        overall_confidence = 0.5
        assumptions = []
        summary = ""
        
        lines = content.splitlines()
        current_assumption = None
        current_reasoning = ""
        current_importance = 0.5
        current_confidence = 0.5
        
        for line in lines:
            line_lower = line.lower().strip()
            
            if line_lower.startswith("relationship type:"):
                relationship_type = line.split(":", 1)[1].strip().lower()
            elif line_lower.startswith("overall confidence:"):
                try:
                    overall_confidence = float(line.split(":", 1)[1].strip())
                    overall_confidence = min(max(overall_confidence, 0.0), 1.0)
                except Exception:
                    overall_confidence = 0.5
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
        
        # Ensure we have at least 3 assumptions
        if len(assumptions) < 3:
            print(f"[ai_api] generate_assumptions: Warning: Only {len(assumptions)} assumptions generated, adding default ones")
            while len(assumptions) < 3:
                assumptions.append(Assumption(
                    assumption_text=f"Additional assumption needed for {edge_type} relationship",
                    reasoning="This assumption is required to establish the logical connection between the claims.",
                    importance=0.5,
                    confidence=0.5
                ))
        
        # Limit to 5 assumptions
        if len(assumptions) > 5:
            assumptions = assumptions[:5]
        
        print(f"[ai_api] generate_assumptions: Generated {len(assumptions)} assumptions")
        
        response = GenerateAssumptionsResponse(
            edge_id=f"{data.edge.source}-{data.edge.target}",
            source_node_id=data.source_node.id,
            target_node_id=data.target_node.id,
            source_node_text=data.source_node.text,
            target_node_text=data.target_node.text,
            edge_type=edge_type,
            relationship_type=relationship_type,
            assumptions=assumptions,
            summary=summary if summary else f"Generated {len(assumptions)} assumptions for {edge_type} relationship",
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
        
        yaml_path = os.path.join(os.path.dirname(__file__), "..", "spec", "argument_patterns_bank.yaml")
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