# Active Plan

Date: 2026-04-10

This is the single active planning queue. It folds in the MCP Fighter vs. Goblin follow-up plan and replaces the standalone goblin plan.

## Batch Objective

Pick one or more bounded implementation slices that improve the D&D rules engine and MCP action surface without adding MCP-only state, duplicating owned facts, or widening into a geometry/grid engine.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Do not pick up unless the batch objective changes.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with the task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "MCP0-A",
      "status": "done",
      "title": "Dead-Creature Condition Mutation Bug"
    },
    {
      "number": 2,
      "id": "MCP0-B",
      "status": "done",
      "title": "Dead-Creature Exhaustion Mutation Decision"
    },
    {
      "number": 3,
      "id": "MCP0-C",
      "status": "done",
      "title": "Short Unknown Action Error"
    },
    {
      "number": 4,
      "id": "MCP0-D",
      "status": "done",
      "title": "SHORT_REST Documentation Clarity"
    },
    {
      "number": 5,
      "id": "MCP0-E",
      "status": "done",
      "title": "EXIT_COMBAT After Death UX Decision"
    },
    {
      "number": 6,
      "id": "B",
      "status": "done",
      "title": "Battle Size Ownership For Grapple"
    },
    {
      "number": 7,
      "id": "A",
      "status": "done",
      "title": "Condition Consequence Table Completion Research"
    },
    {
      "number": 8,
      "id": "C",
      "status": "ready-for-implementation-after-light-research",
      "title": "ResourceCost Typed Refactor"
    },
    {
      "number": 9,
      "id": "D",
      "status": "ready-for-research",
      "title": "Battle Attack Runtime/Session Boundary"
    },
    {
      "number": 10,
      "id": "MCP1-A",
      "status": "ready-for-research",
      "title": "Session Host Architecture"
    },
    {
      "number": 11,
      "id": "MCP1-B",
      "status": "ready-for-research",
      "title": "Core Statblock Facility + Initial Goblin Minion Entry"
    },
    {
      "number": 12,
      "id": "E",
      "status": "ready-for-research",
      "title": "Movement And Help Geometry/Session Ownership"
    },
    {
      "number": 13,
      "id": "J",
      "status": "ready-for-research",
      "title": "Generic Table Events, Environmental Hazards, And Monster Commands"
    },
    {
      "number": 14,
      "id": "F",
      "status": "blocked",
      "title": "Legendary Attack Payload Ownership"
    },
    {
      "number": 15,
      "id": "G",
      "status": "blocked",
      "title": "Attack Rider Ownership"
    },
    {
      "number": 16,
      "id": "MCP1-C",
      "status": "blocked",
      "title": "Encounter Start Tool/Command"
    },
    {
      "number": 17,
      "id": "MCP2-A",
      "status": "blocked",
      "title": "Battle Attack Public Boundary"
    },
    {
      "number": 18,
      "id": "MCP2-B",
      "status": "blocked",
      "title": "Fighter Attacks Goblin End-to-End"
    },
    {
      "number": 19,
      "id": "MCP3-A",
      "status": "blocked",
      "title": "Goblin Warrior/Nimble Escape Follow-Up"
    },
    {
      "number": 20,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 21,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status. The Ralph harness treats that JSON block as the machine-readable control surface.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Update the task status before ending the loop:
  - `done` if implementation/research and verification are complete;
  - `ready-for-implementation-after-light-research` if research made it implementable;
  - `blocked` if a required ownership/API decision is still unresolved;
  - `deferred` if research shows the task should not be in the current batch.
- When a task is marked `done` or `deferred`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- Do not leave a task `blocked` only because an old dependency label still says blocked. Reconcile the DAG table and the task's detailed `Depends on` section before ending the loop.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Do not fix semantic behavior only in MCP or XState. Adapter-only tasks, documentation-only tasks, and pure session-routing tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run MBT for research-only tasks. For implementation tasks, use the narrowest verification tier listed on the task.

## DAG / Queue Order

| Order | Task                                                                  | Status                                        | Depends on                                               | Blocks                                                                              | Next action                                                                                                                                                              | Handoff readiness                          |
| ----- | --------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1     | MCP0-A - Dead-Creature Condition Mutation Bug                         | done                                          | none                                                     | MCP0-B, safer MCP table events                                                      | Closed 2026-04-10: dead-creature condition apply/remove now reject at MCP/XState and no-op in Quint                                                                      | Completed; policy documented in A16        |
| 2     | MCP0-B - Dead-Creature Exhaustion Mutation Decision                   | done                                          | MCP0-A RAW/dead policy research                          | safer MCP table events                                                              | Closed 2026-04-10: dead-creature exhaustion add/reduce now reject at MCP/XState and no-op in Quint; generic starvation/dehydration exhaustion is also blocked while dead | Completed; policy documented in A16        |
| 3     | MCP0-C - Short Unknown Action Error                                   | done                                          | none                                                     | MCP UX and downstream agents                                                        | Closed 2026-04-10: `execute_action` / `preview_action` now return compact `UNKNOWN_ACTION_TYPE` errors before full decode, while known-action schema validation remains intact | Completed; no downstream plan changes      |
| 4     | MCP0-D - SHORT_REST Documentation Clarity                             | done                                          | none                                                     | MCP docs accuracy                                                                   | Closed 2026-04-10: docs/tool descriptions now keep `SHORT_REST` on the action-token lane and explicitly out of `execute_control_command`                               | Completed; no duplicate route added        |
| 5     | MCP0-E - EXIT_COMBAT After Death UX Decision                          | done                                          | MCP0-A policy context                                    | optional UX cleanup                                                                 | Closed 2026-04-10: keep `EXIT_COMBAT` available after death, document A33 caller-owned roster teardown, and clarify the MCP/core outcome text                           | Completed; no dead-creature special route  |
| 6     | B - Battle Size Ownership For Grapple                                 | done                                          | none                                                     | Public `BATTLE_GRAPPLE`; helps clarify attack-size ownership patterns               | Closed 2026-04-10: battle/spec/init now own combatant `creatureSize`; `BATTLE_GRAPPLE` no longer accepts caller-supplied sizes and remains unexposed only because `targetSaveFailed` still needs the final public runtime/session contract | Completed; audit blocker text updated      |
| 7     | A - Condition Consequence Table Completion Research                   | done                                          | none                                                     | none                                                                                | Closed 2026-04-10: rejected redundant/single-condition table columns, deferred initiative modifiers, and landed the SRD 5.2.1 incapacitated speech fix                 | Completed; no table expansion needed       |
| 8     | C - ResourceCost Typed Refactor                                       | ready-for-implementation-after-light-research | none                                                     | Cleaner MCP/UI cost display and future resource docs                                | Confirm cost consumer blast radius and immediate-cost scope, then implement typed costs if still small                                                                   | Good support-layer cleanup                 |
| 9     | D - Battle Attack Runtime/Session Boundary                            | ready-for-research                            | none                                                     | F, G, MCP1-C, MCP2-A, possibly I; public `BATTLE_ATTACK`; off-hand/legendary/riders | Design token/runtime/session contract and stop conditions                                                                                                                | Research only; do not implement attack yet |
| 10    | MCP1-A - Session Host Architecture                                    | ready-for-research                            | MCP0 tasks done or intentionally deferred                | MCP1-C, MCP2-A                                                                      | Design MCP session/router host without combat state duplication                                                                                                          | Research before implementation             |
| 11    | MCP1-B - Core Statblock Facility + Initial Goblin Minion Entry        | ready-for-research                            | MCP0 tasks done or intentionally deferred                | MCP1-C, MCP2-B                                                                      | Design a reusable core statblock facility, document approved provenance for future entries, and add Goblin Minion as the first entry                                     | Research before implementation             |
| 12    | E - Movement And Help Geometry/Session Ownership                      | ready-for-research                            | none                                                     | Public `BATTLE_MOVE`, `BATTLE_HELP_ATTACK`                                          | Decide visibility/reach/threat/path/provocation ownership                                                                                                                | Research only                              |
| 13    | J - Generic Table Events, Environmental Hazards, And Monster Commands | ready-for-research                            | none                                                     | Future raw table event exposure and monster command work                            | Pick one narrow source/provenance family or keep deferred                                                                                                                | Research only                              |
| 14    | F - Legendary Attack Payload Ownership                                | blocked                                       | D plus monster stat-block payload ownership              | Public `BATTLE_LEGENDARY_ATTACK`                                                    | Wait for D, then define stat-block Legendary Action payload ownership                                                                                                    | Not handoff-ready                          |
| 15    | G - Attack Rider Ownership                                            | blocked                                       | D                                                        | Attack rider tokens                                                                 | Wait for D, then classify rider timing and owned/runtime facts                                                                                                           | Not handoff-ready                          |
| 16    | MCP1-C - Encounter Start Tool/Command                                 | blocked                                       | MCP1-A, MCP1-B                                           | MCP2-A                                                                              | Initialize fighter-vs-goblin battle via MCP                                                                                                                              | Not handoff-ready                          |
| 17    | MCP2-A - Battle Attack Public Boundary                                | blocked                                       | D, MCP1-C                                                | MCP2-B                                                                              | Implement first-slice main-hand `BATTLE_ATTACK` token after D decides the boundary                                                                                       | Not handoff-ready                          |
| 18    | MCP2-B - Fighter Attacks Goblin End-to-End                            | blocked                                       | MCP2-A                                                   | motivating MCP flow                                                                 | Execute attack against goblin through MCP                                                                                                                                | Not handoff-ready                          |
| 19    | MCP3-A - Goblin Warrior / Nimble Escape Follow-Up                     | blocked                                       | MCP1-B, MCP2-A; possible stat-block attack-rider support | fuller goblin behavior                                                              | Model richer goblin behavior after the minion slice                                                                                                                      | Not handoff-ready                          |
| 20    | H - PassiveModifiers Sub-Record                                       | deferred                                      | none                                                     | Possible passive modifier cleanup                                                   | Only revisit if the batch selects passive modifier restructuring                                                                                                         | Not current-batch work                     |
| 21    | I - Build-Map / Hole Metadata                                         | deferred                                      | Concrete consumer, possibly D                            | Future token-hole metadata                                                          | Only revisit when attack boundary, transcript disambiguation, or UI needs it                                                                                             | Not current-batch work                     |

## Current Integrated Baseline

Already wired on `master`:

- `BATTLE_HIDE`, `BATTLE_SEARCH`, `BATTLE_ESCAPE_GRAPPLE`, and `BATTLE_RELEASE_GRAPPLE` through `get_available_actions`.
- `BATTLE_ACTION_SURGE`, `BATTLE_ENTER_RAGE`, and `BATTLE_DECLARE_RECKLESS` through `get_available_actions`.
- Warlock `USE_MAGICAL_CUNNING`, Sorcerer `USE_INNATE_SORCERY`, and Druid `ENTER_WILD_SHAPE`, `EXIT_WILD_SHAPE`, `USE_WILD_RESURGENCE_SLOT`.
- Creature damage/recovery, condition/exhaustion, falling, voluntary concentration break, failed-save/check semantic triggers, and battle `BATTLE_HEAL` through `record_table_event`.

Still explicitly deferred in the `MCP_EVENT_SURFACE_AUDIT.md` baseline. Task B is now complete, but public `BATTLE_GRAPPLE` remains deferred until its remaining runtime/session contract is finalized:

- `BATTLE_ATTACK`, `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`.
- Attack riders: `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, `USE_DIVINE_SMITE_FREE`.
- `BATTLE_HELP_ATTACK`, `BATTLE_MOVE`, `BATTLE_GRAPPLE`.
- Generic battle spell table events, raw effect/max-HP table events, environmental blockers such as `SUFFOCATE`, and monster-command blockers such as raw monster `USE_LEGENDARY_ACTION`.

Merged MCP Fighter vs. Goblin baseline:

- Confirmed MCP bugs should be tackled before the new battle-session workflow:
  - dead-creature condition mutation through MCP table events;
  - dead-creature Exhaustion mutation policy;
  - huge schema decode output for unknown `execute_action` types;
  - `SHORT_REST` documentation clarity;
  - `EXIT_COMBAT` after death UX decision.
- The fighter-vs-goblin flow is blocked on Task D because MCP does not yet expose public `BATTLE_ATTACK`.
- The first monster-content slice should be a reusable core statblock facility with Goblin Minion as the initial SRD-backed entry, not a goblin-only architecture. Goblin Warrior still remains deferred because its advantage-based extra damage is not represented by the current `MonsterAttack` shape, and full goblin support also needs Nimble Escape as a monster bonus-action option.
- Monster content must live in core stat-block/content modules. MCP should select or reference that content; it must not duplicate RAW stat-block numbers in its own registry.

## Task Selection Guidance

Recommended first coding-loop tasks:

1. **Task C: ResourceCost Typed Refactor** if the goal is support-layer cleanup with limited behavioral risk.
2. **Task D: Battle Attack Runtime/Session Boundary** if the goal is the next ownership/API research frontier after the MCP0 cleanup.
3. **Task MCP1-A: Session Host Architecture** if the goal is MCP-side research that does not duplicate combat state.
4. **Task MCP1-B: Core Statblock Facility + Initial Goblin Minion Entry** if the goal is monster-content research that feeds later public battle surfaces.
5. **Task E: Movement And Help Geometry/Session Ownership** if the goal is another bounded ownership research slice.

Do not start with `BATTLE_ATTACK` implementation. Its public runtime/session contract is the main unresolved API boundary and can easily absorb off-hand attacks, hit reactions, legendary actions, and riders.

Do not start the full fighter-vs-goblin implementation before Task D has produced the public attack boundary. The session and goblin-content tasks can be researched first, but the motivating "Fighter attacks Goblin through MCP" loop remains blocked until public `BATTLE_ATTACK` exists.

### Task 1 - MCP0-A - Dead-Creature Condition Mutation Bug

Status: done.

Depends on: none.

Blocks: Task MCP0-B, table-event confidence, MCP fighter-vs-goblin workflow.

Next action: Closed 2026-04-10. Use the A16 dead-creature condition policy as context for MCP0-B and MCP0-E follow-up work.

Problem:

- `record_table_event` accepts `REMOVE_CONDITION` on dead creatures.
- Current behavior can produce `dead: true, unconscious: false`, contradicting the modeled 0 HP unconscious/stable behavior.
- `record_table_event` also accepts `APPLY_CONDITION` on dead creatures.
- Root handlers are unguarded in `packages/core/src/machine-states.ts`.
- XState applies and removes conditions in `packages/core/src/machine.ts` without a dead guard.
- Quint `pApplyCondition` and `pRemoveCondition` in `creature.qnt` also have no dead guard.

Inputs:

- `.references/srd-5.2.1/Playing-the-Game.md` "Dropping to 0 Hit Points", "Falling Unconscious", and "Stabilizing a Character".
- `.references/srd-5.2.1/Rules-Glossary.md` "Dead", "Stable", and "Unconscious".
- `ASSUMPTIONS.md` A16 and A33.
- `UBIQUITOUS_LANGUAGE.md` death, stable, unconscious, condition terminology.
- `creature.qnt`.
- `packages/core/src/machine.ts`.
- `packages/core/src/machine-states.ts`.
- `packages/mcp/src/server-table-events.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add a focused test that reproduces `REMOVE_CONDITION` on a dead/unconscious creature through MCP.
- Add a focused test for `APPLY_CONDITION` on a dead creature and document the chosen behavior.
- Update `creature.qnt` first, then mirror the chosen behavior in XState and MCP. Preferred default unless RAW research contradicts it:
  - condition removal on a dead creature is a no-op or explicitly rejected for table-event entry;
  - new post-death condition application is rejected/no-op unless an owned revival/effect source authorizes it;
  - existing conditions can persist through death and revival per SRD Dead.
- Update MCP table-event behavior to return a structured not-accepted result if the core event is rejected.
- Update `MCP_EVENT_SURFACE_AUDIT.md` if public table-event semantics change.

Acceptance criteria:

- `REMOVE_CONDITION` cannot clear Unconscious from a dead creature through MCP.
- `APPLY_CONDITION` on a dead creature has an explicit modeled behavior and test coverage.
- Quint and XState agree.
- The implementation notes distinguish "existing conditions persist through death" from "new conditions can be applied after death."
- No MCP-only dead-condition state or special registry is introduced.

Verification:

- RAW check: read the SRD passages listed above and `UBIQUITOUS_LANGUAGE.md` before editing.
- `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.
- Focused core tests for the pure/machine behavior.
- Focused MCP tests for `record_table_event`.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if `creature.qnt` or the creature MBT bridge changes.

Verification completed:

- RAW check completed against `.references/srd-5.2.1/Playing-the-Game.md` ("Dropping to 0 Hit Points", "Falling Unconscious", "Stabilizing a Character"), `.references/srd-5.2.1/Rules-Glossary.md` ("Dead", "Stable", "Unconscious [Condition]"), `ASSUMPTIONS.md` A16/A33, and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: kept both the root guard and the action-level dead no-op. The root guard is needed for structured MCP rejection; the action-level no-op remains as defensive parity if condition actions are invoked outside the guarded root path. No simplification change needed.
- `/simplify` round 2: re-checked for duplicate state or MCP-only dead-condition handling. None found; no further changes needed.
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts -t "dead state rejects APPLY_CONDITION|dead state rejects REMOVE_CONDITION"`: passed.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "record_table_event rejects condition application on dead creatures|record_table_event rejects condition removal on dead creatures"`: passed.
- `npx quint test --match "test_dead_condition_(apply|remove)_noop" dndTest.qnt`: passed.
- `npx quint test --match "inv_" dndTest.qnt`: passed (47 passing).
- Tier 1b creature MBT: `START=$(date +%s); cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/creature.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` completed with the MBT replay passing for seed `0x07709fff`, but the run still failed on the pre-existing schema-sync assertion `New Quint CreatureState fields not in schema: maxHpReduction`. No new CreatureState fields were introduced by MCP0-A.
- `pnpm quality`: failed on pre-existing `prettier --check` drift in `packages/core/src` (`battle-machine-actions-attack.ts`, `context-encoding.ts`, `creature.mbt.test.ts`, `features/spell-available-actions.ts`, `machine-event-extractors.ts`, `machine-helpers.ts`, `machine-monk.ts`, `machine-queries.ts`, `machine-startturn.ts`, `machine.ts`, `types.ts`) before reaching typecheck.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-A`: revise to `done`.
  - `MCP0-B`: no-change; dependency context is now explicit in A16, and the task was already `ready-for-implementation-after-light-research`.
  - `MCP0-E`: no-change; the dead-condition policy context is now documented for the later UX decision.
- Plan edits: marked `MCP0-A` done in the Ralph task index and DAG row, updated the task closeout with verification results and downstream planning notes.

Extra research needed:

- Light. RAW Dead/Stable/Unconscious reread required before edits.

### Task 2 - MCP0-B - Dead-Creature Exhaustion Mutation Decision

Status: done.

Depends on: Task MCP0-A RAW/dead policy research.

Blocks: safer table-event behavior and later MCP session reliability.

Next action: Closed 2026-04-10. Use the A16 dead-creature exhaustion policy as context for MCP0-E and future table-event provenance work.

Problem:

- `ADD_EXHAUSTION` and `REDUCE_EXHAUSTION` are accepted on dead creatures.
- XState updates are in `packages/core/src/machine.ts`.
- Quint equivalents are `pAddExhaustion` and `pReduceExhaustion` in `creature.qnt`.
- SRD covers Exhaustion causing death and revival reducing existing Exhaustion by 1, but there is no known local assumption authorizing arbitrary Exhaustion changes while dead.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` "Dead" and "Exhaustion".
- `ASSUMPTIONS.md` A14, A16, A33.
- `UBIQUITOUS_LANGUAGE.md` Exhaustion and death terminology.
- `creature.qnt`.
- `packages/core/src/machine.ts`.
- `packages/mcp/src/server-table-events.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add focused tests for `ADD_EXHAUSTION` and `REDUCE_EXHAUSTION` on dead creatures through MCP.
- Decide in `creature.qnt` first, then mirror in XState/MCP, one of:
  - reject/no-op Exhaustion changes while dead except owned revival semantics;
  - allow a clearly documented subset tied to an explicit source;
  - document why current behavior is intentional in `ASSUMPTIONS.md`.
- Keep revival-specific "returns with 1 fewer Exhaustion level" separate from table-event `REDUCE_EXHAUSTION`.

Acceptance criteria:

- Dead-creature Exhaustion mutation has a RAW-backed or assumption-backed policy.
- MCP behavior matches core behavior.
- Quint and XState agree.
- No generic raw table event bypasses revival/source provenance.

Verification:

- RAW check: read SRD Dead and Exhaustion plus `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused core and MCP tests.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if `creature.qnt` or the bridge changes.

Verification completed:

- RAW check completed against `.references/srd-5.2.1/Rules-Glossary.md` ("Dead", "Exhaustion"), `ASSUMPTIONS.md` A14/A16/A33, and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: kept both the Quint dead no-op and the XState root guards. Quint remains the semantic authority, while the root guards are still needed so MCP table events return structured `TABLE_EVENT_NOT_ACCEPTED` results instead of silently no-oping after dispatch.
- `/simplify` round 2: checked for remaining dead-exhaustion mutation paths and found that `APPLY_STARVATION` / `APPLY_DEHYDRATION` bypass `pAddExhaustion` through `exhaustionWithConcBreak`, so the shared `canChangeExhaustion` guard stays on those root handlers to preserve Quint parity. No further simplification needed.
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts -t "dead state rejects exhaustion|dead state rejects starvation exhaustion|dead state rejects dehydration exhaustion"`: passed.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "record_table_event rejects ADD_EXHAUSTION on dead creatures|record_table_event rejects REDUCE_EXHAUSTION on dead creatures"`: passed.
- `npx quint test --match "test_dead_exhaustion_(add|reduce)_noop|inv_" dndTest.qnt`: passed.
- Tier 1b creature MBT: after confirming no live `vitest` processes and no stale `quint_evaluator` processes before launch, `START=$(date +%s); cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/creature.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` completed with MBT replay passing for seed `0xa6875358`, but the run still failed on the pre-existing schema-sync assertion `New Quint CreatureState fields not in schema: maxHpReduction`.
- `pnpm quality`: failed on pre-existing `prettier --check` drift in `packages/core/src` (`battle-machine-actions-attack.ts`, `context-encoding.ts`, `creature.mbt.test.ts`, `features/spell-available-actions.ts`, `machine-event-extractors.ts`, `machine-helpers.ts`, `machine-monk.ts`, `machine-queries.ts`, `machine-startturn.ts`, `machine.ts`, `types.ts`) before reaching circular-dependency and typecheck steps.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-B`: revise to `done`.
  - `MCP0-E`: no-change; the dead/exhaustion policy is now explicit for the later UX decision.
  - `J`: no-change; generic raw table-event provenance work still remains a separate research task.
- Plan edits: marked `MCP0-B` done in the Ralph task index and DAG row, and added the task closeout with verification and policy notes.

Extra research needed:

- Light. Depends on the dead-creature policy in Task MCP0-A.

### Task 3 - MCP0-C - Short Unknown Action Error

Status: done.

Depends on: none.

Blocks: MCP UX and downstream agents.

Next action: Closed 2026-04-10. Use the compact unknown-action error path as the MCP baseline for future action-surface work; no downstream plan updates were required.

Problem:

- Invalid `execute_action` input such as `{ type: "TOTALLY_FAKE_ACTION" }` returns a very large Effect schema decode string.
- Cause: `packages/mcp/src/server.ts` decodes the full `ResolvedActionTokenSchema` union and returns `String(decoded.left)`.

Inputs:

- `packages/mcp/src/server.ts`.
- `packages/core/src/available-actions.ts` action scope/type constants and resolved action schemas.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add a small pre-decode discriminator check for `execute_action` and `preview_action`.
- Return a short structured error for unknown or missing action type, for example:
  - `error: "Unknown execute_action type: TOTALLY_FAKE_ACTION"`;
  - `details: { code: "UNKNOWN_ACTION_TYPE", type: "TOTALLY_FAKE_ACTION" }`.
- Keep full schema validation for known action types with malformed payloads.

Acceptance criteria:

- Unknown action type returns a compact error, not the full union decode output.
- Known action type with invalid fields still returns useful validation failure.
- Scope mismatch behavior remains unchanged.
- No action registry is duplicated in MCP if the type list can be derived/exported from core.

Verification:

- RAW check: not applicable; adapter UX only.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused MCP tests for unknown action type, missing type, malformed known type, and scope mismatch.
- `pnpm --filter @dnd/mcp test`.

Verification completed:

- Confirmed the core-owned discriminator source is `ResolvedActionTokenSchema`; MCP now derives the pre-decode type set from the schema AST instead of maintaining a parallel registry.
- `/simplify` round 1: removed the need for any new exported action-type list by deriving the discriminator check from the existing core schema. No duplicate MCP/core registry remains.
- `/simplify` round 2: re-checked the pre-decode path for behavior drift. Unknown and missing types stay compact, while known malformed payloads still fall through to full schema validation and scope mismatch remains unchanged.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "compact error|missing action type|malformed known action payloads|scope mismatch behavior"`: passed.
- `pnpm --filter @dnd/mcp lint`: passed.
- `pnpm --filter @dnd/mcp typecheck`: passed.
- `pnpm --filter @dnd/mcp test`: passed.
- `pnpm quality`: failed before reaching typecheck because `packages/core` has pre-existing `prettier --check` drift in `src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, and `src/types.ts`. No new `pnpm quality` failure was introduced by MCP0-C.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-C`: revise to `done`.
  - `MCP0-D`: no-change.
  - `B`: no-change.
- Plan edits: marked `MCP0-C` done in the Ralph task index, DAG row, task section, and refreshed the recommended task list to remove the completed item.

### Task 4 - MCP0-D - SHORT_REST Documentation Clarity

Status: done.

Depends on: none.

Blocks: MCP documentation accuracy.

Next action: Closed 2026-04-10. Keep `SHORT_REST` on `get_available_actions` / `execute_action`; do not add a mirrored `execute_control_command` route.

Problem:

- `SHORT_REST` is not missing. It intentionally stays on `get_available_actions` / `execute_action`, not `execute_control_command`.
- It is schema-supported in `packages/core/src/available-actions.ts` and tested in `packages/mcp/src/server.test.ts`.
- The fix is documentation/description clarity, not a new command.

Inputs:

- `ARCHITECTURE.md` MCP section.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- `plans/available-actions.md`.
- `packages/mcp/src/server.ts` tool descriptions.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Clarify public docs/tool descriptions that `SHORT_REST` remains an action token because it has user-selected hit-dice order and runtime rolls.
- Add a regression assertion if tool descriptions or docs are snapshot-tested.

Acceptance criteria:

- Docs do not imply `SHORT_REST` should be sent through `execute_control_command`.
- Existing `SHORT_REST` action-token path remains unchanged.
- No duplicate short-rest control route is added.

Verification:

- RAW check: Short Rest wording only if documentation cites SRD behavior.
- `/simplify` convergence: minimum two rounds after implementation or docs/tool-description edits.
- `pnpm --filter @dnd/mcp test` if tool description tests change.

Verification completed:

- Light research confirmed the misleading wording lived in `ARCHITECTURE.md`, `plans/available-actions.md`, `plans/MCP_EVENT_SURFACE_AUDIT.md`, and the MCP tool descriptions in `packages/mcp/src/server.ts`; the existing `SHORT_REST` action-token route and test coverage already lived in `packages/core/src/available-actions.ts` and `packages/mcp/src/server.test.ts`.
- RAW check: not applicable beyond avoiding new SRD claims. The final wording is routing/ownership documentation only and does not add or reinterpret rule text.
- `/simplify` round 1: kept the change set on the documentation/tool-description surface only. No schema, control-command, or action-routing code changed, so there was nothing to collapse into a new public route.
- `/simplify` round 2: re-checked for duplicated guidance between the audit, architecture note, and tool descriptions. The remaining repetition is intentional because each file serves a different reader surface; no further simplification needed.
- `pnpm --filter @dnd/mcp test -- --runInBand`: passed.
- `git diff --check`: passed.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-D`: revise to `done`.
  - `MCP0-E`: no-change; this task only clarified routing docs and did not change the pending UX decision.
- Plan edits: marked `MCP0-D` done in the Ralph task index, DAG row, task-selection guidance, and Task 4 closeout.

Extra research needed:

- Light. Confirm where the misleading docs/tool text is before editing.

### Task 5 - MCP0-E - EXIT_COMBAT After Death UX Decision

Status: done.

Depends on: Task MCP0-A policy context.

Blocks: optional UX cleanup.

Next action: Closed 2026-04-10. Keep `EXIT_COMBAT` available after death, document the A33 caller-owned teardown rationale, and use clearer outcome text in core/MCP surfaces.

Problem:

- `EXIT_COMBAT` remains available and succeeds after death.
- This is probably lower priority and may be intentional: the audit keeps it as an action-token control command, and `ASSUMPTIONS.md` says dead/unconscious creatures remain in initiative until caller removal.

Inputs:

- `ASSUMPTIONS.md` A33.
- `plans/MCP_EVENT_SURFACE_AUDIT.md` `EXIT_COMBAT` row.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.test.ts`.

Research output:

- Decision: keep `EXIT_COMBAT` available after death and clarify the outcome text so it describes caller-owned removal from combat/initiative tracking.

Acceptance criteria:

- The behavior is documented as intentional or changed with tests.
- If changed, no conflict is introduced with A33's caller-owned removal policy.
- If token availability or rule semantics change, the decision is made in the core/spec layer first, then mirrored through MCP. Do not special-case dead combat exit only in MCP.

Verification:

- RAW/assumption check: read A33 before changing behavior.
- `/simplify` convergence: minimum two rounds if implementation or docs/tool-description edits occur.
- Focused available-actions/MCP tests if token availability or text changes.

Verification completed:

- RAW/assumption check: reread `ASSUMPTIONS.md` A33 and kept the caller-owned roster teardown policy intact. This task does not add new SRD semantics; it clarifies the MCP/core UX around the existing assumption.
- `/simplify` round 1: rejected a dead-only MCP special case. The final change keeps ownership in the core action spec and uses one clearer `EXIT_COMBAT` summary for both living and dead creatures.
- `/simplify` round 2: re-checked for redundant state or duplicated routing. No new flags, control routes, or MCP-only logic were added; the remaining docs updates are intentional mirrors of the same A33 decision.
- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`: passed.
- `pnpm --filter @dnd/mcp test -- --runInBand packages/mcp/src/server.test.ts`: passed.
- `git diff --check`: passed.
- `pnpm quality`: failed in a pre-existing repo state during `packages/core` lint because `prettier --check src` reported unrelated formatting drift in 11 existing files (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`). This task did not touch those files and did not run broad formatters.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-E`: revise to `done`.
  - `MCP1-A`: no-change; the decision preserves caller-owned teardown and does not add a second MCP control surface.
  - `MCP1-C`: no-change; encounter teardown ownership remains aligned with the existing single-creature host route.
- Plan edits: marked `MCP0-E` done in the Ralph task index, DAG row, task-selection guidance, and Task 5 closeout.

Extra research needed:

- No. The decision is closed for this batch; only optional future UX copy cleanup remains.

### Task 6 - B - Battle Size Ownership For Grapple

Status: done.

Depends on: none.

Blocks: public `BATTLE_GRAPPLE` exposure and any grapple legality surface that requires owned combatant Size.

Next action: Closed 2026-04-10. Use the updated `plans/MCP_EVENT_SURFACE_AUDIT.md` row for the remaining `BATTLE_GRAPPLE` public-surface blocker (`targetId` plus runtime-owned `targetSaveFailed` contract).

Purpose:

- Move creature Size into battle-owned combatant state so `BATTLE_GRAPPLE` can stop accepting `attackerSize` and `targetSize` as public/raw event payload facts.

Context:

- Folded-in ownership note: battle Size ownership must be fixed before public
  `BATTLE_GRAPPLE` exposure.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Current problem: `BATTLE_GRAPPLE` needs size, but `BattleCreatureState` and `battle.qnt` `Combatant` do not store size.
- Current raw payload locations to inspect: `packages/core/src/battle-machine-events.ts` `BATTLE_GRAPPLE` and `packages/core/src/battle-machine-actions-turn.ts` grapple handling.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` Grapple and Size text.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-events.ts` if event payload shape changes.
- `packages/core/src/battle-machine-actions-turn.ts`.
- `packages/core/src/available-actions.ts`.
- Battle MBT projection files.

Implementation output:

- Add `creatureSize` to Quint `Combatant`.
- Add `creatureSize` to `BattleCreatureState`.
- Add optional `creatureSize` to `InitCreatureConfig`; default PCs to `"medium"` unless a better owned source is available.
- Add `creatureSize` to MCP `BATTLE_INIT` creature schema if battle init remains the public combatant config source.
- Update `BATTLE_GRAPPLE` handling to derive attacker and target size from battle state.
- Reassess whether public `BATTLE_GRAPPLE` token can be exposed after size is owned. If save/free-hand/target facts are still clean, expose; otherwise update blocker precisely.

Acceptance criteria:

- Public API no longer accepts caller-supplied `attackerSize`/`targetSize` for grapple.
- Battle machine and `battle.qnt` derive grapple size legality from combatant state.
- MBT bridge maps the new size field.
- No MCP-only size state is introduced.
- Existing release/escape grapple behavior remains unchanged.

Verification:

- RAW check: Grapple and Size entries in `.references/srd-5.2.1/Rules-Glossary.md` and terminology in `UBIQUITOUS_LANGUAGE.md` before implementation.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused battle scenario tests for size-blocked and size-allowed grapples.
- `pnpm --filter @dnd/core typecheck`.
- Tier 1 battle MBT after Quint and bridge changes.

Verification completed:

- RAW check: reread `.references/srd-5.2.1/Rules-Glossary.md` Grappled, Grappling, Unarmed Strike (grapple size limit), and Size; rechecked `UBIQUITOUS_LANGUAGE.md` entries for Grapple, Free Hand, and Size before editing. The final change only moves Size ownership into battle/spec state and keeps the existing SRD grapple legality.
- `/simplify` round 1: removed the raw `attackerSize`/`targetSize` payload from battle events/tests and rejected the bridge-side hardcoded grapple-size inputs.
- `/simplify` round 2: rechecked init/default ownership and public-surface wording; kept `BATTLE_GRAPPLE` unexposed because `targetSaveFailed` is still a runtime-owned fact, and updated the audit/plan text to describe that precise remaining blocker.
- Focused battle scenario tests: added a size-blocked grapple case and kept the size-allowed drag-speed exemption coverage.
- `pnpm --filter @dnd/core typecheck`: passed.
- `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts -t "grapple fails when the target is more than one size larger|dragging a grappled target halves the grappler's speed unless the target is two sizes smaller"`: passed.
- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts -t 'release grapple|escape grapple'`: passed.
- `pnpm --filter @dnd/mcp test -- --runInBand packages/mcp/src/server.test.ts -t 'release grapple|escape grapple'`: passed.
- `node scripts/compile-battle-spec.cjs`: passed; rebuilt `.quint-cache/battle-compiled.json` for the updated battle spec.
- Tier 1 battle MBT: `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle-projection.mbt.test.ts` passed after recompiling the battle spec cache.
- `git diff --check`: passed.
- `pnpm quality`: failed in a pre-existing repo state during `packages/core` lint because `prettier --check src` reported unrelated formatting drift in 11 existing files (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`). This task-formatted its touched test files and did not run broad repo-wide formatting.

Plan Impact:

- Status: applied
- Affected tasks:
  - `B`: revise to `done`.
  - `D`: no-change; the remaining `BATTLE_GRAPPLE` blocker is now the same runtime/session-boundary problem family, but Task D scope itself is unchanged.
  - `MCP2-A`: no-change; attack-boundary research remains a separate blocker for public attacks.
- Plan edits: marked Task `B` done in the Ralph task index, DAG row, task-selection guidance, current baseline note, and Task 6 closeout; updated the next-step text to point at the audit's new post-size blocker wording.

Extra research needed:

- Light. RAW Grapple/Size reread required, but the ownership design is already documented.

### Task 7 - A - Condition Consequence Table Completion Research

Status: done.

Depends on: none.

Blocks: none.

Next action: Closed 2026-04-10. Task 7 research rejected the proposed redundant/single-condition columns, deferred initiative modifiers to future initiative work, and landed the narrow SRD 5.2.1 speech fix for Incapacitated/Stunned parity.

Purpose:

- Convert the under-documented competitor-derived condition-table gap into an implementation-ready scope.
- Decide whether to finish the full Quint+TS condition consequence table or only document why the current narrower TS table is sufficient.

Context:

- Competitor inspiration: `.references/inspirations/05-condition-effects-table.md`.
- Current TS table: `CANONICAL_CONDITION_CONSEQUENCES` in `packages/core/src/types.ts`.
- Current TS query usage: `packages/core/src/machine-queries.ts`.
- Current authoritative predicates: `creature.qnt` (`pOwnAttackModifiers`, `pDefenseModifiers`, `pCheckModifiers`, `pSaveModifiers`, `pCanSpeak`, `pApplyCondition`, `pComputeEffectiveSpeed`, `pTakeDamageAsCreature`).
- `plans/DAG.md` marks `canonical-condition-effects` complete, but current implementation is only partial relative to the inspiration design.

Known findings:

- Current TS table columns:
  - `ownAttackDisadvantage`
  - `defenseAdvantage`
  - `defenseAutoCritWithin5ft`
  - `checkDisadvantage`
  - `saveDexDisadvantage`
  - `saveStrDexAutoFail`
  - `speedZero`
  - `blocksActions`
  - `blocksSpeech`
- Inspiration-proposed extra columns:
  - `breaksConc`
  - `initDisadv`
  - `allDamageResist`
  - `blocksPoisonApp`
  - `impliesProne`
  - `impliesIncap`
- There is no authoritative Quint `CONDITION_EFFECTS` table.
- The inspiration note flags `pCanSpeak`/`canSpeak` and initiative disadvantage as possible gaps; those must be rechecked against SRD 5.2.1 before changing code.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` condition entries.
- `UBIQUITOUS_LANGUAGE.md` condition/effect terminology.
- `.references/inspirations/05-condition-effects-table.md`.
- `creature.qnt`, `packages/core/src/types.ts`, `packages/core/src/machine-queries.ts`, `packages/core/src/machine-helpers.ts`, `packages/core/src/battle-machine-creature.ts`.

Research output:

- Add a "Condition Table Delta" section to this file with:
  - exact SRD-backed columns to adopt or reject;
  - list of current behavior gaps, if any;
  - list of contextual effects that must remain outside the table;
  - implementation order and verification plan.

Implementation output, only after research:

- If adopted, add a Quint `ConditionEffects` table and align TS table naming/columns.
- Rewrite only unconditional condition consequences to table lookups.
- Keep contextual effects explicit: prone distance, frightened LOS, invisible attacker/defender role, deafened hearing checks, blinded sight checks, charmed source-specific effects, grappled non-grappler attack effects, and movement/path effects.

Acceptance criteria for research:

- Every proposed table column has a RAW citation or is explicitly rejected.
- The plan states whether `breaksConc`, `initDisadv`, `allDamageResist`, `blocksPoisonApp`, `impliesProne`, and `impliesIncap` should be implemented now, deferred, or rejected.
- The plan reconciles the `plans/DAG.md` "complete" status with current partial implementation.

Acceptance criteria for implementation:

- Quint and TS represent the same intended unconditional consequence set.
- Existing contextual behavior is not collapsed into incorrect booleans.
- Any behavior change is explicitly tied to RAW and noted in the plan.
- No new redundant condition state is introduced.

Verification:

- RAW check: condition entries in `.references/srd-5.2.1/Rules-Glossary.md` and terminology in `UBIQUITOUS_LANGUAGE.md` before any implementation.
- `/simplify` convergence: minimum two rounds after implementation if the research leads to code changes.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if only creature-level parity changes.
- Tier 1 battle MBT if battle-facing behavior changes.

Extra research needed:

- No. RAW reread completed.

Implementation closeout:

- Research outcome: keep the existing 9-column support table, fix the `incapacitated.blocksSpeech` gap, and do not add redundant/single-condition columns.
- Implemented scope: `pCanSpeak` now keys off incapacitation, TS `blocksSpeech` now includes Incapacitated, tests expect stunned creatures to be speechless, and `UBIQUITOUS_LANGUAGE.md` now reflects SRD 5.2.1 wording.

Verification results:

- RAW check completed against `.references/srd-5.2.1/Rules-Glossary.md` for Incapacitated, Stunned, Invisible, Petrified, and Concentration, plus `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: removed candidate carryover that was only formatting/comment churn and kept the task to the SRD-backed speech fix plus terminology/test updates.
- `/simplify` round 2: no further important simplifications found; no redundant state or extra table columns remain.
- `pnpm quality` failed in `prettier --check` because unrelated existing files already have formatting drift (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`).
- `pnpm --dir packages/core exec vitest run src/machine.test.ts -t "canAct and canSpeak"` passed.
- `pnpm exec quint test --match "test_can_speak_" dndTest.qnt` passed.
- `git diff --check` passed.

Plan Impact:

- Status: applied
- Affected tasks:
  - `A`: revised from `ready-for-research` to `done`; no new follow-up task added.
- Plan edits: synchronized Task 7 status/queue guidance and recorded the final closeout.

### Task 8 - C - ResourceCost Typed Refactor

Status: ready-for-implementation-after-light-research.

Depends on: none.

Blocks: cleaner MCP/UI cost display and future resource consumption terminology.

Next action: inspect all `ResourceCost` consumers and confirm this remains an immediate-cost display/selection shape before changing types.

Purpose:

- Promote shallow action costs into a typed, self-describing support-layer representation without adding a generic consumption engine.

Context:

- Competitor inspiration: `.references/inspirations/10-first-class-consumption.md`.
- Current type: `ResourceCost` in `packages/core/src/available-actions.ts`.
- Current shape:
  - `action?: true`
  - `bonusAction?: true`
  - `reaction?: true`
  - `movement?: number`
  - `charge?: ResourceCostCharge`
  - `shape?: "spend" | "grant" | "reserve" | "refund"`
- Missing domain language: `UBIQUITOUS_LANGUAGE.md` and `battle/DOMAIN.md` do not currently define Pool/Quota/Lock/Timer or Spend/Grant/Reserve/Refund.

Inputs:

- `.references/inspirations/10-first-class-consumption.md`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.ts`.
- Any app/MCP consumers of token `cost`.
- `UBIQUITOUS_LANGUAGE.md`, `battle/DOMAIN.md`.

Implementation output:

- Add resource consumption vocabulary to docs:
  - Pool, Quota, Lock, Timer.
  - Spend, Grant, Reserve, Refund.
- Confirm `ResourceCost` means immediate up-front selectable/displayable costs only.
- Replace shallow `ResourceCost` with typed cost items, likely `ReadonlyArray<QuotaCost | PoolCost>`.
- Update token builders and cost grouping/rendering consumers.
- Do not add a generic Quint `Cost` record or generic `consume()` function.

Acceptance criteria:

- Cost representation is typed enough for MCP/UI consumers to distinguish quotas from pools.
- Ready spell and Counterspell refund semantics are documented as resource-shape examples without moving their actual semantics into a generic engine.
- Existing token execution behavior is unchanged.
- All cost consumers compile without stringly matching old shallow fields.

Verification:

- RAW/domain-language check: confirm the representation is support-layer terminology and does not change SRD semantics.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/core typecheck`.
- Focused available-actions tests if token snapshots/shape tests exist.
- MCP tests if JSON schema or grouping output changes.

Extra research needed:

- Light. Confirm consumer blast radius before code changes.

### Task 9 - D - Battle Attack Runtime/Session Boundary

Status: ready-for-research.

Depends on: none.

Blocks: Task F, Task G, possibly Task I, public `BATTLE_ATTACK`, `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`, and attack riders.

Next action: design and document the token/runtime/session contract; do not implement attack in this pass.

Purpose:

- Define the public resolved-token/runtime input contract for a first-slice main-hand `BATTLE_ATTACK` without letting MCP fabricate table/session facts.

Context:

- Main audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Architectural rule: `ARCHITECTURE.md` says MCP must not remember, fabricate, or re-derive combat facts.

Known split:

- Battle-owned/derivable:
  - active attacker;
  - action/extra-attack spend;
  - `attackActionUsed`;
  - `lightAttackUsedThisTurn`;
  - help consumption;
  - crit range;
  - main-hand weapon profile;
  - melee/ranged flag;
  - damage type;
  - default damage qualifiers;
  - weapon properties;
  - Sneak Attack state.
- User holes:
  - `targetId`;
  - `knockOut`.
- Runtime dice/result inputs:
  - `attackRoll`;
  - damage dice/final damage;
  - possibly `crit`;
  - possibly `saDmg`.
- Table/session facts still missing from the public contract:
  - target AC;
  - `attackerWithin5ft`;
  - optional `attackerWithin60ft`;
  - `hostileWithin5ft`;
  - `targetCanSeeAttacker`;
  - `attackerCanSeeTarget`;
  - `frightSourceInLOS`;
  - `hasAllyAdjacentToTarget`;
  - `hitReactionCandidates`.

Inputs:

- `.references/srd-5.2.1/Playing-the-Game.md` Attack rules.
- `.references/srd-5.2.1/Rules-Glossary.md` relevant attack/visibility/cover/condition entries.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-actions-attack.ts`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server-runtime.ts`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- A contract proposal in this file or a task-specific plan:
  - exact resolved token shape;
  - exact runtime input shape;
  - explicit table/session facts allowed;
  - facts forbidden because battle already owns them;
  - stop conditions.

Implementation output, only after research:

- Add only one active-creature main-hand weapon `BATTLE_ATTACK` token.
- Do not include unarmed, off-hand, legendary, spell attack, custom weapon payloads, or attack riders.
- Do not accept caller-supplied `weaponProperties`, `isFinesse`, `dt`, or `damageQualifiers` for the first slice.

Acceptance criteria for research:

- The contract can execute without MCP inventing AC, geometry, visibility, adjacency, or hit-reaction candidates.
- The plan says whether `crit` is runtime-supplied or derived from `attackRoll` and `critRange`.
- The plan says whether damage aggregation is runtime-owned or battle-owned.

Acceptance criteria for implementation:

- Token appears only when active creature has an owned main-hand weapon and attack budget.
- Event construction derives weapon payload facts from battle state.
- Missing table/session facts are explicit inputs, not sampled or hidden in MCP.
- Off-hand, legendary, unarmed, and rider paths remain blocked.

Verification:

- RAW check: attack and relevant condition/visibility entries in `.references/srd-5.2.1/` and terminology in `UBIQUITOUS_LANGUAGE.md` before implementation.
- `/simplify` convergence: minimum two rounds after implementation if the research leads to code changes.
- Focused available-actions tests.
- MCP tests if schema/runtime handling changes.
- Tier 1 battle MBT if battle/spec/bridge semantics change.

Extra research needed:

- Yes. API contract design and RAW attack reread required.

### Task 10 - MCP1-A - Session Host Architecture

Status: ready-for-research.

Depends on: MCP0 tasks done or intentionally deferred.

Blocks: Task MCP1-C, Task MCP2-A.

Purpose:

- Introduce an MCP session/router model so the server can route tools to creature and battle hosts without treating the character list as active combat state.

Inputs:

- `packages/mcp/src/index.ts`.
- `packages/mcp/src/server.ts`.
- `packages/mcp/src/server-shared.ts`.
- `packages/mcp/src/server.test.ts`.
- `ARCHITECTURE.md` MCP section.

Design output:

- Define a `SessionHost` shape that can own current host routing, optional encounter draft inputs before battle initialization, active battle actor reference, and durable character-list references or IDs only.
- Decide whether to add new tools or narrow control commands. Prefer generic architecture over a one-off `start_fighter_vs_goblin_demo`.

Implementation output:

- Add a session/router layer in `packages/mcp`.
- Route existing tools through the selected active host.
- Add session-level tool(s) only if needed for battle creation/selection.

Acceptance criteria:

- Stdio server is no longer hardwired only to the demo creature host for all workflows.
- Existing creature-host tests still pass.
- Battle-host tests can use the same public routing path that stdio uses.
- MCP does not store mutable HP, conditions, action economy, or goblin combat facts outside `battleMachine`.

Verification:

- RAW check: not applicable; adapter/session architecture only.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- `pnpm --filter @dnd/mcp typecheck`.

Extra research needed:

- Yes. Confirm the current stdio/test-host wiring before coding, then pick the smallest routing model that supports a creature host and an active battle host.

### Task 11 - MCP1-B - Core Statblock Facility + Initial Goblin Minion Entry

Status: ready-for-research.

Depends on: MCP0 tasks done or intentionally deferred.

Blocks: Task MCP1-C, Task MCP2-B.

Purpose:

- Add a reusable core-owned statblock/content facility, then express Goblin Minion through that facility without duplicating RAW stat-block fields in MCP.

Inputs:

- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Minion.
- `.references/srd-5.2.1/Monsters/Overview.md` stat-block rules.
- `UBIQUITOUS_LANGUAGE.md`.
- `packages/core/src/monster-types.ts`.
- `creature.qnt` stat-block definitions if Quint parity must be extended.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-actions-turn.ts`.
- Any provenance/maintenance docs that describe where additional local statblocks should be sourced from.

Implementation output:

- Add a reusable core-owned statblock/content facility for battle-init-compatible monster definitions.
- Add a short description of approved provenance for future statblocks: local `.references/srd-5.2.1/` first; other corpora only by explicit owner decision. 5etools may be used as a research aid but is not the default imported source of truth.
- Add a core-owned Goblin Minion stat-block/content entry using that shared facility.
- Add a compiler/projection from stat-block content to `InitCreatureConfig` or directly to battle init state, depending on the ownership chosen in Task MCP1-A.
- Represent only facts currently supported by core types:
  - name: Goblin Minion;
  - type: Fey;
  - size: Small;
  - AC 12;
  - initiative mod +2, or default initiative score 12 if a score helper is added;
  - HP 7, 2d6;
  - walk speed 30;
  - ability scores Str 8, Dex 15, Con 10, Int 10, Wis 8, Cha 8;
  - Stealth +6;
  - darkvision 60;
  - CR 1/8, PB +2;
  - dagger attack +4, reach 5 or range 20/60, average 4 Piercing.
- Defer Goblin Warrior and Nimble Escape unless the needed stat-block attack rider/bonus-action support is already present.
- Do not build a bulk corpus importer in this task.

Acceptance criteria:

- A reusable statblock/content facility exists in core.
- Goblin Minion is defined once in core using that facility.
- MCP selects or references the core content; it does not repeat RAW numbers.
- Future statblock provenance is documented clearly enough that a later task can add more entries without reopening the ownership question.
- Goblin Warrior is explicitly deferred until advantage damage rider support exists.
- No bulk importer or non-SRD corpus ingestion is introduced by this task.

Verification:

- RAW check: Goblin Minion and Monsters Overview in `.references/srd-5.2.1/`; terminology in `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused unit tests for the shared statblock facility, Goblin Minion catalog values, and compiler projection.
- Creature MBT only if `creature.qnt` or the creature bridge changes.
- Tier 1 battle MBT only if battle semantics or Quint bridge changes.

Extra research needed:

- Yes. Confirm existing monster catalog/projection ownership before adding fields, and identify where the provenance note should live so future statblocks are added consistently.

### Task 12 - E - Movement And Help Geometry/Session Ownership

Status: ready-for-research.

Depends on: none.

Blocks: public `BATTLE_MOVE` and `BATTLE_HELP_ATTACK`.

Next action: decide the owner of visibility, reach, threat, path, and provocation facts; do not implement movement/help until ownership is explicit.

Purpose:

- Decide whether to introduce a session geometry owner or keep `BATTLE_MOVE` and `BATTLE_HELP_ATTACK` deferred.

Context:

- `BATTLE_MOVE` is blocked on position, path/destination, difficult terrain beyond a fixed step, reach exit, threatened creature set, and OA provocation.
- `BATTLE_HELP_ATTACK` is blocked on helper/ally/target visibility and range/reach facts.
- `ARCHITECTURE.md` and `battle/DOMAIN.md` intentionally keep formal geometry out of the core.
- `.references/inspirations/12-opportunity-attack-path-analysis.md` recommends adopting vocabulary but not adding grid/pathfinding.

Inputs:

- `ARCHITECTURE.md`.
- `battle/DOMAIN.md`.
- `.references/inspirations/12-opportunity-attack-path-analysis.md`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- Decision note:
  - continue deferring;
  - accept explicit caller/session facts for a narrow action;
  - or define a future session geometry owner.

Acceptance criteria:

- The note must not add a grid/geometry engine by accident.
- The note must identify the owner of visibility, reach, threat, path, and provocation facts.

Verification:

- Docs-only unless implementation is explicitly scheduled later.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes. This is product/session boundary design, not ready implementation.

### Task 13 - J - Generic Table Events, Environmental Hazards, And Monster Commands

Status: ready-for-research.

Depends on: none.

Blocks: future raw table event exposure and monster command work.

Next action: choose one narrow source/provenance family to research, or mark the family deferred.

Purpose:

- Decide whether to schedule a table-event provenance or monster-command ownership batch.

Context:

- Max-HP reduction/restoration needs source-specific provenance and caps.
- Raw effect add/remove needs source, duration, dependency, and payload ownership.
- Generic battle spell table events are blocked on multi-phase reaction resolution and spell payload ownership.
- `SUFFOCATE` is blocked because the current raw event is a terminal drop-to-0 shortcut, not a public SRD suffocation-progress hazard event.
- Raw monster `USE_LEGENDARY_ACTION` is blocked because named monster legendary actions need action-name legality and stat-block ownership; `BATTLE_LEGENDARY_PASS` is already the safe control command for passing a legendary-action window.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Relevant SRD spell/effect examples if a specific table event is selected.
- Monster stat-block/action data if a monster command is selected.

Research output:

- Pick one narrow table-event or monster-command family, or keep all deferred.
- For max-HP work, distinguish `REDUCE_MAX_HP` and `RESTORE_MAX_HP` provenance and caps.
- For effect work, distinguish raw `ADD_EFFECT` payloads from modeled semantic spell/feature effects.
- For environmental work, decide whether to model a source-specific hazard like suffocation rather than exposing the raw terminal event.
- For monster commands, decide whether a command owns a named stat-block action or must wait for monster action payload ownership.

Acceptance criteria:

- No raw payload command is exposed without source/provenance constraints.
- Prefer modeled semantic spell/action tokens when possible.
- Public monster commands do not accept arbitrary action names, damage, damage types, or payload facts without stat-block validation.

Verification:

- Docs-only until implementation.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes. Needs source-by-source provenance review.

### Task 14 - F - Legendary Attack Payload Ownership

Status: blocked.

Depends on: Task D and monster stat-block action payload ownership.

Blocks: public `BATTLE_LEGENDARY_ATTACK`.

Next action: wait for Task D; then define stat-block Legendary Action payload ownership and whether the action is a suggested action, monster-control command, or both.

Purpose:

- Define what entity owns monster Legendary Action option payloads before exposing `BATTLE_LEGENDARY_ATTACK`.

Context:

- `BATTLE_LEGENDARY_PASS` is already wired as a control command.
- `BATTLE_LEGENDARY_ATTACK` remains blocked because battle owns the legendary-action window and charges, but not the specific stat-block Legendary Action option payload/name/cost.
- It also needs the same attack runtime/session contract as `BATTLE_ATTACK`.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Monster stat-block files/types.
- `battle.qnt` legendary action handling.
- Task D research output.

Research output:

- A monster stat-block action payload ownership proposal.
- Decide whether legendary attack is a suggested action, monster-control command, or both.

Acceptance criteria:

- MCP does not accept arbitrary damage type, damage qualifier, weapon property, action cost, or melee/ranged facts.
- The plan reuses the Task D attack boundary where possible.

Verification:

- Docs-only until implementation.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes. Depends on attack boundary and monster payload ownership review.

### Task 15 - G - Attack Rider Ownership

Status: blocked.

Depends on: Task D.

Blocks: attack rider tokens.

Next action: wait for Task D; then classify each rider by timing, owned feature state, and runtime/session facts.

Purpose:

- Keep attack riders out of creature-level MCP and prepare them as battle-owned rider windows after attack ownership exists.

Context:

- Blocked riders:
  - `USE_BRUTAL_STRIKE`;
  - `STUNNING_STRIKE`;
  - `USE_CUNNING_STRIKE`;
  - `USE_ELDRITCH_SMITE`;
  - `USE_DIVINE_SMITE_FREE`.
- Each requires specific attack timing and qualifying-hit facts.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md` rider rows.
- `.references/srd-5.2.1/Classes/` relevant class passages.
- Task D research output.

Research output:

- For each rider, classify:
  - pre-roll choice;
  - post-hit/pre-damage choice;
  - post-damage effect;
  - runtime save/target facts;
  - battle-owned feature state.

Acceptance criteria:

- No creature-level token is added for a hit-qualified rider.
- Rider timing is explicit and maps to battle attack resolution phases.

Verification:

- Docs-only until Task D is implemented.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes. Depends on attack boundary and RAW class feature reread.

### Task 16 - MCP1-C - Encounter Start Tool/Command

Status: blocked.

Depends on: Task MCP1-A, Task MCP1-B.

Blocks: Task MCP2-A, Task MCP2-B.

Purpose:

- Let MCP initialize a battle containing an existing/selected Fighter and a core-owned Goblin Minion.

Inputs:

- Session host from Task MCP1-A.
- Goblin compiler/content from Task MCP1-B.
- Existing `BATTLE_INIT` control command.
- Fighter feature/config helpers, including `fightingStyleBattleModifiers` if relevant.

Implementation output:

- Add a public MCP flow for encounter initialization. It may be a session-level `start_battle` tool using combatant descriptors, an `execute_control_command` extension that accepts core-owned combatant descriptors, or another architecture approved by Task MCP1-A.
- Compile Fighter durable/config data to `InitCreatureConfig`:
  - `maxHp`;
  - `kind: "PC"`;
  - `fighterLevel`;
  - owned weapon/shield/two-hand flags if available;
  - derived feature fields only where battle init expects them.
- Compile Goblin Minion via core stat-block content, not MCP literals.
- Call `BATTLE_INIT` on the battle actor.

Acceptance criteria:

- MCP can initialize a battle with `fighter` and `goblin-1` IDs.
- `get_state` returns battle scope, initiative, active creature ID, and both creature IDs.
- The active battle actor owns both mutable combatant states.
- No character-list HP/condition copy is updated during active battle initialization.

Verification:

- RAW check: only if the task maps RAW stat-block or Fighter combat facts; otherwise reuse Task MCP1-B citations.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- Focused MCP adapter tests for valid start, invalid stat-block ID, duplicate creature ID, and scope/routing errors.

Extra research needed:

- Yes. Confirm how current Fighter durable/config state is represented and which fields battle init already owns.

### Task 17 - MCP2-A - Battle Attack Public Boundary

Status: blocked.

Depends on: Task D done, Task MCP1-C.

Blocks: Task MCP2-B.

Purpose:

- Expose the first safe public battle attack action through MCP.

Scope:

- Main-hand weapon attack by the active creature only.
- No off-hand, legendary, spell attack, unarmed strike, custom weapon payload, or attack rider.

Required design from Task D:

- exact `BattleActionToken` shape;
- exact resolved-token shape;
- explicit runtime dice inputs;
- explicit table/session facts;
- facts forbidden because battle already owns them;
- whether `crit` is runtime-supplied or derived from `attackRoll` and `critRange`;
- whether damage aggregation is runtime-owned or battle-owned.

Implementation output:

- Add `BATTLE_ATTACK` to `BattleActionToken`.
- Add resolved schema and resolver/finalizer support.
- Derive weapon payload facts from `BattleCreatureState` / compiled weapon or stat-block action data.
- Accept explicit open table/session facts rather than sampling them in `server-runtime.ts`.

Acceptance criteria:

- Token appears only when active creature has an owned main-hand weapon/attack payload and attack budget.
- Token exposes target choices without accepting arbitrary weapon properties, damage type, damage qualifiers, or finesse flags.
- Missing session facts such as target AC, visibility, distance, adjacency, and hit-reaction candidates are explicit inputs and not invented by MCP.
- Existing reaction windows still route through battle state after attack resolution.
- Off-hand, legendary, unarmed, and rider paths remain blocked.

Verification:

- RAW check: attack rules and relevant visibility/condition entries in `.references/srd-5.2.1/`; terminology in `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `available-actions` tests.
- Focused MCP tests for token discovery, invalid session facts, successful hit, miss, and reaction-window behavior if applicable.
- Tier 1 battle MBT if battle/spec/bridge semantics change.

Extra research needed:

- Yes. Complete Task D first; this task should consume that contract rather than redesign attack ownership inside MCP.

### Task 18 - MCP2-B - Fighter Attacks Goblin End-to-End

Status: blocked.

Depends on: Task MCP2-A.

Blocks: objective completion.

Purpose:

- Complete the motivating MCP flow after the attack boundary exists.

Implementation output:

- Add an MCP integration test or harness scenario:
  1. Create/start battle with Fighter and Goblin Minion.
  2. Start the active creature turn with explicit start-turn facts.
  3. Query `get_available_actions`.
  4. Resolve and execute `BATTLE_ATTACK` against the goblin with explicit runtime/session facts.
  5. Assert the battle state, not a character-list copy, reflects HP/death/reaction-window changes.

Acceptance criteria:

- A coding agent can follow the test as the reference "fighter vs goblin through MCP" workflow.
- The goblin's mutable combat state lives only in `BattleContext.creatures`.
- The Fighter's mutable battle state lives only in `BattleContext.creatures` during combat.
- Durable character-list update, if any, happens only at a future explicit battle-close/commit boundary and is not part of this task.

Verification:

- RAW check: reuse Task MCP1-B and Task MCP2-A citations.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- `pnpm --filter @dnd/core test` only if core action logic changes.
- Tier 1 battle MBT only if battle/spec semantics change.

Extra research needed:

- Light. Mostly integration wiring once the prior tasks are done.

### Task 19 - MCP3-A - Goblin Warrior/Nimble Escape Follow-Up

Status: blocked.

Depends on: Task MCP1-B, Task MCP2-A; possibly stat-block attack rider and bonus-action monster support.

Blocks: fuller goblin behavior.

Purpose:

- Move beyond the minimal Goblin Minion slice toward fuller SRD goblin support.

Research output:

- Decide how to represent Goblin Warrior's advantage-based extra damage on Scimitar/Shortbow.
- Decide how to represent Nimble Escape as monster bonus-action Disengage/Hide without duplicating `BATTLE_DISENGAGE` / `BATTLE_HIDE`.
- Decide whether Goblin Boss `Redirect Attack` belongs in battle reaction windows and whether it requires size/ally-position ownership.

Acceptance criteria:

- No goblin-specific MCP shortcuts.
- Stat-block attack riders and bonus actions are core-owned.
- MCP exposes only generic action/session surfaces.

Verification:

- RAW check: Goblin Warrior and Goblin Boss entries plus Monsters Overview.
- `/simplify` convergence: minimum two rounds if implementation occurs.
- Focused stat-block/action tests.
- Tier 1 battle MBT if battle semantics change.

Extra research needed:

- Yes. This is intentionally deferred until the minimal Fighter/Goblin Minion path and public attack boundary exist.

### Task 20 - H - PassiveModifiers Sub-Record

Status: deferred.

Depends on: none.

Blocks: possible passive modifier field cleanup.

Next action: do not pick up unless the batch explicitly selects passive modifier restructuring.

Purpose:

- Reduce flat modifier field boilerplate by grouping explicit named fields into a closed `PassiveModifiers` record.

Context:

- Competitor inspiration: `.references/inspirations/11-modifier-algebra.md`.
- The repo intentionally rejects open modifier registries in favor of explicit Quint fields.
- Current flat fields include `hasEvasion`, `saveMiscBonus`, `critRange`, `rangedWeaponAttackRollBonus`, `defenseArmorClassBonus`, `greatWeaponFightingDamageFloor`, `meleeDamageBonus`, `recklessThisTurn`, and related fields.
- `ARCHITECTURE.md` lists planned future passive fields: `conditionImmunities`, `dexSaveAdvantage`, `attacksCannotHaveAdvantage`.

Inputs:

- `.references/inspirations/11-modifier-algebra.md`.
- `ARCHITECTURE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- Battle MBT bridge.

Implementation output:

- Add `PassiveModifiers`/`FRESH_MODS` in Quint and TS only if this batch is deliberately selected.
- Mechanically nest existing passive modifier fields.
- Do not add a generic modifier resolver unless there is a real multi-source stacking case.

Acceptance criteria:

- Behavior unchanged.
- Field grouping reduces boilerplate without hiding semantics in an open registry.
- MBT bridge remains explicit and parity-tested.

Verification:

- RAW/domain-language check before implementation if this grouping lands with new modifier semantics; pure mechanical grouping still needs `UBIQUITOUS_LANGUAGE.md` terminology review.
- `/simplify` convergence: minimum two rounds after implementation.
- Typecheck.
- Focused battle tests if setup types change.
- Tier 1 battle MBT because the bridge/spec shape changes.

Extra research needed:

- Moderate. Not urgent; best paired with adding new passive modifier fields.

### Task 21 - I - Build-Map / Hole Metadata

Status: deferred.

Depends on: a concrete consumer; possibly Task D if the first consumer is attack-boundary parameterization.

Blocks: future token-hole metadata.

Next action: do not pick up until a concrete attack, transcript, or UI consumer exists.

Purpose:

- Enrich action-token holes with metadata such as domain name, legality source, and whether filling one hole narrows later holes.

Context:

- Competitor inspiration: `.references/inspirations/15-build-map-parameterization.md`.
- Current implementation already has `ActionToken` -> `ResolvedActionToken` -> `ResolutionRequest` -> event.
- Current `Hole<T>` is just `{ options: ReadonlyArray<T> }`.

Inputs:

- `.references/inspirations/15-build-map-parameterization.md`.
- `packages/core/src/available-actions.ts`.
- `plans/available-actions.md`.
- Task D research output if this is used for battle attacks.

Research output:

- Decide whether the first user is attack boundary, transcript disambiguation, or a future UI.

Acceptance criteria:

- Metadata is not added speculatively without a consumer.
- No UI-specific abstraction leaks into core action legality.

Verification:

- Docs-only unless a consumer is selected.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes, but defer until a concrete consumer exists.

## Extra Research Summary

Needs extra research before coding:

- Task MCP0-A: dead-creature condition policy and RAW citations for Unconscious/Dead/Stable.
- Task MCP0-B: dead-creature exhaustion mutation policy.
- Task A: Condition table completion. RAW condition reread and column decision required.
- Task D: Battle attack boundary. API contract and RAW attack reread required.
- Task E: Movement/help geometry. Session/product ownership decision required.
- Task F: Legendary attack payload. Monster stat-block action payload ownership required, and it depends on Task D.
- Task G: Attack riders. RAW class feature reread and Task D dependency.
- Task I: Build-map metadata. Needs a concrete consumer.
- Task J: Generic table events. Needs source/provenance review.
- Task MCP1-A: current MCP stdio/test-host routing and minimal session-host shape.
- Task MCP1-B: existing monster/stat-block ownership and Goblin Minion RAW projection.
- Task MCP1-C: Fighter durable/config mapping into battle init.
- Task MCP2-A: blocked on Task D battle attack boundary research.
- Task MCP3-A: fuller goblin support after stat-block rider/bonus-action support exists.

Light research only:

- Task MCP0-C: current decode path and available action type index.
- Task MCP0-D: current documentation/tool description wording for `SHORT_REST`.
- Task MCP2-B: integration wiring once prerequisites are done.
- Task B: Battle size ownership. RAW Grapple/Size reread required, but design is already documented.
- Task C: ResourceCost typed refactor. Confirm consumer blast radius and immediate-cost scope.
- Task H: PassiveModifiers. Research only if selected; otherwise defer.

## Recommended Coding Loop

If choosing one implementation batch:

1. Task MCP0-A: Dead-Creature Condition Mutation Bug.
2. Task MCP0-C: Short Unknown Action Error.

If choosing one research-first batch:

1. Task MCP1-A: Session Host Architecture.
2. Task A: Condition Consequence Table Completion Research.

If choosing a support-layer cleanup:

1. Task C: ResourceCost Typed Refactor.

Avoid in the first APR10 implementation loop:

- `BATTLE_ATTACK` implementation.
- Fighter-vs-goblin end-to-end implementation before Task D and Task MCP1-C are complete.
- Full Goblin Warrior/Nimble Escape support before core stat-block rider/bonus-action ownership exists.
- `BATTLE_MOVE` / `BATTLE_HELP_ATTACK` implementation.
- `BATTLE_LEGENDARY_ATTACK` implementation.
- Attack riders.
- Build-map metadata without a consumer.
