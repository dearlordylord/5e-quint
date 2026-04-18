# Staff of Charming

## Verdict

`atom_widening`

## Why It Does Not Fit Cleanly

The item is close to an honest composite magic item:

- activation part: while holding the staff, spend 1 charge to cast `charm_person`, `command`, or `comprehend_languages` using your spell save DC
- triggered reaction part: after a successful save against an Enchantment spell that targets only you, spend your Reaction and 1 charge to reflect the spell back at its caster
- automatic passive part: once per dawn, after a failed save against an Enchantment spell that targets only you, upgrade that failed save into a success

The first two pieces already fit the current surface:

- `MagicItemMechanics.composite`
- held-item-gated charge-pool activation with `grant_spell_access`
- `triggered_reaction` with `ReactionTrigger.spell_save_outcome`
- `reflect_triggering_spell`
- `RestResetCadence.dawn`
- `ItemDestructionPolicy.last_charge_roll`

The blocker is **Resist Enchantment**:

> If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn.

That clause does not fit any existing authorable shape honestly:

- `triggered_reaction` would be false, because the rule does not spend a Reaction
- `PassiveMechanics.operations` cannot listen for spell-save outcomes; it only supports elapsed-time cadence
- there is no existing effect atom for “rewrite the triggering save result from failure to success”

So any authored content file would have to either:

- omit `Resist Enchantment`, which understates the item; or
- encode it as a reaction, which changes the rule

Both would produce a misleading trace.

## Narrowest Honest Widening

Two additions are needed:

1. A passive event trigger variant for spell-save outcomes, such as:
   `PassiveOperation.trigger = { kind: "spell_save_outcome", outcome, spellLevelAtMost?, spellSchool?, spellTargetsOnlySelf?, spellHasNoAreaOfEffect? }`

2. A new effect atom that upgrades the triggering save result, such as:
   `upgrade_triggering_save_outcome`

With those, the item could encode honestly as one composite magic item:

- activation: charge-cast `charm_person`, `command`, `comprehend_languages`
- triggered reaction: on qualifying successful Enchantment save, spend Reaction + 1 charge -> `reflect_triggering_spell`
- passive operation: on qualifying failed Enchantment save, consume the once-per-dawn use -> `upgrade_triggering_save_outcome`

## Why This Is Atom Widening

This is not only a surface-shape gap.

The passive listener is a surface widening, but the core missing mechanic is a new effect:

- `reflect_triggering_spell` already exists
- `negate_triggering_spell` already exists, but is not the same thing
- no current atom says “the triggering failed save becomes a success”

That makes the narrowest honest verdict `atom_widening`.
