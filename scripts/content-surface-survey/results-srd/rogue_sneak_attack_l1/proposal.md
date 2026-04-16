# Widening Proposal: Sneak Attack (rogue L1)

**Outcome:** `structural_widening`  
**Slug:** `rogue_sneak_attack_l1`  
**SRD section:** Classes/Rogue#Level 1: Sneak Attack

---

## Why it doesn't fit

Sneak Attack is a passive on-hit damage rider on weapon attack rolls. It fires once per turn when the rogue hits with an attack roll under specific conditions. It is not an activated feature — there is no action, bonus action, or declared use. It requires no activation cost and has no resource pool in the `activation` sense.

The only `ClassFeatureMechanics` family currently defined is `activation`, whose effects are `grant_extra_action` and `heal_hp`. None of that maps to Sneak Attack. Coercing it into `activation` would produce a false trace (e.g., `grant_extra_action` for a damage rider) — explicitly forbidden by the guardrails.

---

## Required widenings (in priority order)

### 1. New `ClassFeatureMechanics` family: `on_hit_trigger`

Analogous to `MasteryMechanics.OnHitTriggerMechanics`, but attached to a `ClassFeatureRecord`. Minimum shape:

```typescript
export type ClassFeatureOnHitTriggerMechanics = {
  readonly family: "on_hit_trigger";
  readonly trigger: ClassFeatureTrigger;       // new type — see #5
  readonly precondition?: OnHitPrecondition;   // new type — see #4
  readonly optional: boolean;
  readonly effect: ClassFeatureOnHitEffect;    // new variant — see #2
  readonly usageLimit?: MasteryUsageLimit;     // already exists; reusable
};
```

**Evidence:** "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll"

---

### 2. New `ClassFeatureEffect` variant: `damage_on_hit`

```typescript
export type DamageOnHitClassFeatureEffect = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType | "weapon_damage_type";  // requires #3
  readonly amount: DiceAmount;
};
```

The existing `DiceAmount.threshold_tiers` with `axis: "class"` is already sufficient to represent the 1d6 (L1) → 10d6 (L19) progression. Only the effect kind and damage type reference are missing.

**Evidence:** "deal an extra 1d6 damage ... increases as you gain Rogue levels, as shown in the Sneak Attack column"

---

### 3. Variable `DamageType`: `"weapon_damage_type"`

`DamageType` is a closed 13-value enum. Sneak Attack's damage type is not a fixed value — it inherits from whatever weapon was used. Options:

- Extend `DamageType` with a sentinel `"weapon_damage_type"` variant, OR
- Add a tagged union wrapper: `DamageTypeRef = { kind: "fixed"; type: DamageType } | { kind: "weapon" }`.

**Evidence:** "The extra damage's type is the same as the weapon's type."

---

### 4. Disjunctive `OnHitPrecondition` grammar

Sneak Attack's firing condition is:

```
(Advantage on the roll)
  OR
(ally within 5 ft of target AND ally not Incapacitated AND no Disadvantage on roll)
```

No existing trigger or attachment type models conditional preconditions on attack-roll riders. The mastery `MasteryTrigger` vocabulary (`weapon_hit` / `weapon_hit_melee_only`) is unconditional.

Proposed new type:

```typescript
export type OnHitPrecondition =
  | { readonly kind: "advantage_on_roll" }
  | { readonly kind: "ally_adjacent_to_target"; readonly allyNotCondition: "incapacitated"; readonly notDisadvantage: true }
  | { readonly kind: "any_of"; readonly conditions: ReadonlyArray<OnHitPrecondition> };
```

**Evidence:** "if you have Advantage on the roll ... You don't need Advantage on the attack roll if at least one of your allies is within 5 feet of the target, the ally doesn't have the Incapacitated condition, and you don't have Disadvantage on the attack roll."

---

### 5. Weapon-property filter in trigger

Sneak Attack only fires when the attack uses a Finesse or Ranged weapon. No existing trigger type filters by weapon property.

```typescript
export type ClassFeatureTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_with_property"; readonly properties: ReadonlyArray<"finesse" | "ranged"> };
```

**Evidence:** "the attack uses a Finesse or a Ranged weapon"

---

## What already fits

- `kind: "class_feature"` — exists
- `className: "rogue"` — exists in `ClassName`
- `acquiredAtLevel: 1` — exists
- `usageLimit: { kind: "once_per_turn" }` — `MasteryUsageLimit` already has this; reusable
- Damage scaling via `DiceAmount.threshold_tiers` with `axis: "class"` — fully representable for the 1d6→10d6 schedule across rogue levels

---

## Widening classification summary

| Gap | Classification |
|---|---|
| Missing `on_hit_trigger` family for ClassFeatureMechanics | structural_widening |
| Missing `damage_on_hit` ClassFeatureEffect variant | surface_widening |
| Missing `weapon_damage_type` DamageType variant | surface_widening |
| Missing disjunctive OnHitPrecondition grammar | surface_widening |
| Missing weapon-property filter in trigger | surface_widening |

The dominant classification is **`structural_widening`** because the payload family itself is absent.
