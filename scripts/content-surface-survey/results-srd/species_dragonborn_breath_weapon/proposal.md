# Proposal: species_dragonborn_breath_weapon

## Outcome: `structural_widening`

The unit cannot be encoded. The surface has no `SpeciesTraitRecord` type and no `"species_trait"` variant of `UnitRecord`. The v4 taxonomy lists `species_trait_root` as a first-class source atom, but `types.ts` never added the corresponding record kind.

---

## Gap 1 (Structural): Missing `SpeciesTraitRecord`

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`

No `species_trait` kind exists. Before any species trait can be encoded, this record must be added. At minimum it needs:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

And a `SpeciesTraitMechanics` discriminated union must be defined. Based on this unit, the first family needed is something like `activated_area_damage` (or an `activation` family parallel to ClassFeature's), but the exact family shape depends on what else goes into `SpeciesTraitMechanics`.

---

## Gap 2 (Surface): `cone` and `line` area shapes

`Attachment` area only supports `sphere`. Breath Weapon uses:
- 15-foot Cone
- 30-foot Line (5 feet wide)

These are the two most common SRD non-sphere AoE shapes. They appear on dozens of spells (Burning Hands, Lightning Bolt) and will recur across species traits and class features. Minimum addition to `Attachment`:

```typescript
| {
    readonly kind: "area";
    readonly shape:
      | { readonly kind: "sphere"; readonly radiusFeet: number }
      | { readonly kind: "cone"; readonly lengthFeet: number }
      | { readonly kind: "line"; readonly lengthFeet: number; readonly widthFeet: number };
    readonly origin: AreaOrigin;
  }
```

The unit requires a player choice at use time ("choose the shape each time"), which is a further `choose` procedure not yet modeled for area shape selection.

---

## Gap 3 (Surface): PB-scaled `UseCountCap`

The feature grants uses equal to the character's Proficiency Bonus (2–6 depending on level). `UseCountCap` only has:

- `{ kind: "fixed"; uses: number }` — wrong, count is not fixed
- `ThresholdTiers<number>` — could approximate (tiers at PB thresholds: L1 PB=2, L5 PB=3, L9 PB=4, L13 PB=5, L17 PB=6) but the axis is `proficiency_bonus` which already exists in `LevelAxis`. A direct cap variant would be cleaner:

```typescript
| { readonly kind: "proficiency_bonus" }
```

This pattern recurs throughout SRD 5.2.1 (several species traits, Stunning Strike, etc.).

---

## Gap 4 (Surface): Half-damage save result

The SRD's standard "half on success" save pattern appears throughout area damage spells and features. The current `Effect` union is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

There is no way to express "half of the rolled damage". A new effect variant is needed:

```typescript
| { readonly kind: "half_damage" }
```

This would be used in `onSuccess` of a `save_gate` to indicate the halving, with `onFail` carrying the full `DiceAmount`. The tracer would need to understand that `half_damage` is semantically dependent on the paired `onFail` damage.

---

## Gap 5 (Surface): Ability-specific DC for non-spell features

`DcSource` currently has:
- `caster_spell_save_dc` — references the caster's spell save DC formula
- `weapon_attack_dc` — DC 8 + attack ability mod + PB, but ability is unspecified

Breath Weapon's DC is `8 + CON modifier + PB`. This is not a spell save DC and the ability is specifically CON. The `weapon_attack_dc` label is semantically misleading. A general form is needed:

```typescript
| { readonly kind: "fixed_plus_ability_plus_pb"; readonly base: number; readonly ability: Ability }
```

This covers Breath Weapon (base=8, ability="con") and would also cleanly cover `weapon_attack_dc` if the ability field was populated.

---

## What fits without changes

- **Damage type**: any of the 10 SRD damage types (acid, cold, fire, lightning, poison) — all exist in `DamageType`
- **Damage scaling**: 1d10 → 2d10 → 3d10 → 4d10 at character levels 5/11/17 is expressible as `threshold_tiers` with `axis: "character"` and `DiceExprDelta` changing `dice` only
- **Long rest reset**: `kind: "long_rest"` exists in `RestResetCadence`
- **`proficiency_bonus` axis**: already present in `LevelAxis` — can be reused for the UseCountCap once a PB-cap variant is added

---

## Summary of required additions

| # | Kind | Name | Priority |
|---|------|------|----------|
| 1 | `new_subgraph` | `SpeciesTraitRecord` + mechanics family | Blocker |
| 2 | `new_variant` | `cone` and `line` area shapes | Required for Breath Weapon |
| 3 | `new_variant` | PB-scaled `UseCountCap` | Required for Breath Weapon |
| 4 | `new_variant` | `half_damage` `Effect` | Required for honest save result |
| 5 | `new_variant` | ability-specific DC source | Required for honest DC |
