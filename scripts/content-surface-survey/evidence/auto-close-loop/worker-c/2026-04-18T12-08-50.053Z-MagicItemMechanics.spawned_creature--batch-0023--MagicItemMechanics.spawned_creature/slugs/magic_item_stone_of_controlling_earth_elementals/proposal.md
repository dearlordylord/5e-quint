## Stone of Controlling Earth Elementals

Outcome: `surface_widening`

The unit fits the existing `magic_item` + `spawned_creature` family honestly. The summoned creature, timing, dismissal, initiative behavior, and dawn reset all round-trip through the current surface and tracer.

The remaining gap is the activation gate:

- Missing surface shape: a non-spell activation predicate for item state like "touching this item to the ground".
- Why it matters: the current gate vocabulary can express worn / held / wielded state, but not grounded contact. Omitting the gate overpermits activation; encoding it as `holding_item` would be false, because the RAW requires contact with the ground, not merely possession.

Evidence from the unit text:

> "While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental."

Suggested widening:

- Add a new activation-side predicate variant for item-environment contact, e.g. `condition = { kind = "touching_item_to_surface", surface = "ground" }` or an equivalent bounded item-state predicate.
