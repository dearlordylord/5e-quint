# Competitor Analysis Methodology

## Purpose

This methodology drives the architecture analysis of D&D 5e rule engines. The goal is not to rank engines in general quality, but to identify **architectural patterns, state models, and verification approaches** that inform our Quint + XState formal specification project.

## Our Project's Unique Position

Before analyzing competitors, we need clarity on what makes our approach distinctive:

| Dimension | Our Approach | Typical Competitor |
|---|---|---|
| **Correctness mechanism** | Formal spec (Quint) + safety invariants + MBT parity proof | Example-based tests or none |
| **State model** | Immutable records, deterministic transitions | Mutable object graphs |
| **Replay/audit** | ITF traces, seed-based deterministic replay | Not possible |
| **Content boundary** | Spec models mechanics, TS models content, strict separation | Porous, mixed |
| **Spatial model** | Intentionally abstracted (caller-provided inputs) | Usually committed to a grid |
| **Edition discipline** | SRD 5.2.1 only, every rule traces to a passage | Loose or mixed-edition |
| **Extensibility** | New features plug into existing Quint facilities | Hook/callback/override systems |

## Analysis Rubric (Per Competitor)

Each competitor is analyzed along these dimensions:

### 1. Snapshot
Quick identification: language, framework, edition, license, size, maturity.

### 2. Core Architecture Pattern
One-sentence characterization: "Entity-Component-Event," "Document-Lifecycle," "Resolve-Commit," etc.

### 3. State Model
- How is game state represented? (records, object graphs, documents)
- What is the authoritative state? (single source of truth, or distributed?)
- Is state serializable/snapshotable?
- Entity composition: what does a "creature" look like?
- What state is persisted vs derived?

### 4. Action/Event System
- How do actions flow from intent to resolution?
- Is there a pipeline model? Phases?
- How are interrupts/reactions handled?
- Can actions be canceled, modified, or previewed?

### 5. Condition/Effect System
- How are conditions represented?
- How do conditions affect game mechanics?
- Do conditions have lifecycle (duration, save-to-end, removal)?
- Are effects first-class or implicit?

### 6. Spatial Model
- Grid, hex, theater-of-mind, or abstracted?
- How does position affect mechanics (range, cover, LOS)?
- How does movement work?

### 7. Content vs Engine Boundary
- How clean is the separation between rules engine and specific content (spells, features, items)?
- Where does the boundary leak?
- How is content loaded/defined?

### 8. Verification Story
- What testing exists? (unit, integration, property, invariant)
- Is there deterministic replay?
- Is there any formal verification or model checking?
- How confident can we be in the engine's correctness?

### 9. Key Inspirations
Split into:
- **High-Signal Patterns**: Architectural ideas we can learn from
- **Anti-Patterns (For Us)**: Things that conflict with our Quint+XState proof approach

### 10. File Index
Key source files with LOC and role, for future reference.

## Comparison Dimensions

The COMPARISON.md uses these columns for cross-cutting analysis:

### Architecture
- Core pattern (ECE, document-lifecycle, OOP, etc.)
- State mutability (immutable/mutable/mixed)
- State serializability (full/partial/none)

### Mechanics Coverage
- Turn structure (initiative, action economy)
- Attack pipeline (to-hit, damage, R/V/I)
- Conditions (which of the 14 SRD conditions)
- Spells (casting, concentration, effects)
- Reactions (OA, Shield, Counterspell, etc.)
- Death saves and stabilization
- Class features
- Multiclass support

### Verification
- Test presence and quality
- Deterministic replay capability
- Invariant/property testing
- Formal verification

### Relevance to Our Project
- Scenario mining value
- State/action vocabulary value
- Architecture inspiration value
- Oracle trustworthiness

## Discovery Methodology

### Source 1: Existing corpus
7 repos already cloned in `.references/competitors/`.

### Source 2: Web search
Multiple search strategies:
- Direct queries: "D&D 5e combat engine open source"
- Language-specific: "dnd 5e engine" + {TypeScript, Rust, Go, Haskell}
- Academic: "D&D formalization" + {TLA+, Alloy, formal verification}
- Community: Reddit threads, awesome-lists
- Niche: Monte Carlo simulators, AI combat bots, encounter balancers

### Source 3: Transitive discovery
Checking each discovered engine's dependencies, inspirations, and related projects.

## Quality Tiers

Engines are classified into tiers based on usefulness to our project:

- **Tier A**: Substantive combat engine with clear architecture, useful for pattern mining and scenario extraction
- **Tier B**: Partial engine or content library, useful for specific aspects (data shapes, spell definitions, edge cases)
- **Tier C**: Too minimal, too noisy, or too far from our domain to be useful

Tier assignment is about usefulness to us, not about quality in general.
