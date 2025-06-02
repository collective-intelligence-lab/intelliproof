**IntelliProof UI Component Spec Sheet**

---

## 📊 Component Overview

This document outlines the modular UI components for IntelliProof, including descriptions, responsibilities, and frontend development priorities. These are designed for React-based implementation with hooks to a Python AI backend.

---

## Core Components & Specs

### 1. **Graph Canvas Module**

**Purpose:** Central visualization and interaction with the argument graph.

* **Tech:** Cytoscape.js / vis.js / D3.js/ whatever
* **Features:**

  * Add/remove/edit node (modal or right-click)
  * Add/remove/edit edge (via drag or modal)
  * Edge-type validation (based on claim types)
  * Node tooltips (claim summary, type)
  * Context menu: Analyze Node, View Evidence, Delete, Add Link

**Backend Hooks:**

* `analyze_node(node_id)`
* `get_evidence_for_claim(claim_id)`

**Dev Priority:** ⭐⭐⭐⭐⭐ (Essential)

---

### 2. **Evidence Explorer Panel**

**Purpose:** Visual exploration of evidence assets, searchable/queryable.

* **Tabs:** Starter Kit | Queried Results | All Explored
* **Evidence Card Fields:**

  * Title
  * Source, Date, Confidence level
  * Type icon (video, memo, doc, image)
  * Drag-to-Graph handle
* **Modal Preview:** Full evidence text, linked claims, metadata

**Backend Hooks:**

* `query_evidence(question: str)`

**Dev Priority:** ⭐⭐⭐⭐ (High)

---

### 3. **AI Assistant Panel**

**Purpose:** User-AI chat interface for intelligent querying and feedback.

* **Features:**

  * Scrollable message thread
  * Prompt input + submit button
  * AI response cards (text, evidence, critique)
  * Buttons in message: "Add to Graph", "Find Assumptions", etc.

**Backend Hooks:**

* `handle_user_prompt(prompt: str)`
* `generate_graph_nudges(graph)`

**Dev Priority:** ⭐⭐⭐⭐ (High)

---

### 4. **Claim Creator Modal**

**Purpose:** Add a new claim node to graph.

* **Fields:**

  * Claim text
  * Claim type (dropdown)
  * Evidence links (optional)
* **Auto-classification hook** available

**Backend Hooks:**

* `classify_claim_type(text)`

**Dev Priority:** ⭐⭐⭐ (Medium)

---

### 5. **Edge Editor Modal**

**Purpose:** Manually define relation between claims.

* **Fields:**

  * Source node, Target node
  * Edge type: Support/Attack
  * Validation notice if type-violation occurs

**Backend Hooks:**

* `validate_edge_type(from_type, to_type)`

**Dev Priority:** ⭐⭐⭐ (Medium)

---

### 6. **Graph Review Toolbar**

**Purpose:** Trigger global graph-level tools.

* **Buttons:**

  * Analyze Graph
  * Generate Report
  * Compare Graphs
  * Evaluate vs Ground Truth

**Backend Hooks:**

* `critique_graph(graph)`
* `compare_to_ground_truth(graph)`
* `summarize_argument(graph)`

**Dev Priority:** ⭐⭐⭐⭐ (High)

---

### 7. **Multi-User Session Tools**

**Purpose:** Enable collaboration and graph comparison.

* **Modes:** Side-by-side or overlay graphs
* **Features:**

  * User color coding
  * Shared insights panel
  * Toggle diff view

**Backend Hooks:**

* `compare_graphs(graph1, graph2)`
* `recommend_cross_user_evidence()`

**Dev Priority:** ⭐⭐⭐ (Medium–High)

---

### 8. **Toasts & Alerts**

**Purpose:** Provide system-level feedback during interaction.

* **Examples:**

  * "Claim type mismatch"
  * "Unsupported conclusion"
  * "Assumption detected in C3"

**Trigger Sources:** Graph analysis, claim validation, AI messages

**Dev Priority:** ⭐⭐⭐ (Medium)

---

### 9. **Session Manager + Export Tools**

**Purpose:** Save/load/replay user sessions.

* **Features:**

  * JSON graph export
  * Load saved graph from file or ID
  * Export AI report to Markdown/PDF

**Dev Priority:** ⭐⭐ (Optional for July 14, essential for final demo)

---


