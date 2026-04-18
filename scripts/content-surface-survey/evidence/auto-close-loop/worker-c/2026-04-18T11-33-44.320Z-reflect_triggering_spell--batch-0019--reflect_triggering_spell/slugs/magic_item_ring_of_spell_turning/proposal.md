# Ring of Spell Turning

## Verdict

`surface_widening`

## Why It Does Not Fit Cleanly

The item is close to an honest composite magic item:

- passive part: while wearing the ring, advantage on saving throws against spells
- triggered reaction part: after a qualifying successful save against a spell that targeted only you and created no area, you can spend a reaction to reflect it back at the caster

Those two pieces already have surface support:

- `modify_roll_advantage` with `on: ["saving_throw"]` and `saveSourceFilter`
- `triggered_reaction` with `ReactionTrigger.spell_save_outcome`
- `reflect_triggering_spell`

The blocker is the automatic middle clause:

> If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you.

That negation is not optional and does not cost a reaction. The current non-spell surface has no honest place to put it:

- `triggered_reaction` would be wrong because it consumes a reaction quota
- `PassiveMechanics.operations` only supports fixed elapsed-time cadence, not event-driven triggers like successful spell saves

So any authored JSON would have to either:

- omit the no-effect rider, which understates the item; or
- encode it as a reaction, which is false

Both would produce a misleading trace.

## Narrowest Honest Widening

Add an event-driven passive-operation trigger variant, for example:

- `PassiveOperation.trigger = { kind: "spell_save_outcome", outcome, spellLevelAtMost?, spellSchool?, spellTargetsOnlySelf?, spellHasNoAreaOfEffect? }`

Then this item could encode honestly as a composite magic item:

- passive grant: advantage on saving throws against spells
- passive operation: on successful save vs spell level 7 or lower -> `negate_triggering_spell`
- triggered reaction: on successful save vs spell level 7 or lower, self-only, no-area spell -> `reflect_triggering_spell`

## Why This Is Surface, Not Atom, Widening

No new v4 atom is required:

- `negate_triggering_spell` already exists
- `reflect_triggering_spell` already exists
- `modify_roll_advantage` already exists

The missing piece is only an authorable surface shape for an automatic event-driven passive listener.
