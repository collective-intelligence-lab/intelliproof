Here’s a full feature list for **IntelliProof**, spanning both UI and AI functionality across Phases 1 and 2.

---

## UI & Interaction Features (Phase 1)

### Core Layout

* Three-panel responsive UI:

  * Left: **Evidence Explorer**
  * Center: **Graph Canvas**
  * Right: **AI Assistant Panel**

### Graph Canvas

* Add/edit/delete nodes (claims) via modal
* Add/edit/delete edges (support/attack) via modal or drag
* Node coloring by claim type (Factual, Value, Policy)
* Context menu on node: Analyze, View Evidence, Add Link, Delete
* Tooltip on hover: truncated text + claim type
* Real-time type validation on edges

### Evidence Explorer

* Tabbed interface: Starter Kit, Queried, All Explored
* Evidence cards with title, source, type, confidence badge
* Evidence preview modal with full content
* Drag-and-drop to graph to link to claims

### AI Assistant (UI-only in Phase 1)

* Chat thread with user/AI messages
* Prompt input field + send button
* Message types: AI text, evidence links, critique notices
* Action buttons in AI replies (e.g., “Add to Graph”, “Search Timeline”)

### Claim & Edge Creation

* Claim creation modal with manual type selection or auto-classify
* Edge creation modal with support/attack selector
* Visual edge validation based on claim-type rules

### Multi-User Support

* Dual-analyst view toggle or split screen mode
* Color-coding of claims by user
* Shared graph overlays

### Export & Save

* Export graph as JSON
* Import previous sessions
* Save named user sessions
* Replay saved graph state

### Visual Polish

* Toast alerts for type mismatches, missing links, AI notifications
* Smooth transitions between tabs and panels
* Dark mode or theme toggle (optional)

---

## AI Features (Phase 2)

### Evidence Querying & Retrieval

* Natural language question-to-evidence via `query_evidence`
* Return filtered, scored evidence based on relevance
* Retrieval enhanced by AMR, semantic similarity, or keyword tags

### Claim Classification

* Auto-classification of user-entered claims as Factual, Value, or Policy
* Explanation or confidence score (optional)

### Assumption Detection

* Suggests missing premises or warrants
* Context-aware: considers local subgraph and evidence

### Graph Critique

* Surface structural flaws (e.g., circularity, unsupported claims)
* Enforce claim-type flow rules (e.g., Factual → Policy requires Value bridge)

### Fallacy Detection

* Pattern-matching for known argumentation flaws
* Uses `argument_patterns_bank.yaml` for matching logic

### Claim Strength Estimation

* Scores nodes based on quantity/quality of linked evidence
* Explains rationale for low or high strength

### Ground Truth Comparison

* Compare user graph to canonical expert version
* Highlight:

  * Missing nodes/claims
  * Unsupported conclusions
  * Redundant reasoning

### Summary Generation

* Produces natural language narrative of user's argument graph
* Cites supporting evidence and confidence

### Multi-User Collaboration

* Compare graphs between two users
* Highlight:

  * Agreement
  * Disagreement
  * Missed opportunities (evidence found by one, not the other)
* Suggest evidence transfers between users

---


