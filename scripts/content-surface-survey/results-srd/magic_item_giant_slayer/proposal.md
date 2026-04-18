# Proposal: Giant Slayer — surface_widening

## Unit

**Giant Slayer** — Weapon (Any Simple or Martial), Rare  
SRD 5.2.1 magic item.

## What Fits

**Passive +1 bonus (Mechanic 1)** encodes cleanly as `CompositeMagicItemMechanics` (or directly as `PassiveMechanics`) with:

```dhall
{ kind = "passive"
, grants =
    [ { kind = "modify_roll_numeric"
      , on = [ "attack_roll" ]
      , delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }
      , weaponFilter = { kind = "specific_item", itemId = "magic_item_giant_slayer" }
      }
    , { kind = "modify_damage_numeric"
      , delta = { kind = "fixed_dice", dice = 1, dieSize = 1, sign = "+" }
      , weaponFilter = { kind = "specific_item", itemId = "magic_item_giant_slayer" }
      }
    ]
}
```

Both atoms exist in the surface and their `weaponFilter` correctly scopes to this weapon.

## What Does Not Fit (Three Surface Widenings)

### 1. `DamageTypeRef` — missing `wielded_weapon_type` variant

**RAW:** "the Giant takes an extra 2d6 damage **of the weapon's type**"

The extra damage inherits the damage type from the wielded weapon's own damage profile. `DamageTypeRef` currently supports:
- `DamageType` (literal: `"slashing"`, `"piercing"`, etc.)
- `CastTimeChoice<DamageType>` (player picks at cast time)

Neither covers "whatever the wielded weapon deals." A new variant is needed:

```typescript
| { readonly kind: "wielded_weapon_type" }
```

Resolution: at hit-resolution time, substitute the weapon's damage type for this reference.

### 2. `MasteryTrigger` / `OnHitTriggerMechanics` — missing creature type filter

**RAW:** "**When you hit a Giant** with this weapon…"

The on-hit rider fires only against creatures with creature type `"giant"`. `MasteryTrigger` has two variants:
- `{ kind: "weapon_hit" }` — any hit
- `{ kind: "weapon_hit_melee_only" }` — melee hit

Neither supports a creature type predicate. The trigger needs an optional filter:

```typescript
export type MasteryTrigger =
  | { readonly kind: "weapon_hit"; readonly typeFilter?: ReadonlyNonEmptyArray<CreatureType> }
  | { readonly kind: "weapon_hit_melee_only"; readonly typeFilter?: ReadonlyNonEmptyArray<CreatureType> };
```

Without this, any encoding would fire the on-hit rider on all targets — a dishonest trace.

### 3. On-hit effect — missing composite damage + save_gate shape

**RAW:** "the Giant takes an extra 2d6 damage … **and** must succeed on a DC 15 Strength saving throw or have the Prone condition"

The on-hit effect is two sequential outcomes:
1. A `damage` atom (2d6 of the weapon's type)
2. A `save_gate` (DC 15 Str; on fail → Prone; on success → none)

`MasteryEffect` supports three shapes:
- `ModifyRollAdvantageRider` — advantage/disadvantage rider
- `SaveGateRider` — save gate with `SaveGateRiderResult` on each branch (`apply_condition | none`)
- `GrantWeaponAttackRider` — nested weapon attack

`SaveGateRider.onFail` is `SaveGateRiderResult`, not `EffectAtom`, so it cannot carry a damage payload. There is no shape that expresses "deal damage, then open a save gate."

**Proposed fix (Option A — widen SaveGateRider):**

```typescript
export type SaveGateRider = {
  readonly kind: "save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly preGateDamage?: DiceAmount;  // damage resolved before the save
  readonly onFail: SaveGateRiderResult;
  readonly onSuccess: SaveGateRiderResult;
};
```

**Proposed fix (Option B — composite MasteryEffect):**

Allow `MasteryEffect` to be an array, or add a `composite` variant:

```typescript
| { readonly kind: "composite"; readonly effects: ReadonlyNonEmptyArray<Exclude<MasteryEffect, { kind: "composite" }>> }
```

Option A is narrower and fits the single SRD pressure case exactly; Option B is more general but may be over-engineered for the current evidence base.

## Encoding Blocked By

All three widenings are required simultaneously to encode the on-hit rider honestly. Mechanic 1 (passive +1) could be encoded standalone, but the composite unit cannot be written without Mechanic 2.

## Classification

`surface_widening` — all three missing pieces are new variants of existing surface types. No new v4 taxonomy atoms are required.
