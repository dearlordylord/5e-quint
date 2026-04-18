# Proposal: magic_item_sun_blade

**Outcome:** `atom_widening`
**Confidence:** high

## What fits

- `modify_roll_numeric` on `attack_roll` with `specific_item` weaponFilter and `+2` fixed_dice delta — the +2 attack bonus.
- `modify_damage_numeric` with `specific_item` weaponFilter and `+2` fixed_dice delta — the +2 damage bonus.
- `emit_light` with `brightRadiusFeet: 15`, `dimAdditionalFeet: 15` — the base light emission while blade persists.

These three atoms could be expressed today inside a `PassiveMechanics` or composite `MagicItemMechanics`. However, they are gated on the blade being present (see blade-toggle gap below), which itself has no surface representation.

## Gap 1 — `set_weapon_damage_type` (new atom)

**Evidence:** "which deals Radiant damage instead of Slashing damage"

The Sun Blade's longsword form deals Radiant damage in place of its normal Slashing damage. This is not:
- A bonus damage roll (`modify_damage_numeric` adds a delta, does not change the base type).
- A resistance (`grant_resistance` applies to the recipient, not the dealer).
- A one-shot `damage` atom (that is an activation-phase effect, not a persistent weapon property).

The missing concept is a persistent property on the weapon that overrides the weapon's base damage type for all attacks made with it. Proposed surface field on `PassiveMechanics` or as a new `EffectAtom`:

```typescript
| {
    readonly kind: "set_weapon_damage_type";
    readonly damageType: DamageType;
    readonly weaponFilter?: WeaponFilter;
  }
```

SRD generalisation: any magic weapon that changes its base damage type (e.g., a force-damage blade) would use this same atom.

## Gap 2 — Typed on-hit damage with creature-type filter

**Evidence:** "When you hit an Undead with it, that target takes an extra 1d8 Radiant damage."

`OnHitTriggerMechanics.effect` is typed as `MasteryEffect`:

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider;
```

None of these allows emitting a typed damage instance with an optional creature-type filter. The required extension is:

```typescript
| {
    readonly kind: "damage";
    readonly damageType: DamageTypeRef;
    readonly amount: DiceAmount;
    readonly creatureTypeFilter?: ReadonlyNonEmptyArray<CreatureType>;
  }
```

Adding a `damage` variant to `MasteryEffect` (renamed `OnHitEffect` for clarity) would cover this case and generalise to other weapon-bonus-vs-creature-type patterns (holy avenger, bane weapons, etc.).

## Gap 3 — Blade toggle (bidirectional item-form switch)

**Evidence:** "you can take a Bonus Action to cause a blade of pure radiance to spring into existence or make the blade disappear"

The blade toggle is a Bonus Action that alternates between two states: hilt-only (no weapon, no light) and blade-active (weapon, light, +2 bonuses, Undead rider). All other mechanics on this item are gated on the blade being present.

`alter_item_kind` is the closest existing atom but is unidirectional — it names a single destination form (`newKind: string`) and has no toggle or return semantics. `ActivatedAbilityMechanics` also has no symmetric toggle concept.

Proposed surface widening: extend `alter_item_kind` or add a new `toggle_item_form` activation variant with two named states (e.g., `"hilt"` | `"blade"`), where activating while in state A transitions to state B and vice versa.

## Gap 4 — `emit_light` radius adjustment

**Evidence:** "you can take a Magic action to expand or reduce its radius of Bright Light and Dim Light by 5 feet each, to a maximum of 30 feet each or a minimum of 10 feet each"

`emit_light` has fixed `brightRadiusFeet` and `dimAdditionalFeet`. There is no concept of a mutable emission radius. `reposition_attachment` moves the attachment origin but does not alter any emission parameters.

Proposed surface widening: a new `OngoingOperation` (or `ActivatedAbilityMechanics`) effect atom:

```typescript
| {
    readonly kind: "adjust_emit_light_radius";
    readonly deltaFeet: number;           // +5 or -5
    readonly brightMin: number;
    readonly brightMax: number;
    readonly dimMin?: number;
    readonly dimMax?: number;
  }
```

## Gap 5 — Finesse weapon property

**Evidence:** "this magic weapon functions as a Longsword with the Finesse property"

The Finesse property (use STR or DEX for attack/damage rolls) is a weapon-rule property, not expressible as any existing `EffectAtom`. There is no `grant_weapon_property` atom. This is a narrow but clean widening:

```typescript
| {
    readonly kind: "grant_weapon_property";
    readonly property: "finesse" | "thrown" | "versatile" | ...;
    readonly weaponFilter?: WeaponFilter;
  }
```

## Encoding path once widenings land

With the above atoms in place, the unit would encode as a `CompositeMagicItemMechanics` with:

1. **Activation part** (Bonus Action blade toggle): `ActivatedAbilityMechanics` with `toggle_item_form`.
2. **Passive part** (while blade active): `PassiveMechanics` gated on blade form being active, containing:
   - `set_weapon_damage_type` (radiant)
   - `grant_weapon_property` (finesse)
   - `modify_roll_numeric` (+2 attack)
   - `modify_damage_numeric` (+2 damage)
   - `emit_light` (bright 15 ft, dim 15 ft)
3. **On-hit trigger** (Undead extra damage): `OnHitTriggerMechanics` with a `damage` effect (1d8 radiant, creatureTypeFilter: ["undead"]).
4. **Ongoing activation** (Magic action resize): `ActivatedAbilityMechanics` with `adjust_emit_light_radius`.

The blade-active gate on the passive bundle (gap 3) requires the item-form-state concept to be resolved first, since all other effects are conditional on the blade existing.
