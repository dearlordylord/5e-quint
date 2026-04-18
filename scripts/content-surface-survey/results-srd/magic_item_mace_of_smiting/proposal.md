# Proposal: magic_item_mace_of_smiting

## Unit

**Mace of Smiting** — Weapon (Mace), Rare  
SRD 5.2.1 magic item.

```
You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. The bonus increases to +3 when you use the weapon to attack a Construct.

When you roll a 20 on an attack roll made with this weapon, the target takes an extra 7 Bludgeoning damage, or 14 Bludgeoning damage if it's a Construct. If a Construct has 25 Hit Points or fewer after taking this damage, it is destroyed.
```

## What fits

- The unconditional base `+1` to attack rolls → `modify_roll_numeric` on `["attack_roll"]` with `weaponFilter: { kind: "specific_item", itemId: "magic_item_mace_of_smiting" }`.
- The unconditional base `+1` to damage rolls → `modify_damage_numeric` with the same `weaponFilter`.

These two atoms are representable today. Everything else is not.

## Gap 1 — targetTypeFilter on modify_roll_numeric / modify_damage_numeric (surface_widening)

The `+1 → +3` upgrade is gated on the target being a Construct. Neither `modify_roll_numeric` nor `modify_damage_numeric` carry any `targetTypeFilter` field today.

**Proposed widening**: add an optional `targetTypeFilter?: ReadonlyNonEmptyArray<CreatureType>` field to both atoms. When present, the modifier applies only on attacks against one of the listed creature types. The unconditional base bonus and the conditional upgrade can then be authored as two separate passive grants stacking to +3 vs Constructs (+1 always, +2 additionally when target is Construct).

## Gap 2 — on_crit trigger variant for OnHitTriggerMechanics (surface_widening)

The extra-damage rider fires specifically on a natural 20, not on every hit. `MasteryTrigger` only has `weapon_hit` and `weapon_hit_melee_only`. There is no crit-scoped trigger.

**Proposed widening**: add `weapon_crit` (or `weapon_hit_natural_20`) as a new `MasteryTrigger` variant:

```typescript
| { readonly kind: "weapon_crit" }
```

This variant would open an `on_crit_window` (new window atom) or reuse `on_hit_window` with a crit sub-label. The tracer would need a new window node kind or a label tag on the existing `on_hit_window`.

## Gap 3 — target-type-conditional damage amount (surface_widening)

The on-crit damage is 7 normally but 14 vs Constructs. `DiceAmount` has no branching on target creature type; `EffectAtom.damage` has no `targetTypeFilter`.

**Proposed widening**: add an optional `targetTypeFilter?: ReadonlyNonEmptyArray<CreatureType>` to the `damage` effect atom (parallel to Gap 1). Two sibling `damage` atoms can then express both the universal case and the Construct-boosted case without a new DiceAmount variant:

```json
{ "kind": "damage", "damageType": "bludgeoning", "amount": { "kind": "fixed", "expr": { "dice": 0, "dieSize": 1, "flat": 7 } } }
{ "kind": "damage", "damageType": "bludgeoning", "amount": { "kind": "fixed", "expr": { "dice": 0, "dieSize": 1, "flat": 7 } }, "targetTypeFilter": ["construct"] }
```

…where the second adds the extra 7 for a total of 14 vs Constructs. (Alternatively a single atom with a `byTargetType` DiceAmount variant, but that is heavier machinery.)

## Gap 4 — destroy_creature / instant-kill at HP threshold (atom_widening)

"If a Construct has 25 Hit Points or fewer after taking this damage, it is destroyed."

This is an instantaneous destruction gated on:
- target creature type = Construct, AND
- target's current HP (post-damage) ≤ 25

No existing `EffectAtom` models this. The closest atoms (`apply_condition: unconscious`, `damage`) are wrong: Constructs are immune to the dying/death-save rules; the SRD explicitly says the item "destroys" them rather than dealing additional damage or applying a condition.

**Proposed new atom**:

```typescript
{
  readonly kind: "destroy_creature";
  readonly condition: {
    readonly hpAtMost: number;
    readonly targetTypeFilter: ReadonlyNonEmptyArray<CreatureType>;
  };
}
```

Semantics: if, after all damage in this resolution step is applied, the target's current HP is ≤ `hpAtMost` AND the target's creature type is in `targetTypeFilter`, the target is instantly destroyed (removed from play, no death saves). This is distinct from dealing damage-to-zero because it bypasses death saves entirely.

This is a genuinely new v4 concept; `destroy_creature` does not appear in the v4 taxonomy.

## Classification

| Gap | Classification |
|---|---|
| targetTypeFilter on bonus atoms | surface_widening |
| on_crit trigger variant | surface_widening |
| target-type-conditional damage amount | surface_widening |
| destroy_creature HP-threshold atom | **atom_widening** |

Overall: **atom_widening** (the `destroy_creature` mechanic is not in v4; the three other gaps are missing variants of existing surface types).
