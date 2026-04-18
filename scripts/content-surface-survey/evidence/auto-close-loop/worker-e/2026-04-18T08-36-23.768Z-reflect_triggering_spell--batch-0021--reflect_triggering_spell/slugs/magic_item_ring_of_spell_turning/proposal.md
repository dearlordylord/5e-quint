# Ring of Spell Turning

Outcome: `surface_widening`

## Why it does not fit cleanly

The item is not a new top-level kind. It is still a `magic_item`, and its overall shape is still a composite of:

- a passive component while worn/attuned
- a triggered reaction component for the optional spell reflection

The problem is narrower: two existing surface shapes are missing required variants.

## Gap 1: spell-scoped save advantage

Current `modify_roll_advantage` can target `saving_throw`, and it can narrow by save ability, skill, or attacker creature type. It cannot narrow the rider to saves caused by spells.

Needed widening:

- add a spell/magical-source filter on `modify_roll_advantage`

Pressure text:

> While wearing this ring, you have Advantage on saving throws against spells.

This is the same surface pressure already noted on `magic_item_robe_of_the_archmagi`.

## Gap 2: automatic post-save spell negation

The ring automatically cancels a qualifying spell after a successful saving throw:

> If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you.

That is not a reaction. It is an automatic triggered consequence of a successful spell save.

Existing pieces are close but insufficient:

- `negate_triggering_spell` already exists as an effect atom
- `spell_save_outcome` already exists as a reaction trigger
- `PassiveOperation` only supports `elapsed_time` cadence, not post-save triggers

Needed widening:

- add a passive-operation trigger variant for `spell_save_outcome`
  or
- generalize passive operations to reuse the existing trigger grammar for non-resource automatic triggers

Without that widening, any authored JSON would either omit a core mechanic or falsely model the automatic negation as costing a reaction.

## What already fits

The optional reflection rider is already representable once the passive half exists:

- `MagicItemMechanics.family = "composite"`
- passive part for the always-on benefits
- `TriggeredReactionAbilityMechanics` for:
  - trigger: successful spell save
  - predicates: spell level 7 or lower, targeted only self, no area
  - effect: `reflect_triggering_spell`

Pressure text:

> If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC.

## Classification rationale

This is `surface_widening`, not `structural_widening`:

- the unit still fits the existing `magic_item` kind
- the overall composition still fits the existing composite magic-item family
- the missing pieces are variants on existing surface types, not a new top-level family or a new v4 atom
