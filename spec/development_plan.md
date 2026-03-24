**IntelliProof Summer Development Plan**

---

## 🌟 Overview

This document defines the two-phase development timeline for IntelliProof, specifying the work plan for two frontend developers and the backend team (PI and grad student). It integrates the UI and AI spec sheets, API contracts, and project goals leading to:

* **July 14:** Sponsor-ready polished UI demo with full frontend interactivity and backend hooks
* **August 12:** Fully functional AI-powered argumentation assistant demo

---

## ✅ Phase 1: UI Core Build (June 2 – July 14)

### 📅 Timeline Goal

A deployed, fully interactive, multi-user UI with graph construction, evidence management, chat scaffolding, and visual polish.

### 🧑‍💼 Team: 2 Frontend Developers

**Backend team (PI + grad student)** will provide mock APIs + schemas.

### 🔧 Development Objectives

| Week                    | Deliverables                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Week 1 (June 3–7)**   | Repo setup (React + FastAPI), 3-pane layout (Evidence, Graph, Chat), load mock evidence, basic graph canvas using Cytoscape.js                 |
| **Week 2 (June 10–14)** | Node/edge creation UI with claim typing, edge validation rules, Evidence Explorer with drag-and-drop to graph                                  |
| **Week 3 (June 17–21)** | Claim and edge editor modals, evidence preview modals, right-click menus on graph nodes, save/export graph JSON                                |
| **Week 4 (June 24–28)** | AI chat interface + stubs, hook all frontend features to backend endpoints with mock outputs, begin dual-user mode (split view or user toggle) |
| **Week 5 (July 1–5)**   | Polish UI/UX, develop test walkthroughs for user stories, improve transitions and interactive feedback (toasts, error banners)                 |
| **Week 6 (July 8–12)**  | Internal testing, deploy to demo server, prepare sponsor walkthrough script + documentation                                                    |

### ✨ Phase 1 Deliverables

* Responsive 3-panel UI with:

  * Graph canvas (nodes, edges, coloring, type-checks)
  * Evidence panel (tabbed, drag/drop, preview)
  * Chat panel (stubs)
* Node/edge modals
* Multi-user graph view support (simple toggle or split)
* Data models and API contract integrated into calls
* Deployment to live link + internal QA
* Slide deck and script for sponsor demo

---

## 🧪 Phase 2: AI Feature Integration (July 15 – August 12)

### 🔧 Development Objectives

| Week                       | Deliverables                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Week 7 (July 15–19)**    | `query_evidence` implementation with prompt engineering, evidence ranking, AMR-based inference hook      |
| **Week 8 (July 22–26)**    | `analyze_node`, `detect_assumptions`, `classify_claim_type` live integration, AI critique of subgraphs   |
| **Week 9 (July 29–Aug 2)** | Ground-truth comparison, `compare_to_ground_truth`, heatmap overlay, report generation and graph summary |
| **Week 10 (Aug 5–9)**      | Fallacy detection using pattern matching, dual-user graph comparison, cross-user insight suggestion      |
| **Final Week (Aug 10–12)** | Demo polishing, dry-runs, full walkthrough testing, printout/export of reasoning report                  |

### 🪡 AI Backend Functions

* `query_evidence`
* `analyze_node_strength`
* `detect_assumptions`
* `critique_graph`
* `classify_claim_type`
* `detect_fallacies`
* `compare_graphs`
* `compare_to_ground_truth`
* `summarize_argument`
* `recommend_cross_user_evidence`

### 🌟 Phase 2 Deliverables

* Functional AI system with backend integration
* Working AI assistant chat with evidence suggestion, critique, assumptions
* Graph evaluation with summary + heatmap overlay
* Multi-user comparison and recommendation support
* Final working demo

---

## 🚀 Coordination Notes

* Backend can be mocked using JSON stubs in Phase 1
* Frontend devs should expose all API calls as async hooks or fetch wrappers
* Weekly check-ins recommended every Friday
* Target stable demo deployment: **July 10 (for internal review)**
* Sponsor walkthrough: **July 14**
* Final dry-run: **Aug 9–10**


