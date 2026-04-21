# Active Plan

Date: 2026-04-20

This is the single active planning queue.

**Active batch:** Surface Runtime Correction vertical slice.

**Batch goal:** implement one day-sized vertical slice in `packages/surface-runtime-correction` that proves the intended architecture:

- real `Surface` schema
- Effect-owned authored-unit service boundary
- runtime wrappers without duplicate authored identity
- initiative-aware battle state
- prompt discovery derived from state
- complete prompt answers only
- pure prompt resolution and battle reduction
- explicit support for “new prompt appears after prior resolution”
- TS-first pattern discovery with planned Quint/MBT follow-up

**Superseded active queue:** the older EPT/CSA/CSB/CSC queue remains below only as deferred historical context. It is not the active implementation target for Ralph right now.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Parked by owner direction. Not part of the active queue.
- `done`: Work completed and verification recorded.

## Ralph Task Index

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "SRC1",
      "status": "done",
      "title": "Rename Package And Establish First-Class Battle Types"
    },
    {
      "number": 1,
      "id": "SRC2",
      "status": "done",
      "title": "Implement Initiative-Aware Battle Init And Turn Ownership"
    },
    {
      "number": 2,
      "id": "SRC3",
      "status": "done",
      "title": "Replace Flat Battle Choice With Prompt And Resolution Flow"
    },
    {
      "number": 3,
      "id": "SRC4",
      "status": "done",
      "title": "Route Core And Unit Actions Through Structural Surface Interpretation"
    },
    {
      "number": 4,
      "id": "SRC5",
      "status": "done",
      "title": "Land End-To-End Correction Slice Tests And Docs"
    },
    {
      "number": 5,
      "id": "SRC5.5",
      "status": "done",
      "title": "Freeze Discovered Pattern And Respecify Quint/Core Follow-Ups"
    },
    {
      "number": 6,
      "id": "SRC6",
      "status": "done",
      "title": "Add Quint Spec For Correction Slice"
    },
    {
      "number": 7,
      "id": "SRC7",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Correction-Slice MBT Bridge And MBT Tests"
    },
    {
      "number": 8,
      "id": "SRC8",
      "status": "blocked",
      "title": "Integrate Correction Slice Back Into Core"
    }
  ]
}
-->

The JSON index tracks only the active `SRC1`-`SRC8` batch. Deferred historical work (`EPT9`-`EPT20`, `CSA5`-`CSA8`, `CSB1`-`CSB11`, `CSC1`-`CSC2`) is retained as textual context in the "Deferred Historical Queue" section at the end of this file; it is not picked up by the coding loop.

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Keep `Ralph Task Index` synchronized with task sections whenever task status, order, ID, or title changes.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any implementation task, include `/simplify` convergence in the closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. Treat battle MBT as scarce; use deterministic unit and projection tests first.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched surface, record the baseline noise and stop. Do not widen into repo-wide cleanup.
- If implementation starts stretching the design described in [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1), stop and update the plan before patching around the issue.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
|---|---|---|---|---|---|---|
| 0 | SRC1 - Rename Package And Establish First-Class Battle Types | done | none | SRC2, SRC3, SRC4, SRC5 | Landed `packages/surface-runtime-correction`, updated workspace/package metadata, replaced the flat toy battle choice with first-class battle vocabulary types, and kept authored identity only on `unit.id`. | Done. Verification: package typecheck and package test passed; broader `pnpm quality` stopped at unrelated baseline lint failure in `packages/core/src/projected-compiler.ts`. |
| 1 | SRC2 - Implement Initiative-Aware Battle Init And Turn Ownership | done | SRC1 | SRC3, SRC4, SRC5 | Landed battle init input, stable initiative ordering, and explicit turn ownership (`turnActorId`, `round`, `turnNumber`) in `packages/surface-runtime-correction`. Tie resolution stays table-owned input and the empty-battle path validates that init remains battle-scoped. | Done. Verification: package typecheck and test passed; broader `pnpm quality` stopped at the unrelated baseline lint failure in `packages/core/src/projected-compiler.ts`. |
| 2 | SRC3 - Replace Flat Battle Choice With Prompt And Resolution Flow | done | SRC1, SRC2 | SRC4, SRC5 | Landed derived prompt discovery from battle state, exact prompt-answer types, resolved battle actions, and minimal in-flight prompt state for multi-step interactions. The first follow-up prompt seam is `chooseAttackTarget`; structural `Surface` interpretation of chosen units remains deferred to SRC4. | Done. Verification: `pnpm --filter @dnd/surface-runtime-correction typecheck` and `pnpm --filter @dnd/surface-runtime-correction test` passed; broader `pnpm quality` stopped at the unrelated baseline lint failure in `packages/core/src/projected-compiler.ts`. |
| 3 | SRC4 - Route Core And Unit Actions Through Structural Surface Interpretation | done | SRC1, SRC2, SRC3 | SRC5 | Implement the first real correction slice with both core actions and unit actions routed through structural helper interpretation of `Surface`, not by specific unit ids. Minimum in-scope path: `attack`, `endTurn`, `cure_wounds`, `fireball`, `fighter_action_surge_l2`. Avoid introducing a second compiled execution language unless the implementer proves the design doc’s narrowing conditions. | Ready now that prompt discovery, exact answer typing, and follow-up prompt creation are explicit. Keep `useUnit` generic until structural interpretation lands here. |
| 4 | SRC5 - Land End-To-End Correction Slice Tests And Docs | done | SRC1, SRC2, SRC3, SRC4 | SRC5.5 | Landed deterministic end-to-end package coverage for prompt discovery, follow-up prompting, reduction, and next-turn prompt discovery; updated the package docs and design notes to match the implemented prompt lifecycle and to state Quint parity as the next phase. | Done. Verification: `pnpm --filter @dnd/surface-runtime-correction typecheck` and `pnpm --filter @dnd/surface-runtime-correction test` passed with `22` tests. |
| 5 | SRC5.5 - Freeze Discovered Pattern And Respecify Quint/Core Follow-Ups | done | SRC5 | SRC6, SRC7, SRC8 | Froze the discovered TS-first slice in the design note, rewrote the next-batch tasks from the landed contract, and recorded the handoff back to Quint-led work. | Done. Verification: docs/plan diff reviewed against landed `surface-runtime-correction` code; RAW and `UBIQUITOUS_LANGUAGE.md` sources checked for the rewritten follow-up tasks; `/simplify` converged in 2 rounds. |
| 6 | SRC6 - Add Quint Spec For Correction Slice | done | SRC5.5 | SRC7, SRC8 | Landed a dedicated Quint module and deterministic Quint tests for the frozen correction slice, plus a mapping note that ties the modeled terms back to the TS contract and the cited RAW / ubiquitous-language sources. `grantExtraAction` stays structural in Quint by carrying restriction, use-count-cap, and once-per-turn facts rather than collapsing into an Action Surge-only tag. | Done. Verification: `pnpm exec quint typecheck surfaceRuntimeCorrectionTest.qnt`, `pnpm exec quint test surfaceRuntimeCorrectionTest.qnt`, and `pnpm quality` passed. `/simplify` converged in 2 rounds while tightening the extra-action model and RAW trace note. |
| 7 | SRC7 - Add Correction-Slice MBT Bridge And MBT Tests | ready-for-implementation-after-light-research | SRC6 | SRC8 | Add an MBT bridge and MBT tests for the correction slice against the Quint model. | Ready now that the Quint module and deterministic Quint replay surface exist. Re-read the landed Quint mapping note and keep verification at Ralph-approved Tier 1 / Tier 1b only. |
| 8 | SRC8 - Integrate Correction Slice Back Into Core | blocked | SRC6, SRC7 | none | Port the proven correction-slice pattern back into one bounded `core` path after Quint parity exists. | Final task in the next batch. |
| 100 | Legacy open work (EPT/CSA/CSB/CSC queue) | deferred | owner | none | Park all previously-open work until the correction-package slice is landed or the owner explicitly revives a different batch. | Historical queue only; do not pick from it. |

### Task 0 - SRC1 - Rename Package And Establish First-Class Battle Types

Status: `done`

Depends on: none

Blocks: `SRC2`, `SRC3`, `SRC4`, `SRC5`

### Scope

Create the real package boundary and type vocabulary for the correction slice.

This task must:

- rename `packages/toy-surface-hydration` to `packages/surface-runtime-correction`
- update package/workspace references accordingly
- replace the flat toy battle-choice vocabulary with first-class battle package types
- keep authored identity only on `unit.id`
- prepare the package for prompt-driven battle flow without implementing the full loop yet

Do **not**:

- implement prompt resolution yet
- implement full initiative logic yet
- add a second execution IR

### Input

- [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)
- current package under `packages/toy-surface-hydration/`
- real surface types from `@dnd/prototype-content-surface/surface/types`

### Output

- renamed package directory and metadata
- updated imports/workspace references
- new type layer for:
  - battle combatant
  - battle state
  - runtime unit wrapper
  - available prompt
  - resolved action

### Useful implementation recommendation

- Keep the type layer small and explicit.
- Use `unit.id` as authored identity; do not add `authoredUnitId`.
- Prefer a separate `types.ts` plus narrow concern files rather than one large kitchen-sink file.
- If a type looks like it already assumes resolved table input, it is probably too late in the flow.

### Acceptance criteria

- there is no `packages/toy-surface-hydration` package anymore
- `packages/surface-runtime-correction` builds and tests
- the package exposes first-class battle types instead of a flat `ToyBattleChoice`
- no duplicate authored identity field exists alongside `unit.id`
- no semantic dispatch by specific unit ids is introduced in this task

### Verification

- `pnpm --filter @dnd/surface-runtime-correction typecheck`
- `pnpm --filter @dnd/surface-runtime-correction test` (if tests still exist at this stage)
- `/simplify` minimum two rounds

### Outcome

- Renamed the package to `packages/surface-runtime-correction`.
- Replaced the old flat `ToyBattleChoice` export surface with first-class battle vocabulary types.
- Kept authored identity only on `unit.id` by using `RuntimeUnitAccess` wrappers with `ownerId` and no duplicate `authoredUnitId`.
- Verified the package with package-scoped typecheck and test. Broader `pnpm quality` hit an unrelated pre-existing lint failure in `packages/core/src/projected-compiler.ts`.

### Task 1 - SRC2 - Implement Initiative-Aware Battle Init And Turn Ownership

Status: `done`

Depends on: `SRC1`

Blocks: `SRC3`, `SRC4`, `SRC5`

### Scope

Implement battle initialization and turn ownership with initiative counts and initiative order.

This task must establish:

- initiative count per combatant
- initiative order for currently participating creatures
- `turnActorId`
- round / turn counters

It must be designed so future mid-battle joins are straightforward.

### Input

- `SRC1` battle types
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)
- SRD combat initiative text:
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:482)
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:494)
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:497)

### Output

- battle-init function(s)
- initiative ordering logic
- state ownership for current turn

### Useful implementation recommendation

- Keep both initiative counts and initiative order.
- Model tie resolution as Table-supplied input, not reducer-owned inference.
- Do not freeze the design around a forever-static participant list; leave a clear insertion seam.

### Acceptance criteria

- battle state stores initiative counts and initiative order
- turn ownership is explicit via `turnActorId`
- initiative order remains stable across rounds for current participants
- tie order is not hardcoded inside reducers; it is accepted as external input
- the code shape clearly leaves room for mid-battle joins

### Verification

- deterministic tests for:
  - simple initiative ordering
  - tie ordering via supplied resolution
  - turn advancement across a round boundary
- `/simplify` minimum two rounds

### Outcome

- Added `BattleInit`, `initiativeCounts`, `initiativeOrder`, `turnActorId`, `round`, and `turnNumber` to the battle-state layer in `packages/surface-runtime-correction`.
- Landed `battle-init.ts` with validation for missing, duplicate, and out-of-battle actor ids, including the empty-battle path.
- Kept tie resolution table-owned input via tied-cohort ordering rather than reducer-owned inference.
- Preserved a clean future insertion seam by keeping initiative ordering logic isolated from prompt discovery and resolution.
- Verified with `pnpm --filter @dnd/surface-runtime-correction typecheck` and `pnpm --filter @dnd/surface-runtime-correction test`. Broader `pnpm quality` stopped at the unrelated pre-existing lint failure in `packages/core/src/projected-compiler.ts`.

### Task 2 - SRC3 - Replace Flat Battle Choice With Prompt And Resolution Flow

Status: `done`

Depends on: `SRC1`, `SRC2`

Blocks: `SRC4`, `SRC5`

### Scope

Replace the current flat, already-resolved battle choice object with explicit prompt and resolution flow.

The model must distinguish:

- available prompt
- complete prompt answer
- resolved battle action
- newly-created prompt after prior resolution

The model must **not** allow:

- partially answered prompts

### Input

- `SRC1` type layer
- `SRC2` battle state and turn ownership
- design rule from [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)

### Output

- prompt discovery function(s)
- prompt-answer types
- resolution result type
- any minimal open-prompt state needed for multi-step interactions

### Useful implementation recommendation

- Keep available prompts derived from state.
- If a multi-step interaction is in flight, store only the current open prompt/window.
- Make prompt answers exact and complete at the type level.
- The resolver should return either:
  - a final resolved action, or
  - a new prompt

### Acceptance criteria

- the old flat battle choice object is removed or clearly superseded
- there is an explicit prompt type and an explicit resolved action type
- prompt answers cannot be partial
- the model can represent “new prompt appeared after prior resolution”
- available prompts are derived from state, not redundantly stored

### Verification

- deterministic tests for:
  - prompt discovery from state
  - valid complete prompt answer -> resolved action
  - valid complete prompt answer -> new prompt
  - invalid partial answer is unrepresentable or rejected immediately
- `/simplify` minimum two rounds

### Outcome

- Replaced the old flat already-resolved choice flow with explicit battle prompts, exact prompt answers, and explicit resolved action variants in `packages/surface-runtime-correction`.
- Kept available prompts derived from battle state and stored only minimal in-flight prompt state via `openPrompt`.
- Landed the first multi-step resolution seam by letting a complete `chooseAction` answer open a new `chooseAttackTarget` prompt before producing a resolved attack action.
- Preserved the SRC3/SRC4 boundary by keeping unit selection generic here; structural interpretation of chosen `Surface` units still belongs to SRC4.
- Verified with `pnpm --filter @dnd/surface-runtime-correction typecheck` and `pnpm --filter @dnd/surface-runtime-correction test`; broader `pnpm quality` stopped at the unrelated baseline lint failure in `packages/core/src/projected-compiler.ts`.

### Task 3 - SRC4 - Route Core And Unit Actions Through Structural Surface Interpretation

Status: `done`

Depends on: `SRC1`, `SRC2`, `SRC3`

Blocks: `SRC5`

### Scope

Implement the first real correction slice by routing both core actions and unit actions through structural interpretation of `Surface`.

Minimum in-scope slice:

- core actions:
  - `attack`
  - `endTurn`
- unit actions:
  - `cure_wounds`
  - `fireball`
  - `fighter_action_surge_l2`

The important design constraint is:

- dispatch on structural `Surface` shape
- not on specific unit ids for semantics

### Input

- current authored-unit service boundary
- real `Surface` schema/types
- `SRC3` prompt/resolution flow
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)

### Output

- `surface-interpretation` helpers
- prompt discovery for the first slice
- battle reduction for the first slice

### Useful implementation recommendation

- Prefer pure helper functions that interpret `Surface` structurally.
- Keep them centralized so reducers do not each rediscover semantics.
- Avoid a second compiled execution language unless the implementer can prove it is strictly smaller and more generic than `Surface`.
- If the implementation starts stretching toward a parallel IR, stop and update the plan.

### Acceptance criteria

- first-slice actions work without semantic branching on unit ids
- core and unit actions share the same prompt/resolution/reducer framework
- unit semantics are read structurally from `Surface`
- no new large execution IR is introduced casually

### Verification

- deterministic tests for:
  - attack flow
  - end-turn flow
  - cure wounds flow
  - fireball flow
  - action surge flow
- `/simplify` minimum two rounds

### Task 4 - SRC5 - Land End-To-End Correction Slice Tests And Docs

Status: `done`

Depends on: `SRC1`, `SRC2`, `SRC3`, `SRC4`

Blocks: none

### Scope

Close the first correction slice with deterministic tests and documentation updates.

This task should:

- prove the slice end-to-end inside the package
- update docs/diagram text to reflect the landed pattern
- record the sequencing toward Quint parity

### Input

- implemented slice from `SRC1`-`SRC4`
- [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)

### Output

- end-to-end deterministic tests for the correction slice
- design/doc updates reflecting the actually-landed shapes
- explicit note that Quint parity and Quint MBT are the next phase, after the TS pattern is coherent

### Useful implementation recommendation

- Keep the docs honest: if the landed code deviates from the design note, revise the note.
- Add a specific note about the distinction between:
  - complete prompt answer
  - newly-created prompt after resolution
- Keep this package TS-first only for this discovery phase; do not imply that Quint parity is optional.

### Acceptance criteria

- deterministic tests cover one full turn flow through prompt discovery, prompt fulfillment, resolution, and state update
- docs reflect the actually-landed pattern
- docs explicitly state the next-phase Quint parity requirement
- no unresolved architectural contradiction remains between docs and code intent

### Verification

- `pnpm --filter @dnd/surface-runtime-correction typecheck`
- `pnpm --filter @dnd/surface-runtime-correction test`
- `/simplify` minimum two rounds

### Outcome

- Added deterministic end-to-end coverage for a full turn flow through prompt discovery, complete prompt answering, follow-up prompt opening, reduction, and next-turn prompt discovery in `packages/surface-runtime-correction`.
- Updated the package README and design notes so the landed prompt lifecycle is explicit, including the distinction between complete prompt answers and newly opened prompts after resolution.
- Recorded that this slice was intentionally TS-first for discovery and that Quint parity plus Quint MBT are the required next phase.
- Verified with `pnpm --filter @dnd/surface-runtime-correction typecheck` and `pnpm --filter @dnd/surface-runtime-correction test`, which passed with `22` tests.

### Task 5 - SRC5.5 - Freeze Discovered Pattern And Respecify Quint/Core Follow-Ups

Status: `done`

Depends on: `SRC5`

Blocks: `SRC6`, `SRC7`, `SRC8`

### Scope

After `SRC1`-`SRC5` land, freeze the actually discovered pattern before starting Quint work or `core` integration.

This task must:

- compare landed code against [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- record what stayed true
- record what changed
- record what assumptions were rejected
- respecify `SRC6`, `SRC7`, and `SRC8` from the actual outcome of `SRC1`-`SRC5`

### Input

- landed code from `SRC1`-`SRC5`
- [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- [plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_MANUAL_DIAGRAM.md:1)
- [plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md](/workspace/typescript/dnd/plans/SURFACE_TO_BATTLE_VERTICAL_DRAFT.md:1)

### Output

- revised design note or follow-up freeze note describing the discovered pattern
- updated `ACTIVE_PLAN.md` task bodies for `SRC6`, `SRC7`, and `SRC8`

### Useful implementation recommendation

- Treat this as a real freeze point, not a perfunctory recap.
- If the landed pattern differs materially from the original plan, change the plan rather than pretending it didn’t.
- Use this task to keep the Quint and `core` follow-up work honest and smaller.

### Acceptance criteria

- the discovered pattern is documented explicitly
- differences from the pre-implementation design are recorded
- `SRC6`, `SRC7`, and `SRC8` are rewritten from the actual landed outcome
- the handoff from TS-first exploration to Quint-led work is explicit

### Verification

- docs/plan diff reviewed for consistency with landed code
- RAW/UL check for the rewritten follow-up tasks:
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:318) for Bonus Action / Reaction timing
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:479) for rounds, turns, initiative, and stable initiative order
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:584) for attack structure and target selection
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:710) for shared damage rolls on simultaneous save-for-damage effects
  - [Spells/Descriptions-A-D.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:1277) for `Cure Wounds`
  - [Spells/Descriptions-E-L.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:418) for `Fireball`
  - [Classes/Fighter.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:76) for `Action Surge`
  - [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md:14) and [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md:128) for initiative, round/turn, action, bonus action, reaction, offer, and quota terminology
- `/simplify` minimum two rounds

### Outcome

- Added an explicit discovered-pattern freeze section to
  [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
  covering what stayed true, what changed, and which pre-implementation
  assumptions were rejected.
- Rewrote `SRC6`, `SRC7`, and `SRC8` around the landed prompt/action/window
  contract and restored stable repo-root links in their inputs.
- Re-grounded the Quint follow-up in specific SRD and
  `UBIQUITOUS_LANGUAGE.md` sources so the frozen TS contract is an input to
  Quint work, not the semantic authority.
- `/simplify` round 1: tightened the handoff so `SRC5.5` now closes as `done`
  and unblocks `SRC6` instead of leaving the queue artificially stalled after
  the freeze note landed.
- `/simplify` round 2: re-checked the rewritten tasks and freeze note for
  redundant speculation and found no further durable planning changes.

### Task 6 - SRC6 - Add Quint Spec For Correction Slice

Status: `done`

Depends on: `SRC5.5`

Blocks: `SRC7`, `SRC8`

### Scope

Formalize the frozen correction-slice contract in Quint so Quint becomes the
semantic lead again before any `core` integration work resumes.

This task must model the exact slice already proven in TS:

- initiative-owned battle state with `initiativeCounts`, stable
  `initiativeOrder`, `turnActorId`, `round`, and `turnNumber`
- derived prompt discovery from battle state rather than stored prompt lists
- minimal open-prompt state for in-flight interaction windows
- complete prompt answers that yield either `resolvedAction` or `openedPrompt`
- reducer application for the bounded resolved-action set:
  `endTurn`, `attack`, `singleTargetHeal`, `areaSaveDamage`, and
  `grantExtraAction`

Do **not**:

- invent a broader generic prompt language than the frozen TS slice uses
- start `core` integration in this task
- add MBT in the same task

### Input

- `SRC5.5` freeze notes in
  [plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md](/workspace/typescript/dnd/plans/SURFACE_RUNTIME_CORRECTION_DESIGN.md:1)
- relevant RAW before modeling:
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:318) for Bonus Action / Reaction timing
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:479) for initiative order, rounds, and turns
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:584) for attack target selection and attack resolution shape
  - [Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md:710) for simultaneous save-based damage rolls
  - [Spells/Descriptions-A-D.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md:1277) for `Cure Wounds`
  - [Spells/Descriptions-E-L.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:418) for `Fireball`
  - [Classes/Fighter.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Fighter.md:76) for `Action Surge`
- [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md:14) and [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md:128) for initiative, round/turn, action, bonus action, reaction, offer, and quota terminology
- exported TS contract in
  [packages/surface-runtime-correction/src/battle-types.ts](/workspace/typescript/dnd/packages/surface-runtime-correction/src/battle-types.ts:1)
- prompt behavior in
  [packages/surface-runtime-correction/src/battle-prompts.ts](/workspace/typescript/dnd/packages/surface-runtime-correction/src/battle-prompts.ts:1)
- reducer behavior in
  [packages/surface-runtime-correction/src/battle-reducer.ts](/workspace/typescript/dnd/packages/surface-runtime-correction/src/battle-reducer.ts:1)
- deterministic slice tests in
  [packages/surface-runtime-correction/src/surface-runtime-correction.test.ts](/workspace/typescript/dnd/packages/surface-runtime-correction/src/surface-runtime-correction.test.ts:1)

### Output

- Quint model for the correction slice
- documented mapping from frozen TS prompt/action terms to Quint terms where
  naming differs

### Useful implementation recommendation

- Start from the frozen deterministic flows, not from abstract prompt
  generalization.
- Treat the frozen TS contract as a discovery artifact to be matched against
  RAW, not as permission to skip the SRD/UL grounding step.
- Keep the Quint state aligned with the minimal `openPrompt` ownership model so
  MBT can reuse the same semantic boundary.
- Once this task lands, Quint becomes the semantic lead for the correction
  slice.

### Acceptance criteria

- correction-slice semantics are expressed in Quint
- Quint matches the frozen discovered pattern
- the Quint model covers the currently-landed bounded slice only

### Verification

- Quint typecheck/tests appropriate to the landed slice
- deterministic Quint tests for the frozen prompt/action flows before MBT
- explicit check that every modeled rule in the slice still traces to the SRD
  passages and `UBIQUITOUS_LANGUAGE.md` terms listed in Inputs
- `/simplify` minimum two rounds

### Outcome

- Added [surfaceRuntimeCorrection.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrection.qnt:1) for the frozen correction-slice contract.
- Added [surfaceRuntimeCorrectionTest.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrectionTest.qnt:1) for deterministic Quint coverage of initiative, prompt discovery, prompt answering, reducer application, and the Action Surge edge cases in scope.
- Added [QUINT_MAPPING.md](/workspace/typescript/dnd/packages/surface-runtime-correction/QUINT_MAPPING.md:1) to map TS prompt/action terms to the Quint names and to record the cited RAW / ubiquitous-language grounding.
- Kept `grantExtraAction` structural in the Quint model by carrying restriction, use-count-cap, and usage-limit facts rather than baking in an Action Surge-only constructor.

### Task 7 - SRC7 - Add Correction-Slice MBT Bridge And MBT Tests

Status: `ready-for-implementation-after-light-research`

Depends on: `SRC6`

Blocks: `SRC8`

### Scope

Add MBT coverage for the correction slice against the frozen prompt/action model
after `SRC6` lands.

### Input

- `SRC6` Quint model
- frozen contract from `SRC5.5`

### Output

- MBT bridge and MBT tests for the correction slice
- bridge mapping for:
  - prompt discovery
  - open-prompt state
  - complete prompt answers
  - resolved actions

### Useful implementation recommendation

- Keep the MBT surface aligned with the frozen prompt/action/window model
  rather than inventing a broader adapter surface.
- Reuse the deterministic TS slice tests as replay targets before spending a
  Tier 1 MBT run.
- Keep MBT validation at Ralph-approved Tier 1 / Tier 1b only.

### Acceptance criteria

- correction-slice MBT path exists
- MBT exercises the correction-slice prompt/action flow against Quint
- MBT can distinguish `resolvedAction` from `openedPrompt`

### Verification

- focused correction-slice MBT runs
- deterministic replay tests for failing seeds before any rerun
- `/simplify` minimum two rounds

### Task 8 - SRC8 - Integrate Correction Slice Back Into Core

Status: `blocked`

Depends on: `SRC6`, `SRC7`

Blocks: none

### Scope

Port the Quint-backed correction-slice pattern back into one bounded `core`
entry path after `SRC6` and `SRC7` land.

The first integration should reuse the frozen prompt lifecycle:

- derive the currently-available prompt from battle state
- accept complete answers only
- allow resolution to open a new prompt
- reduce only resolved actions

### Input

- frozen discovered pattern from `SRC5.5`
- Quint parity from `SRC6`
- MBT bridge/tests from `SRC7`
- the bounded target `core` entry path selected during implementation

### Output

- one bounded `core` integration of the correction pattern
- removal or bypass of conflicting local ad hoc prompt/action handling in that
  bounded path

### Useful implementation recommendation

- Keep the integration bounded; do not attempt a whole-core rewrite in one task.
- Pick one representative `core` path and port the pattern cleanly.
- Prefer replacing a local ad hoc prompt/action seam over layering an adapter on
  top of it.

### Acceptance criteria

- one real `core` path uses the correction pattern
- the integration is backed by Quint/MBT rather than TS-only confidence
- the integrated `core` path does not reintroduce authored-id semantic
  branching or duplicated prompt state

### Verification

- bounded `core` tests
- relevant Quint/MBT parity checks
- `/simplify` minimum two rounds

## Deferred Historical Queue

All previously-open tasks outside `SRC1`-`SRC5` are deferred by owner direction for now.

This includes the currently open legacy work:

- `EPT9`-`EPT20`
- `CSA5`-`CSA8`
- `CSB1`-`CSB11`
- `CSC1`-`CSC2`

They are intentionally **not** part of the active batch while the correction-package slice is being established.

If the owner later wants one of them revived, this file should be updated explicitly rather than having Ralph infer it from older plan text.
