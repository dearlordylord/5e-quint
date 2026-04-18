# Proposal: Monk Martial Arts — Surface Widenings

**Unit**: `monk_martial_arts` — Monk Level 1 class feature  
**Outcome**: `atom_widening` (3 missing atoms + 2 missing predicate variants)

---

## Why This Unit Does Not Fit

Monk Martial Arts has four mechanical components, each gated by a compound equipment predicate. Three of the four components require atoms not present in the v4 taxonomy or the current TS surface. The condition gate itself also needs two new `EquipmentPredicate` variants.

---

## Component Analysis

### Condition Gate

> "...while you are unarmed or wielding only Monk weapons and you aren't wearing armor or wielding a Shield."

The `PassiveMechanics` family supports an `EquipmentPredicate` condition with `all_of` composition. Partially expressible:

| Clause | Coverage |
|---|---|
| not wearing armor | `not_wearing_armor { categories: ["light","medium","heavy"] }` ✓ |
| not wielding a Shield | **no predicate** — Shield is armor-adjacent equipment but is not an armor category ✗ |
| unarmed or wielding only Monk weapons | **no predicate** — `wielding_weapon` is coarse (ranged/melee_two_handed/melee_one_handed/two_weapons); cannot express "weapon from a filtered subset OR no weapon" ✗ |

**Proposed**:
- `EquipmentPredicate.not_wielding_shield` — sentinel for "bearer holds no shield in off-hand"
- `EquipmentPredicate.unarmed_or_monk_weapons_only` — gate for "bearer holds no weapon OR holds only weapons matching a specified filter (e.g., simple melee or light martial melee)"

Both are `surface_widening` (variants of the existing `EquipmentPredicate` surface type; no new v4 taxonomy atom).

---

### 1. Bonus Unarmed Strike

> "You can make an Unarmed Strike as a Bonus Action."

**Gap**: No atom grants a specific bonus-action unarmed strike.

- `grant_extra_action` grants a full additional action (not a bonus action attack), and makes no restriction to unarmed.
- `scale_attack_count` (Extra Attack pattern) widens the Attack action's attack count — it does not grant a standalone bonus action attack.
- This mechanic is a permanent bonus: "whenever you take a bonus action, you may spend it on an unarmed strike." It is passive and unconditional within the equipment gate. It is NOT a use-count resource.

**Proposed new atom** (`atom_widening`):

```
grant_bonus_action_unarmed_strike
```

Semantics: while the effect is active, the bearer may make a single Unarmed Strike as a Bonus Action on each of their turns. No resource consumed; the bonus action quota is consumed by the attack.

This differs from existing atoms in that it is:
- Bonus-action-economy (not action, not reaction)
- Attack-type-specific (unarmed only)
- Permanent passive grant (not per-use activation)

---

### 2. Martial Arts Die

> "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels, as shown in the Martial Arts column of the Monk Features table."

**Gap**: No atom models die substitution on unarmed/weapon attacks.

- `damage` atom is a concrete damage instance, not a damage profile modifier.
- `modify_damage_numeric` adds a numeric delta to damage rolls — it does not replace the die.
- `natural_weapons` (from Alter Self) replaces the unarmed strike profile with a new damage type and die, but: (a) it is spell-scoped, (b) it also mandates a damage type change (the monk keeps bludgeoning), (c) it has no level-scaling hook.
- `scale_die_size` is a scaling atom that modifies how a `DiceAmount` grows — it cannot express the initial die substitution.

The Martial Arts Die is:
1. A die-replacement (not an addend) on the attack resolution step
2. Scoped to unarmed strikes and monk weapons only
3. Level-scaled via threshold tiers (d6 / d8 / d10 / d12 at class levels 1/5/11/17)

**Proposed new atom** (`atom_widening`):

```
override_weapon_damage_die
{
  kind: "override_weapon_damage_die",
  dieSize: DiceAmount,   // threshold_tiers over class axis for monk
  weaponFilter?: WeaponFilter | "unarmed_or_monk_weapons"
}
```

This atom replaces the normal weapon/unarmed damage die with the specified die for qualifying attacks. The `scale_die_size` scaling atom already exists in the taxonomy and can drive the tier progression; the missing piece is the die-replacement effect atom itself.

---

### 3. Dexterous Attacks

> "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

**Gap**: No atom models ability modifier substitution.

- `modify_roll_numeric` adds a fixed delta or named modifier to a roll — it cannot express "use Dex instead of Str."
- The monk player already adds one ability modifier (Str) to attack/damage. This feature swaps the *base* modifier, not appending an addend.
- `innate_dc` (DcSource) lets authors specify which ability drives the DC — but only on new DcSource definitions, not as an override on existing unarmed/weapon attacks.

The Dex-for-Str swap also applies to the Grapple/Shove save DC, which is a derived DC from the SRD rules (base 8 + proficiency + Str mod by default). The feature lets the monk substitute Dex mod there too.

**Proposed new atom** (`atom_widening`):

```
substitute_ability_modifier
{
  kind: "substitute_ability_modifier",
  use: Ability,      // "dex"
  inPlaceOf: Ability, // "str"
  on: ReadonlyNonEmptyArray<"attack_roll" | "damage_roll" | "save_dc">,
  weaponFilter?: WeaponFilter | "unarmed_or_monk_weapons"
}
```

This atom permanently allows the bearer to use `use` modifier wherever `inPlaceOf` modifier would normally apply for qualifying rolls/DCs. The player still makes the choice on each roll (per RAW "can use"), but the atom defines the eligibility.

---

## Summary Table

| Component | Current coverage | Widening needed |
|---|---|---|
| Condition gate: not wearing armor | `not_wearing_armor` ✓ | — |
| Condition gate: not wielding shield | ✗ | `EquipmentPredicate.not_wielding_shield` (surface_widening) |
| Condition gate: unarmed or monk weapons | ✗ | `EquipmentPredicate.unarmed_or_monk_weapons_only` (surface_widening) |
| Bonus Unarmed Strike | ✗ | `grant_bonus_action_unarmed_strike` atom (atom_widening) |
| Martial Arts Die (d6→d12 by level) | ✗ | `override_weapon_damage_die` atom (atom_widening) |
| Dexterous Attacks (Dex-for-Str swap) | ✗ | `substitute_ability_modifier` atom (atom_widening) |

Primary classification: **`atom_widening`** (3 new atoms + 2 predicate variants; the `passive` family itself and the `class_feature` kind are present and would otherwise suffice).
