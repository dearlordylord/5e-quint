# Proposal: Monk Martial Arts L1 — atom_widening

## Unit

**Monk Martial Arts (Level 1)** — `class_feature`, `monk`, `srd-5.2.1`

## Summary

All three sub-features require new atoms not present in the v4 taxonomy. No coercion into existing shapes is honest. No `.dhall` or `.json` authored.

---

## Sub-feature 1: Bonus Unarmed Strike

> "You can make an Unarmed Strike as a Bonus Action."

**Gap:** No atom expresses "grant the ability to make a specific attack type (Unarmed Strike) as a Bonus Action."

- `grant_extra_action` grants an extra full Action (not a Bonus Action slot for a specific attack).
- Nothing in `EffectAtom` or `PassiveMechanics` covers the bonus-action economy scoped to one attack type.

**Proposed atom:**

```ts
{
  readonly kind: "grant_bonus_action_attack";
  readonly attackType: "unarmed_strike" | "monk_weapon";
  // closed set — widen per unit
}
```

This is a passive grant: while the predicate holds, the creature may spend their Bonus Action on the named attack type. It maps to a new `grant_bonus_action_attack` effect atom, delivered through `PassiveMechanics.grants`.

---

## Sub-feature 2: Martial Arts Die

> "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels, as shown in the Martial Arts column of the Monk Features table."

**Gap:** No atom replaces the base damage die of a class of weapons/attacks with a scaling die.

- `natural_weapons` is the closest relative but it:
  1. applies only to Unarmed Strike, not Monk weapons
  2. uses a bare `damageDie: number`, not a `DiceAmount` (no scaling)
  3. overrides the damage **type** as well — wrong for Martial Arts Die which leaves the type unchanged

The scaling is class-level-tiered: d6 (L1–4), d8 (L5–10), d10 (L11–16), d12 (L17–20) per the Monk Features table.

**Proposed atom:**

```ts
{
  readonly kind: "replace_damage_die";
  // The new die, supporting threshold_tiers scaling over class axis
  readonly die: DiceAmount;
  // What attacks/weapons this applies to
  readonly weaponScope: "unarmed_strike" | "monk_weapon" | "unarmed_or_monk_weapon";
}
```

The die is expressed as a `DiceAmount` with `threshold_tiers` and `axis: "class"` to capture the Monk Features table progression. This maps to a `scale_die_size` scaling atom in v4.

---

## Sub-feature 3: Dexterous Attacks

> "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

**Gap:** No atom substitutes one ability modifier for another on attack, damage, or DC rolls.

- `modify_roll_numeric` adds a fixed or PB-derived delta — cannot express "use DEX instead of STR."
- The Grapple/Shove DC substitution is the same operation applied to a save DC context.

**Proposed atom:**

```ts
{
  readonly kind: "substitute_ability_for_rolls";
  // The ability to use instead of the default
  readonly use: Ability;
  // What it replaces (in 5e this is always STR → DEX for finesse/monk patterns)
  readonly replaces: Ability;
  // What kind of rolls this applies to
  readonly on: ReadonlyNonEmptyArray<"attack_roll" | "damage_roll" | "ability_check_dc">;
  // Optional scope narrowing
  readonly weaponScope?: "unarmed_or_monk_weapon";
}
```

For Grapple/Shove DC: `on: ["ability_check_dc"]` with `weaponScope: "unarmed_or_monk_weapon"`.

---

## Equipment Gate Gaps

The feature applies: *"while you are unarmed or wielding only Monk weapons and you aren't wearing armor or wielding a Shield."*

Two `EquipmentPredicate` variants are missing:

### 4a. `not_wielding_shield`

The existing `not_wearing_armor` covers the armor half. The shield half has no predicate.

```ts
| { readonly kind: "not_wielding_shield" }
```

### 4b. `unarmed_or_monk_weapons_only`

`wielding_weapon` offers coarse categories (ranged / melee_two_handed / melee_one_handed / two_weapons). "Unarmed, or holding only Simple Melee or Light Martial Melee weapons" is not expressible.

```ts
| { readonly kind: "unarmed_or_monk_weapons_only" }
```

The full predicate would compose as `all_of` over `unarmed_or_monk_weapons_only`, `not_wearing_armor { categories: ["light","medium","heavy"] }`, and `not_wielding_shield`.

---

## Overall Classification: `atom_widening`

All three sub-features require new atoms absent from v4. The equipment gate requires two new `EquipmentPredicate` variants (surface widening). Since the dominant pressure is missing atoms, the outcome is `atom_widening`.

None of the three mechanics can be coerced into an existing atom without producing a dishonest trace. No `.dhall` or content `.json` was authored for this unit.
