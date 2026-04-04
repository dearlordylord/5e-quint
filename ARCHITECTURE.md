# Architecture

This project formalizes D&D 5e SRD 5.2.1 combat rules. Every system has a clear scope, a defined correctness mechanism, and explicit boundaries with adjacent systems.

## Content Scope and Licensing

**Content boundary: SRD 5.2.1 only.** The spec formalizes the [System Reference Document 5.2.1](https://www.dndbeyond.com/resources/1781-systems-reference-document-srd) and nothing else -- no homebrew, no licensed PHB-only content. Every modeled rule traces to a specific SRD passage. Where formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`.

This boundary is practical, not architectural. The SRD is freely available under CC-BY-4.0, which permits redistribution and derivative works. PHB content beyond the SRD is proprietary. The modeling layers (Quint spec, XState machines, TS features) are designed to be **extensible** -- non-SRD subclasses, spells, feats, and monsters can be added to the TS features layer without changing the core spec. The spec models *mechanics* (how damage works, how conditions chain, how spell slots deplete), not *content* (which spells exist, which subclasses have which features). New content plugs into existing mechanics.

**Licenses:**
- Project code: [Apache License 2.0](LICENSE)
- SRD 5.2.1 content: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/), (c) Wizards of the Coast LLC
- SRD markdown source: [DND.SRD.Wiki](https://github.com/OldManUmby/DND.SRD.Wiki) by OldManUmby, CC-BY-4.0
- Full attribution: [NOTICE](NOTICE)

## System Map

```
                            ┌─────────────────────────────┐
                            │     SRD 5.2.1 (source of    │
                            │        truth for rules)      │
                            └──────────┬──────────────────┘
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
    ┌────────────▼──────────┐ ┌───────▼────────┐ ┌─────────▼──────────┐
    │   Quint Spec          │ │ UBIQUITOUS_    │ │   ASSUMPTIONS.md   │
    │   creature.qnt (6K)   │ │ LANGUAGE.md    │ │   (34 modeling     │
    │   battle.qnt (2K)     │ │ (canonical     │ │    decisions)      │
    │                       │ │  terminology)  │ │                    │
    │   Scope: abstract     │ └────────────────┘ └────────────────────┘
    │   mechanics, safety   │
    │   invariants          │
    └────────┬──────────────┘
             │ ITF traces (MBT parity)
             │
    ┌────────▼──────────────┐        ┌──────────────────────────┐
    │   XState Machines     │        │   TS Features            │
    │   machine.ts          │◄───────│   features/class-*.ts    │
    │   battle-machine.ts   │ calls  │   features/spell-*.ts    │
    │                       │        │   features/weapon-*.ts   │
    │   Scope: game logic,  │        │   features/feats.ts      │
    │   state transitions   │        │                          │
    └────────┬──────────────┘        │   Scope: specific SRD   │
             │                       │   content, pure functions│
    ┌────────▼──────────────┐        └──────────────────────────┘
    │   React UI            │
    │   components/         │
    │   features/use*.ts    │
    │                       │
    │   Scope: presentation │
    └───────────────────────┘

    ┌───────────────────────┐
    │   QA Pipeline         │
    │   scripts/qa/         │
    │   qa_generated.qnt    │
    │                       │
    │   Scope: community    │
    │   rule validation     │
    └───────────────────────┘
```

---

## 1. Quint Spec

**Files:** `creature.qnt` (6079 lines), `battle.qnt` (2065 lines), `dndTest.qnt` (7132 lines)

**Scope:** Abstract game mechanics. Proves safety properties hold under *any* input combination via property-based fuzzing and model checking.

**Owns:**
- Damage pipeline (temp HP absorption, R/V/I, death/unconscious/death saves, massive damage)
- Condition system (14 conditions, implication chains, exhaustion levels 1-6)
- Spell slot economy (multiclass caster tables, pact slots, one-slot-per-turn)
- Turn structure (action/BA/reaction/movement/extra attack economy)
- Class resource tracking (rage charges, focus points, smite slots, channel divinity, etc. -- all 12 SRD classes)
- Multi-creature battle orchestration (initiative, turns, attack/reaction chains, Counterspell stack, AoE, legendary actions)
- 41 creature-level + 11 battle-level safety invariants

**Does NOT own:**
- Specific weapon/spell/feat data (no "Longsword does 1d8")
- Spatial relationships (no positions, distances, line of sight)
- UI state or rendering

**Correctness mechanism:** Nondeterministic fuzzing with abstract ranges (e.g., `DAMAGE_RANGE = 0.to(60)`) stress-tests the rules engine with inputs no single weapon produces, deliberately hitting edge cases that realistic inputs rarely reach. Safety invariants (HP bounded, dead implies 0 HP, exhaustion 6 implies dead, etc.) must hold for every reachable state. Additionally, `dndTest.qnt` contains 1,047 deterministic unit tests for pure functions.

**Key constraint:** Dice rolls are pre-resolved -- callers pass results as arguments. The spec never generates random numbers; it receives them as nondeterministic inputs.

**Modeling frontier:** The spec abstracts away spatial concerns (cover, distance, line of sight, movement geometry). These are treated as caller-provided inputs. For example, `bMove`'s threatened set is a nondeterministic powerset -- the spec tests "given any set of threatening creatures, does the OA pipeline work correctly?" without knowing *which* creatures are actually in reach.

---

## 2. XState Machines

**Files:**
- `app/src/machine.ts` + `machine-*.ts` (single-creature state machine, ~20 files)
- `app/src/battle-machine.ts` + `battle-machine-*.ts` (multi-creature battle, ~8 files)

**Scope:** The actual game engine. Implements the same state transitions as the Quint spec.

**Owns:**
- Runtime state management (XState actors, context, events)
- Event-driven API for the UI layer
- Integration of Tier 2 feature functions into state transitions

**Does NOT own:**
- Correctness of the underlying rules (delegated to Quint via MBT)
- Content data (delegated to TS features)
- Rendering (delegated to React)

**Correctness mechanism:** Model-Based Testing (MBT) via `@firfi/quint-connect`. The Quint spec generates ITF (Intermediate Trace Format) traces -- sequences of (action, state) pairs. The MBT bridge (`machine.mbt.test.ts`, `battle-machine.mbt.test.ts`) replays each trace against the XState machine, comparing state field-by-field after every step. 50 traces x 30 steps for creature; 50 traces x 10 steps for battle.

**Key constraint:** The creature machine and battle machine use completely different architectures. The creature machine has parallel states (damageTrack, turnPhase, spellcasting). The battle machine is flat with context-driven phase routing (nullable context fields trigger `always` transitions). Creatures in battle are a `Map<CreatureId, BattleCreatureState>` in context, NOT spawned child actors -- D&D combat requires atomic cross-creature updates.

---

## 3. TS Features

**Files:** `app/src/features/class-*.ts`, `features/spell-*.ts`, `features/weapon-mastery.ts`, `features/feats.ts`

**Scope:** Pure functions for specific SRD content -- class features, spells, weapons, feats. The content database.

**Owns:**
- Specific class feature behavior (Evasion damage halving, Aura of Protection bonus, Sneak Attack dice count, rage damage by level)
- Specific spell implementations (organized by school: abjuration through divination)
- Weapon mastery effects (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- Feat implementations (Grappler, etc.)

**Does NOT own:**
- State management (pure functions, no side effects, no XState imports)
- Game rules engine logic (delegated to machine + spec)

**Correctness mechanism:** Vitest unit tests with concrete SRD-derived inputs. Each function is tested against specific RAW passages.

**Pure-function contract:** No XState imports. No side effects. Input in, output out. Feature state (rage charges, focus points) lives on the caller side, not inside feature functions. Features depend on core; core never depends on features.

---

## 4. React UI

**Files:** `app/src/components/`, `app/src/features/use*.ts` (hooks)

**Scope:** Presentation layer. Reads XState state via `useSelector`, dispatches events, renders panels.

**Owns:** Visual representation, user interaction, component layout.

**Does NOT own:** Game logic, state transitions, rule correctness.

---

## 5. QA Pipeline

**Files:** `scripts/qa/`, `qa_generated.qnt` (generated)

**Scope:** Validates the Quint spec against ~12,700 community Q&A entries from RPG Stack Exchange, Reddit r/onednd, Sage Advice, and sageadvice.eu.

**Owns:**
- Corpus download and parsing (SE dumps, Arctic Shift API, Sage Advice)
- LLM-driven classification (Haiku: "is this a RAW mechanics question?")
- LLM-driven assertion generation (Sonnet: "write a Quint test for this ruling")
- Typecheck validation (every generated fragment compiled before caching)
- Test execution and failure triage

**Does NOT own:** The spec itself (QA tests the spec, never modifies it).

**Correctness mechanism:** If a QA-generated test fails, one of three things is true: (1) the spec has a bug, (2) the community answer is wrong, (3) the LLM misinterpreted the Q&A. Each failure is triaged manually. ~926 tests currently generated.

---

## 6. Reference Documents

| Document | Scope | Authority |
|----------|-------|-----------|
| `.references/srd-5.2.1/` | Rules text (2024 edition) | Ground truth for all modeling |
| `UBIQUITOUS_LANGUAGE.md` | Canonical D&D terminology (18 sections, 80+ terms) | Naming authority -- all code uses these terms |
| `ASSUMPTIONS.md` | 34 modeling decisions where spec makes explicit what SRD leaves implicit | Curated by project owner; sole record of RAW deviations |
| `battle/DOMAIN.md` | Battle-layer terminology (transactions, interrupt points, reaction windows) | Extends UBIQUITOUS_LANGUAGE for multi-creature concepts |
| `battle/REQUIREMENTS.md` | SRD-derived facts for battle mechanics | Requirements only (what RAW says, not design decisions) |
| `CLAUDE.md` | Development instructions and project conventions | Operational authority for contributors |

---

## Choosing the Right System

| Question | System | Why |
|----------|--------|-----|
| Can HP ever go negative? | Quint invariant | Multi-step property over all inputs |
| Does Fireball do 8d6? | TS unit test | Specific content validation |
| Does death save + healing + damage at 0HP interact? | Quint | State machine property |
| Does Greatsword with GWF reroll 1s/2s? | TS feature + unit test | Specific weapon mastery behavior |
| Can concentration break leave orphaned effects? | Quint invariant | Cross-step consistency property |
| Does Evasion halve AoE on failed save? | Both | Quint for the mechanic pipeline, TS for the computation |
| Are all 37 weapon stat blocks correct? | TS data tests | Content validation |
| Can a creature with 3 rage charges rage 4 times? | Quint invariant | Resource bound property |
| Does the XState machine match the Quint spec? | MBT bridge | Trace replay, field-by-field |
| Does the spec match community consensus? | QA pipeline | LLM-generated assertions vs spec |

---

## Why Abstract Ranges, Not Real Content?

The Quint spec models **mechanics**, not **content**. `DAMAGE_RANGE = 0.to(60)` doesn't represent a weapon -- it says "throw any damage value at the pipeline and verify invariants hold."

Modeling all SRD content in Quint would cause combinatorial explosion (37 weapons x 6 abilities x 20 AC values x conditions x advantage = billions). Quint's value is proving **"the rules engine is correct regardless of which weapon you use"**, not **"all 37 weapons have the right stats."**

The abstract ranges also *intentionally* cover corners that real content rarely hits. A Longsword doing 4-11 damage won't trigger massive-damage instant death against a 50 HP creature. `DAMAGE_RANGE = 0.to(60)` will.

---

## Modeling Frontier: What's In vs Out

| Modeled (Quint + XState) | Modeled (TS features only) | Not modeled |
|--------------------------|---------------------------|-------------|
| Damage pipeline (R/V/I, temp HP, death) | Specific weapon stats | Positions / distances |
| 14 conditions + exhaustion | Specific spell effects | Cover geometry |
| Spell slot economy (multiclass) | Specific feat behavior | Line of sight |
| Turn structure (action economy) | AC from specific armor | Difficult terrain mapping |
| Class resource pools (all 12 classes) | Weapon mastery effects | Social / exploration |
| Attack/reaction chains (8 reaction types) | Aura of Protection bonus | Mounted combat details |
| Counterspell stack (depth 5) | Evasion damage halving | Ready action triggers |
| AoE resolution | Sneak Attack dice count | Lair actions |
| Legendary actions/resistance | Divine Smite damage | Multi-target concentration |
| Movement / opportunity attacks | Rage damage bonus | Grapple/shove in battle |
| Death saves / stabilization | Bardic Inspiration | TWF in battle |
| Concentration (start/break/check) | Level-up HP calculation | Environmental hazards |

The left column has both Quint invariant coverage AND XState implementation. The middle column has TS implementations with unit tests but no formal verification. The right column is acknowledged as out of scope.

---

## Future: Generator Pattern

The [generator/contract/spec pattern](https://github.com/informalsystems/emerald/pull/236) from Emerald could bridge the gap between abstract Quint ranges and specific TS content. Instead of `DAMAGE_RANGE = 0.to(60)`, a Quint generator would produce SRD-realistic parameter combinations (e.g., "L3 spell, 8d6 Fire, DEX save, DC 15") without enumerating all 300+ spells. This constrains the state space to realistic inputs while maintaining invariant coverage -- better exploration efficiency without losing edge-case testing.
