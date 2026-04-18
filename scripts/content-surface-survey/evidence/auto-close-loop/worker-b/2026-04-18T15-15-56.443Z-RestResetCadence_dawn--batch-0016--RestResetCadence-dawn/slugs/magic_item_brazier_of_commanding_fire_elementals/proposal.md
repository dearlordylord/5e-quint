## Brazier of Commanding Fire Elementals

Encoded as `magic_item` + `spawned_creature`, but not cleanly.

- The activation gate is a surface gap. RAW says, "While you are within 5 feet of this brazier, you can take a Magic action..." The current `EquipmentPredicate` vocabulary cannot express proximity to an item, so the authored unit had to approximate this as `holding_item`.
- Spawn placement is also underspecified by the current surface. RAW says, "The elemental appears in an unoccupied space as close to the brazier as possible." The current summon shape only records a coarse `range`, not a nearest-valid-space rule anchored on the item.

Secondary omission noted but not promoted to a widening here:

- The catalog-ref summon payload does not carry "understands your languages." That is real text, but command obedience and turn order are already modeled, so this worker treats language comprehension as residual metadata rather than the primary blocking gap.
