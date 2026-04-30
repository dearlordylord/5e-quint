# Plan: Executable Projection Tracer Bullet

> Archival note: this plan is preserved history for baseline `39f9ab71`.
> The active Correction Application Migration deletes the projected executable
> vocabulary from promoted paths; do not treat this document as current
> architecture.

> Source design: [DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md](/workspace/typescript/dnd-design-domain-model/DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md)

## Goal

Implement the first end-to-end executable projection slice from authored content surface records into Quint-owned semantics, TypeScript runtime execution, and MCP battle flow.

The slice is deliberately narrow:

- mage with `acid_splash` and `mage_armor`
- Fighter 2 with `Second Wind` and `Action Surge`
- goblin and bugbear battle participation
- turn starts and turn ends

The point is to prove a durable path that can later grow in width.

## Durable Decisions

- The primary domain language comes from the content-surface/Dhall side, not the fighter MCP branch.
- Quint remains the semantic owner.
- Dhall is authoring input, not runtime execution input.
- Generated surface JSON is the authored artifact consumed by the first compiler path.
- The first landing uses in-memory compilation from generated JSON into projected records.
- There is no spell-specific interpreter. There is one closed projected mechanic interpreter for executable mechanics across spell and class-feature activations.
- The first projection split is:
  - persistent projection
  - executable projection
- Lifecycle ownership lands only in the minimal form needed by the chosen slice.
- Qualifier vocabulary widening is deferred unless a concrete first-slice task forces it.

## Phase Structure

The work should be executed in four phases:

- **Phase 1: Shape**
  - freeze scope
  - author missing surface unit
  - define Quint and TS projected subsets
- **Phase 2: Compilation**
  - build surface-to-projection compiler
  - hook persistent projection
- **Phase 3: Execution**
  - build projected mechanic interpreter
  - route availability and execution through projected records
  - wire character and monster paths
- **Phase 4: Proof And Cleanup**
  - parity tests
  - end-to-end MCP tests
  - remove or mark superseded handwritten paths

## Critical Path

The minimum critical path is:

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 7
7. Task 8
8. Task 9
9. Task 10
10. Task 11
11. Task 12

Task 6 is necessary for the full scenario because `Mage Armor` is in scope, but it is not on the executable-only path. It can proceed in parallel with Task 7 once Task 5 is complete.

## Atomic Tasks

---

## Task 1: Freeze First-Slice Scope And Vocabulary

**Input**

- [DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md](/workspace/typescript/dnd-design-domain-model/DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md)
- existing authored units in `packages/surface/content/`
- existing Quint battle and creature semantics

**Output**

- A checked-in scope file, preferably `plans/EXECUTABLE_PROJECTION_FIRST_SLICE_SCOPE.md`, that names:
  - the exact units in scope
  - the exact projected executable node kinds in scope
  - the exact projected persistent record kinds in scope
  - the exact runtime-provided facts permitted in the first slice
  - the explicit out-of-scope items

**Validation**

- Every unit in the tracer bullet maps to one of the named projected subsets.
- Nothing in scope requires an unnamed family, unnamed node kind, or unnamed runtime fact.

**Success criteria**

- The first slice is closed enough that later tasks cannot silently widen it.
- A reviewer can answer “is this new unit or node kind in scope?” by reading one file, without inferring intent from code.

**Dependencies**

- None.

---

## Task 2: Confirm The Existing `acid_splash` Surface Unit As First Spell Pressure Case

**Input**

- existing authored spell activation:
  - [acid_splash.json](/workspace/typescript/dnd/packages/surface/content/acid_splash.json)
- the design requirement that the first safe SRD slice uses an existing licensed spell rather than a non-SRD pressure case

**Output**

- a checked-in note or scope confirmation that `acid_splash` is the in-scope spell-side executable unit
- any narrow spell-slice adjustments needed to keep the first tracer bullet SRD-safe

**Validation**

- `acid_splash` remains authored, typechecks, and traces cleanly.
- The first tracer bullet no longer depends on a non-SRD spell.
- The spell-side executable pressure is still covered by an authored spell unit already in corpus.

**Success criteria**

- The first tracer bullet uses an SRD-safe authored spell-side executable unit with no licensing ambiguity.

**Dependencies**

- Task 1.

---

## Task 3: Define The Quint Executable And Persistent Subsets

**Input**

- frozen scope from Task 1
- authored units in scope:
  - `acid_splash`
  - `mage_armor`
  - `fighter_second_wind`
  - `fighter_action_surge_l2`
- existing Quint semantics in `battle.qnt` and `creature.qnt`

**Output**

- A closed Quint-side representation for:
  - projected executable actions
  - projected resolution graphs
  - projected persistent records
  - minimal lifecycle hooks needed by `mage_armor`
- explicit mapping notes from each in-scope authored unit to the Quint subset

**Validation**

- Quint can represent every in-scope mechanic without lossy fallback fields.
- No projected executable or persistent construct in scope requires a generic stringly operation slot.
- `Second Wind` and `Action Surge` fit the same executable world as `Acid Splash`.
- `Mage Armor` fits the persistent world without introducing a second unrelated projection model.

**Success criteria**

- There is one closed Quint semantic language for the first tracer bullet.
- No in-scope mechanic still requires direct interpretation of surface JSON from within Quint-adjacent runtime code.

**Dependencies**

- Task 1.
- Task 2.

---

## Task 4: Define Matching TypeScript Projected Record Types

**Input**

- frozen scope from Task 1
- Quint subset from Task 3

**Output**

- TypeScript projected record types matching the Quint subset for:
  - projected executable actions
  - projected resolution nodes
  - projected persistent records
  - source-preserving projection metadata
  - minimal lifecycle hooks

**Validation**

- Every Quint-side projected construct has a TS equivalent.
- No TS type duplicates authored content wholesale.
- No domain-closed field is modeled as an unconstrained string.
- The TS types are narrow enough that unsupported future mechanics are unrepresentable without an explicit widening edit.

**Success criteria**

- TS and Quint describe the same projected slice one-for-one.

**Dependencies**

- Task 3.

---

## Task 5: Build The Surface-To-Projection Compiler

**Input**

- generated authored JSON from `packages/surface/content/`
- projected TS types from Task 4
- Quint subset boundaries from Task 3

**Output**

- A deterministic compiler from the in-scope generated JSON units into:
  - projected executable records
  - projected persistent records
- explicit failure behavior for unsupported or out-of-scope authored patterns
- compiler fixtures or snapshot-style artifacts for the in-scope units

**Validation**

- Compilation succeeds for:
  - `acid_splash`
  - `mage_armor`
  - `fighter_second_wind`
  - `fighter_action_surge_l2`
- Compilation fails closed for unsupported patterns rather than silently dropping semantics.
- Projected records preserve source identity.
- Recompiling the same authored input produces byte-for-byte equivalent projected output for the in-scope fixtures, modulo stable ordering rules if needed.

**Success criteria**

- The repo has a real, inspectable path from authored surface units to closed projected records without direct runtime interpretation of surface JSON.
- A reviewer can inspect one projected fixture per in-scope unit and understand the intended runtime-facing shape.

**Dependencies**

- Task 2.
- Task 3.
- Task 4.

---

## Task 6: Hook Persistent Projection Into Character Or Battle Projection

**Input**

- projected persistent records from Task 5
- `mage_armor` authored and compiled path
- existing character-sheet and battle-host projection seams

**Output**

- Integration that applies the first persistent projected records through one owned projection path
- `mage_armor` shaping AC through projected semantics rather than ad hoc spell-specific logic
- minimal early-end lifecycle handling for `target_dons_armor`
- one explicit ownership decision recorded in code or docs stating whether persistent projection is applied at character projection time, battle host setup time, or through a shared query used by both

**Validation**

- A mage with `Mage Armor` receives the expected base AC effect.
- Donning armor causes the projected effect to end through the owned lifecycle hook, not via special-case patching.
- No duplicate AC source of truth is introduced.

**Success criteria**

- Persistent projection is real, minimal, and exercised by a shipped authored unit.
- The implementation leaves exactly one owned path for this persistent effect instead of duplicating character-side and battle-side logic.

**Dependencies**

- Task 5.

---

## Task 7: Build The Projected Mechanic Interpreter

**Input**

- projected executable records from Task 5
- Quint and TS executable subsets from Tasks 3 and 4
- existing battle runtime and reducer seams

**Output**

- A closed interpreter for projected executable mechanics across:
  - spell activations
  - class-feature activations
- interpretation for:
  - `attack_roll`
  - `save_gate`
  - `damage`
  - `heal_hp`
  - `grant_extra_action`
  - resource and usage gates

**Validation**

- `Acid Splash`, `Second Wind`, and `Action Surge` all execute through the same interpreter family.
- The interpreter consumes explicit runtime facts only at the allowed boundary.
- The interpreter emits battle events or reducer-consumable state transitions rather than mutating state directly.
- The interpreter does not branch on specific unit ids like `acid_splash` or `fighter_second_wind`.

**Success criteria**

- There is one closed executable interpreter for the tracer bullet, and it is not spell-specific.
- Adding one more unit that reuses existing node kinds would require compiler work but not a new interpreter branch keyed by unit identity.

**Dependencies**

- Task 5.

---

## Task 8: Hook Projected Actions Into Availability And Execution

**Input**

- projected executable records from Task 5
- interpreter from Task 7
- existing action-availability and battle execution seams

**Output**

- record-driven action availability for the in-scope activations
- execution wiring that routes those actions through the projected mechanic interpreter
- removal or reduction of redundant handwritten feature branches where the projected records now own the same facts
- explicit handoff between availability query and execution token so MCP sees projected legality rather than legacy feature-specific legality

**Validation**

- `Second Wind` appears only when legal and resolves through projected execution.
- `Action Surge` appears only when legal, respects once-per-turn and no-Magic restriction, and resolves through projected execution.
- `Acid Splash` appears as a legal cast option for the mage and resolves through projected execution.
- Availability and execution agree on legality; execution is not secretly more permissive than the token emitted by availability.

**Success criteria**

- The first slice materially changes the runtime from feature-specific execution to record-driven execution.
- At least one handwritten legality or execution branch for an in-scope mechanic is deleted or made unreachable.

**Dependencies**

- Task 7.

---

## Task 9: Wire The Character And Monster Paths For The Tracer-Bullet Scenario

**Input**

- existing stored character and `start_battle` seams
- projected persistent and executable integration from Tasks 6-8
- goblin and bugbear monster ownership path

**Output**

- an end-to-end path that can:
  - create and finalize the mage
  - create and finalize the Fighter 2
  - start battle with goblin and bugbear opponents
  - expose projected legal actions through battle setup

**Validation**

- Character creation and finalization still flow through canonical stored character state.
- `start_battle` or equivalent battle-host promotion uses owned sheet projection rather than fabricated MCP payloads.
- Goblin and bugbear participate without a tracer-bullet-only monster schema.
- The battle scenario can be assembled without any MCP command that embeds mechanic semantics directly in request payloads.

**Success criteria**

- PCs and monsters meet in one owned battle execution path for the chosen scenario.
- The scenario can be explained entirely in terms of stored characters, authored monsters, projected records, and runtime facts.

**Dependencies**

- Task 6.
- Task 8.

---

## Task 10: Add Quint And TypeScript Parity Tests For The First Slice

**Input**

- implemented Quint subset
- TS projected types and interpreter
- integrated character, battle, and monster path

**Output**

- parity-oriented tests for:
  - `Second Wind`
  - `Action Surge`
  - `Mage Armor`
  - `Acid Splash`
- focused tests for graph-shaped execution and early-end lifecycle behavior

**Validation**

- Quint and TS agree on the in-scope semantics.
- `Acid Splash` tests confirm:
  - area save-gate execution works through projected spell activation
  - cantrip scaling remains correct through projected execution
- `Action Surge` tests confirm:
  - extra action granted
  - Magic excluded
  - once-per-turn respected
- `Mage Armor` tests confirm:
  - base AC change
  - early end on donning armor
- At least one focused test asserts projected record shape before asserting battle outcome, so failures localize to compiler vs interpreter.

**Success criteria**

- The promoted slice is not TS-only behavior; it is covered by Quint-owned parity expectations.
- A failure in the promoted slice can be localized to authored content, compiler output, projected interpretation, or reducer behavior without rerunning the full MCP scenario first.

**Dependencies**

- Task 6.
- Task 8.
- Task 9.

---

## Task 11: Add End-To-End MCP Tracer-Bullet Tests

**Input**

- full integrated runtime path from Tasks 6-10
- stored character and battle host MCP seams

**Output**

- MCP tests covering:
  - mage creation and finalization
  - Fighter 2 creation and finalization
  - battle start against goblin and bugbear
  - action availability
  - `execute_action` flow for:
    - `Second Wind`
    - `Action Surge`
    - `Acid Splash`
    - turn end progression

**Validation**

- MCP remains thin and does not invent semantics.
- Required runtime facts are supplied explicitly only where the server already expects them.
- The scenario is executable end to end through MCP calls.
- The MCP test payloads contain identifiers and runtime facts, not embedded mechanic instructions.

**Success criteria**

- The tracer bullet is proven at the public adapter surface, not only internally.
- A reader can follow the MCP test and see the same ownership boundaries described in the design doc.

**Dependencies**

- Task 9.
- Task 10.

---

## Task 12: Remove Or Mark Superseded Handwritten Paths In The Promoted Slice

**Input**

- successful projected execution path from Tasks 8-11
- existing handwritten feature-specific logic for the promoted slice

**Output**

- minimal cleanup removing redundant special-case logic where the projected records now own the same semantics
- comments or follow-up notes for any remaining intentionally temporary fallback branches
- a short follow-up debt list only for truly out-of-scope leftovers

**Validation**

- No behavior regression in the in-scope scenario.
- Review shows fewer duplicate sources of truth for:
  - `Second Wind`
  - `Action Surge`
  - `Mage Armor`
  - `Acid Splash`
- No new permanent adapter, registry, or compatibility layer remains solely to preserve the old path for in-scope mechanics.

**Success criteria**

- The tracer bullet demonstrates architectural movement rather than parallel infrastructure.

**Dependencies**

- Task 11.

---

## Verification

Verification for the whole plan should include:

1. Surface validation
   - in-scope authored units typecheck and generate successfully

2. Quint validation
   - the Quint subset is authoritative for the promoted slice

3. Focused TS tests
   - projected compilation, persistent projection, executable interpretation

4. End-to-end MCP tests
   - mage + Fighter 2 vs goblin + bugbear scenario

5. `/simplify` convergence
   - run at least 2 rounds after implementation until no important simplifications remain

6. RAW check
   - confirm each modeled rule in the promoted slice still traces to the local SRD corpus

7. Width-growth check
   - confirm the landed shapes are reusable by at least one plausible sibling unit in each landed subset, so the tracer bullet remains a width-growth seed rather than a one-off

## Review Questions

At the end of each phase, the implementation should answer these questions explicitly:

- Did this phase introduce any unit-id-specific runtime branching?
- Did this phase duplicate data already present in authored content, projection, or battle state?
- Did this phase widen the model because of one unit only, or because of a repeated pattern?
- Can the next sibling unit plausibly reuse the landed shape without redesign?

## Completion Standard

This plan is complete when:

- the in-scope authored units compile into closed projected records
- Quint and TS share the same promoted semantics for the slice
- the runtime executes those semantics through one projected mechanic interpreter
- MCP can drive the bounded scenario end to end
- the design is clearly positioned as the first narrow landing of a surface that will later grow in width
