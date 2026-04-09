# DAG Task Cards

## Purpose

This file contains self-contained execution cards for active or near-active DAG nodes.

Use:

- [DAG.md](./DAG.md) for dependency truth
- [DAG_RUNBOOK.md](./DAG_RUNBOOK.md) for orchestration and merge protocol
- `DAG_TASK_CARDS.md` for execution handoff to a coding agent

Each card is intentionally compact but should be sufficient for a coding agent to execute without re-deriving the whole repo plan corpus.

## Card Template

### Node

`node-name`

### Goal

- short statement of intended outcome

### Depends On

- prerequisite nodes only

### Read First

- exact files only

### Edit Set

- expected write scope

### Non-Goals

- flat list of things not to do

### Verification

- exact commands

### Stop Conditions

- flat list of when to stop and report instead of improvising

## Architecture Cards

### Node

`resolve-commit-doctrine`

### Goal

- make resolve/commit vocabulary explicit in repo docs and, where cheap and low-risk, align battle/support naming with that doctrine

### Depends On

- none

### Read First

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- [.references/inspirations/03-resolve-commit.md](../.references/inspirations/03-resolve-commit.md)
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)

### Edit Set

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- optionally low-risk naming edits in:
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)

### Non-Goals

- no semantic changes
- no broad battle refactor
- no transcript implementation

### Verification

- `pnpm --filter @dnd/core exec tsc --noEmit`
- if code symbols change: targeted vitest files covering touched modules

### Stop Conditions

- if the rename set propagates into a broad MBT bridge rewrite
- if a proposed rename changes semantics rather than terminology

### Node

`canonical-condition-effects`

### Goal

- define one authoritative condition-consequence surface for support layers while keeping Quint as the semantic authority

### Depends On

- none

### Read First

- [.references/inspirations/05-condition-effects-table.md](../.references/inspirations/05-condition-effects-table.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [creature.qnt](../creature.qnt)
- [battle.qnt](../battle.qnt)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)

### Edit Set

- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- related tests for touched queries/helpers

### Non-Goals

- no dynamic open-ended registry
- no duplication of semantic ownership away from Quint
- no unrelated feature work

### Verification

- targeted vitest for touched query/helper files
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if the work requires a broad redesign of the Quint condition model
- if a single authoritative consequence surface cannot be expressed without duplicating existing spec truth

### Node

`first-class-consumption-model`

### Goal

- make spend/refund/quota semantics explicit and typed across available actions and related support code

### Depends On

- none

### Read First

- [.references/inspirations/10-first-class-consumption.md](../.references/inspirations/10-first-class-consumption.md)
- [PRD_AVAILABLE_ACTIONS.md](../PRD_AVAILABLE_ACTIONS.md)
- [available-actions.ts](../packages/core/src/available-actions.ts)
- [machine-guards.ts](../packages/core/src/machine-guards.ts)
- [battle.qnt](../battle.qnt)
- [creature.qnt](../creature.qnt)

### Edit Set

- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/core/src/machine-guards.ts](../packages/core/src/machine-guards.ts)
- [packages/core/src/features/spell-available-actions.ts](../packages/core/src/features/spell-available-actions.ts)
- related tests in core and MCP if payloads or cost semantics change

### Non-Goals

- no transcript work
- no DM-override implementation
- no broad spell breadth batch

### Verification

- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`
- if MCP payloads change: targeted `packages/mcp/src/server.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if the node expands into battle-spellcast breadth instead of defining the shared model
- if the implementation requires changing Quint semantics rather than tightening support vocabulary

### Node

`authoritative-d20-modifier-query-surface`

### Goal

- establish one authoritative runtime/query seam for d20-roll modifier and disadvantage facts, specifically to unblock armor-training disadvantage cleanly

### Depends On

- none

### Read First

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine-types.ts](../packages/core/src/machine-types.ts)
- [packages/core/src/features/feature-bridge.ts](../packages/core/src/features/feature-bridge.ts)
- [.references/srd-5.2.1/Rules-Glossary.md](../.references/srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Equipment.md](../.references/srd-5.2.1/Equipment.md)

### Edit Set

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine-types.ts](../packages/core/src/machine-types.ts)
- [packages/core/src/features/feature-bridge.ts](../packages/core/src/features/feature-bridge.ts)
- related tests

### Non-Goals

- do not implement all future d20 modifier features
- do not widen into a full generic modifier framework

### Verification

- targeted vitest for touched query/bridge files
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if the best answer is really `closed-modifier-algebra` first
- if there is still no clear single owner after a small design pass

### Node

`closed-modifier-algebra`

### Goal

- replace ad hoc reusable modifier surfaces with a small closed algebra suitable for Quint-facing support work

### Depends On

- none

### Read First

- [.references/inspirations/11-modifier-algebra.md](../.references/inspirations/11-modifier-algebra.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [battle.qnt](../battle.qnt)

### Edit Set

- design-first; expected files are:
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [packages/core/src/types.ts](../packages/core/src/types.ts)
- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- possibly battle/creature support code if the model is made concrete

### Non-Goals

- no open-ended registry
- no broad passive-feature rollout in the same batch

### Verification

- targeted vitest
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if the node needs a larger Quint frontier redesign before any support-layer change is useful

### Node

`oa-path-vocabulary`

### Goal

- make movement interruption and OA terminology explicit before broader movement/spatial work

### Depends On

- none

### Read First

- [.references/inspirations/12-opportunity-attack-path-analysis.md](../.references/inspirations/12-opportunity-attack-path-analysis.md)
- [battle/DOMAIN.md](../battle/DOMAIN.md)
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)

### Edit Set

- [battle/DOMAIN.md](../battle/DOMAIN.md)
- possibly small naming/documentation adjustments in:
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)

### Non-Goals

- no grid/geometry implementation
- no full battle-spatial expansion

### Verification

- `pnpm --filter @dnd/core exec tsc --noEmit`
- targeted movement tests only if code changes occur

### Stop Conditions

- if the work starts requiring concrete spatial state instead of vocabulary cleanup

## Ready Candidate Cards

### Node

`same-name-magical-effect-non-stacking`

### Goal

- align runtime effect insertion/removal behavior with the existing Quint rule that same-name magical effects do not stack

### Depends On

- none

### Read First

- [creature.qnt](../creature.qnt)
- [dndTest.qnt](../dndTest.qnt)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](../.references/srd-5.2.1/Spells/Gaining-and-Casting.md)

### Edit Set

- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

### Non-Goals

- no effect-dependency graph
- no generic effect-system redesign

### Verification

- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts src/battle-rules-scenarios.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`
- `pnpm exec quint test --match "same|effect" dndTest.qnt`

### Stop Conditions

- if non-stacking requires a parent/child effect model after all

### Node

`exhaustion-d20-penalty`

### Goal

- align TS/runtime d20 penalty behavior with existing Quint exhaustion semantics

### Depends On

- none

### Read First

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [creature.qnt](../creature.qnt)
- [dndTest.qnt](../dndTest.qnt)

### Edit Set

- [packages/core/src/machine-queries.ts](../packages/core/src/machine-queries.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)

### Non-Goals

- no broad modifier-surface redesign
- no condition-system overhaul

### Verification

- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`
- `pnpm exec quint test --match "exhaustion_penalty|check_exhaustion|save_exhaustion" dndTest.qnt`

### Stop Conditions

- if the runtime cannot express the penalty cleanly without first landing a shared query surface

### Node

`sneak-attack-any-disadvantage`

### Goal

- enforce that any disadvantage blocks Sneak Attack eligibility, even if advantage is also present

### Depends On

- none

### Read First

- [packages/core/src/features/class-rogue.ts](../packages/core/src/features/class-rogue.ts)
- [packages/core/src/features/class-rogue.test.ts](../packages/core/src/features/class-rogue.test.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- [.references/srd-5.2.1/Classes/Rogue.md](../.references/srd-5.2.1/Classes/Rogue.md)

### Edit Set

- [packages/core/src/features/class-rogue.ts](../packages/core/src/features/class-rogue.ts)
- [packages/core/src/features/class-rogue.test.ts](../packages/core/src/features/class-rogue.test.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

### Non-Goals

- no general advantage-reasons architecture pass
- no rogue subsystem redesign

### Verification

- `pnpm --filter @dnd/core exec vitest run src/features/class-rogue.test.ts src/battle-rules-scenarios.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if a missing shared attack-context owner makes the change non-local

### Node

`sneak-attack-once-per-turn-boundary`

### Goal

- tighten deterministic turn-boundary coverage for Sneak Attack once-per-turn semantics

### Depends On

- none

### Read First

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-actions-movement.ts](../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- [.references/srd-5.2.1/Classes/Rogue.md](../.references/srd-5.2.1/Classes/Rogue.md)

### Edit Set

- likely tests first:
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- then touched battle files only if behavior is wrong

### Non-Goals

- no broader rogue feature expansion
- no initiative/turn-system redesign

### Verification

- `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if the issue turns out to require a wider turn-state redesign

### Node

`stand-from-prone-in-battle`

### Goal

- expose standing from prone in battle as an explicit supported action with correct movement cost

### Depends On

- none

### Read First

- [creature.qnt](../creature.qnt)
- [packages/core/src/machine-states.ts](../packages/core/src/machine-states.ts)
- [packages/core/src/machine.test.ts](../packages/core/src/machine.test.ts)
- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)

### Edit Set

- [packages/core/src/battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- relevant battle action/exposure files
- tests for battle action exposure and cost

### Non-Goals

- no broad movement-action-surface project
- no spatial-system redesign

### Verification

- targeted vitest for touched battle files
- `pnpm --filter @dnd/core exec tsc --noEmit`

### Stop Conditions

- if exposing the action requires the broader `movement-action-surface` plan after all

## Sequencing Advice

If a single coding agent is looping through this file, preferred order is:

1. `resolve-commit-doctrine`
2. `canonical-condition-effects`
3. `first-class-consumption-model`
4. `same-name-magical-effect-non-stacking`
5. `exhaustion-d20-penalty`
6. `sneak-attack-any-disadvantage`
7. `sneak-attack-once-per-turn-boundary`
8. `stand-from-prone-in-battle`
9. `authoritative-d20-modifier-query-surface`
10. `armor-training-disadvantage`

If an orchestrator is running parallel worktrees, follow [DAG_RUNBOOK.md](./DAG_RUNBOOK.md) for lane structure and merge order.
