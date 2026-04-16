# Proposal: Widening for Blessed Healer (cleric L6)

## Outcome

`structural_widening` — No existing `ClassFeatureMechanics` family can honestly encode this unit.

## Why the existing surface fails

The only available class-feature family is `activation` (`ClassFeatureActivationMechanics`). Its header (`ClassFeatureMechanicsHeader`) hard-requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;     // MANDATORY
  readonly resetCadence: RestResetCadence; // MANDATORY
};
```

Blessed Healer has **no use-count resource and no reset cadence**. It fires automatically, without limit, every time the cleric casts a healing spell on others. Fabricating `{ kind: "fixed", uses: 1 }` plus any rest cadence would be a dishonest trace — the SRD text says nothing of the kind.

## The mechanic

```
Trigger:  cast a spell [with a spell slot] [that restores HP] [to ≥1 creature other than self]
Effect:   caster regains (2 + slot_level) HP
Limit:    none — fires on every qualifying cast
```

This is a **passive, unlimited, spell-cast-triggered self-heal**. It is structurally different from every feature modeled so far (Action Surge, Second Wind, etc.), all of which have explicit activation + use counts.

## Required widenings

### 1. New `ClassFeatureMechanics` family: `spell_cast_trigger`

A family for class features that are passive riders on spell casting:

```typescript
export type SpellCastTriggerMechanics = {
  readonly family: "spell_cast_trigger";
  readonly trigger: SpellCastTriggerCondition;  // see below
  readonly effect: ClassFeatureEffect;           // reuses existing effect atoms
};
```

No `resource` or `resetCadence` field — the feature is unlimited.

### 2. New surface type: `SpellCastTriggerCondition`

A closed grammar for what makes a cast qualify:

```typescript
export type SpellCastTriggerCondition = {
  readonly kind: "heal_spell_on_other";
  // "a spell with a slot that restores HP to ≥1 creature other than self"
  // Requires: slot-expending cast, HP-restore effect, ≥1 non-self target
};
```

Potential future variants: `damage_spell_on_target`, `any_spell_slot_cast`, etc.

### 3. New `HealHpEffect` target or amount binding

The heal amount is `2 + slot_level`, where "slot_level" refers to the slot used in the *triggering cast* — not the caster's class level, character level, or a separately tracked resource.

The existing `HealHpEffect` with `axis: "slot"` and `DiceAmount.linear_per_level` can approximate the math (base flat=2, perLevel flat=1, startingAtLevel=1) but the slot axis currently binds to the *own spell slot being consumed*, not to a triggering spell's slot. A new binding concept is needed:

```typescript
// New DiceAmount variant or amount source:
| {
    readonly kind: "flat_plus_trigger_slot_level";
    readonly flat: number; // 2
  }
```

Or alternatively, extend `LevelAxis` with a `"trigger_slot"` value to distinguish "slot I just cast" from "slot I'm currently consuming."

## Atom inventory impact

All atoms used are existing v4 atoms:
- `heal` (effect) — already present
- `spell_cast_window` (window) — already in v4 taxonomy

The gap is entirely at the **surface schema level** (missing family + missing trigger condition shape), not at the v4 atom level. However, the `trigger_slot` amount binding may require a new atom or surface variant depending on how the trigger-to-amount binding is modeled.

## Confidence

High. The structural mismatch is unambiguous: `UseCountResource` is not optional in `ClassFeatureMechanicsHeader`, and Blessed Healer has no use count.
