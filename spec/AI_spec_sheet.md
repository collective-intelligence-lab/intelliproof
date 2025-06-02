**IntelliProof AI Feature Spec Sheet**

---

## 🧬 Overview

This document outlines the backend AI features and core logic for IntelliProof. Each feature includes its purpose, input/output signature, related UI triggers, and priority for implementation. These functions should be implemented as modular Python services, callable via API or internal interfaces.

---

## 🧐 AI Functional Modules

### 1. **Evidence Retrieval**

**Purpose:** Respond to user queries with relevant evidence items.

* **Function:** `query_evidence(question: str) -> List[Dict]`
* **Input:** Natural language query or graph context
* **Output:** List of evidence dicts with ID, title, content, confidence
* **UI Trigger:** Chat panel query or nudge
* **Priority:** ⭐⭐⭐⭐⭐ (Essential)

---

### 2. **Claim Typing**

**Purpose:** Auto-classify claims as Factual, Value, or Policy.

* **Function:** `classify_claim_type(text: str) -> str`
* **Input:** Claim text
* **Output:** Claim type string
* **UI Trigger:** Claim creation modal
* **Priority:** ⭐⭐⭐ (Medium)

---

### 3. **Edge Type Validation**

**Purpose:** Ensure logical consistency between linked claims.

* **Function:** `validate_edge_type(from_type: str, to_type: str) -> Optional[str]`
* **Input:** Claim type pair
* **Output:** None or warning string
* **UI Trigger:** Edge editor
* **Priority:** ⭐⭐⭐ (Medium)

---

### 4. **Graph Critique**

**Purpose:** Identify flaws in argument structure or logic.

* **Function:** `critique_graph(graph: Dict) -> List[str]`
* **Input:** Graph structure (nodes, edges)
* **Output:** List of critique messages or flaw labels
* **UI Trigger:** Analyze Graph button or nudge
* **Priority:** ⭐⭐⭐⭐⭐ (Essential)

---

### 5. **Fallacy Detection**

**Purpose:** Match known fallacy patterns using graph structure.

* **Function:** `detect_fallacies(graph: Dict) -> List[Dict]`
* **Input:** Graph
* **Output:** List of fallacies with affected node IDs
* **UI Trigger:** Analyze Graph, fallacy button
* **Priority:** ⭐⭐⭐⭐ (High)

---

### 6. **Implicit Assumption Detection**

**Purpose:** Surface missing warrants or unstated premises.

* **Function:** `detect_assumptions(claim: str, context: List[str]) -> List[str]`
* **Input:** Claim + evidence or graph context
* **Output:** Inferred assumptions
* **UI Trigger:** Node critique, chat
* **Priority:** ⭐⭐⭐⭐ (High)

---

### 7. **Node Strength Estimation**

**Purpose:** Score a claim's strength based on its supporting evidence.

* **Function:** `analyze_node_strength(node: Dict, evidence: List[Dict]) -> str`
* **Input:** Claim node + linked evidence
* **Output:** Confidence score + rationale
* **UI Trigger:** Right-click Analyze Node
* **Priority:** ⭐⭐⭐ (Medium)

---

### 8. **Graph Evaluation vs Ground Truth**

**Purpose:** Compare user graph to canonical expert model.

* **Function:** `compare_to_ground_truth(user_graph: Dict) -> Dict`
* **Input:** User’s graph
* **Output:** Coverage %, matched/missed claims, structural mismatch
* **UI Trigger:** Evaluate button
* **Priority:** ⭐⭐⭐⭐⭐ (Essential)

---

### 9. **Graph Summary Generator**

**Purpose:** Generate a narrative summary of the user’s graph.

* **Function:** `summarize_argument(graph: Dict) -> str`
* **Input:** Graph
* **Output:** Textual summary
* **UI Trigger:** Generate Report button
* **Priority:** ⭐⭐⭐ (Medium)

---

### 10. **Multi-User Graph Comparison**

**Purpose:** Identify agreement, divergence, and shared evidence.

* **Function:** `compare_graphs(graph1: Dict, graph2: Dict) -> Dict`
* **Input:** Two user graphs
* **Output:** Overlap/difference structure
* **UI Trigger:** Dual analyst mode
* **Priority:** ⭐⭐⭐⭐ (High)

---

### 11. **Cross-User Evidence Recommendation**

**Purpose:** Suggest useful evidence from one user to another.

* **Function:** `recommend_cross_user_evidence(graph1, graph2, evidence_pool) -> List[Dict]`
* **Input:** User graphs + full evidence set
* **Output:** Suggested evidence not yet seen by peer
* **UI Trigger:** Sidebar in multi-user mode
* **Priority:** ⭐⭐⭐ (Medium)

---


