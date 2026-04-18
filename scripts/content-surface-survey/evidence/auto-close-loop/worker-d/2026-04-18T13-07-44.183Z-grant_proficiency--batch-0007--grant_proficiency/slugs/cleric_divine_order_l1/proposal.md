`Divine Order` does not fit the current authored surface honestly.

Why it does not fit:

1. The feature is a mandatory level-up choice between two mechanically different passive branches:
   - `Protector` grants fixed proficiencies.
   - `Thaumaturge` grants a cantrip pick plus a skill-check bonus.

   `ClassFeatureMechanics` currently supports `passive`, `activation`, and `composite`, but none of those can express "choose one permanent branch at acquisition time". The existing `choose` procedure only exists inside activation flows, not as a build-time/passive feature selector.

2. `Thaumaturge` says "You know one extra cantrip from the Cleric spell list."
   - `grant_spell_access` can name a specific `spellId`, but it cannot express an acquisition-time pick from a class spell list constrained to cantrips.

3. `Thaumaturge` says "The bonus equals your Wisdom modifier (minimum of +1)" on Intelligence (Arcana or Religion) checks.
   - `modify_roll_numeric` already has `delta.kind = "ability_modifier"` and `skillFilter`, so most of this shape exists.
   - The missing part is the floor: `minimum of +1`. Current `DiceDelta.ability_modifier` cannot express a bounded/floored modifier.

Suggested narrow widenings:

- New `ClassFeatureMechanics`/`PassiveMechanics` acquisition-time choice variant, or equivalent top-level passive branching shape, so one feature can permanently choose one of several passive payloads.
- New `grant_spell_access` variant for "choose N spells/cantrips from class spell list", including list identity and level constraint.
- New bounded `DiceDelta` variant or extension for ability-modifier-derived bonuses with a minimum floor.

This is `surface_widening`, not `structural_widening`, because:

- `class_feature` is the correct top-level kind.
- The feature is still fundamentally passive.
- The missing pieces are specific surface variants, not a brand-new family outside the existing model.
