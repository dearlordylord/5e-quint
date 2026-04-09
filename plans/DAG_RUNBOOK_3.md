# DAG Runbook 3

## Purpose

This file is the execution companion for the next reliably execution-grade batch after [DAG_RUNBOOK_2.md](./DAG_RUNBOOK_2.md).

Use:

- [DAG.md](./DAG.md) for dependency truth
- [DAG_TASK_CARDS.md](./DAG_TASK_CARDS.md) for compact node handoff cards where they exist
- `DAG_RUNBOOK_3.md` for orchestrated coding-agent execution

This runbook is intentionally narrower than “all remaining DAG work.” It only includes the portion of the remaining DAG that is concrete enough to schedule without a separate design pass.

## Closure Status

Runbook 3 is closed.

Landed in this batch:

- `qualified-physical-damage-bypass`
- `next-hit-rider-consumption`
- `max-hp-reduction-state`
- `max-hp-reduction`
- `legendary-resistance-fallback` as the narrow AoE failed-save regression slice

Deferred from this runbook:

- `versatile-weapon-die-switching`

Follow-up required:

- `battle-hand-occupancy-state`

Reason:

- versatile switching should not be implemented via the weaker simplification “no off-hand weapon means two-handed”
- the next correct ownership seam is explicit battle-owned hand occupancy / shield / free-hand state, which also supports later hand-usage consumers beyond versatile switching

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- consume the known-known remainder
- avoid broad facilities whose scope is still underdetermined
- preserve momentum without forcing hidden design decisions

## Confirmed Already Complete

Do not reschedule these in this runbook unless regression evidence appears:

- everything closed by [DAG_RUNBOOK.md](./DAG_RUNBOOK.md)
- everything closed by [DAG_RUNBOOK_2.md](./DAG_RUNBOOK_2.md)
- in practice, that includes:
- `resolve-commit-doctrine`
- `canonical-condition-effects`
- `first-class-consumption-model`
- `authoritative-d20-modifier-query-surface`
- `preview-execution`
- `oa-path-vocabulary`
- `duration-boundary-audit`
- `qualified-damage-typing`
- `battle-helped-target-state`
- `help-advantage-state`
- `weapon-property-aware-battle-resolution`
- `off-hand-attack-surface`
- `two-weapon-fighting-bonus-attack`
- `one-shot-rider-consumption-metadata`

## Default In-Scope Nodes

Execution-grade remainder for the original run:

1. `qualified-physical-damage-bypass`
2. `next-hit-rider-consumption`
3. `max-hp-reduction-state`
4. `max-hp-reduction`
5. `legendary-resistance-fallback`

Conditional in-scope node from the original run:

1. `versatile-weapon-die-switching`

This condition did not hold. `versatile-weapon-die-switching` remains deferred pending explicit `battle-hand-occupancy-state`.

## Default Out Of Scope

Do not schedule these in the same run unless explicitly requested:

- `closed-modifier-algebra`
- `generic-per-attack-type-bonus-surface`
- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `battle-spatial-expansion`
- `hide-stealth-chain`
- `forced-movement-vs-oa`
- `reach-extends-oa-range`
- `available-actions-main` as a broad umbrella
- `battle-spellcast-action-breadth`
- `movement-action-surface` as a broad umbrella
- `dm-override`
- `transcript-port-to-dnd`
- `fighting-styles-in-battle`
- any Hellenvald-port work

Reason:

- these are still facility-first or design-heavy and are not yet reliable execution-grade nodes

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Create one worktree per lane when edits are likely to overlap.
4. Merge state-owning facilities before their first consumer nodes.
5. Do not let sub-agents expand nodes into design programs.
6. If a node appears to require a new architecture concept not named here, stop and return a design note instead of improvising.
7. Treat out-of-scope nodes as hard boundaries, not “nice to also do.”

## Parallelization Plan

### Lane A: Qualified Physical Damage Bypass

Node:

- `qualified-physical-damage-bypass`

Goal:

- consume the newly landed damage-qualification surface so monster/effect resistance, vulnerability, and immunity rules can distinguish qualified physical damage correctly

Likely files:

- [battle.qnt](../battle.qnt)
- [creature.qnt](../creature.qnt)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/machine-combat.ts](../packages/core/src/machine-combat.ts)
- targeted tests in:
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Non-goals:

- no generic damage-tag registry
- no monster-stat-block breadth batch beyond the concrete bypass semantics

Verification:

- targeted core tests for qualified physical damage cases
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle damage semantics change

### Lane B: Next-Hit Rider Consumption

Node:

- `next-hit-rider-consumption`

Goal:

- consume the new one-shot rider metadata so qualifying “next hit” effects are actually expended on the correct attack event

Likely files:

- [battle.qnt](../battle.qnt)
- [creature.qnt](../creature.qnt)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- targeted effect/attack tests

Non-goals:

- no parent/child effect graph
- no general effect dependency redesign
- no unrelated rider-feature breadth

Verification:

- targeted effect and battle attack tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if attack/effect semantics change

### Lane C: Max HP Reduction

Nodes:

- `max-hp-reduction-state`
- `max-hp-reduction`

Goal:

- add explicit max-HP reduction state rather than overloading plain `maxHp`, then land the first consumer semantics on top of that state

Execution rule:

- land the state owner first
- only land the consumer if the state surface stays local and coherent

Likely files:

- [creature.qnt](../creature.qnt)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-types.ts](../packages/core/src/machine-types.ts)
- [packages/core/src/machine.ts](../packages/core/src/machine.ts)
- [packages/core/src/context-encoding.ts](../packages/core/src/context-encoding.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)

Non-goals:

- no broad monster necrotic-drain batch
- no passive modifier algebra redesign

Verification:

- targeted max-HP tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- deterministic Quint tests if new pure-state helpers are added

### Lane D: Legendary Resistance Fallback

Node:

- `legendary-resistance-fallback`

Goal:

- add only the narrow fallback slice needed if broader battle spellcast breadth still exposes hidden complexity around failed-save interrupt resolution

Execution rule:

- schedule this only after confirming a concrete missing narrow case remains
- if there is no real missing narrow case, close the node instead of inventing work

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-spell.ts](../packages/core/src/battle-machine-actions-spell.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Non-goals:

- no broad `battle-spellcast-action-breadth` program
- no new spell portfolio expansion

Verification:

- targeted battle spell/save tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle failed-save interrupt semantics change

### Lane E: Versatile Weapon Switching

Node:

- `versatile-weapon-die-switching`

Goal:

- consume the now-owned weapon-property surface for the specific versatile-die switch case, if that case can be expressed without new wield-state architecture

Outcome:

- not landed in runbook 3
- promoted to a follow-up dependency on `battle-hand-occupancy-state`

Execution rule:

- begin with a short read-only viability pass
- proceed only if the current battle weapon-property ownership is already sufficient
- otherwise stop and return a design note; do not force new hand-state modeling inside this runbook

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/machine-combat.ts](../packages/core/src/machine-combat.ts)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- targeted attack tests

Non-goals:

- no inventory system
- no generic wield-state architecture
- no fighting styles in battle

Verification:

- targeted attack/property tests
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle attack semantics change

Follow-up note:

- future work should introduce battle-owned hand occupancy / shield / free-hand state first, then re-schedule versatile switching on top of that ownership seam

## Merge Order

Historical merge sequence:

1. Lane A
2. Lane B
3. Lane C facility portion
4. Lane C consumer portion
5. Lane D if still justified
6. Lane E only if viability check passes

Reason:

- qualified damage bypass and next-hit rider consumption are direct consumers of facilities already landed
- max-HP work is clean if the state owner lands before the mechanic
- legendary-resistance fallback is intentionally narrow and should only exist if a real gap remains
- versatile switching is the least certain node in this runbook and should not block more reliable work

## Batch Exit Criteria

This runbook counted as complete when:

1. every in-scope node is either landed or explicitly stopped with a design note tied to a real blocker
2. no out-of-scope design-heavy cluster was silently pulled in
3. targeted tests for every landed node pass
4. `pnpm --filter @dnd/core exec tsc --noEmit` passes
5. at least two simplify-style review rounds have been completed
6. overnight validation remains optional and is not required for this runbook

## Notes To Future Orchestrators

- This runbook is intentionally not “all remaining DAG work.”
- After this runbook, the remaining adjacent work is mostly design-first and should likely be split into:
- a design memo for architecture-heavy clusters
- then a later runbook after those boundaries are frozen
