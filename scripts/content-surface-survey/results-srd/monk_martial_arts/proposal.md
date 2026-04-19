# Proposal: Monk Martial Arts surface gaps

**Unit**: `monk_martial_arts` — Monk Level 1 class feature  
**Outcome**: `atom_widening`  
**Confidence**: high

---

## Summary

Monk Martial Arts (Level 1) is a composite class feature with three sub-benefits under a shared equipment gate. All three sub-benefits expose gaps in the current atom vocabulary; none can be honestly encoded without new atoms or surface variants.

---

## Gap 1 — Missing atom: ability substitution on rolls

**Sub-benefit**: Dexterous Attacks  
**SRD text**: "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

**Why no existing atom fits**:  
- `modify_roll_numeric` with `ability_modifier` DiceDelta adds a modifier on top of the existing roll value — it cannot replace which ability governs the roll.  
- There is no atom that says "when computing this roll, use ability A in place of ability B."  
- The Grapple/Shove DC substitution is the same operation applied to an innate DC derivation, not a d20 roll modifier.

**Proposed atom**: `substitute_ability_for_rolls`  
Shape (sketch):
```typescript
{
  readonly kind: "substitute_ability_for_rolls";
  readonly useAbility: Ability;       // DEX
  readonly inPlaceOf: Ability;        // STR
  readonly on: ReadonlyNonEmptyArray<"attack_roll" | "damage_roll" | "save_dc">;
  readonly weaponFilter?: WeaponFilter; // optional: scope to unarmed/monk weapons
}
```
This atom would be attached as a passive grant, scoped by the feature's equipment predicate.

---

## Gap 2 — Missing atom: damage die replacement

**Sub-benefit**: Martial Arts Die  
**SRD text**: "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels, as shown in the Martial Arts column of the Monk Features table."

**Scaling**: d6 (L1) → d8 (L5) → d10 (L11) → d12 (L17) — threshold_tiers on class axis.

**Why no existing atom fits**:  
- `modify_damage_numeric` adds a flat or dice *delta* to the existing damage expression — it does not replace the base die.  
- `natural_weapons` (from Alter Self) replaces an unarmed strike profile but is spell-scoped and does not extend to monk weapons.  
- The v4 `scale_die_size` scaling atom exists and would correctly model the d6→d12 progression, but it needs a base atom that establishes the die replacement to attach to.

**Proposed atom**: `set_damage_die`  
Shape (sketch):
```typescript
{
  readonly kind: "set_damage_die";
  readonly amount: DiceAmount;        // base: { dice:1, dieSize:6 }, threshold_tiers for scaling
  readonly weaponFilter?: WeaponFilter; // scope to unarmed / monk weapons
}
```
The `DiceAmount.threshold_tiers` variant (axis: "class") already exists and can carry the d6→d8→d10→d12 progression. The only missing piece is the base `set_damage_die` atom that `scale_die_size` would modify.

---

## Gap 3 — Missing EquipmentPredicate variant: unarmed / monk weapon state

**Equipment gate**: "while you are unarmed or wielding only Monk weapons and you aren't wearing armor or wielding a Shield"

**What fits**:  
- `all_of([unarmored, not_wielding_shield])` expresses the armor+shield side correctly.

**What doesn't fit**:  
- `wielding_weapon` covers coarse weapon kinds (`ranged`, `melee_one_handed`, etc.) but has no `unarmed` state predicate and no `monk_weapons` named category.  
- The predicate surface has no `any_of` / OR-composition form. The weapon side of the gate is a disjunction ("unarmed OR monk weapons") that cannot be expressed with `all_of`.

**Proposed variant**: Two additions to `NonAlwaysEquipmentPredicate`:
1. `{ readonly kind: "unarmed" }` — the bearer is making no weapon attacks (no weapon in hand OR making unarmed strikes).
2. `{ readonly kind: "wielding_monk_weapons" }` — wielding only weapons from the monk's class-defined weapon set (Simple Melee + Light Martial Melee).
3. `{ readonly kind: "any_of"; readonly predicates: ReadonlyNonEmptyArray<NonAlwaysEquipmentPredicate> }` — OR composition to parallel `all_of`.

The full gate would encode as:
```
all_of([
  any_of([unarmed, wielding_monk_weapons]),
  unarmored,
  not_wielding_shield
])
```

---

## Gap 4 — Missing AttackKind variant: melee weapon attack

**Sub-benefit**: Bonus Unarmed Strike  
**SRD text**: "You can make an Unarmed Strike as a Bonus Action."

**Why no existing variant fits**:  
- `ActivationPhase.attack_roll.attackKind` accepts only `ranged_spell_attack | melee_spell_attack`.  
- An unarmed strike is a melee *weapon* attack (it uses the wielder's weapon attack bonus, not a spell attack bonus).  
- Encoding it as `melee_spell_attack` would be dishonest — it would emit a spell attack node in the trace when no spell attack is being made.

**Proposed variant**: Extend `AttackKind` in `types.ts`:
```typescript
export type AttackKind =
  | "ranged_spell_attack"
  | "melee_spell_attack"
  | "melee_weapon_attack"   // NEW — for class-feature activations that make weapon/unarmed attacks
  | "ranged_weapon_attack"; // NEW — for completeness (thrown weapons, ranged weapon attacks)
```

The Bonus Unarmed Strike would then encode as an `ActivatedAbilityMechanics` with:
- `activationCost = { kind: "bonus_action" }`
- `resource = { kind: "use_count", cap: { kind: "unlimited" } }`
- `resetCadence = { kind: "never" }`
- `condition = all_of([any_of([unarmed, wielding_monk_weapons]), unarmored, not_wielding_shield])`
- Phase: `attack_roll` with `attackKind: "melee_weapon_attack"`, `attachment: { kind: "target", selection: { mode: "one" } }`

---

## Recommended encoding structure (once gaps are filled)

The full feature would be a `CompositeClassFeatureMechanics` with parts:

1. **Passive part** — equipment-gated passive grants:
   - `set_damage_die` (Martial Arts Die, threshold_tiers class scaling)
   - `substitute_ability_for_rolls` (Dexterous Attacks, attack_roll + damage_roll + save_dc)

2. **Activation part** — bonus-action unarmed strike (Bonus Unarmed Strike):
   - `family: "activation"`, `activationCost: bonus_action`, `unlimited/never`
   - Phase: `attack_roll`, `attackKind: "melee_weapon_attack"`

Both parts share the same equipment predicate condition.

---

## Priority

Gap 1 (ability substitution) and Gap 2 (damage die replacement) are the highest priority — they represent genuinely new mechanics concepts not in v4. Gap 3 (equipment predicate OR + unarmed state) and Gap 4 (melee_weapon_attack AttackKind) are surface variants of existing shapes and are lower effort.
