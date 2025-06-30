# IntelliProof Argumentation Evaluation Features



## Entities

- Claim (c) -- nodes of the graph and represent a statement being made
  - Types: Factual (fact) | Value (value) | Policy (policy)  
  - Confidence [0,1]: The degree to which the claim holds 
  - Evidences E: List of evidence items (e), each derived from a source document (s)
  - Claim c1: 
    - fact(c1), E = {e1, e2, e3, ....}, s1 = {e1, e3}, s2 = {e2}
    - conf(c1) = 0.5
- Inferential Relationships (I) -- edges of the graph and represent support or attack relationships between claims
  - Type: Support (sup) | Attack (att)
    - supp(c1, c2) means c1 supports c2 
    - att(c10, c14) means c10 attacks c14)
  - Strength of edge [0,1]: The degree to which the inferential relationship holds
- Graph (G) -- the entire argument graph with claims and relationships. 



## Methods or Agents

- Methods over claims
  - func `check_evidence(claim) `
    - Checks whether each item of evidence supports the claim with reasons 
    - Returns: Dict of dicts
      - {evidence ID: {evaluation: yes|no|unsure|unrelated, reasons: str} .....  } 
    - AI calls 
  - func `classify_claim_type(claim)`
    - Classifies the type of the node
    - Returns: "factual" | "value" | "policy"  (maybe we have a claim-type enum or something)
    - AI call
  - func `get_claim_credibility(claim)`
    - Checks how credible the claim is given its own internal evidence and the strengths of neighboring support nodes and attack nodes 
    - For algorithm see below section on "Credibility propagation" 
    - **there is <u>no</u> AI Call** here 
- Methods over edges 
  - func `validate_edge(edge)`
    - Returns a score of [-1,1] for each edge -- -1 is full attack, and +1 is full support 
    - AI call 
  - Func `generate_assumptions(edge, N)`
    - Generates N implicit assumptions required by the edge 
    - E.g., if there is an edge between c1 and c2, Then the function needs to return a str that articulates what assumption "p" MUST be true for c1 to support c2 more -- i.e., what p will increase the strength of the edge. 
    - AI call
  - func `eval_assumption(assumption, edge)`
    - Given a str assumption on an edge, it returns whether this assumption increases or decreases the strength of the edge 
    - Returns an updated strength value 
    - AI Call
- Methods over entire graph 
  - func `score_all_edges(G)`
    - Runs the `validate_edge(e)` function over all pairs of nodes 
    - **there is <u>no</u> AI Call** here 
  - func `critique_graph(G)`
    - Identifies potential flaws in the argument 
    - Algorithm is to use the "graph patterns" in the `argument_patterns_bank.yaml`
    - AI Call 
  - func `export_report(G, N)`
    - Generates a written written report of N words 
    - AI call







## Credibility Propagation in an Argument Graph

### 1. Notation

- Let \(G = (V, E)\) be our directed argument graph.  
  - \(V = \{1,2,\dots,n\}\) is the set of claim nodes.  
  - \(E \subseteq V \times V\) is the set of directed edges.  
- Each node \(i\in V\) has  
  - a set of internal evidence scores  
    \[
      \mathcal{E}_i = \{\,e_{i,1}, e_{i,2}, \dots, e_{i,N_i}\}\subseteq[-1,1],
    \]  
  - an aggregated “intrinsic” score \(E_i\).  
- Each edge \((j\to i)\in E\) carries a weight  
  \[
    w_{j\to i}\in[-1,1],
  \]  
  where \(w>0\) means support, \(w<0\) means attack.

We will compute node credibilities \(c_i\in[-1,1]\).

---

### 2. Evidence Aggregation

For each node \(i\), define its intrinsic score
\[
E_i \;=\;
\begin{cases}
\displaystyle \frac{1}{N_i}\sum_{k=1}^{N_i} e_{i,k}, 
& N_i > 0,\\[1em]
0, 
& N_i = 0.
\end{cases}
\]

---

### 3. Update Rule

Let \(c_i^{(t)}\) be the credibility of node \(i\) at iteration \(t\).  Choose a parameter \(\lambda\ge0\) (strength of internal evidence).  Then compute a “raw” update
\[
Z_i^{(t+1)}
\;=\;
\lambda\,E_i
\;+\;
\sum_{(j\to i)\in E} w_{j\to i}\;c_j^{(t)}.
\]
Finally, squash back into \([-1,1]\) via a function \(f\colon\mathbb{R}\to[-1,1]\), for example:

1. **Tanh squashing**  
   \[
   c_i^{(t+1)} \;=\;\tanh\!\bigl(Z_i^{(t+1)}\bigr).
   \]
2. **Normalized linear**  
   \[
   c_i^{(t+1)}
   = \frac{Z_i^{(t+1)}}{1 + \lvert Z_i^{(t+1)}\rvert}.
   \]

---

### 4. Iterative Algorithm

```pseudo
# 1. Precompute intrinsic scores
for each node i in V:
    if N_i > 0:
        E_i ← (1/N_i) * sum(e ∈ 𝓔_i)
    else:
        E_i ← 0

# 2. Initialize credibilities
for each node i:
    c_i^(0) ← E_i

# 3. Iterate until convergence
repeat until max_i |c_i^(t+1) − c_i^(t)| < ε:
    for each node i in V:
        Z ← λ * E_i
        for each (j → i) in E:
            Z ← Z + w_{j→i} * c_j^(t)
        c_i^(t+1) ← f(Z)    # e.g. tanh or Z/(1+|Z|)
    t ← t + 1

# 4. Return final credibilities
return { c_i^(t) : i ∈ V }