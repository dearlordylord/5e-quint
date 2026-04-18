# Staff of Charming

Outcome: `structural_widening`

## Why it stops

`Staff of Charming` mostly matches the existing magic-item surface:

- `Cast Spell` fits a magic-item `activation` part with:
  - `condition = holding_item`
  - `resource = charge_pool(10)`
  - `resetCadence = dawn(1d8 + 2)`
  - `grant_spell_access` for `charm_person`, `command`, and `comprehend_languages`
- `Reflect Enchantment` fits a `triggered_reaction` magic-item part with:
  - trigger `spell_save_outcome(success)`
  - `spellSchool = enchantment`
  - `spellTargetsOnlySelf = true`
  - effect `reflect_triggering_spell`
  - cost `reaction`
  - resource draw from the same charge pool
- attunement restriction is already representable as a `class_list`

The blocker is `Resist Enchantment`:

> "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."

This is a triggered property, but it does **not** consume a reaction. The current non-spell triggered family is `TriggeredReactionAbilityMechanics`, which requires `activationCost.kind = "reaction"`. Encoding this as a reaction would be false.

## Missing surface shape

The surface needs a non-spell triggered-response family, or an honest widening of the current triggered family, so an item can respond to a trigger without necessarily spending a reaction.

Suggested shape direction:

- widen `TriggeredReactionAbilityMechanics` into a generic triggered ability with `activationCost` allowed to be `free` or `reaction`

or

- add a new sibling family for trigger-bound non-reaction abilities

Either way, the current family boundary is the first blocker, so the unit is classified as `structural_widening`.

## Missing mechanical atom

Even with a triggered non-reaction family, the effect itself is still missing. Existing atoms do not express:

- "negate the triggering spell" (`negate_triggering_spell`) or
- "reflect the triggering spell" (`reflect_triggering_spell`)

but `Resist Enchantment` needs:

- "rewrite the triggering save outcome from failure to success"

That likely wants a new effect atom such as `override_triggering_save_outcome`.

## Why no partial content file was authored

Dropping `Resist Enchantment` would omit a core deterministic property of the item and produce a misleading partial trace. Per protocol, I stopped before authoring `content/magic_item_staff_of_charming.dhall`.
