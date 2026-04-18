`Quarterstaff of the Acrobat` fits the existing top-level `magic_item` kind and would naturally want `mechanics.family = "composite"`:

- passive held-item bonuses for `+2` attack and damage with the staff;
- an activated form-change ability;
- a triggered-reaction defensive ability with a short/long-rest reset;
- additional passive properties that depend on the current form.

The current surface cannot encode the item honestly for three separate reasons.

1. Form-gated mechanics need a new condition variant.

The surface can gate passive or activated item mechanics on `holding_item`, but it cannot say "only in Quarterstaff form" or "only in Quarterstaff and 10-Foot Pole forms."

Evidence:

> "In certain forms, the weapon has the following additional properties."
>
> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).** ..."
>
> "**Attack Deflection (Quarterstaff Form Only).** ..."
>
> "**Ranged Weapon (Quarterstaff Form Only).** ..."

This is a `surface_widening` need on `EquipmentPredicate` or an equivalent item-state predicate, not a new family.

2. Light emission is missing from the effect vocabulary.

There is no existing effect atom for "emit dim light out to X feet" or "extinguish emitted light." This is not represented in the current TS surface, and it is not one of the v4 effect atoms listed in `TAXONOMY_atoms_graph.md`.

Evidence:

> "While holding this weapon, you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light ..."

This is `atom_widening`.

3. The quarterstaff-form ranged/return rider is missing from the effect vocabulary.

The surface has no honest way to express:

- adding the Thrown property to a specific weapon only in one form;
- assigning that form a normal/long range;
- "immediately after you make a ranged attack with the weapon, it flies back to your hand."

`alter_item_kind` can represent switching between "Quarterstaff", "10-foot pole", and "6-inch rod" forms, but it cannot express conditional weapon-property grants or the return-to-hand rider.

Evidence:

> "**Ranged Weapon (Quarterstaff Form Only).** This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

This is `atom_widening`.

Because the missing pieces are real mechanics, not just decorative text, omitting them would produce a misleading trace. I therefore did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall`.
