# Censer of Controlling Air Elementals

## Verdict

`surface_widening`

The unit's top-level shape is still `magic_item` with `spawned_creature` mechanics, but the current surface cannot encode it honestly.

## Why It Does Not Fit Cleanly

The item has a deterministic summon payload:

- Magic action activation
- one use, resets at dawn
- summons a named `Air Elemental`
- shared initiative, immediately after the user
- disappears after 1 hour, on death, or on bonus-action dismissal

Those parts match the existing `MagicItemSpawnedCreatureMechanics` family.

The problem is that several required details do **not** fit the current fields without inventing rules:

- Summon placement:
  `"The elemental appears in an unoccupied space as close to the censer as possible."`
  The current family only has coarse `range` values. It cannot express a nearest-valid-space placement rule relative to the item/source.

- Command range:
  `"obeys your commands"`
  `CreatureControl` requires `commandRangeFeet`, but the item gives no distance.

- Fallback behavior:
  `CreatureControl` also requires `defaultBehavior`, but the item does not say what the elemental does if not commanded.

- Language comprehension override:
  `"understands your languages"`
  A `catalog_ref` summoned creature currently cannot carry a narrow override for language understanding.

## Narrowest Widenings

1. Add a spawned-creature placement variant for "nearest unoccupied space to the source item/caster".
2. Allow `CreatureControl.commandRangeFeet` to be omitted when the text gives no range.
3. Allow `CreatureControl.defaultBehavior` to be omitted when the text does not specify one.
4. Allow `catalog_ref` summoned creatures to carry narrow overrides such as `understandsCasterLanguages`.

## Why I Did Not Author `content/magic_item_censer_of_controlling_air_elementals.dhall`

Doing so would have required inventing at least three facts the SRD text does not provide:

- an arbitrary summon range,
- an arbitrary command range,
- an arbitrary fallback behavior.

A valid JSON file with those placeholders would typecheck, but it would not be an honest encoding of the item.
