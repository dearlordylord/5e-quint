## Ring of Warmth

Outcome: `atom_widening`

`Ring of Warmth` fits the existing `magic_item` + `passive` family structurally, but it does not fit honestly as a complete unit in the current surface.

### What fits

- Unit kind: `magic_item`
- Mechanics family: `passive`
- Rarity / attunement / destruction all fit existing fields
- The first clause is already representable with existing surface atoms:
  - equipment gate: `condition = { kind = "wearing_item" }`
  - effect atom: `reduce_damage_taken`
  - narrowed to `damageType = "cold"`
  - amount = `2d8`

RAW:

> If you take Cold damage while wearing this ring, the ring reduces the damage you take by 2d8.

### What does not fit

The second clause is not representable with any existing effect atom:

> while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower

This is not:

- `grant_resistance` or `reduce_damage_taken`, because the rule is about environmental temperature exposure rather than a damage instance;
- `grant_damage_immunity`, because the text does not say cold damage immunity and should not be widened into one;
- DM-only narrative text, because the threshold is explicit and the immunity is mechanical.

Encoding only the first clause would produce a partial record that silently drops a deterministic rule. That would be misleading, so I did not author `content/magic_item_ring_of_warmth.dhall`.

### Required widening

Proposed new atom: `grant_environmental_temperature_immunity`

Minimum pressure from this item:

- scope to an environmental temperature threshold
- specify the protected subject set:
  - wearer
  - worn items
  - carried items

Sketch:

```ts
{
  kind: "grant_environmental_temperature_immunity";
  minimumFahrenheit?: number;
  maximumFahrenheit?: number;
  protects: readonly ["self", "worn_items", "carried_items"];
}
```

For this item, the authored payload would be equivalent to:

```ts
{
  kind: "grant_environmental_temperature_immunity";
  maximumFahrenheit: 0;
  protects: ["self", "worn_items", "carried_items"];
}
```

### Classification

- `atom_widening`

Why not `surface_widening`:

- The gap is not a missing parameter on an existing atom.
- The missing concept is a new effect class: bounded immunity to harmful environmental temperature conditions.
