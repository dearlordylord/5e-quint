`Brazier of Commanding Fire Elementals` mostly fits the existing `magic_item` + `spawned_creature` family, but it is not a clean encoding.

Missing surface shapes:

- `EquipmentPredicate.within_feet_of_item`
  Justification: the activation is gated by proximity to a placed item, not by holding, wearing, or wielding it.
  Evidence: "While you are within 5 feet of this brazier, you can take a Magic action..."

- Item-rooted spawn placement for `MagicItemSpawnedCreatureMechanics`
  Justification: the summon appears relative to the brazier, not relative to the user/caster. The current surface only gives spawned creatures a coarse `range` from the activator.
  Evidence: "The elemental appears in an unoccupied space as close to the brazier as possible..."

Secondary pressure noted but not required to fit the family:

- Catalog-ref summoned creatures cannot currently express a rider like "understands your languages".
- `CreatureControl` requires `commandRangeFeet` and `defaultBehavior` even when the item text does not specify either. This forced conservative placeholders in the authored encoding.
