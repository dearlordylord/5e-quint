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
    │   battle.qnt          │ │ LANGUAGE.md    │ │   (34 modeling     │
    │   (authoritative)     │ │ (canonical     │ │    decisions)      │
    │   creature.qnt        │ │  terminology)  │ │                    │
    │   (helper library)    │ │                │ │                    │
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

**Files:** `battle.qnt` (authoritative combat spec), `creature.qnt` (helper library composed by `battle.qnt`), `dndTest.qnt`

**Scope:** Abstract game mechanics. `battle.qnt` is the main semantic model for combat. `creature.qnt` provides pure helpers and decompositions reused by battle logic and tests. Safety properties are proved against the battle-level model.

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

**Correctness mechanism:** Nondeterministic fuzzing with abstract ranges (e.g., `DAMAGE_RANGE = 0.to(60)`) stress-tests the rules engine with inputs no single weapon produces, deliberately hitting edge cases that realistic inputs rarely reach. Safety invariants (HP bounded, dead implies 0 HP, exhaustion 6 implies dead, etc.) must hold for every reachable battle state. Additionally, `dndTest.qnt` contains deterministic unit tests for pure helper functions, many of them in `creature.qnt`.

**Key constraint:** Dice rolls are pre-resolved -- callers pass results as arguments. The spec never generates random numbers; it receives them as nondeterministic inputs.

**Modeling frontier:** The spec abstracts away two categories of concerns:

1. **Spatial concerns** (cover, distance, line of sight, movement geometry). These are treated as caller-provided inputs. For example, `bMove`'s threatened set is a nondeterministic powerset -- the spec tests "given any set of threatening creatures, does the OA pipeline work correctly?" without knowing *which* creatures are actually in reach.

2. **DM rulings.** D&D is a tabletop game where the DM (Dungeon Master) has final authority over many decisions that RAW leaves open. The spec models what RAW *prescribes* -- mechanical rules with deterministic outcomes. When RAW says "the DM decides," that decision is a **caller-provided input**, not something the spec resolves. The spec proves that *given any DM decision*, the mechanical consequences are correct.

Examples of DM rulings treated as caller inputs:
- **Battle start/end**: The DM decides when combat begins and ends (not all creatures need to be dead; sides aren't defined in RAW).
- **Ready action triggers**: The DM confirms when a trigger circumstance occurs ("the zombie steps next to me"). The spec models the action/reaction economy of readying and releasing; the trigger itself is DM agenda.
- **Surprise**: The DM determines who is surprised (the spec receives surprise as an initiative modifier).
- **Cover level**: The DM judges cover from geometry (the spec receives cover as a typed input).
- **Threatened creatures for OA**: The DM determines who is in reach (the spec receives the set nondeterministically).
- **Initiative tie-breaking**: The DM decides ties (the spec receives the sorted order).

This is not a limitation — it is the correct modeling boundary. The spec's value is proving that the *mechanical* rules are correct. DM rulings are the interface between the spec and the human game.

---

## 2. XState Machines

**Files:**
- `packages/core/src/machine.ts` + `machine-*.ts` (single-creature state machine, ~28 files)
- `packages/core/src/battle-machine.ts` + `battle-machine-*.ts` (multi-creature battle, ~8 files)

**Scope:** The actual game engine. Implements the same state transitions as the Quint spec.

**Owns:**
- Runtime state management (XState actors, context, events)
- Event-driven API for the UI layer
- Integration of Tier 2 feature functions into state transitions

**Does NOT own:**
- Correctness of the underlying rules (delegated to Quint via MBT)
- Content data (delegated to TS features)
- Rendering (delegated to React)

**Correctness mechanism:** Model-Based Testing (MBT) via `@firfi/quint-connect`. `battle-machine.mbt.test.ts` is the primary combat parity proof against `battle.qnt`. `creature.mbt.test.ts` remains useful for helper/local-projection coverage, but it is not the semantic source of truth for combat ownership decisions.

**Architectural role:** The commit layer. Quint resolves what the rules prescribe; XState commits those outcomes as runtime state.

**Key constraint:** The creature machine and battle machine use completely different architectures. The battle machine is the authoritative engine because it mirrors `battle.qnt`. The creature machine is a local projection and debugging surface; when ownership questions arise, design from battle semantics outward and project local facts down. Creatures in battle are a `Map<CreatureId, BattleCreatureState>` in context, NOT spawned child actors -- D&D combat requires atomic cross-creature updates.

---

## 3. TS Features

**Files:** `packages/core/src/features/class-*.ts`, `features/spell-*.ts`, `features/weapon-mastery.ts`, `features/feats.ts`

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

**Files:** `packages/app/src/components/`, `packages/app/src/features/use*.ts` (hooks)

**Scope:** Presentation layer. Reads XState state via `useSelector`, dispatches events, renders panels.

**Owns:** Visual representation, user interaction, component layout.

**Does NOT own:** Game logic, state transitions, rule correctness.

---

## 5. MCP Server & Available-Actions Module

**Files:** `packages/mcp/` (MCP server process), `packages/core/src/available-actions.ts` (pure function)

**Scope:** Exposes the game engine to LLM and programmatic consumers via the Model Context Protocol. The available-actions module is a pure projection: `(DndContext, machineState) → ActionToken[]`.

**MCP API surface taxonomy:** The audit in `plans/MCP_EVENT_SURFACE_AUDIT.md` classifies every core event into one of six MCP/API-adapter categories: `suggested_action`, `control_command`, `table_event`, `action_resolution`, `domain_trigger`, `bookkeeping`. This taxonomy describes how events map to the MCP adapter layer — it is not a Quint or XState domain taxonomy.

**Owns:**
- Supported action registry (query tokens, resolved tokens, runtime-input requirements, event mappings)
- Four MCP tools: `get_state`, `get_available_actions`, `execute_action`, `preview_action`; planned separate surfaces: `execute_control_command`, `record_table_event`
- Three-step execution contract: `ActionToken` (query-time) → `ResolvedActionToken` (user choices filled) → `ResolutionRequest` → `DndEvent` (runtime inputs added)

**Does NOT own:**
- Game logic or state transitions (delegated to XState machines)
- Legality computation (queries the same XState guards that MBT validates against Quint)
- Dice rolls or runtime facts (supplied by the runtime layer after token resolution)

**Key constraint:** If the MCP adapter must remember, fabricate, or re-derive a combat fact to execute an action, that is an ownership bug. Fix the domain/spec/machine state first; do not solve ownership leaks in the adapter.

**Detailed design:** See `plans/available-actions.md` for phase-by-phase implementation history and architectural decisions.

---

## 6. QA Pipeline

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

## 7. Reference Documents

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

## The Quint/TS Frontier

The frontier between what lives in Quint and what lives in TS is not "generic vs specific." It is: **Quint models anything that affects state machine correctness.** This produces three categories of features:

### Flow features (Quint, specific and named)

Features that create new battle phases, interrupt chains, or state machine transitions. The correctness of their interaction patterns is what Quint proves.

Examples already in battle.qnt: Counterspell (recursive stack with slot refund), Shield (+5 AC mid-resolution), Uncanny Dodge (halve damage as reaction), Retaliation (counter-attack after damage), Legendary Resistance (auto-succeed save).

These are named and specific because the *flow* matters. Counterspell's nesting can deadlock, orphan effects, or double-spend slots. Shield changes the hit/miss branch mid-resolution. Quint proves these interactions are safe.

Each flow feature uses a **common facility** -- a reusable battle mechanism:
- Shield, Parry, Cutting Words use the `PIAttackHit` reaction facility
- Uncanny Dodge, Deflect Attacks use the `PIAttackDamage` reaction facility
- Counterspell uses the `PISpellCast` + `bSpellStack` facility
- Hellish Rebuke, Retaliation use the `PIAfterDamage` facility

Future features (from new books, homebrew, etc.) that need reactions plug into the same facilities by adding a `ReactionDecision` variant. The facility is generic; the feature using it is specific; both live in Quint.

### Modifier features (Quint generic fields + TS specific computation)

Features that modify a value in an existing pipeline without creating new flow. Quint models the **mechanic shape** via generic modifier fields on `Combatant` (e.g., `hasEvasion: bool`, `saveMiscBonus: int`). TS computes the **specific values** (e.g., "Rogue 7 gets Evasion", "Paladin aura gives +CHA to saves").

This separation means:
- Quint proves "the save-bonus pipeline is correct under all inputs" without knowing about Paladins
- TS proves "Paladin L6 with CHA 16 gives +3" via unit tests
- A homebrew class with a similar aura just sets the same `saveMiscBonus` field -- no Quint changes

### Content (TS only)

Specific numbers, data, stat blocks. Invariants don't depend on them. "Fireball does 8d6 Fire in a 20ft sphere" is pure content -- Quint models "some spell does N damage of type T with a DEX save" and proves the pipeline handles it correctly regardless of N and T.

### Why abstract ranges?

`DAMAGE_RANGE = 0.to(60)` doesn't represent a weapon. It says "throw any damage value at the pipeline and verify invariants hold." The abstract ranges *intentionally* cover corners that real content rarely hits. A Longsword doing 4-11 damage won't trigger massive-damage instant death against a 50 HP creature. `DAMAGE_RANGE = 0.to(60)` will.

### Promotion path

A feature starts in TS (specific, unit-tested). If it has subtle interaction bugs with the state machine, it gets promoted to Quint. This happened implicitly with the current reaction types -- they started as "the TS battle machine needs Shield" and became Quint-modeled flow features because their correctness depends on interaction patterns that unit tests can't cover.

---

## Modeling Frontier: Current State

| Flow features (Quint, named) | Modifier features (Quint generic + TS specific) | Content (TS only) | Not modeled |
|------------------------------|--------------------------------------------------|-------------------|-------------|
| Attack/reaction chains (10 reaction types) | hasEvasion (Rogue/Monk 7+) | Specific weapon stats | Positions / distances |
| Counterspell stack (depth 5) | saveMiscBonus (Aura of Protection) | Specific spell effects | Cover geometry |
| Legendary actions/resistance | critRange (Champion 19/18) | Specific feat behavior | Line of sight |
| AoE resolution | meleeDamageBonus (Rage) | AC from specific armor | Difficult terrain |
| Movement / opportunity attacks | recklessThisTurn (Barbarian) | Weapon mastery effects | Social / exploration |
| Damage pipeline (R/V/I, temp HP, death) | sneakAttackDice (Rogue) | Sneak Attack dice count | Mounted combat |
| 14 conditions + exhaustion | *Planned: conditionImmunities (external)* | Divine Smite damage | Ready action triggers |
| Spell slot economy (multiclass) | | Rage damage bonus | Lair actions |
| Turn structure (action economy) | | Evasion damage halving | Environmental hazards |
| Class resource pools (creature.qnt, all 12) | | Aura of Protection bonus | |
| Death saves / stabilization | | Bardic Inspiration | |
| Concentration (start/break/check) | | Level-up HP calculation | |
| Grapple / shove / escape in battle | | | |
| TWF off-hand attack in battle | | | |
| Hand occupancy (weapon/shield/grapple/free) | | | |
| Qualified physical damage bypass | | | |

Items in *italics* are planned (see PLAN_AUDIT.md, PRD 3).

---

## Deferred Design Work

The following items are scoped but deferred. See `PLAN_AUDIT.md` for full context.

- **Aura of Courage** (Paladin L10): Frightened immunity within Aura of Protection. Would use a `conditionImmunities: Set[Condition]` modifier field on Combatant, following the same generic-field pattern as `saveMiscBonus`. Data layer done in `class-paladin.ts`; battle wiring deferred.
- **Additional passive modifiers** (Danger Sense, Elusive, etc.): Each is a new field or modifier on Combatant. Data layers done in `class-barbarian.ts` and `class-rogue.ts`; battle wiring deferred. Danger Sense = advantage on DEX saves (needs `dexSaveAdvantage: bool`). Elusive = no advantage on attacks against you (needs `attacksCannotHaveAdvantage: bool`).
- **Versatile weapon die switching**: Hand occupancy state is now landed. Implementation is ready to schedule — see DAG node `versatile-weapon-die-switching`.

---

## Future: Generator Pattern

The [generator/contract/spec pattern](https://github.com/informalsystems/emerald/pull/236) from Emerald could bridge modifier features and content. Instead of `DAMAGE_RANGE = 0.to(60)`, a Quint generator would produce SRD-realistic parameter combinations (e.g., "L3 spell, 8d6 Fire, DEX save, DC 15") without enumerating all 300+ spells. This constrains the state space to realistic inputs while maintaining invariant coverage -- better exploration efficiency without losing edge-case testing.
