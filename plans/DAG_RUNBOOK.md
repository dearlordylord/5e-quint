# DAG Runbook

## Purpose

This file is the execution companion to [DAG.md](./DAG.md).

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK.md` for all-day agent execution

The intended reader is an orchestrator agent that may spawn parallel coding agents in worktrees and merge their results afterward.

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

Today's default mission shape:

- land the high-value architecture shaping nodes first
- then land the low-risk ready correctness fixes that do not need new facilities
- leave broader feature breadth and transcript work for later

## Default In-Scope Nodes

Architecture shaping:

1. `resolve-commit-doctrine`
2. `canonical-condition-effects`
3. `first-class-consumption-model`
4. `authoritative-d20-modifier-query-surface`

Low-risk correctness follow-ups:

1. `same-name-magical-effect-non-stacking`
2. `exhaustion-d20-penalty`
3. `sneak-attack-any-disadvantage`
4. `sneak-attack-once-per-turn-boundary`
5. `stand-from-prone-in-battle`

Only after the relevant architecture is stable:

1. `armor-training-disadvantage`
2. `preview-execution`

## Default Out Of Scope

Do not schedule these in the same all-day run unless explicitly requested:

- `dm-override`
- `transcript-port-to-dnd`
- `battle-spellcast-action-breadth`
- `movement-action-surface` as a broad umbrella
- `battle-spatial-expansion`
- any Hellenvald-port work

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Create one worktree per lane when edits are likely to overlap.
4. Prefer merging architecture lanes before feature lanes that depend on them.
5. Do not let sub-agents invent new architecture beyond the assigned node.
6. If a node expands unexpectedly, stop and return a design note instead of improvising a larger refactor.

## Parallelization Plan

### Lane A: Doctrine And Domain Language

Node:

- `resolve-commit-doctrine`

Goal:

- make resolve/commit vocabulary explicit in docs and review language
- tighten naming only where low-risk and clearly beneficial

Likely files:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- possibly small naming cleanups in:
  - [battle.qnt](../battle.qnt)
  - [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
  - [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)

Non-goals:

- no semantic changes
- no broad battle refactor

Verification:

- targeted tests only if code renames happen
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Lane B: Condition Canonicalization

Node:

- `canonical-condition-effects`

Goal:

- define one authoritative condition-consequence surface for support layers
- align TS query/projection logic to it without weakening Quint authority

Likely files:

- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- related tests

Non-goals:

- no generic dynamic registry
- no move of semantic ownership away from `battle.qnt` / `creature.qnt`

Verification:

- targeted vitest files
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Lane C: Consumption Model

Node:

- `first-class-consumption-model`

Goal:

- define typed spend/refund/quota vocabulary
- align action-token and execution-support surfaces around it

Likely files:

- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/core/src/machine-guards.ts](../packages/core/src/machine-guards.ts)
- [packages/core/src/features/spell-available-actions.ts](../packages/core/src/features/spell-available-actions.ts)
- [PRD_AVAILABLE_ACTIONS.md](../PRD_AVAILABLE_ACTIONS.md) only if docs need alignment
- related core and MCP tests

Non-goals:

- no transcript work
- no DM-override implementation
- no broad spell breadth batch yet

Verification:

- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
- relevant MCP tests if payloads change
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Lane D: D20 Query Surface Design

Node:

- `authoritative-d20-modifier-query-surface`

Goal:

- define the authoritative runtime/query seam for d20-roll modifiers and disadvantages
- keep this as a small design-plus-implementation lane

Likely files:

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine-types.ts](../packages/core/src/machine-types.ts)
- [packages/core/src/features/feature-bridge.ts](../packages/core/src/features/feature-bridge.ts)
- related tests

Non-goals:

- do not implement every blocked modifier feature
- only create the surface needed to unblock `armor-training-disadvantage`

Verification:

- targeted vitest files
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Lane E: Low-Risk Correctness Fixes

Nodes:

- `same-name-magical-effect-non-stacking`
- `exhaustion-d20-penalty`
- `sneak-attack-any-disadvantage`
- `sneak-attack-once-per-turn-boundary`
- `stand-from-prone-in-battle`

Execution rule:

- one sub-agent per fix only if file overlap is low
- otherwise batch compatible fixes in a single worktree

Suggested grouping:

- E1: `same-name-magical-effect-non-stacking`
- E2: `exhaustion-d20-penalty`
- E3: `sneak-attack-any-disadvantage` + `sneak-attack-once-per-turn-boundary`
- E4: `stand-from-prone-in-battle`

Non-goals:

- no opportunistic architecture changes beyond the assigned node
- if a fix discovers a missing facility, stop and report

## Merge Order

Recommended merge sequence:

1. Lane A
2. Lane B
3. Lane C
4. Lane D
5. Lane E fixes
6. `armor-training-disadvantage` only after Lane D lands
7. `preview-execution` only after Lanes A and C land

Reason:

- documentation and vocabulary should stabilize first
- feature fixes should not be forced to rebase on shifting architecture repeatedly

## Per-Node Task Card Template

Every scheduled node should be restated for the worker using this format:

### Node

`node-name`

### Goal

- one paragraph max

### Read First

- exact files only

### Edit Set

- exact files expected to change

### Non-Goals

- flat list of what not to do

### Verification

- exact commands

### Stop Conditions

- if you discover a missing facility
- if the edit set expands materially
- if you need to change the Quint frontier rather than support it

## Example Task Cards

### `exhaustion-d20-penalty`

Goal:

- align TS/runtime query results with existing Quint exhaustion semantics for d20 penalties

Read first:

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [creature.qnt](../creature.qnt)
- [dndTest.qnt](../dndTest.qnt)

Edit set:

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)

Verification:

- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`

Stop conditions:

- if the fix requires a new shared modifier/query surface after all

### `armor-training-disadvantage`

Goal:

- implement the rule only after the d20 modifier/query ownership seam is explicit

Read first:

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine-types.ts](../packages/core/src/machine-types.ts)
- [packages/core/src/features/feature-bridge.ts](../packages/core/src/features/feature-bridge.ts)
- [.references/srd-5.2.1/Rules-Glossary.md](../.references/srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Equipment.md](../.references/srd-5.2.1/Equipment.md)

Edit set:

- to be finalized by Lane D

Verification:

- targeted vitest
- `pnpm --filter @dnd/core exec tsc --noEmit`

Stop conditions:

- if there is still no single authoritative runtime fact for untrained-armor disadvantage

## Worktree Protocol

When using worktree agents:

1. Each worker must begin with:
   - `git log --oneline -1 master`
   - verify HEAD matches
   - `git rebase master` if needed
2. One write scope per worker.
3. No worker should revert unrelated changes.
4. If two lanes need the same file, either:
   - serialize them
   - or split one lane into a doc-only pass and a code-only pass

## Simplify / Cleanup Protocol

For every merged lane:

1. run the targeted verification from the task card
2. perform at least two rounds of simplification review
3. fold obvious naming duplication and dead branches
4. do not widen scope during simplify unless the bug is directly caused by the lane

## What Good Looks Like

A successful orchestrator run leaves:

- DAG still accurate
- architecture nodes materially smaller or complete
- low-risk correctness fixes landed
- no speculative transcript/DM-override work started early
- no support-layer workaround that should have been a spec/domain cleanup
