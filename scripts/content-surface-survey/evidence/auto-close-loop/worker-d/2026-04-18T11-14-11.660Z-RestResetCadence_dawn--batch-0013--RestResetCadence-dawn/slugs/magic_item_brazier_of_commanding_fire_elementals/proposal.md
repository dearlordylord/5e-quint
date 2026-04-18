# Brazier of Commanding Fire Elementals

Outcome: `surface_widening`

The item fits the existing `magic_item` + `spawned_creature` family, but the current surface cannot express two item-specific details honestly without approximation.

## Missing surface shapes

1. Activation proximity to a placed item

- Needed shape: a new activation-side predicate for "within N feet of this item".
- Why: the current `EquipmentPredicate` vocabulary only models held / worn / wielded states.
- Evidence: "While you are within 5 feet of this brazier, you can take a Magic action..."

2. Item-rooted nearest-space spawn placement

- Needed shape: a spawned-creature placement variant for "appears in an unoccupied space as close to the item as possible".
- Why: current `MagicItemSpawnedCreatureMechanics` only carries a coarse `range` header from the activator, not a placement rule rooted on the item itself.
- Evidence: "The elemental appears in an unoccupied space as close to the brazier as possible..."

## Additional approximation carried in the authored record

- `catalog_ref` spawn payload cannot express "understands your languages".
- `CreatureControl` requires `commandRangeFeet` and `defaultBehavior`, but the item text provides neither. The authored record uses conservative placeholders: `commandRangeFeet = 0` and `defaultBehavior = "dodge_and_avoid"`.
