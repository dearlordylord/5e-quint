# DAG Runbook 4

## Purpose

This file is the execution companion for the next large execution-grade batch after the first three DAG batches.

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK_4.md` for orchestrated coding-agent execution

This runbook is intentionally large, but it is not a catch-all for the remainder of the DAG. It includes only the concrete post-research batch that can be assigned overnight without first inventing new architecture.

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- consume the newly ready battle action-surface breadth
- consume the hand-occupancy facility through its first real consumer
- tighten the movement/OA contract without widening into a grid engine
- avoid design-heavy effect-graph and generic-modifier programs

## Confirmed Already Complete

Do not reschedule these in this runbook unless regression evidence appears:

- everything closed by DAG Runbooks 1-3 (deleted after completion; see `DAG.md` node table for authoritative status)
- `battle-hand-occupancy-state`
- `preview-execution`
- `battle-helped-target-state`
- `help-advantage-state`
- `weapon-property-aware-battle-resolution`
- `off-hand-attack-surface`
- `two-weapon-fighting-bonus-attack`

## Default In-Scope Nodes

1. `versatile-weapon-die-switching`
2. `battle-basic-action-surface`
3. `battle-ready-action-surface`
4. `movement-provocation-kind`
5. `forced-movement-vs-oa`
6. `reach-extends-oa-range`

## Default Out Of Scope

Do not schedule these in the same run unless explicitly requested:

- `closed-modifier-algebra`
- `battle-ready-spell-payload-state`
- `after-damage-trigger-state`
- `generic-per-attack-type-bonus-surface`
- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `fighting-styles-in-battle`
- `battle-hidden-state`
- `hide-stealth-chain`
- `dm-override`
- `transcript-port-to-dnd`
- any Hellenvald-port or transcript work

Reason:

- these are still design-first, still need decomposition, or sit beyond the current product-surface priority boundary
- `battle-ready-spell-surface` and `after-damage-reaction-surface` are no longer treated as ready after implementation proved battle lacks the owned payload/trigger metadata to expose them honestly

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Merge facilities before their consumers.
4. Keep movement-contract edits separate from action-surface registry edits until the contract is stable.
5. Do not let workers turn the batch into a hidden modifier-algebra or effect-graph redesign.
6. If a node appears to need a new ownership concept not named here, stop and return a design note instead of improvising.

## Parallelization Plan

### Lane A: Versatile Damage Consumer

Node:

- `versatile-weapon-die-switching`

Goal:

- consume the newly landed hand-occupancy state so versatile weapons use the parenthetical damage only when a melee attack is actually made with two hands

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- MBT battle parity files only if normalized state or attack semantics change materially

Non-goals:

- no fighting-style rollout
- no general hand-reposture action
- no shortcut based on empty off-hand slots

Verification:

- targeted battle scenario tests for versatile one-hand vs two-hand damage
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if attack resolution behavior changes

### Lane B: Movement Provocation Contract

Nodes:

- `movement-provocation-kind`
- `forced-movement-vs-oa`
- `reach-extends-oa-range`

Goal:

- make OA provocation an explicit movement contract, then consume it for the two first correctness cases:
- forced movement should not provoke
- reach-sensitive OA handling should not assume 5 feet

Execution rule:

- land `movement-provocation-kind` first
- only then consume it in the two follow-up nodes

Likely files:

- [battle.qnt](../battle.qnt)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- [battle/REQUIREMENTS.md](../battle/REQUIREMENTS.md)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- [packages/core/src/battle-machine.mbt.test.ts](../packages/core/src/battle-machine.mbt.test.ts) if event shape changes

Non-goals:

- no spatial/grid engine
- no line-of-sight or cover ownership expansion
- no hide/stealth redesign

Verification:

- deterministic OA regression tests for provoking and non-provoking movement
- deterministic reach tests proving threat sets are not hardcoded to 5 feet
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 MBT if battle movement event semantics change

### Lane C: Battle Action Surface Breadth

Nodes:

- `battle-basic-action-surface`
- `battle-ready-action-surface`

Goal:

- expose already-owned non-spell battle action semantics through the unified available-actions and MCP surface

Scope split:

- `battle-basic-action-surface` covers:
- `BATTLE_DASH`
- `BATTLE_DISENGAGE`
- `BATTLE_DODGE`
- `battle-ready-action-surface` covers:
- `BATTLE_READY`
- `BATTLE_READY_PASS`
- `BATTLE_READY_RELEASE`

Likely files:

- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/mcp/src/server.ts](../packages/mcp/src/server.ts)
- [packages/core/src/available-actions.test.ts](../packages/core/src/available-actions.test.ts)
- [packages/mcp/src/server.test.ts](../packages/mcp/src/server.test.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts) for representative execution coverage

Non-goals:

- no battle movement token in this lane
- no battle spell breadth in this lane
- no after-damage reaction surfacing in this lane
- no DM override warnings

Verification:

- focused available-actions tests for token projection and resolved execution
- focused MCP tests for round-trip execution
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Deferred Boundary Discovered During Execution

These two nodes were initially included in the batch but should now be treated as blocked follow-ups rather than Runbook 4 scope:

- `battle-ready-spell-surface`
- `after-damage-reaction-surface`

Reason:

- `battle-ready-spell-surface` needs battle-owned spell save/effect payload metadata before `READY_SPELL` / `READY_SPELL_RELEASE` can be exposed honestly
- `after-damage-reaction-surface` needs battle-owned trigger qualifiers and stored reactive effect-choice facts before reactions such as Hellish Rebuke / Fire Shield / Retaliation can be surfaced honestly

Do not recover these by:

- fabricating payloads in `available-actions.ts`
- storing ad hoc spell names or reaction choices only in MCP/action-token plumbing
- widening into a generic reaction registry

## Merge Order

1. Lane B facility: `movement-provocation-kind`
2. Lane A: `versatile-weapon-die-switching`
3. Lane C basic surface: `battle-basic-action-surface`
4. Lane C ready surface: `battle-ready-action-surface`
5. Lane B consumers: `forced-movement-vs-oa`, `reach-extends-oa-range`

Reason:

- the movement facility should settle before its correctness consumers
- the basic and ready surfaces can land independently if one stalls
- the spell/reaction surface follow-ups are now intentionally excluded until their missing owned-state facilities are designed

## Stop Conditions

- if `battle-basic-action-surface` requires redesigning the resolved-token contract rather than consuming it
- if `battle-ready-spell-surface` or `after-damage-reaction-surface` appears to need battle-owned payload/trigger metadata that does not already exist, stop and move that discovery into `DAG.md` as a new facility rather than forcing the surface through
- if `battle-ready-spell-surface` or `after-damage-reaction-surface` appears to need a generic reaction registry instead of consuming already-owned interrupt points
- if `forced-movement-vs-oa` or `reach-extends-oa-range` appears to need battle-owned geometry rather than caller-owned threat sets
- if `versatile-weapon-die-switching` appears to require a new explicit reposture action instead of using the current hand-occupancy ownership seam

## Questions To Resolve For Later Runbooks

Record short answers in the PR description or follow-up DAG notes if the implementation makes them clear.

### Questions For Runbook 5

1. Is the current hand/weapon ownership seam sufficient for later modifier consumers, or did `versatile-weapon-die-switching` expose a missing battle-owned fact?
2. Does the available-actions work reveal a stable battle action-token taxonomy that later `dm-override` / transcript work can consume directly?
3. Does `battle-ready-spell-surface` prove that battle spell/reaction exposure can keep using concrete owned windows, or did it reveal pressure toward a generic registry that should be rejected explicitly?

### Questions For Runbook 6

1. Is `movement-provocation-kind` enough of a spatial contract for future OA/stealth work, or is another minimal caller-owned movement fact still missing?
2. Do `forced-movement-vs-oa` and `reach-extends-oa-range` validate that caller-owned threat sets remain the right boundary, or do they expose a need to redesign `battle-hidden-state` / future spatial nodes?
3. Do the action-surface lanes leave any unresolved token-shape or interrupt-shape inconsistencies that should be settled before later product nodes like `dm-override` and `transcript-port-to-dnd`?

If any of these happen during execution:

1. stop the affected lane
2. write a short design note
3. continue with the unaffected lanes

## Verification Floor

Minimum acceptable validation for the full run:

- focused core tests for each lane
- focused MCP tests for newly exposed surfaces
- `pnpm --filter @dnd/core exec tsc --noEmit`
- one Tier 1 battle MBT run at the end if any battle semantics changed:
  - `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`

Do not escalate to Tier 2/3/overnight validation as part of this runbook.

## Completion Rule

Runbook 4 is complete when:

- all 8 in-scope nodes are landed, or explicitly stopped with design notes under the stop conditions
- the DAG statuses can be updated without ambiguity
- the focused validation floor passes

If the batch lands cleanly, the remaining DAG should mostly collapse to:

- `closed-modifier-algebra`
- `generic-per-attack-type-bonus-surface`
- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `fighting-styles-in-battle`
- `battle-hidden-state`
- `hide-stealth-chain`
- `dm-override`
- `transcript-port-to-dnd`
