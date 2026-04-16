# Proposal: Widenings for Medallion of Thoughts

## Outcome: `structural_widening`

The Medallion of Thoughts cannot be encoded because `kind: "magic_item"` does not exist in `UnitRecord`. Three distinct gaps block encoding.

---

## Gap 1 — Missing `MagicItemRecord` top-level kind (structural)

`UnitRecord` is currently `SpellRecord | ClassFeatureRecord | MasteryRecord`. Magic items are a fourth source-root category (`magic_item_root` in v4 taxonomy) with no corresponding record type or mechanics family in `types.ts`.

A `MagicItemRecord` would need at minimum:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

And a mechanics family to cover charge-based spell-casting items:

```typescript
export type ChargeSpellMechanics = {
  readonly family: "charge_spell";
  readonly chargeResource: ChargeResource;     // new — see Gap 2
  readonly spellId: string;
  readonly dc: DcSource;                       // needs new variant — see Gap 3
};
```

---

## Gap 2 — Missing daily-at-dawn reset cadence (surface widening)

The medallion regains `1d4` charges **daily at dawn** — a real-time cadence independent of rests. `RestResetCadence` only covers:

- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

Required new variant:

```typescript
| {
    readonly kind: "daily_at_dawn";
    readonly refill: DiceAmount;   // 1d4 for Medallion of Thoughts
  }
```

This is distinct from rest-based cadences and from the attunement-slot reset pattern.

---

## Gap 3 — Missing item-fixed DC source (surface widening)

The medallion casts Detect Thoughts at **save DC 13**, a literal fixed value baked into the item — independent of the wearer's Intelligence modifier or proficiency bonus. `DcSource` currently supports:

- `caster_spell_save_dc` — computed from wearer's stats
- `weapon_attack_dc` — `8 + ability mod + PB`

Required new variant:

```typescript
| { readonly kind: "item_fixed_dc"; readonly value: number }
```

Evidence: *"you can expend 1 charge to cast Detect Thoughts (save DC 13) from it"*

---

## Summary

| Gap | Classification | Blocker? |
|-----|---------------|----------|
| `MagicItemRecord` kind missing from `UnitRecord` | `structural_widening` | Yes — encoding impossible |
| `RestResetCadence` lacks `daily_at_dawn` variant | `surface_widening` | Yes — charge refill unrepresentable |
| `DcSource` lacks `item_fixed_dc` variant | `surface_widening` | Yes — DC 13 unrepresentable |

All three must be resolved before a clean encoding of this (or any charge-based magic item) is possible.
