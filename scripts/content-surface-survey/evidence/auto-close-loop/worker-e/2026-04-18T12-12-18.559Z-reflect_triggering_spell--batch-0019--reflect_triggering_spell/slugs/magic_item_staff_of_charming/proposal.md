# Staff of Charming

## Verdict

`Staff of Charming` does not fit the current authored surface honestly. The item is a composite magic item, but one of its three properties has no honest family:

- `Cast Spell` fits the existing charge-cast item surface.
- `Reflect Enchantment` fits the existing trigger-bound reaction surface.
- `Resist Enchantment` does **not** fit, because it is triggered by a failed saving throw but does **not** consume a Reaction.

Because that missing shape is a mechanics-family gap, the unit is classified as `structural_widening`.

## What Fits Already

### Cast Spell

This can be represented with the existing magic-item spell-access surface:

- `MagicItemRecord`
- `charge_pool` resource with cap `10`
- `dawn` recharge with `1d8 + 2`
- `last_charge_roll` destruction
- attunement restriction via `class_list`
- `grant_spell_access` for:
  - `charm_person`
  - `command`
  - `comprehend_languages`

### Reflect Enchantment

This also fits the current surface:

- trigger: `spell_save_outcome`
- constraints:
  - `outcome = "success"`
  - `spellSchool = "enchantment"`
  - `spellTargetsOnlySelf = true`
- effect: `reflect_triggering_spell`
- activation cost: `reaction`
- shared item charge pool

## Blocking Gap

### Resist Enchantment

RAW:

> If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn.

This forces two missing pieces:

1. A trigger-bound **non-reaction** item ability family.

The current trigger-bound non-spell family is `triggered_reaction`, and it requires:

- `activationCost.kind = "reaction"`

That is false for this property. The item text does not spend a Reaction. Encoding it as one would be a mechanical lie.

2. A post-save **outcome replacement** effect.

The current effect vocabulary can:

- reflect the triggering spell,
- negate the triggering spell,
- modify rolls before resolution,
- grant advantage/disadvantage,
- reroute or negate named effects.

It cannot directly say:

- "the failed triggering saving throw becomes successful."

This is not a reroll, not a numeric modifier, and not a reflection. It is an explicit replacement of the resolved save outcome.

## Proposed Widenings

### New family / variant

Add a trigger-bound non-spell ability family that is not hard-wired to Reaction economy.

Minimal requirement:

- trigger grammar reused from `ReactionTrigger`
- activation cost allowed to be `free` or omitted
- still compatible with per-use or cooldown resources

### New effect atom

Add a post-resolution effect such as `replace_triggering_save_outcome` with a bounded shape like:

- from: `failure`
- to: `success`

That would let the surface encode this property without misrepresenting it as a reroll or reaction.

## Why No Placeholder Encoding Was Authored

Any authored `content/magic_item_staff_of_charming.dhall` would have to do one of the following:

- omit `Resist Enchantment`, which makes the unit materially incomplete;
- encode it as a `triggered_reaction`, which is false to RAW;
- encode it as a passive bonus, reroll, or negation, which is also false to RAW.

That would produce a misleading trace, so no content file was authored.
