# Proposal: Sear Undead (cleric L5) — structural_widening

## Unit

**Name:** Sear Undead (cleric L5)  
**Kind:** class_feature  
**Provenance:** srd-5.2.1, Classes/Cleric#Level 5: Sear Undead

**Source text:**
> Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the roll's total. This damage doesn't end the turn effect.

---

## Why the unit does not fit honestly

### Gap 1 (structural): No passive-augment family for class features

`ClassFeatureMechanics` has exactly one concrete family: `ClassFeatureActivationMechanics` (`family: "activation"`). Its required header fields are:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Sear Undead is not independently activated. It fires **automatically** whenever Turn Undead is used — no separate action, no resource pool of its own, no reset cadence. Assigning it a `use_count` resource and a `short_or_long_rest` reset cadence (borrowed from Turn Undead) would be a lie: those belong to Turn Undead, not this rider.

The required subgraph shape is: _"passive augmentation — when feature X fires and its save gate produces a failure result, also apply this effect."_ There is no such family in the current surface.

**Proposed addition:** A new `ClassFeatureMechanics` family, e.g. `on_feature_trigger`, with fields:
- `triggerFeatureId: string` — the feature whose use triggers this rider (here: `"cleric_channel_divinity"` / Turn Undead)
- `triggerCondition` — closed enum of conditions (e.g., `save_fail`, `on_use`) describing when within that feature's resolution this rider fires
- `effect: ClassFeatureEffect` — the rider's effect (see Gap 3 below)

### Gap 2 (surface): No ability-modifier axis in `LevelAxis`

The die count scales with the caster's **Wisdom modifier** (min 1). `LevelAxis` currently covers:

```typescript
export type LevelAxis =
  | "character" | "class" | "slot" | "subclass" | "proficiency_bonus";
```

None of these are ability-score-derived. Wisdom modifier is a runtime creature stat, not a level or PB.

**Proposed addition:** A new `LevelAxis` variant, one of:
- `"ability_modifier"` paired with an `Ability` field (general), or
- A dedicated `"wisdom_modifier"` variant (narrower, matches Wis-specific features like Divine Spark and Sear Undead)

The `DiceAmount` `linear_per_level` / `threshold_tiers` shape would still work once the axis is correct — dice count = `base: 1d8, perLevel: {dice: 1}, startingAtLevel: 1` with `axis: "wisdom_modifier"` would express "1d8 per point of Wis modifier, starting at 1".

### Gap 3 (surface): No damage variant in `ClassFeatureEffect`

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Sear Undead's effect is Radiant damage. The spell surface already has `DamageEffect`:

```typescript
export type DamageEffect = {
  readonly kind: "damage";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
```

This same shape (or a re-export of it) needs to be added to `ClassFeatureEffect`.

---

## Secondary note: additive damage semantics

The clause "This damage doesn't end the turn effect" records that the Radiant damage is additive to Turn Undead's existing effect — the undead is both turned *and* damaged. This is a semantic constraint on the on-feature-trigger family: the rider's effect must not replace or negate the parent feature's outcome. A future surface design should encode this as a property on the trigger family (e.g., `doesNotReplaceParentEffect: true`) or ensure the tracer's subgraph composition preserves it implicitly.

---

## Summary of required widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | new_subgraph | `on_feature_trigger` class-feature mechanics family | Yes (primary) |
| 2 | new_variant | `ability_modifier` / `wisdom_modifier` in `LevelAxis` | Yes |
| 3 | new_variant | `damage` in `ClassFeatureEffect` | Yes |

All three gaps must be addressed before an honest encoding can be produced.
