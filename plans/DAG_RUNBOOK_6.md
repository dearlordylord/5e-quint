# DAG Runbook 6

## Status

TS/MCP action-surface implementation landed; Runbook 6 Quint parity is mirrored except for the split Fire Shield active-effect payload node.

The merge completed the TypeScript battle state, available-actions, MCP, and focused test portions of this runbook. The follow-up worktree updates `battle.qnt` so ready-spell setup derives modeled payload facts from spell identity and slot level, and so attack damage carries explicit after-damage trigger qualifiers for Hellish Rebuke and Retaliation. The narrower Fire Shield active-effect payload caveat is split into [DAG_RUNBOOK_8.md](./DAG_RUNBOOK_8.md) as `fire-shield-reactive-effect-payload-parity`.

This runbook captures the execution-grade batch after Runbook 5. Its scope comes from the ownership gaps discovered during Runbook 4 and confirmed still open after Runbook 5.

## Purpose

This file is the execution companion for the next high-confidence batch after [DAG_RUNBOOK_5.md](./DAG_RUNBOOK_5.md).

Use:

- [DAG.md](./DAG.md) for dependency truth
- `DAG_RUNBOOK_6.md` for orchestrated coding-agent execution

The batch is intentionally ownership-first. Runbook 4 proved that the non-spell Ready and after-damage interrupt plumbing exist, but two action-surface consumers cannot be exposed honestly until battle owns the missing payload and trigger facts.

## Current Mission

Repository-shaping priority remains:

1. Quint/spec-side correctness and clarity
2. domain language and ownership
3. TypeScript architecture only as support for `1` and `2`

This batch should:

- add battle-owned spell payload facts for already-modeled readyable spells
- expose `READY_SPELL` / `READY_SPELL_RELEASE` through available-actions only after that payload exists
- add battle-owned after-damage trigger qualifiers and reactive effect payload facts
- expose after-damage reactions only from owned trigger facts and owned effect payloads
- avoid action-token, MCP, or adapter fabrication

## Confirmed Already Complete

Do not reschedule these in this runbook unless regression evidence appears:

- `battle-ready-spell-payload-state` in TS battle state / initialization
- `battle-ready-spell-surface` in core available-actions and MCP
- `after-damage-trigger-state` in TS after-damage interrupt context
- `after-damage-reaction-surface` in core available-actions and MCP
- everything closed by DAG Runbooks 1-5; see [DAG.md](./DAG.md) for authoritative status
- `available-actions-main` foundation through the non-spell battle basic/ready action surface
- `battle-basic-action-surface`
- `battle-ready-action-surface`
- `preview-execution`
- `weapon-property-aware-battle-resolution`
- `battle-hand-occupancy-state`
- `closed-modifier-algebra`
- `archery-in-battle`
- `two-weapon-fighting-style-in-battle`

## Default In-Scope Nodes

1. `battle-ready-spell-payload-state`
2. `battle-ready-spell-surface`
3. `after-damage-trigger-state`
4. `after-damage-reaction-surface`

## Default Out Of Scope

Do not schedule these in the same run unless explicit new research promotes them first:

- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `battle-hidden-state`
- `hide-stealth-chain`
- broad `fighting-styles-in-battle`
- `defense-in-battle`
- `great-weapon-fighting-in-battle`
- `generic-per-attack-type-bonus-surface`
- `dm-override`
- `transcript-port-to-dnd`

Reason:

- this batch is about two direct available-actions frontier gaps, not the general effect lifecycle, visibility, fighting-style, or product-transcript programs
- `Fire Shield` may need a narrow reactive active-effect payload, but it must not become a parent/child effect graph redesign
- after-damage trigger qualifiers may include concrete visibility/proximity facts, but they must not become a full hidden-state or geometry engine

## Post Runbook 4/5 Scope Recheck

Runbooks 4 and 5 changed the scheduling frontier, but they do not justify adding more nodes to this runbook.

- Runbook 4 completed the non-spell battle action surface and proved the two remaining action-surface gaps are ownership gaps: `battle-ready-spell-payload-state` and `after-damage-trigger-state`.
- Runbook 5 completed the narrow fighting-style modifier seam and explicitly did not unblock the broad `fighting-styles-in-battle` umbrella. `Defense` still needs battle-owned armor-worn state, and `Great Weapon Fighting` still needs die-face/reroll ownership.
- `dm-override` and `transcript-port-to-dnd` should stay later until this runbook closes the remaining product-surface gaps around readied spells and after-damage reactions.
- `effect-dependency-graph` and `battle-hidden-state` remain separate research/promote problems. This runbook may produce evidence for them, but should not absorb them.

## SRD And Architecture Guardrails

Read before implementation:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [available-actions.md](./available-actions.md)
- [PRD_AVAILABLE_ACTIONS.md](../PRD_AVAILABLE_ACTIONS.md)
- [PRD_READY_ACTION.md](../PRD_READY_ACTION.md)
- [.references/srd-5.2.1/Playing-the-Game.md](../.references/srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](../.references/srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](../.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- [.references/srd-5.2.1/Spells/Spell-Descriptions.md](../.references/srd-5.2.1/Spells/Spell-Descriptions.md)

Required architecture interpretation:

- battle owns the combat facts needed to project and execute battle actions
- available-actions projects tokens from already-owned facts
- MCP executes resolved tokens and supplies runtime-owned inputs such as dice rolls
- MCP and available-actions must not reconstruct spell mechanics, trigger legality, visibility, range, or stored effect choice from ad hoc registries

Rules-facing language:

- use `Ready`, `Reaction`, `Spell Component`, `Verbal`, `Somatic`, `Material`, `free hand`, `visible`, `within 60 feet`, `within 5 feet`, and `melee attack roll` where those are the SRD-facing terms
- avoid invented shorthand such as spell AST, reaction registry, geometry engine, or generic trigger expression in rules-facing docs and plan prose

## Handoff To Orchestrator

Give the orchestrator this instruction shape:

1. Use [DAG.md](./DAG.md) as the dependency source of truth.
2. Use this file as the execution plan.
3. Land `battle-ready-spell-payload-state` before `battle-ready-spell-surface`.
4. Land `after-damage-trigger-state` before `after-damage-reaction-surface`.
5. Keep the two facility lanes independent unless the existing code proves a shared type belongs in one common battle semantic module.
6. Do not let workers fabricate missing fields in `available-actions.ts`, MCP, or action-token payloads.
7. If a lane appears to need a generic spell AST, generic reaction registry, hidden-state engine, geometry engine, or effect-dependency graph, stop that lane and return a design note instead of widening scope.

## Parallelization Plan

### Lane A: Ready Spell Payload Facility

Node:

- `battle-ready-spell-payload-state`

Goal:

- replace the battle-facing readyable-spell surface from spell-name-only state to a typed battle-owned payload projection for already-modeled readyable battle spells

Problem to solve:

- battle currently stores `preparedSpells: ReadonlySet<string>` and `readiedSpellParams: ReadiedSpellParams | null`
- that is enough to execute a fully-specified `BATTLE_READY_SPELL` event, but not enough for available-actions to build honest query tokens
- the current event expects payload facts such as save ability, save DC, damage on failure, half-on-success, damage type, condition-on-failure, apply-condition flag, target, and slot level

Expected shape:

- TS content remains the source of specific spell definitions
- battle stores a typed projection of the spell facts battle needs, not a full spellbook and not a second registry
- `readiedSpellParams` should reuse the same payload shape plus chosen target and chosen spell slot level where practical
- only spells already modeled for battle readying should be included

Allowed type direction:

```ts
type BattlePreparedSpell =
  | {
      readonly spellName: string
      readonly baseLevel: SpellSlotLevel
      readonly release: {
        readonly kind: "save"
        readonly saveAbility: Ability
        readonly halfOnSuccess: boolean
        readonly damageType: DamageType
        readonly damageOnFail: number
        readonly conditionOnFail: Condition
        readonly applyCondition: boolean
      }
    }
```

This is illustrative, not mandatory. Prefer the existing repo's naming and type factoring if there is already a better single source of truth.

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/features/spell-available-actions.ts](../packages/core/src/features/spell-available-actions.ts) if this is still the existing content projection source
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- MBT bridge files only if Quint-visible state shape changes require mapping updates

Non-goals:

- no generic spell AST
- no full spellbook or prepared-spell inventory redesign
- no broad support for all spells
- no AoE or spell-attack expansion in this facility
- no MCP-side spell mechanics registry

Verification:

- focused scenario tests proving battle stores the projected spell payload
- focused test proving `BATTLE_READY_SPELL` no longer requires available-actions to invent save/effect facts
- `pnpm --filter @dnd/core exec tsc --noEmit`
- `pnpm exec quint typecheck battle.qnt`
- Tier 1 battle MBT if battle state/event parity changes materially

### Lane B: Ready Spell Action Surface

Node:

- `battle-ready-spell-surface`

Goal:

- expose battle-scoped `READY_SPELL` and `READY_SPELL_RELEASE` through available-actions / MCP using the payload from Lane A

Execution rule:

- do not start this lane until Lane A has landed enough owned payload to project tokens honestly

Expected shape:

- active-turn query token for setting up a readied spell from battle-owned spell payload
- ready-window query token for releasing a readied spell from `readiedSpellParams`
- resolved token should include user-facing holes only
- runtime-owned inputs such as save rolls remain runtime-owned
- spell component legality must keep using the battle hand-occupancy/component logic, not spell-name-specific hacks in available-actions

Likely files:

- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/core/src/available-actions.test.ts](../packages/core/src/available-actions.test.ts)
- [packages/mcp/src/server.ts](../packages/mcp/src/server.ts)
- [packages/mcp/src/server.test.ts](../packages/mcp/src/server.test.ts)
- [packages/core/src/battle-machine-actions-turn.ts](../packages/core/src/battle-machine-actions-turn.ts) only if execution shape needs final alignment after Lane A
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Required tests:

- token appears for a readyable modeled spell when the actor can take the Ready action and can provide required components
- token does not appear when no modeled readyable payload exists
- token does not appear when spellcasting is blocked by current battle state
- release token appears only in the ready-window interrupt for the creature with a readied spell
- MCP round-trip executes a representative ready-spell setup and release

Non-goals:

- no all-spells action surface
- no new product ranking or recommendation logic
- no token fields that smuggle engine-only save rolls or fabricated spell mechanics

Verification:

- focused available-actions tests for token projection and resolved execution
- focused MCP tests for representative round trip
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 battle MBT only if the lane changes Quint-visible battle semantics beyond token projection

### Lane C: After-Damage Trigger Facility

Node:

- `after-damage-trigger-state`

Goal:

- enrich the battle-owned after-damage interrupt context with the concrete trigger facts needed by current modeled SRD reactions, and add narrow reactive active-effect payload ownership for persistent effects such as `Fire Shield`

Problem to solve:

- `PIAfterDamage` already identifies the attacker, damaged creature, damage dealt, damage type, damage qualifiers, and return path
- it does not yet own enough facts to surface current after-damage choices honestly
- `Hellish Rebuke` needs attacker visible and within 60 feet
- `Retaliation` needs attacker within 5 feet
- `Fire Shield` needs attacker within 5 feet and a hit with a melee attack roll, and its damage type comes from the active shield mode rather than a trigger-time spell choice

Expected shape:

- enrich `AfterDamageCtx` with direct booleans for the current trigger facts
- enrich active effects with a narrow reactive payload only when a persistent active effect is the source of the reaction/effect
- keep geometry and visibility as caller-owned inputs or existing battle facts; do not implement a full geometry/hidden-state subsystem here

Allowed type direction:

```ts
type AfterDamageCtx = {
  readonly damageSource: CreatureId
  readonly damagedCreature: CreatureId
  readonly damageDealt: number
  readonly damageType: DamageType
  readonly damageQualifiers: ReadonlySet<DamageQualifier>
  readonly sourceVisibleToDamagedCreature: boolean
  readonly sourceWithin5ftOfDamagedCreature: boolean
  readonly sourceWithin60ftOfDamagedCreature: boolean
  readonly sourceHitWithMeleeAttackRoll: boolean
  readonly returnTo: AfterDamageReturn
}

type ReactiveEffectPayload =
  | {
      readonly trigger: "meleeHitWithin5ft"
      readonly damageType: "fire" | "cold"
      readonly damage: number
    }
```

This is illustrative, not mandatory. Prefer the existing repo's discriminants and damage modeling conventions.

Likely files:

- [battle.qnt](../battle.qnt)
- [packages/core/src/battle-machine-types.ts](../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-helpers.ts](../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-creature.ts](../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/features/spell-evocation.ts](../packages/core/src/features/spell-evocation.ts)
- [packages/core/src/features/class-barbarian.ts](../packages/core/src/features/class-barbarian.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)
- MBT bridge files only if Quint-visible interrupt/state shape changes require mapping updates

Non-goals:

- no generic trigger-expression language
- no generic reaction registry
- no hidden-state or line-of-sight engine
- no spatial/grid engine
- no parent/child effect-dependency graph

Verification:

- focused scenario tests proving the after-damage context owns each trigger qualifier needed by the first consumers
- focused test proving persistent reactive effect payload is stored on active effects rather than reconstructed from spell names in the action surface
- `pnpm --filter @dnd/core exec tsc --noEmit`
- `pnpm exec quint typecheck battle.qnt`
- Tier 1 battle MBT if battle interrupt semantics or bridge mapping changes materially

### Lane D: After-Damage Reaction Surface

Node:

- `after-damage-reaction-surface`

Goal:

- expose battle-scoped `PIAfterDamage` reactions through available-actions / MCP from Lane C's owned trigger facts and active-effect payloads

Execution rule:

- do not start this lane until Lane C has landed enough owned trigger facts to project tokens honestly

Expected shape:

- `Hellish Rebuke` appears only when the damaged creature can take a reaction and the owned trigger facts satisfy visible and within-60-feet requirements
- `Retaliation` appears only when the owned trigger facts satisfy within-5-feet requirements and the creature has the feature in the current modeled state
- `Fire Shield` appears from active-effect reactive payload, not from available-actions checking a spell name directly
- resolved tokens contain only user-facing choices; runtime-owned rolls/damage dice remain runtime-owned

Likely files:

- [packages/core/src/available-actions.ts](../packages/core/src/available-actions.ts)
- [packages/core/src/available-actions.test.ts](../packages/core/src/available-actions.test.ts)
- [packages/mcp/src/server.ts](../packages/mcp/src/server.ts)
- [packages/mcp/src/server.test.ts](../packages/mcp/src/server.test.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../packages/core/src/battle-machine-actions-attack.ts) only if event shape needs final alignment after Lane C
- [packages/core/src/battle-rules-scenarios.test.ts](../packages/core/src/battle-rules-scenarios.test.ts)

Required tests:

- Hellish Rebuke token appears only when visible and within 60 feet
- Hellish Rebuke token is absent when the attacker is not visible or not within 60 feet
- Retaliation token appears only when the attacker is within 5 feet
- Fire Shield token/effect appears from active reactive payload and uses the stored warm/chill damage type
- after-damage reaction tokens are absent outside `PIAfterDamage`
- MCP round-trip executes at least one representative after-damage reaction

Non-goals:

- no broad reaction search across all features and spells
- no MCP-owned reaction legality cache
- no product-level warning/override UX

Verification:

- focused available-actions tests for token projection and resolved execution
- focused MCP tests for representative round trip
- `pnpm --filter @dnd/core exec tsc --noEmit`
- Tier 1 battle MBT only if the lane changes Quint-visible battle semantics beyond token projection

## Merge Order

1. Lane A: `battle-ready-spell-payload-state`
2. Lane B: `battle-ready-spell-surface`
3. Lane C: `after-damage-trigger-state`
4. Lane D: `after-damage-reaction-surface`

Parallelization rule:

- Lane A and Lane C may be researched and implemented in parallel if workers have disjoint ownership and coordinate any shared battle type files carefully.
- Lane B must wait for Lane A.
- Lane D must wait for Lane C.
- Final integration should be single-owner because `available-actions.ts`, MCP execution, battle type normalization, and MBT bridge mapping are shared seams.

## Stop Conditions

Stop the affected lane and return a design note instead of pushing through if any of these become necessary:

1. adding a generic spell AST
2. adding a generic reaction registry or trigger-expression language
3. adding MCP-side spell mechanics or reaction legality reconstruction
4. adding a full spellbook/prepared-spell inventory redesign
5. adding a hidden-state, line-of-sight, grid, or geometry engine
6. adding an effect-dependency graph or parent/child teardown model
7. widening to all spells, all reactions, `dm-override`, or transcript execution
8. exposing an action token whose execution requires action-surface code to fabricate battle facts

## Questions To Resolve For Later Runbooks

Record short answers in the PR description or follow-up DAG notes if the implementation makes them clear.

### Questions For Effect Lifecycle Work

1. Does the narrow `Fire Shield` reactive payload reveal a real need for `effect-dependency-graph`, or is a typed active-effect payload enough for current persistent reactions?
2. Does storing warm/chill retaliation facts on the effect require a parent effect identity, or can it remain a local active-effect payload without teardown redesign?

### Questions For Hidden / Spatial Work

1. Are concrete after-damage booleans enough for `Hellish Rebuke`, `Retaliation`, and `Fire Shield`, or did the implementation reveal pressure for `battle-hidden-state`?
2. Did the visibility/proximity facts remain caller-owned at the battle boundary, or did code start reconstructing geometry from unrelated state?

### Questions For Product Surface Work

1. After these action-surface gaps land, is `available-actions-main` complete enough to unblock `dm-override` or `transcript-port-to-dnd`, or are there still combat actions whose token surface is too incomplete?
2. Did the resolved-token/runtime-input contract need a shape change, or did the existing contract handle spell release and after-damage reactions cleanly?

## Verification Floor

Minimum acceptable validation for the full run:

1. RAW check against the local SRD 5.2.1 corpus for Ready, reaction timing, spell components, Hellish Rebuke, Fire Shield, and Retaliation
2. focused core tests for each lane
3. focused MCP tests for the two newly exposed action-surface families
4. `pnpm --filter @dnd/core exec tsc --noEmit`
5. `pnpm exec quint typecheck battle.qnt`
6. Tier 1 battle MBT if battle state/event/bridge semantics materially change
7. minimum two `/simplify` rounds, continuing until convergence if either round finds important fixes

## Exit Criteria

This runbook is complete when:

- battle owns readyable spell payload facts for the modeled ready-spell slice
- `READY_SPELL` and `READY_SPELL_RELEASE` tokens are projected and executed without fabricated spell mechanics
- battle owns after-damage trigger qualifiers for the modeled after-damage reaction slice
- persistent reactive effect payloads such as `Fire Shield` are stored on active effects rather than inferred by action-surface spell-name checks
- after-damage reactions are projected and executed from owned facts
- no generic spell AST, reaction registry, geometry engine, hidden-state redesign, or effect-dependency graph was introduced

Implementation note:

- The TS/MCP action surface satisfies the exit criteria above for the current runtime projection layer.
- `battle.qnt` now mirrors the ready-spell payload derivation and after-damage trigger qualifier shape used by Hellish Rebuke and Retaliation. Fire Shield's reactive active-effect payload remains TS-owned until `fire-shield-reactive-effect-payload-parity` in [DAG_RUNBOOK_8.md](./DAG_RUNBOOK_8.md) gives the Quint active-effect schema an equivalent payload.
