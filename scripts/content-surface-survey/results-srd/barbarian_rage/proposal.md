# Proposal: Atom Widenings for Barbarian Rage

**Unit:** `barbarian_rage` (Barbarian L1 class feature, SRD 5.2.1)  
**Outcome:** `atom_widening` — tracer threw `unhandled class-feature effect` because `ClassFeatureEffect` has no `ongoing_state` variant.

---

## Root cause

`ClassFeatureMechanics` currently has a single family, `activation`, whose `effect` field is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Rage enters a **persistent state** on activation — not a one-shot effect. This
requires either:

1. A new `ClassFeatureEffect` variant `ongoing_state` that holds a sub-effect array
   + duration + termination + renewal; **or**
2. A new `ClassFeatureMechanics` family `class_feature_ongoing_effect` (analogous to
   `OngoingEffectMechanics` for spells) that promotes duration/lifecycle to first-class
   fields on the mechanics header.

Option 2 is preferred because it mirrors the spell surface structure and keeps the
activation header clean.

---

## Proposed widenings

### W1 — New `ClassFeatureMechanics` family: `class_feature_ongoing_effect`

```typescript
export type ClassFeatureOngoingEffectMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "class_feature_ongoing_effect";
  readonly duration: Duration;           // reuse existing Duration type
  readonly effects: ReadonlyArray<ClassFeatureOngoingEffect>;
  readonly earlyTermination?: ReadonlyArray<EarlyTerminationCondition>;  // see W6
  readonly renewal?: TurnRenewal;        // see W7
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics     // existing
  | ClassFeatureOngoingEffectMechanics; // new
```

**Tracer:** add `case "class_feature_ongoing_effect"` to `traceClassFeatureMechanics`.
The tracer should emit a `persist` lifecycle node (from `Duration.timed`) and walk
each sub-effect through a new `traceClassFeatureOngoingEffect` dispatcher.

---

### W2 — New effect atom: `damage_resistance`

```typescript
export type DamageResistanceEffect = {
  readonly kind: "damage_resistance";
  readonly damageTypes: ReadonlyArray<DamageType>;
};
```

Sourced from: *"You have Resistance to Bludgeoning, Piercing, and Slashing damage."*

Maps to v4 atom `resistance` (if it exists in the full taxonomy) or a new atom of the
same name. The tracer should emit a `damage_resistance` effect node attached to `self`.

---

### W3 — New effect atom: `bonus_damage`

```typescript
export type BonusDamageEffect = {
  readonly kind: "bonus_damage";
  readonly condition: "strength_attack_or_unarmed";  // enum, widen as needed
  readonly amount: DiceAmount;   // threshold_tiers by class level for Rage Damage column
};
```

Sourced from: *"When you make an attack using Strength … you gain a bonus to the damage
that increases as you gain levels as a Barbarian."*

The Rage Damage column: +2 (L1), +3 (L9), +4 (L16).

Uses `DiceAmount.threshold_tiers` with `axis: "class"` and `flat`-only overrides — the
existing `DiceAmount` / `DiceExprDelta` types are sufficient for the value representation.
Only the `bonus_damage` container and the `"strength_attack_or_unarmed"` condition
discriminant are new.

---

### W4 — New effect atom: `advantage_on_ability`

```typescript
export type AdvantageOnAbilityEffect = {
  readonly kind: "advantage_on_ability";
  readonly ability: Ability;     // "str"
  readonly on: ReadonlyArray<"ability_check" | "saving_throw">;
};
```

Sourced from: *"You have Advantage on Strength checks and Strength saving throws."*

Note: `RollKind` currently only has `"attack_roll" | "saving_throw"`. Ability checks
require either widening `RollKind` with `"ability_check"` or introducing a separate
discriminated union for ability-check-rolls. Widening `RollKind` is simpler.

---

### W5 — New effect atom: `disable_actions`

```typescript
export type DisableActionsEffect = {
  readonly kind: "disable_actions";
  readonly disables: ReadonlyArray<"maintain_concentration" | "cast_spell">;
};
```

Sourced from: *"You can't maintain Concentration, and you can't cast spells."*

This is a constraint on what the Raging creature may do, not a restriction on action
*kinds* (Standard Action kinds). `"maintain_concentration"` and `"cast_spell"` are
new capability discriminants.

---

### W6 — New type: `EarlyTerminationCondition`

```typescript
export type EarlyTerminationCondition =
  | { readonly kind: "equips_heavy_armor" }
  | { readonly kind: "gains_condition"; readonly condition: Condition };
```

Sourced from: *"it ends early if you don Heavy armor or have the Incapacitated condition"*

`Condition` currently only has `"prone"` (from mastery surface). Widen with
`"incapacitated"` (and others as pressure cases land).

---

### W7 — New type: `TurnRenewal`

```typescript
export type TurnRenewalTrigger =
  | { readonly kind: "make_attack_roll_against_enemy" }
  | { readonly kind: "force_enemy_saving_throw" }
  | { readonly kind: "take_bonus_action" };

export type TurnRenewal = {
  readonly triggers: ReadonlyArray<TurnRenewalTrigger>;
  readonly expiresAtEndOf: "current_turn" | "next_turn";
};
```

Sourced from: *"you can extend the Rage for another round by doing one of the following:
Make an attack roll against an enemy. Force an enemy to make a saving throw. Take a
Bonus Action to extend your Rage. Each time the Rage is extended, it lasts until the
end of your next turn."*

This is a novel lifecycle pattern — a `timed` duration that auto-extends each turn
the activating creature satisfies any trigger. No current `Duration` variant supports
this.

---

### W8 — New `UseCountCap` variant: `unlimited`

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | { readonly kind: "unlimited" };   // new
```

Sourced from: Level 17 Barbarian Features table shows "Unlimited" in the Rages column.

The `threshold_tiers` cap can express levels 1–16 (2→3→4→5→6 uses), but cannot
express the level-17 transition to unlimited. An `unlimited` variant is required.

---

## What fits without widening

These parts of Rage's mechanics mapped cleanly to existing surface atoms:

| Mechanic | Existing type | Notes |
|----------|--------------|-------|
| Activation cost: Bonus Action | `ClassFeatureActivationCost.bonus_action` | ✓ |
| Use count with class-level tiers | `UseCountCap.threshold_tiers` (axis=class) | ✓ for L1–L16 |
| Reset: 1 use/Short Rest, all/Long Rest | `RestResetCadence.partial_short_full_long` | ✓ |
| Resource + rest windows | `use_count`, `rest_window` atoms | ✓ |
| Damage type enum (BPS) | `DamageType` | ✓ |
| Class level scaling axis | `LevelAxis.class` | ✓ |
| Flat-bonus scaling via `DiceExprDelta.flat` | `DiceExprDelta` | ✓ |

---

## Summary

Rage requires 1 new `ClassFeatureMechanics` family (W1), 4 new effect atoms (W2–W5),
2 new structural types (W6–W7), and 1 new `UseCountCap` variant (W8). The resource
management layer (activation cost, use count, rest resets) fits the existing surface
without modification.
