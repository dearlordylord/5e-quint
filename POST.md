# Blog Post — Full Context for Writer

This document provides everything needed to write both a **mini post** (~500 words, pre-article priority piece) and the **full article**. Read the referenced files for detail; this file provides the map.

## Mini post (500 words, publish before full article)

**Purpose:** Establish public priority. "Here's what I built, full writeup coming."

**Structure — follow this order:**

1. **Hook (1-2 sentences):** "I'll do anything to avoid learning tabletop game rules." Or: "Formally specifying D&D so I don't have to read the rulebook." Humor disarms the "formal methods are scary" reaction.

2. **What I built (3-4 sentences + diagram):** 3,300-line Quint formal spec of D&D 5e combat. XState mirror implementation. MBT conformance-tests them against each other via seed-deterministic traces. Show the chain: `Quint spec → MBT conformance testing → XState runtime → React UI`. Each layer checks the one above.

3. **The punchline (2 sentences):** If you push all logic into a model-checked state machine and make the UI a stateless projection, the UI inherits upstream guarantees for free. No proof assistants, no dependent types — Quint, XState, React, TanStack Start.

4. **The wildest part (2-3 sentences + code snippet):** 12,700 Reddit/StackExchange Q&A entries turned into machine-checked assertions. Show ONE concrete example — the prone lock (grapple + prone = speed 0, can't stand, stuck forever). Include the 6-line Quint snippet from `BLOG_QA_EXAMPLES.md`. "Real people argued about this on Reddit. An LLM turned it into a formal assertion. The spec confirms it."

5. **Teaser (1 sentence):** "Full writeup coming. Repo: [link]"

**What NOT to include in the mini post:**
- Tool explanations (what is Quint, what is XState) — anyone who needs this won't read a 500-word post
- Scope limitations ("what it doesn't model") — be aspirational, not defensive
- Implementation details (compile-time sync, AST parsing)
- Unbuilt features (interactive educational UI vision)
- Vibe code critique — show, don't argue
- More than one QA example — one is a hook, two is a lecture

**Tone:** Not academic. Practical. Show the bugs found, not the methodology for finding them. The prone lock example should make people go "wait, that works?" — that's the share trigger.

---

## What this project is

A **3,362-line formal specification of D&D 5e combat** in Quint, with a mirror XState implementation, MBT conformance testing, a community Q&A validation pipeline, and a React UI. Single author (Igor Loskutov), 257 commits.

It models a **single actor's condition state machine** — "given this pre-resolved game event, what happens to the character's conditions?" The SRD 5.2.1 is the source of truth. The Quint spec formalizes it. The XState machine ports it to TypeScript. MBT conformance-tests them against each other.

## Core thesis

Formal methods don't need exotic tools. You can get a chain from formal spec to production UI using Quint, XState v5, React, and TanStack Start — all standard TypeScript ecosystem tools. The key architectural insight: push all logic into a model-checked state machine, make the UI a stateless projection, and the UI inherits upstream guarantees transitively.

## The verification chain

```
SRD 5.2.1 (rules text)
    |
    v
creature.qnt (Quint spec — 3,362 lines, 238 pure functions, 56 actions)
    |  ^
    |  | QA corpus validates spec against community domain knowledge
    |  | (12.7K entries from Reddit, StackExchange, Sage Advice)
    |
    v
machine.ts (XState v5 — mechanical port of the spec)
    |  ^
    |  | MBT conformance testing via @firfi/quint-connect
    |  | (50 traces x 30 steps, seed-deterministic, field-by-field comparison)
    |
    v
React UI (stateless projection of XState snapshot)
    |
    (no game logic in components — display derived from snapshot)
```

Each layer checks the one above it. The UI is the last link — it can't render a state the machine can't produce, and the machine can't produce a state the spec forbids.

## Files the writer must read

| File | What it contains | Why |
|------|-----------------|-----|
| `LAUNCH.md` | Launch schedule, audience strategy, framing guidance | Overall strategy and positioning |
| `POST_DRAFT.md` | Article structure, Twitter strategy, hook angles | Draft outline and viral angles |
| `BLOG_QA_EXAMPLES.md` | 5 verified community exploits with Quint code | Concrete examples for the article |
| `MBT_TESTING.md` | Fix report from MBT fuzzer session | Bug classes and methodology proof |
| `UBIQUITOUS_LANGUAGE.md` | 200+ canonical D&D terms with precise definitions | Domain vocabulary reference |
| `ASSUMPTIONS.md` | 15 modeling decisions where SRD is ambiguous | Shows rigor of the modeling process |
| `README.md` | Project overview, architecture, coverage | What's modeled and what's not |

## Files for deeper understanding (optional)

| File | What it contains |
|------|-----------------|
| `creature.qnt` | The Quint spec itself (3,362 lines) |
| `app/src/machine.ts` | XState machine (~420 lines, logic extracted to helpers) |
| `app/src/machine.mbt.test.ts` | MBT bridge — how Quint traces replay against XState |
| `PROCESS_README.md` | QA pipeline architecture (6 stages) |
| `scripts/qa/QA_README.md` | QA corpus sources and stats |
| `PRD.md` | Original architecture plan (9 phases) |
| `PLAN.md` | Implementation phases (all DONE) |

## Key stats

| Metric | Value |
|--------|-------|
| Quint spec | 3,362 lines |
| Quint unit tests | 4,028 lines |
| Auto-generated QA tests | 12,276 lines |
| Quint actions | 56 |
| Quint pure functions | 238 |
| XState/TS test files | 18 |
| Total TS test lines | ~9,700 |
| QA corpus entries | ~12,700 |
| Git commits | 257 |
| Contributors | 1 |

## The three testing layers

### 1. Model checking (Quint)

Quint exhaustively explores reachable states and checks invariants (e.g., "dead is absorbing," "HP never exceeds max"). This is proof by exhaustive enumeration, not testing.

**Writer reference:** `creature.qnt` invariants, `dndTest.qnt` unit tests

### 2. Model-based conformance testing (MBT)

Quint generates random execution traces (sequences of actions + resulting states). `@firfi/quint-connect` (Igor's own library) replays those actions against the XState machine and compares state after every step. If they diverge, the port has a bug.

Each trace is fully determined by a seed (`QUINT_SEED=0x...`), making every failure perfectly reproducible. This is stronger than unit tests — it explores state combinations no human would write a test for.

**Writer reference:** `MBT_TESTING.md` for the bug report, `app/src/machine.mbt.test.ts` for the bridge code

**Prior art:** [MongoDB conformance checking](https://www.mongodb.com/blog/post/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs) (June 2025) — same methodology (TLA+ spec as oracle, trace replay against C++ implementation). We do it with Quint + XState.

### 3. Crowdsourced specification validation (QA pipeline)

12,700 community Q&A entries (Reddit r/onednd, RPG StackExchange, Sage Advice Compendium, sageadvice.eu) are:
1. Auto-classified by Claude Haiku ("Is this about RAW mechanics?")
2. Converted to Quint test assertions by Claude Sonnet (reading the full spec)
3. Typechecked by Quint (rejects garbage automatically — ~40% failure rate is fine)
4. Run against the spec

This validates the spec against real-world domain expertise — not just the author's interpretation. "Real people argued about this on Reddit. An LLM turned it into a formal assertion. The spec confirms it."

**Writer reference:** `BLOG_QA_EXAMPLES.md` (5 verified exploits), `PROCESS_README.md` (pipeline architecture), `scripts/qa/QA_README.md` (sources and stats)

## Bug classes MBT catches (from MBT_TESTING.md)

Lead with the *class* of bug, not the count. These are bugs that unit tests, TypeScript's type system, and code review systematically miss:

- **Cross-branch state sync** — parallel state machine branches (damageTrack vs turnPhase) can disagree. A creature stabilized by start-of-turn logic in one branch still accepts death saves in another.
- **Argument-order swaps in same-typed parameters** — `computeTakeDamage(resistances, vulnerabilities, immunities)` vs `(immunities, resistances, vulnerabilities)`. All three are `ReadonlySet<DamageType>` — TypeScript sees no error.
- **Guards that work for 99% of states** — `effectiveSpeed === 0` (grappled creature) + Champion crit + drop prone. Each guard is individually correct; the combination reveals the gap.
- **Heuristic vs full-state comparison** — XState checked HP delta to decide "did damage happen?" Quint compared full state. When a dying creature takes lethal fall damage, HP stays at 0 but the `dead` flag changes — the heuristic missed it.

Concrete example: *"A grappled Champion with 0 effective speed scores a critical hit, then tries to drop prone."* No human writes this test. The fuzzer found it.

## The 5 community exploits (from BLOG_QA_EXAMPLES.md)

These are the viral hooks. Each started as a Reddit argument and is now a machine-checked Quint assertion:

1. **Prone Lock** — Grapple + prone = speed 0, can't stand up. Community discovered it; spec confirms.
2. **Grapple Leapfrog** — Two characters move 60 ft by alternating grapples. Emergent from RAW.
3. **Climbing Cost Parity** — Climbing with a climb speed costs the same as walking flat. Counterintuitive but correct per SRD.
4. **Ogre vs Animated Armor Paradox** — An ogre (STR 19) is easier to grapple than animated armor (AC 18). Grapple uses contested checks, not AC.
5. **Maximum Movement Speed** — Theoretical 3,900+ ft/round with stacked bonuses. Math checks out.

## What the project does NOT model

- Action economy beyond single-actor turn structure
- Dice rolls (takes pre-resolved results as input)
- Multiple combatants / initiative / targeting / map grid
- Character sheet construction (attributes, skills, edges)
- Equipment / weapons / armor (beyond weapon mastery properties)
- DM discretion / rulings — only Rules As Written

This is deliberate: bottom-up modeling, one layer at a time. The spec answers "what happens given this event?" not "is this event legal to perform?"

## Framing guidance (from LAUNCH.md)

### What to call the testing
**Model-based conformance testing** with seed-deterministic traces. Shares the reproducibility property with DST (FoundationDB, Antithesis), but the methodology is MBT — validating a state machine against a formal spec.

### Audiences and what they care about
- **Quint community:** Real-world showcase of quint-connect on a 3K-line spec with 60+ actions
- **XState community:** MBT catches bugs that unit tests and TypeScript can't — lead with specific examples
- **Formal methods (TLA+):** Quint as accessible alternative, comparison to MongoDB's approach
- **Testing practitioners:** Novel MBT + crowdsourced spec validation methodology
- **General engineers / HN:** "Formal methods in a standard TypeScript stack" + QA pipeline virality
- **Vibe coders:** The counterintuitive angle — LLMs generate the test code, 40% fails, and that's fine

### Tone
- Not academic. Practical.
- "I built this because I hate learning tabletop rules" is a valid hook.
- Show the bugs found, not the methodology for finding them.
- The QA pipeline is the most viral angle. The MBT is the most technically interesting. Lead with QA for broad audiences, MBT for technical ones.

## Tech stack

| Layer | Tool | Role |
|-------|------|------|
| Formal spec | Quint | Source of truth, model checking, trace generation |
| MBT bridge | `@firfi/quint-connect` | Replays Quint traces against XState |
| State machine | XState v5 | Runtime enforcement, mechanical port of spec |
| Frontend | React 19 + TanStack Router | Stateless UI projection |
| Build | Vite | Dev server and bundler |
| Styling | Tailwind CSS | UI styling |
| Testing | Vitest | Test runner for both unit and MBT tests |
| QA classification | Claude Haiku | "Is this RAW mechanics?" |
| QA test generation | Claude Sonnet | Quint assertion generation from Q&A |
| QA sources | Reddit, StackExchange, Sage Advice, sageadvice.eu | Domain expert corpus |

## Writer pitfalls — words that will get you corrected

| Don't write | Write instead | Why |
|-------------|--------------|-----|
| "formally verified XState machine" | "conformance-tested XState machine" | Formal verification means mathematical proof of the implementation. MBT is strong empirical evidence, not proof. Only the Quint model checker provides proof, and only of the spec's invariants. |
| "deterministic simulation testing" / "DST" | "model-based conformance testing with seed-deterministic traces" | DST means simulating infrastructure (networks, clocks, fault injection) — FoundationDB, Antithesis, TigerBeetle. We simulate game rules against a formal spec. Shared property: seed reproducibility. Different methodology. |
| "formally verified UI" | "the UI inherits upstream guarantees transitively" | The UI is a stateless projection — it can't render states the machine can't produce. But nothing formally verifies the React components themselves. |
| "proof" (for MBT) | "strong evidence" or "conformance testing" | MBT explores random traces, not all traces. The model checker proves invariants on the spec. MBT checks spec-vs-implementation conformance. Different strength. |
| "AI-generated tests" | "LLM-translated assertions" or "machine-checked assertions" | The LLM translates a Reddit Q&A into Quint syntax. Quint typechecks it. The spec is the oracle. The LLM is a translator, not a tester — it has no opinion on correctness. |
| "game" | "rules engine" or "single-actor state machine" | No dice rolls, no multi-player, no map, no initiative. It models what happens to one creature given pre-resolved events. |
| "100% coverage" | "exhaustive for the spec's state space" (model checking) or "random exploration" (MBT) | Model checking is exhaustive within the spec. MBT is not exhaustive for the implementation — it samples. Don't conflate the two. |
| "TLA+ spec" / "TLA+ syntax" | "Quint spec" | Quint is inspired by TLA+ but is a separate language with different syntax. Don't call Quint code TLA+. |
| "rules as intended" / "designer intent" | "Rules As Written (RAW)" | The spec models the literal SRD text, not what designers might have meant. Ambiguities are documented in `ASSUMPTIONS.md`, not resolved by guessing intent. |
| "verifies" (for layers checking each other) | "checks" or "conformance-tests" | "Verify" implies proof. Use "check" for MBT and QA validation. Reserve "verify" only for Quint model checking, and even then prefer "model-checks." |

## Links and references

- MongoDB conformance checking: https://www.mongodb.com/blog/post/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs
- Quint Connect docs: https://github.com/informalsystems/quint/blob/main/docs/content/posts/quint_connect.mdx
- Quint MBT paper (RVCase25): https://seanmk.com/rvcase/RVCase25_paper_5.pdf
- Antithesis DST: https://antithesis.com/docs/resources/deterministic_simulation_testing/
- SRD 5.2.1: `.references/srd-5.2.1/` (local)
