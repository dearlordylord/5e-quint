# Staff of Charming

## Verdict

`structural_widening`

The item does not fit honestly as a current `MagicItemRecord` payload without omitting one of its core properties. The charge-cast property fits existing `activation` mechanics, and Reflect Enchantment is close to `triggered_reaction`, but Resist Enchantment is a separate triggered mechanic with no Reaction cost.

## What Fits

- `Cast Spell` fits existing magic-item `activation`:
  - `condition = holding_item`
  - `resource = charge_pool(cap = 10)`
  - `resetCadence = dawn(1d8 + 2)`
  - `grant_spell_access` for `charm_person`, `command`, and `comprehend_languages`
- `Reflect Enchantment` is near-fit:
  - existing `triggered_reaction` family
  - existing `reflect_triggering_spell { effectiveCaster = "reacting_creature" }`
  - existing last-charge destruction policy

## What Does Not Fit

### 1. Missing non-reaction triggered ability family

`Resist Enchantment` is not passive, not a normal activation, and not a `triggered_reaction` because the text does not spend a Reaction.

RAW:

> "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."

The current magic-item surface has no family for:

- trigger-bound item abilities that are not Reactions
- independently resettable triggered sub-properties inside a composite item

This forces `structural_widening`, not merely a missing atom.

### 2. Missing trigger variant for save outcome against a filtered spell

`Reflect Enchantment` depends on:

- a saving throw outcome (`succeed`)
- against a spell
- filtered by school (`Enchantment`)
- filtered by targeting shape (`targets only you`)

Current `ReactionTrigger` variants cannot express that combination. They only cover:

- hit by attack roll
- targeted by named spell
- creature casts spell with components

Needed surface widening:

- `ReactionTrigger.save_outcome_against_spell`
  - outcome: `success | failure`
  - school filter
  - target scope filter such as `targets_only_you`

### 3. Missing save-outcome substitution effect

`Resist Enchantment` changes a failed save into a successful one after the roll is known. Current `EffectAtom` coverage does not provide a post-roll save-outcome override.

Needed widening:

- either an effect atom equivalent to `modify_roll_substitute`
- or a resolution-level branch override for save outcome replacement

## Why I Did Not Author Partial Content

Authoring only the cast-spell half, or even cast-spell + reflect, would understate the item's mechanics and produce a misleadingly incomplete trace. The staff's enchantment-defense properties are central to the item, not optional residue.
