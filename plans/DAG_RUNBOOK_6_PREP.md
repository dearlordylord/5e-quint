# DAG Runbook 6 Prep

## Purpose

This file is a design-preparation artifact for the next frontier after [DAG_RUNBOOK_5.md](./DAG_RUNBOOK_5.md).

It exists because Runbook 4 discovered two real ownership gaps:

1. `battle-ready-spell-payload-state`
2. `after-damage-trigger-state`

These are not implementation TODOs. They are missing battle-owned facilities that must be designed before an execution-grade `DAG_RUNBOOK_6.md` can be frozen honestly.

## Current Read

The failed part of Runbook 4 was not token plumbing. It was ownership.

- `battle-ready-spell-surface` failed because battle does not yet own enough spell payload information to expose `BATTLE_READY_SPELL` honestly.
- `after-damage-reaction-surface` failed because battle does not yet own enough trigger facts to expose reactions like Hellish Rebuke, Fire Shield, and Retaliation honestly.

The correct next step is not to fabricate missing data in `available-actions.ts` or MCP. The correct next step is to define the missing battle-owned state.

## Facility 1: `battle-ready-spell-payload-state`

### Problem

Battle currently stores:

- `preparedSpells: ReadonlySet<string>`
- `readiedSpellParams: ReadiedSpellParams | null`

This is enough to execute a spell **after** a fully-populated `BATTLE_READY_SPELL` event is already supplied, but it is not enough to project honest setup tokens.

Why not:

- `preparedSpells` knows only spell identity, not battle-usable payload shape
- the current `BATTLE_READY_SPELL` event expects the caller to provide:
  - target
  - save DC
  - damage on fail
  - half-on-success flag
  - damage type
  - condition-on-fail
  - apply-condition flag
  - save ability
  - slot level
- that means the action surface would have to fabricate spell mechanics from external registries instead of consuming battle-owned semantics

### Existing Useful State

- `ReadiedSpellParams` already proves the minimal runtime payload shape battle wants **after** the spell is chosen.
- `preparedSpells` already proves battle knows which spell names are prepared.
- `spell-available-actions.ts` already contains modeled spell metadata on the TS content side.

### Minimal Design

The smallest honest facility is:

- replace the battle-facing spell-preparation surface from `Set<string>` to a typed modeled spell projection for battle-readyable spells
- keep TS content as the source of specific spell definitions
- let battle own only the projected payload needed for battle semantics

Recommended state shape:

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

Recommended ownership rule:

- TS content computes `BattlePreparedSpell` projections from SRD spell definitions and the caster state
- battle stores those typed projections directly on the combatant instead of only storing spell names
- `readiedSpellParams` should become an instance of the same modeled payload plus chosen target and chosen slot level

That means:

- no extra registry in MCP
- no event payload fabrication in `available-actions.ts`
- no redundant duplicate of the same spell facts in multiple layers

### Explicit Non-Goals

- no support for all spells
- no generic spell AST
- no battle-owned full spellbook/inventory system
- no widening to spell attacks or AoE in the same facility

This facility should cover only the already-modeled, readyable battle spell slice.

### First Consumer

- `battle-ready-spell-surface`

Specifically:

- active-turn query token for `BATTLE_READY_SPELL`
- ready-window query token for `BATTLE_READY_SPELL_RELEASE`

### Exit Criterion

This facility is ready when the action surface can build a `READY_SPELL` token without inventing any spell save/effect fields outside battle-owned typed spell payload.

## Facility 2: `after-damage-trigger-state`

### Problem

Battle currently stores this interrupt context:

```ts
type AfterDamageCtx = {
  damageSource: CreatureId
  damagedCreature: CreatureId
  damageDealt: number
  damageType: DamageType
  damageQualifiers: Set<DamageQualifier>
  returnTo: AfterDamageReturn
}
```

That is enough to resume control flow, but not enough to surface reaction choices honestly.

Missing trigger facts differ by rule:

- `Hellish Rebuke`: attacker must be visible and within 60 feet
- `Retaliation`: attacker must be within 5 feet
- `Fire Shield`: attacker must be within 5 feet and must have hit with a melee attack roll

Also, `Fire Shield` is not a reaction spell chosen at trigger time. It is an already-active effect whose retaliation payload depends on the shield mode:

- warm shield -> Fire damage
- chill shield -> Cold damage

### Existing Useful State

- `PIAfterDamage` already gives a single interrupt point for after-damage semantics
- battle already owns `activeEffects`
- `AfterDamageCtx` already owns the damaged creature, attacker, and damage result

### Minimal Design

This facility should be two narrow additions, not a generic reaction system:

1. enrich `AfterDamageCtx` with the concrete trigger qualifiers already needed by current SRD reactions
2. enrich `ActiveEffect` with a typed battle-reactive payload for effects like Fire Shield

Recommended trigger facts:

```ts
type AfterDamageCtx = {
  damageSource: CreatureId
  damagedCreature: CreatureId
  damageDealt: number
  damageType: DamageType
  damageQualifiers: Set<DamageQualifier>
  sourceVisibleToDamagedCreature: boolean
  sourceWithin5ftOfDamagedCreature: boolean
  sourceWithin60ftOfDamagedCreature: boolean
  sourceHitWithMeleeAttackRoll: boolean
  returnTo: AfterDamageReturn
}
```

Recommended active-effect extension:

```ts
type ReactiveEffectPayload =
  | {
      readonly trigger: "meleeHitWithin5ft"
      readonly damageType: "fire" | "cold"
      readonly damage: number
    }
```

Recommended ownership rule:

- battle owns the trigger qualifiers because they are part of the interrupt semantics
- active effects own reactive payload only when the reaction comes from a persistent effect rather than a fresh choice at trigger time
- `Hellish Rebuke` and `Retaliation` stay as trigger-time choices
- `Fire Shield` becomes discoverable from `activeEffects`, not from ad hoc spell-name checks in the action surface

### Explicit Non-Goals

- no generic trigger-expression language
- no registry of arbitrary reaction predicates
- no geometry engine
- no visibility subsystem beyond the exact booleans needed for current after-damage rules

### First Consumer

- `after-damage-reaction-surface`

Specifically:

- expose `Hellish Rebuke` only when the trigger qualifiers say it is legal
- expose `Retaliation` only when the trigger qualifiers say it is legal
- expose `Fire Shield` from active-effect payload rather than from a named special case in the adapter

### Exit Criterion

This facility is ready when the action surface can explain every surfaced after-damage reaction from battle-owned trigger facts plus owned effect payload, without reconstructing legality in MCP.

## Likely Runbook 6 Shape

If Runbook 5 lands cleanly, the most honest `RUNBOOK_6` candidate is:

1. `battle-ready-spell-payload-state`
2. `battle-ready-spell-surface`
3. `after-damage-trigger-state`
4. `after-damage-reaction-surface`

This is coherent because both facilities sit on the same frontier:

- expose already-modeled battle semantics through the action surface
- but only after battle owns the missing payload/trigger facts

## Not Runbook 6 Yet

These still remain outside the likely next batch:

- `effect-dependency-graph`
- `parent-child-effect-teardown`
- `battle-hidden-state`
- `hide-stealth-chain`
- broad `fighting-styles-in-battle`
- `dm-override`
- `transcript-port-to-dnd`

Those are still different design problems.

## Recommendation

After Runbook 5:

1. confirm whether Runbook 4's landed code already introduced any partial pieces of these facilities
2. if not, freeze `RUNBOOK_6` around the two facilities plus their two direct surfaces
3. keep the batch narrow and ownership-first

Do not reopen these through adapter hacks. The value of the next batch is to make the battle/action-surface boundary honest again.
