# Proposal: Sneak Attack (`rogue_sneak_attack`)

## Classification: `structural_widening`

Sneak Attack cannot be honestly encoded in the current surface. The unit is a conditional on-hit damage rider — a family that exists for masteries and magic items but not for class features.

---

## Primary gap: `on_hit_trigger` family missing from `ClassFeatureComponentMechanics`

```
ClassFeatureComponentMechanics = PassiveMechanics | ActivatedAbilityMechanics
```

Sneak Attack is neither:
- **Passive** — it does not apply continuously while the feature is in effect; it fires only on qualifying hits.
- **Activation** — there is no action-economy cost, no resource pool, no rest reset. The player does not "activate" Sneak Attack; it automatically applies when conditions are met.

The correct family is `on_hit_trigger`, which already exists in:
- `MasteryMechanics` (e.g., Topple, Sap, Cleave)
- `MagicItemComponentMechanics`

The fix is to add `OnHitTriggerMechanics` to `ClassFeatureComponentMechanics`:

```typescript
export type ClassFeatureComponentMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | OnHitTriggerMechanics;   // new
```

---

## Secondary gap: `MasteryEffect` cannot express extra damage dice

Even if the family were available, `MasteryEffect` only covers:
- `modify_roll_advantage` (Sap)
- `save_gate` (Topple)
- `grant_weapon_attack` (Cleave)

Sneak Attack's effect is extra damage dice. A new variant is needed:

```typescript
| {
    readonly kind: "bonus_damage";
    readonly amount: DiceAmount;
    readonly damageType: DamageTypeRef;
  }
```

This variant should be available in the on-hit rider effect union for both masteries and class features.

---

## Tertiary gap: "Damage type = weapon type" DamageTypeRef variant

The extra damage inherits the wielded weapon's damage type at resolution time. No existing `DamageTypeRef` variant covers this — the current options are a fixed `DamageType` or a cast-time `CastTimeChoice<DamageType>`.

Proposed new variant:

```typescript
| { readonly kind: "weapon_damage_type" }
```

This resolves to the damage type of the weapon used for the triggering attack. Used here and likely by future weapon-damage-type-inheriting features.

---

## Quaternary gap: conditional on-hit trigger predicate

`MasteryTrigger` is:
```typescript
| { readonly kind: "weapon_hit" }
| { readonly kind: "weapon_hit_melee_only" }
```

Sneak Attack has a two-branch condition:

**Branch A:** Advantage on the attack roll + weapon is Finesse or Ranged  
**Branch B:** Ally within 5 feet of target + ally not Incapacitated + no Disadvantage on the roll

Neither branch is expressible. The surface needs a trigger predicate grammar for on-hit conditions. Proposed additions:

```typescript
// New MasteryTrigger variants or a trigger predicate field:
| {
    readonly kind: "weapon_hit_with_advantage";
    readonly weaponFilter?: WeaponFilter;  // Finesse or Ranged
  }
| {
    readonly kind: "weapon_hit_ally_adjacent";
    // ally within 5ft, ally not Incapacitated, no Disadvantage
  }
```

Or more generally, a `predicate?: OnHitPredicate` field on `OnHitTriggerMechanics` with a closed grammar.

---

## What WOULD fit cleanly

The per-level scaling of the extra damage (1d6 at L1 → 10d6 at L20) fits `DiceAmount.threshold_tiers` with `axis: "class"` perfectly — no widening needed for the scaling dimension.

The `usageLimit: { kind: "once_per_turn" }` field already exists on `OnHitTriggerMechanics` — the once-per-turn cap is covered.

---

## Summary of required widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `on_hit_trigger` in `ClassFeatureComponentMechanics` | YES — no valid family |
| 2 | `new_variant` | `bonus_damage` in `MasteryEffect` | YES — effect not expressible |
| 3 | `new_variant` | `weapon_damage_type` in `DamageTypeRef` | YES — damage type not expressible |
| 4 | `new_variant` | conditional on-hit trigger predicates | YES — trigger condition not expressible |
