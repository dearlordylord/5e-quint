# Proposal: Rogue Sneak Attack — surface widenings required

**Unit:** `rogue_sneak_attack` (class_feature, Rogue L1, SRD 5.2.1)
**Outcome:** `structural_widening`

---

## Unit summary

Sneak Attack is a once-per-turn on-hit damage rider with a conditional predicate. It adds Nd6 extra damage (same type as the weapon) when the Rogue hits with a Finesse or Ranged weapon and either (A) has Advantage on the attack roll, or (B) has an ally within 5 feet of the target (ally not Incapacitated) and does not have Disadvantage.

The extra damage scales by Rogue class level from 1d6 (L1) to 10d6 (L20) using a threshold-tier schedule.

---

## Gap 1 — `on_hit_trigger` not available for `class_feature` (structural)

`ClassFeatureMechanics` is defined as:

```typescript
export type ClassFeatureMechanics =
  | ClassFeatureComponentMechanics   // passive | activation
  | CompositeClassFeatureMechanics;  // composite of those two
```

The `on_hit_trigger` family (`OnHitTriggerMechanics`) exists under `MasteryMechanics` but is not included in `ClassFeatureMechanics` or `MagicItemComponentMechanics` (the latter was widened to include it, but class features were not). Sneak Attack's core mechanic is identical in shape to a mastery rider: it fires on a weapon hit, has an optional trigger condition, uses a once-per-turn usage limit, and grants an effect on the primary target. No `PassiveMechanics` or `ActivatedAbilityMechanics` encoding can honestly capture a per-hit conditional damage rider.

**Required widening:** Add `OnHitTriggerMechanics` to `ClassFeatureComponentMechanics`.

---

## Gap 2 — No "extra damage of weapon's type" effect in `MasteryEffect` (atom widening)

Even if the family were available, `MasteryEffect` does not contain a variant for adding raw Nd6 extra damage of the weapon's own type to the current hit target:

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider   // advantage/disadvantage rider
  | SaveGateRider              // save → condition
  | GrantWeaponAttackRider;    // nested attack on secondary target
```

Sneak Attack's payload is closer to a `damage` EffectAtom, but:
- It is damage added to an existing attack hit (not a standalone hit or a save-gated AoE).
- The damage type is not fixed — it equals the weapon's type, which is unknown at author time.

**Required widening:** A new `MasteryEffect` variant (or a more general on-hit-rider effect atom) expressing "add Nd6 damage of the weapon's type to the current attack's primary target". This generalizes `GrantWeaponAttackRider` in a different direction: instead of a second attack, it is extra damage on the first.

---

## Gap 3 — `DamageTypeRef` has no "weapon's damage type" variant (surface widening)

`DamageTypeRef = DamageType | CastTimeChoice<DamageType>` — it accepts a fixed type or a cast-time player choice. Neither models "the type of the weapon used for this attack", which is resolved at resolution time, not at cast/authoring time.

**Required widening:** A new `DamageTypeRef` variant `{ kind: "weapon_damage_type" }` meaning "inherit the wielded weapon's damage type at resolution time".

---

## Gap 4 — `WeaponProperty` missing `"finesse"` (surface widening)

`WeaponProperty = "thrown"`. Sneak Attack gates on "Finesse or Ranged weapon". `WeaponFilter.weapon_category = "ranged"` covers the ranged half. There is no `WeaponProperty = "finesse"` to cover Finesse weapons (rapier, shortsword, dagger, etc.).

**Required widening:** Add `"finesse"` to `WeaponProperty`.

This then allows the trigger weapon filter to be expressed as:

```
{ kind: "weapon_category", category: "ranged" }
OR
{ kind: "weapon_property", property: "finesse" }
```

The current `WeaponFilter` union is disjunctive by construction (one filter per atom), but combining two filters as OR requires either a new `any_of` combinator on `WeaponFilter` or an author-level convention that the feature is authored twice (not clean). A `WeaponFilter.any_of` variant may be needed.

---

## Gap 5 — No ally-proximity predicate or disjunctive trigger condition (surface widening / atom widening)

The secondary branch of the Sneak Attack condition — replacing Advantage with an ally check — requires:

1. A new predicate kind: "at least one ally is within 5 feet of the target and does not have the Incapacitated condition". This is a relational predicate over other creatures on the battlefield; nothing like it exists in `OngoingPredicate` (which only has `at_hp_threshold`).

2. A disjunction between two trigger predicates: `(advantage AND weapon_filter) OR (ally_predicate AND NOT disadvantage)`. The current surface has no OR-combinator for predicates.

This is the most novel gap. It requires either:
- A new named predicate variant `ally_within_feet_of_target` (with an optional condition filter for the ally's state), plus an `any_of` / disjunctive combinator on the predicate grammar; or
- A specialized Sneak Attack trigger subgraph that hardcodes the two-branch logic as a new named trigger kind.

The former is more reusable (similar checks appear on other features); the latter is simpler but narrower.

---

## What is already expressible

| Mechanic | Status |
|----------|--------|
| Once per turn (`usageLimit: once_per_turn`) | Already in `UsageLimit` |
| Class-level scaling (`DiceAmount.threshold_tiers` with `axis: "class"`) | Already expressible |
| Hit trigger (`on_hit_trigger` family, `trigger: weapon_hit`) | Exists for masteries |
| Finesse weapon property filter | Missing (`"finesse"` not in `WeaponProperty`) |
| Ranged weapon filter | Exists (`WeaponFilter.weapon_category.ranged`) |
| Advantage condition predicate | Not in surface |
| Ally-proximity predicate | Not in surface |
| Disjunctive predicate (A OR B) | Not in surface |
| "Weapon's damage type" at resolution time | Not in surface |

---

## Recommended encoding path (after widenings)

```
on_hit_trigger
  trigger: weapon_hit
  weaponFilter: any_of [
    { kind: "weapon_category", category: "ranged" },
    { kind: "weapon_property", property: "finesse" }
  ]
  predicate: any_of [
    has_advantage,
    ally_within_5ft_of_target (ally_condition: not incapacitated, attacker_condition: not disadvantage)
  ]
  optional: false
  usageLimit: once_per_turn
  effect: extra_weapon_damage {
    amount: threshold_tiers (axis: class, base: 1d6, tiers: [L3:2d6, L5:3d6, …, L19:10d6])
    damageType: weapon_damage_type
  }
```

Five widenings are required before this unit can be honestly encoded. The scaling by class level is the only part that works today.
