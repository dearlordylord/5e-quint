# DAG Runbook 5

## Purpose

This file is the execution companion for the next high-confidence batch after [DAG_RUNBOOK_4.md](./DAG_RUNBOOK_4.md).

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK_5.md` for orchestrated coding-agent execution

This batch is intentionally narrower than Runbook 4. Its value is not breadth; it is freezing the next battle-owned modifier seam in a way that matches [ARCHITECTURE.md](../ARCHITECTURE.md) and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) without inventing a generic registry.

## Preconditions

Before starting implementation, confirm:

1. the Runbook 4 combat changes are landed or equivalent local code exists for:
   - `weapon-property-aware-battle-resolution`
   - `battle-hand-occupancy-state`
   - `off-hand-attack-surface`
2. no one is trying to widen this batch into the full `fighting-styles-in-battle` umbrella
3. rules-facing prose continues to use SRD language such as:
   - `Ranged weapon`
   - `free hand`
   - `holding`
   - `Two-Handed`
   - `Versatile`

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- freeze a concrete battle-owned additive modifier seam
- consume it through the two cleanest SRD-backed fighting style feats already present in this repo
- keep `fighting style` itself in TS content while battle owns only the resolved additive modifier fields it needs
- avoid widening into armor-state, die-reroll, or generic modifier-program work

## Default In-Scope Nodes

1. `closed-modifier-algebra`
2. `archery-in-battle`
3. `two-weapon-fighting-style-in-battle`

## Default Out Of Scope

Do not schedule these in the same run unless explicit new research promotes them first:

- `fighting-styles-in-battle` as an umbrella
- `generic-per-attack-type-bonus-surface`
- `defense-in-battle`
- `great-weapon-fighting-in-battle`
- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `battle-hidden-state`
- `hide-stealth-chain`
- `dm-override`
- `transcript-port-to-dnd`

Reason:

- `Defense` still wants battle-owned armor-worn state
- `Great Weapon Fighting` still wants battle-owned die-face reroll ownership
- the broader effect/visibility/transcript clusters remain design-first rather than execution-grade

## SRD And Architecture Guardrails

Read before implementation:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [.references/srd-5.2.1/Feats.md](../.references/srd-5.2.1/Feats.md)
- [.references/srd-5.2.1/Equipment.md](../.references/srd-5.2.1/Equipment.md)

Required interpretations for this batch:

- `Archery`: bonus applies to attack rolls made with Ranged weapons
- `Two-Weapon Fighting`: applies only to the extra attack made as a result of using a weapon with the Light property
- `Two-Handed` and `Versatile` keep their SRD meanings; do not invent slot-based shorthand in rules prose

Architecture rule:

- `closed-modifier-algebra` means concrete battle-owned additive fields only
- it does not mean a generic modifier registry, callback layer, or string-tag aggregator

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Land the modifier facility before either fighting-style consumer.
4. Keep attack-roll and off-hand-damage consumers separate until the facility is stable.
5. Do not let workers solve missing ownership with ad hoc style tags on battle events.
6. If a consumer appears to need armor-worn state, die-face reroll state, or a broader equipment redesign, stop and return a design note instead of widening scope.

## Parallelization Plan

### Lane A: Narrow Modifier Facility

Node:

- `closed-modifier-algebra`

Goal:

- introduce the smallest closed set of battle-owned additive modifier fields needed by the first real consumers

Allowed shape:

- concrete fields such as battle-owned attack-roll and off-hand-damage additive modifiers
- Quint and TS should agree on the same owned fields

Forbidden shape:

- no open modifier registry
- no generic map keyed by attack type or feature name
- no feature-tag interpretation inside battle resolution

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts) only if projection helpers are needed

Verification:

- focused type-level and scenario tests proving the new fields are battle-owned and consumed in exactly one place each
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 battle MBT only if battle parity semantics materially change

### Lane B: Archery Consumer

Node:

- `archery-in-battle`

Goal:

- consume the new modifier seam so a creature with the Archery fighting style gets the +2 bonus on attack rolls made with Ranged weapons

Expected shape:

- TS content remains the source of the specific +2 rule
- battle owns only the additive field it needs at resolution time
- Quint proves the attack-roll pipeline remains correct under the new field

Likely files:

- [packages/core/src/features/class-fighter.ts](../packages/core/src/features/class-fighter.ts)
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Required tests:

- ranged weapon attack gets +2
- melee weapon attack does not get +2
- existing advantage/disadvantage and crit handling remain unchanged

### Lane C: Two-Weapon Fighting Consumer

Node:

- `two-weapon-fighting-style-in-battle`

Goal:

- consume the same narrow modifier seam so the Light-property bonus attack can add the ability modifier to damage when the style is present

Expected shape:

- use the existing content helper in [class-fighter.ts](../packages/core/src/features/class-fighter.ts)
- consume it only in the battle-owned off-hand damage branch
- preserve existing negative-modifier behavior when the style is absent

Likely files:

- [packages/core/src/features/class-fighter.ts](../packages/core/src/features/class-fighter.ts)
- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Required tests:

- off-hand Light attack still drops positive ability modifier without the style
- off-hand Light attack adds ability modifier with the style
- negative ability modifier still applies correctly
- non-Light or non-bonus off-hand attacks do not gain the style benefit

## Stop Conditions

Stop and return a design note instead of pushing through if any of these become necessary:

1. adding a generic modifier registry or callback table
2. adding battle-owned armor-worn state just to support `Defense`
3. adding die-face reroll ownership just to support `Great Weapon Fighting`
4. introducing non-SRD style consumers or style names not present in the local 5.2.1 corpus
5. widening the batch into the umbrella `fighting-styles-in-battle`

## Verification

Minimum verification for the batch:

1. deterministic unit/scenario tests for both style consumers
2. `pnpm --filter @dnd/core exec tsc --noEmit`
3. `pnpm exec quint typecheck battle.qnt`
4. Tier 1 battle MBT if Quint battle semantics or battle event/state ownership materially changed

## Exit Criteria

This runbook is complete when:

- the modifier facility is battle-owned, concrete, and narrow
- `Archery` works in battle through that facility
- `Two-Weapon Fighting` works in battle through that facility
- no generic registry or extra style rollout was introduced
- the DAG can honestly keep `fighting-styles-in-battle` blocked for later consumers rather than pretending the whole umbrella is done
