# Proposal: Monk Martial Arts — Surface Gaps

**Unit**: Monk Martial Arts (Level 1 Class Feature)  
**Outcome**: `atom_widening`  
**Confidence**: High

## Summary

All three core mechanics of Martial Arts require atoms that do not exist in the v4 taxonomy or the current TS surface. The equipment gate requires two additional surface widenings. No honest encoding is possible without fabricating atom kinds that would throw in the tracer's exhaustive switch.

---

## Gap 1: `grant_bonus_action_attack` (atom_widening)

**Rule**: "You can make an Unarmed Strike as a Bonus Action."

The closest existing atom is `grant_extra_action` (grants an additional Action subject to an `ActionRestriction`), but this grants a *full Action*, not a Bonus Action attack. The Bonus Unarmed Strike is:

- Always available while the equipment gate holds (no use-count resource, no reset cadence)
- Scoped specifically to Unarmed Strike
- Uses the bonus action economy, not the action economy

There is no atom for "grant the ability to make a specific attack type as a Bonus Action." A new atom `grant_bonus_action_attack` is needed, carrying a weapon-kind or attack-type discriminant (e.g., `weaponKind: "unarmed_strike"`).

**Proposed shape**:
```typescript
| {
    readonly kind: "grant_bonus_action_attack";
    readonly attackKind: "unarmed_strike" | "monk_weapon";
  }
```

---

## Gap 2: `substitute_damage_die` (atom_widening)

**Rule**: "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons."

The die scales by class level: d6 (L1–4) → d8 (L5–10) → d10 (L11–16) → d12 (L17+).

`modify_damage_numeric` is additive — it adds a signed delta to damage rolls. The Martial Arts Die is a *substitution*: the player rolls the Martial Arts die *instead of* the weapon's normal damage die. This is fundamentally different from an additive bonus.

`scale_die_size` exists in the v4 taxonomy and would describe the progression, but there is no delivery atom for the substitution itself. A new atom is needed to express "when making an attack with a qualifying weapon, you may substitute this die for the weapon's damage die."

**Proposed shape**:
```typescript
| {
    readonly kind: "substitute_damage_die";
    readonly amount: DiceAmount;  // threshold_tiers with axis="class" for the d6→d12 progression
    readonly weaponFilter?: WeaponFilter | "unarmed_or_monk_weapon";
    readonly optional: boolean;   // true — "you can roll 1d6 in place of…"
  }
```

The scaling would encode as:
```typescript
amount: {
  kind: "threshold_tiers",
  axis: "class",
  base: { dice: 1, dieSize: 6 },
  tiers: [
    { atLevel: 5,  override: { dieSize: 8 } },
    { atLevel: 11, override: { dieSize: 10 } },
    { atLevel: 17, override: { dieSize: 12 } }
  ]
}
```

---

## Gap 3: `substitute_attack_ability` (atom_widening)

**Rule**: "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons."

The surface has `modify_roll_numeric` (additive delta) and `modify_roll_advantage` (advantage/disadvantage). Neither covers ability substitution — replacing the ability whose modifier is used in a roll. This is a qualitatively different operation: the modifier's sign and magnitude come from a different ability entirely.

**Proposed shape**:
```typescript
| {
    readonly kind: "substitute_attack_ability";
    readonly substituteAbility: Ability;  // "dex"
    readonly forAbility: Ability;         // "str"
    readonly on: ReadonlyNonEmptyArray<"attack_roll" | "damage_roll">;
    readonly weaponFilter?: WeaponFilter | "unarmed_or_monk_weapon";
  }
```

---

## Gap 4: `substitute_maneuver_dc_ability` (atom_widening)

**Rule**: "When you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

Grapple and Shove are special options within the Unarmed Strike, each establishing a save DC for the target. This is a DC ability substitution scoped to specific combat maneuvers. No existing DC-related atom covers this: `DcSource` is a spell/ability DC shape, not a per-maneuver ability substitution for the attacker's DC calculation.

**Proposed shape**:
```typescript
| {
    readonly kind: "substitute_maneuver_dc_ability";
    readonly substituteAbility: Ability;  // "dex"
    readonly forAbility: Ability;         // "str"
    readonly maneuvers: ReadonlyNonEmptyArray<"grapple" | "shove">;
  }
```

Alternatively, this could be folded into `substitute_attack_ability` with an extended `on` field that includes `"maneuver_dc"`.

---

## Gap 5: Equipment predicate — unarmed or Monk weapons (surface_widening)

**Rule**: "while you are unarmed or wielding only Monk weapons"

The `wielding_weapon` predicate covers `ranged | melee_two_handed | melee_one_handed | two_weapons`. None of these cover "unarmed state" or "wielding only class-specific weapons." The disjunction ("unarmed OR Monk weapons") also cannot be composed from existing predicates since `all_of` is conjunctive.

A new predicate variant is needed:

```typescript
| { readonly kind: "unarmed_or_wielding_monk_weapons" }
```

Or alternatively, a general `any_of` disjunctive predicate (mirroring `all_of`) plus an `unarmed` predicate variant.

---

## Gap 6: Equipment predicate — not wielding Shield (surface_widening)

**Rule**: "you aren't wearing armor or wielding a Shield"

`not_wearing_armor` accepts `categories: ReadonlyArray<"light" | "medium" | "heavy">`. Shield is an `ArmorTrainingCategory` but is absent from the category list. Adding `"shield"` to the categories array of `not_wearing_armor` would resolve this:

```typescript
// Current:
readonly categories: ReadonlyArray<"light" | "medium" | "heavy">

// Proposed:
readonly categories: ReadonlyArray<"light" | "medium" | "heavy" | "shield">
```

---

## Encoding Sketch (pending widening)

Once the above atoms/variants land, Martial Arts would encode as a `class_feature` with `family: "composite"` containing:

1. A `passive` part with `condition: { kind: "unarmed_or_wielding_monk_weapons" }` AND `{ kind: "not_wearing_armor", categories: ["light", "medium", "heavy", "shield"] }` (via `all_of`) carrying grants:
   - `grant_bonus_action_attack` (Bonus Unarmed Strike)
   - `substitute_damage_die` with threshold_tiers for the Martial Arts Die scaling
   - `substitute_attack_ability` (Dex for Str on attack/damage)
   - `substitute_maneuver_dc_ability` (Dex for Str on Grapple/Shove DC)
