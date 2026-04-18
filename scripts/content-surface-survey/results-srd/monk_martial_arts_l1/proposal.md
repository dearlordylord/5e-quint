# Proposal: Monk Martial Arts L1

**Outcome**: `atom_widening`  
**Unit**: `monk_martial_arts_l1` (class_feature, Monk L1, SRD 5.2.1)

## Summary

Martial Arts is a `passive` family feature — always active while the monk meets the equipment gate. The gate and all three sub-features require atoms or surface variants not present in `types.ts`. No honest encoding is possible without the additions described below.

---

## Equipment Gate

> "You gain the following benefits while you are unarmed or wielding only Monk weapons and you aren't wearing armor or wielding a Shield."

The gate is a conjunction of three conditions:

1. **Unarmed OR wielding only Monk weapons** — no existing `EquipmentPredicate` variant covers this disjunction. The `wielding_weapon` predicate selects a single weapon-kind with no "unarmed" mode and no "only" restriction.
2. **Not wearing armor** — covered by `unarmored` or `not_wearing_armor`.
3. **Not wielding a Shield** — no predicate exists. Shields are wielded off-hand; the existing `not_wearing_armor` covers armor categories only.

### Proposed surface additions

```typescript
// New variant in NonAlwaysEquipmentPredicate:
| { readonly kind: "unarmed_or_monk_weapons_only" }
// — active when the character is bare-handed OR all held melee weapons are
//   Simple Melee or Light Martial Melee. Monk-weapons definition is class-level
//   configuration; the surface just names the predicate.

| { readonly kind: "not_wielding_shield" }
// — active when the character is not holding a Shield in any hand.
```

The full gate would be expressed with `all_of`:
```
all_of([unarmed_or_monk_weapons_only, not_wielding_shield])
```
(`unarmored` or `not_wearing_armor` can be reused for the armor clause once the other two are added.)

---

## Sub-feature 1: Bonus Unarmed Strike

> "Bonus Unarmed Strike. You can make an Unarmed Strike as a Bonus Action."

This grants a recurring bonus-action attack of a specific strike type. It is **not** an extra standard action (`grant_extra_action` covers action-economy surplus, not bonus-action attack grants). There is no current atom for "while this feature is active, you may make one Unarmed Strike as a Bonus Action."

### Proposed atom

```typescript
// New effect atom:
| {
    readonly kind: "grant_bonus_action_attack";
    readonly strikeKind: "unarmed_strike";
  }
```

This is a persistent unlock that adds the Unarmed Strike to the bonus action menu, not a one-shot grant. It should be modeled as an always-available option (no use-count, no reset cadence beyond the gate itself).

---

## Sub-feature 2: Martial Arts Die

> "Martial Arts Die. You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels."

This substitutes a minimum damage die for the normal die of the attack. It is **not** an additive bonus (`modify_damage_numeric`), not a scaling of an existing die (`scale_die_size`), and not a complete stat-block replacement (`natural_weapons`, which is spell-specific). It is a die-floor replacement on specific strike/weapon types, optionally overriding whatever die the attack would normally use.

The level-scaling (d6 at L1 → d8 at L5 → d10 at L11 → d12 at L17) could reuse `scale_die_size` with `axis: "class"` once the base atom exists.

### Proposed atom

```typescript
// New effect atom:
| {
    readonly kind: "set_minimum_damage_die";
    readonly dieSize: number;                    // 6 at L1
    readonly applicableTo: "unarmed_strike_and_monk_weapons";
    // Level scaling lives on this atom via the existing DiceAmount threshold_tiers
    // or a new DiceExprDelta progression once the base atom is established.
  }
```

---

## Sub-feature 3: Dexterous Attacks

> "Dexterous Attacks. You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

This is an ability-modifier substitution on two roll contexts:
- Attack rolls and damage rolls → Dex instead of Str.
- Grapple/Shove save DC derivation → Dex instead of Str.

The v4 taxonomy includes `modify_roll_substitute` (§9 Effect Atoms) but it is **absent from `types.ts`**. Adding it to the surface would cover the attack/damage roll side. The save DC substitution is an additional shape — the save DC is not a roll kind in the current `RollKind` union, so it may require a further `DcSource` variant or a new sub-field on `modify_roll_substitute`.

### Proposed surface addition

```typescript
// Add to EffectAtom:
| {
    readonly kind: "modify_roll_substitute";
    readonly on: ReadonlyNonEmptyArray<RollKind>;
    readonly substituteAbility: Ability;
    readonly replaces: Ability;
    readonly weaponFilter?: WeaponFilter;
    // narrows to specific strike/weapon types
  }
```

For the Grapple/Shove DC case, either:
- extend the atom with a `dcContext?: "grapple_or_shove"` field, or
- add a separate `modify_dc_ability_substitute` atom if the save DC substitution proves to be a distinct pressure point.

---

## Classification

All three sub-features are blocked by missing atoms. Two EquipmentPredicate variants are also needed for the gate. This is `atom_widening` — the v4 taxonomy partially covers the feature (`modify_roll_substitute` is named but unimplemented; `scale_die_size` covers level scaling but not the base substitution), while `grant_bonus_action_attack` and `set_minimum_damage_die` are genuinely new atom pressure.
