# DAG Runbook 2

## Purpose

This file is the execution companion for the next repository-shaping batch after [DAG_RUNBOOK.md](./DAG_RUNBOOK.md).

Use:

- [DAG.md](./DAG.md) for dependency truth
- [DAG_TASK_CARDS.md](./DAG_TASK_CARDS.md) for compact node handoff cards
- `DAG_RUNBOOK_2.md` for all-day orchestrated execution

This file is intentionally execution-first. It assumes the prior runbook batch is already landed.

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- avoid redoing already-landed work
- avoid design-only nodes that are too open-ended for a coding-agent batch
- prioritize concrete facilities that unlock future combat correctness

## Confirmed Already Complete

Do not reschedule these in this runbook unless regression evidence appears:

- `resolve-commit-doctrine`
- `canonical-condition-effects`
- `first-class-consumption-model`
- `authoritative-d20-modifier-query-surface`
- `same-name-magical-effect-non-stacking`
- `exhaustion-d20-penalty`
- `sneak-attack-any-disadvantage`
- `sneak-attack-once-per-turn-boundary`
- `stand-from-prone-in-battle`
- `armor-training-disadvantage`
- `preview-execution`

Also do not schedule the following stale/misclassified items as if they were still open:

- `USE_SNEAK_ATTACK` / `USE_INDOMITABLE` / `USE_OVERCHANNEL` trigger-window batch
- heavy-weapon 5.2.1 threshold update
- Legendary Resistance “uses reaction instead of LR charge”

## Default In-Scope Nodes

Low-risk domain-language and audit work:

1. `oa-path-vocabulary`
2. `duration-boundary-audit`

Concrete missing facilities:

1. `qualified-damage-typing`
2. `battle-helped-target-state`
3. `help-advantage-state`
4. `weapon-property-aware-battle-resolution`
5. `off-hand-attack-surface`
6. `two-weapon-fighting-bonus-attack`
7. `one-shot-rider-consumption-metadata`

Optional stretch node only if earlier lanes land cleanly and remain small:

1. `parent-child-effect-teardown` only if `effect-dependency-graph` turns out to be avoidable

## Default Out Of Scope

Do not schedule these in the same run unless explicitly requested:

- `closed-modifier-algebra`
- `dm-override`
- `transcript-port-to-dnd`
- `battle-spatial-expansion`
- `qualified-physical-damage-bypass`
- `fighting-styles-in-battle`
- `versatile-weapon-die-switching`
- `next-hit-rider-consumption`
- any Hellenvald-port work

Reason:

- these are either design-first, broader than a clean handoff, or downstream of the facilities in this runbook

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Create one worktree per lane when edits are likely to overlap.
4. Land vocabulary and audit lanes before broader combat facilities when possible.
5. Do not let sub-agents invent new architecture beyond the assigned node.
6. If a node expands unexpectedly, stop and return a design note instead of improvising a larger refactor.
7. Treat already-complete nodes as closed unless current code contradicts that status directly.

## Parallelization Plan

### Lane A: OA Vocabulary

Node:

- `oa-path-vocabulary`

Goal:

- make movement interruption and opportunity-attack terminology explicit before broader movement/spatial work

Likely files:

- [battle/DOMAIN.md](../battle/DOMAIN.md)
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)

Non-goals:

- no grid or geometry implementation
- no battle-spatial expansion
- no movement feature breadth

Verification:

- `pnpm --filter @dnd/core exec tsc --noEmit`
- targeted movement tests only if code changes occur

### Lane B: Duration Audit

Node:

- `duration-boundary-audit`

Goal:

- audit and tighten timing-sensitive effect boundaries across creature and battle state

Execution rule:

- write the concrete audit checklist first
- add deterministic regression tests before production edits
- only change production code once a timing drift is demonstrated

Likely files:

- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/machine-startturn.ts](../packages/core/src/machine-startturn.ts)
- [packages/core/src/machine-endturn.ts](../packages/core/src/machine-endturn.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)

Non-goals:

- no broad effect-system redesign
- no parent/child graph unless a concrete regression proves it necessary

Verification:

- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts src/battle-rules-scenarios.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT only if timing semantics change

### Lane C: Damage Qualification

Node:

- `qualified-damage-typing`

Goal:

- introduce the minimal combat-owned distinctions needed for `magical` / `silvered` / `adamantine` physical damage qualification

Likely files:

- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [battle.qnt](../battle.qnt)
- [creature.qnt](../creature.qnt)
- focused tests in:
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Non-goals:

- no full monster bypass batch
- no open-ended damage tag registry
- no qualified-physical-damage-bypass consumer work yet

Verification:

- targeted core tests for touched damage paths
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if attack semantics change

### Lane D: Help Facility

Nodes:

- `battle-helped-target-state`
- `help-advantage-state`

Goal:

- add battle-owned helped-target state first, then expose Help as a real advantage source with correct consumption semantics

Execution rule:

- do not implement `help-advantage-state` before the state owner is in place
- keep the facility and the first consumer in the same lane to avoid partial architecture

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [packages/core/src/battle-machine.ts](../packages/core/src/battle-machine.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/machine-combat.ts](../packages/core/src/machine-combat.ts)
- battle regression tests

Non-goals:

- no broader action-surface ranking or AI suggestion work
- no stealth/hide coupling in the same batch

Verification:

- targeted battle scenario tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle semantics change

### Lane E: Weapon-Surface Facility

Nodes:

- `weapon-property-aware-battle-resolution`
- `off-hand-attack-surface`
- `two-weapon-fighting-bonus-attack`

Goal:

- make battle resolution aware of the weapon properties it already needs for immediate next features, then expose a concrete off-hand attack slice

Execution rule:

- land weapon-property ownership before the off-hand action surface
- only land `two-weapon-fighting-bonus-attack` if the off-hand facility stays small and coherent

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/core/src/machine-combat.ts](../packages/core/src/machine-combat.ts)
- targeted battle tests

Non-goals:

- no fighting styles in battle
- no versatile-weapon die switching
- no generic inventory/equipment system

Verification:

- targeted battle tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle attack semantics change

### Lane F: One-Shot Rider Metadata

Node:

- `one-shot-rider-consumption-metadata`

Goal:

- introduce consume-on-next-qualifying-hit metadata for active effects without widening immediately into every downstream rider feature

Likely files:

- [creature.qnt](../creature.qnt)
- [battle.qnt](../battle.qnt)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- focused effect tests

Non-goals:

- no full `next-hit-rider-consumption` consumer batch
- no effect dependency graph in the same lane

Verification:

- targeted effect + attack tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT only if attack/effect semantics change

## Merge Order

Recommended merge sequence:

1. Lane A
2. Lane B
3. Lane C
4. Lane D facility portion
5. Lane D consumer portion
6. Lane E facility portion
7. Lane E consumer portion
8. Lane F

Reason:

- vocabulary and audit lanes are low-risk and reduce ambiguity for later combat changes
- qualification and help state are foundational
- weapon/off-hand work should not start from an underspecified combat surface
- one-shot rider metadata is useful but easier to place once attack/effect seams are stable

## Batch Exit Criteria

This runbook counts as complete when:

1. every in-scope node is either landed or explicitly stopped with a design note tied to a real blocker
2. no already-complete node was redundantly reopened without evidence
3. targeted tests for every landed node pass
4. `pnpm --filter @dnd/core exec tsc --noEmit` passes
5. at least two simplify-style review rounds have been completed
6. overnight validation remains optional and is not required for this runbook

## Outcomes

This runbook batch is now landed.

Landed:

1. `oa-path-vocabulary`
2. `duration-boundary-audit`
3. `qualified-damage-typing`
4. `battle-helped-target-state`
5. `help-advantage-state`
6. `weapon-property-aware-battle-resolution`
7. `off-hand-attack-surface`
8. `two-weapon-fighting-bonus-attack`
9. `one-shot-rider-consumption-metadata`

What landed for each lane:

- Lane A: vocabulary landed in [battle/DOMAIN.md](../battle/DOMAIN.md), [battle.qnt](../battle.qnt), and [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- Lane B: audit checklist landed in [DURATION_BOUNDARY_AUDIT.md](./DURATION_BOUNDARY_AUDIT.md) with deterministic timing regressions; no broader production refactor was required
- Lane C: minimal damage qualification landed as battle-owned `magical` / `silvered` / `adamantine` metadata in Quint and TS
- Lane D: helped-target state and Help-as-advantage both landed with owner-scoped expiry and consumption semantics
- Lane E: battle attack resolution now consumes weapon properties, and the light-weapon off-hand bonus-action slice landed
- Lane F: consume-on-next-qualifying-hit metadata landed without widening into the full next-hit rider consumer batch

Residual boundaries kept intentionally out of scope:

- battle geometry is still caller-owned; only OA vocabulary was clarified
- no broader battle `available-actions` action-surface expansion beyond already-modeled slices
- no qualified-damage bypass consumer rollout yet

## Notes To Future Orchestrators

- Treat [plans/available-actions.md](./available-actions.md) as historical context, not as the current critical path. Several items it described as “next” are already implemented.
- Treat claims copied from absent documents such as `PLAN_AUDIT.md` as untrusted until validated against the current tree.
- If a proposed batch item is already covered by passing tests in core and MCP, close it rather than rescheduling it.
