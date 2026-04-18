`Quarterstaff of the Acrobat` does not fit the current authored surface honestly, so no `content/magic_item_quarterstaff_of_the_acrobat.dhall` was written.

Why it does not fit:

- The item is a `magic_item` and the top-level family exists: it is fundamentally a composite magic item with passive grants plus activated/reaction properties.
- The always-on `+2` attack-roll and damage-roll bonus could be encoded today with passive `modify_roll_numeric` and `modify_damage_numeric` filtered to the specific item.
- The dim-light rider is not the blocker here. This repo already treats light-emission text as caller-owned / out-of-core in other authored units.
- The blocker is the item's stateful form system and the mechanics gated by that form.

Missing surface / atom pressure:

1. Form-gated passive and activated components

The item has three mutually exclusive forms:

- `quarterstaff`
- `10-foot pole`
- `6-inch rod`

Existing `alter_item_kind` can express that an activation changes the item's form, but the surface has no way to say:

- this passive applies only in `quarterstaff` and `10-foot pole` forms; or
- this reaction ability applies only in `quarterstaff` form; or
- this weapon-profile mutation applies only in `quarterstaff` form.

That forces a new surface variant: a condition/gate over a magic-item component keyed to the item's current form, not merely `wearing_armor` / `wielding_weapon`.

Evidence:

> "In certain forms, the weapon has the following additional properties."

> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).** While holding this weapon, you have Advantage on Dexterity (Acrobatics) checks."

> "**Attack Deflection (Quarterstaff Form Only).** ..."

> "**Ranged Weapon (Quarterstaff Form Only).** ..."

2. Triggering-attack-scoped AC bonus for a non-spell reaction

The current non-spell activation surface can model a reaction trigger and can model `modify_ac`, but it cannot express that the `+5 AC` applies only against the triggering attack, then immediately ends.

This is not an atom-inventory problem; it is a missing resolution-scoped surface variant for reaction AC riders.

Evidence:

> "When you are hit by an attack while holding the weapon, you can take a Reaction to twirl the weapon around you, gaining a +5 bonus to your Armor Class against the triggering attack, potentially causing the attack to miss you."

3. Returning thrown-weapon behavior

The current surface has no honest way to express "this melee weapon gains the Thrown property with specific ranges, and immediately after a ranged attack it returns to your hand."

This goes beyond a simple numeric modifier. It pressures:

- a weapon-profile mutation / thrown-range surface shape; and
- a return-after-attack mechanic. The second part appears to require a new subgraph or effect beyond the current authored atom set.

Evidence:

> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

Classification:

- `surface_widening` for form-gated item components and triggering-attack-scoped AC timing.
- `atom_widening` for the return-to-hand after a thrown attack.

Because at least one required mechanic appears to need a new atom/subgraph, the overall unit outcome is `atom_widening`.
