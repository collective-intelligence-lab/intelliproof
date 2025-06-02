👩‍💼 Analyst Story 1: Building the Case
“I’m trying to figure out whether this scientist defected or was coerced. I start with a few pieces of evidence, build a graph of claims, and link them with support and attack edges. The AI suggests missing connections and flags unsupported conclusions.”

→ ✨ Design Implication:
Drag-and-drop evidence, easy claim creation, AI nudges for coverage.

🕵️‍♂️ Analyst Story 2: Checking My Reasoning
“I think my graph makes sense—but I want to know what assumptions I’ve left out or where my logic might be flawed. I ask the AI to critique my reasoning.”

→ ✨ Design Implication:
Right-click “Analyze Node,” or “Critique Graph” button with output in chat panel.

👥 Collaborator Story: Comparing Theories
“My teammate and I built two separate graphs. I want to see where we agree, what claims we missed, and whether we’re drawing different conclusions from the same facts.”

→ ✨ Design Implication:
Split-view graph overlay; differences highlighted; common claims merged.

🧠 Investigator Story: Discovering Hidden Evidence
“I’m not sure how to justify this claim. I ask the AI: ‘Is there anything in the evidence about payment or pressure?’ It finds something I hadn’t seen.”

→ ✨ Design Implication:
Chat query sends to query_evidence() and populates “Queried Results” tab.

📝 Presenter Story: Wrapping Up
“I’ve built a graph, explored the evidence, and want to share my findings. I click a button and get a report summarizing my argument, the evidence, and my conclusion.”

→ ✨ Design Implication:
“Generate Report” button that exports to markdown or PDF, based on current graph.
