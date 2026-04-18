## Surface widening: relative granted-spell area override

`Cloak of Arachnida` mostly fits the existing `magic_item` surface as a composite of:

- a passive worn-benefits part; and
- an activated once-per-dawn `Web` cast with fixed DC 13.

The remaining gap is the `Web` rider:

> "The web created by the spell fills twice its normal area."

The current surface only supports `grant_spell_access.areaOverride` as a concrete `AreaShapeSpec`. That works for items like Wand of Fear, where the item replaces the spell's printed area with a specific shape such as a `60-foot cone`.

It does not support a relative override like "twice its normal area", which depends on the referenced spell's own authored area and scales from that base rather than replacing it with a fixed shape.

### Proposed widening

- `kind`: `new_variant`
- `name`: `grant_spell_access.areaOverride.relative_multiplier`
- `justification`: item-granted casts sometimes modify a spell's existing area proportionally rather than replacing it with a new concrete shape
- `evidence`: "The web created by the spell fills twice its normal area."

### Sketch

One honest extension would be a relative-area override on `grant_spell_access`, for example:

```ts
type GrantedSpellAreaOverride =
  | AreaShapeSpec
  | {
      readonly kind: "relative_area_multiplier";
      readonly multiplier: number;
    };
```

This keeps the provenance of the base area on the underlying spell record instead of forcing authors to restate or approximate it at each grant site.
