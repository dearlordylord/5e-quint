# Quarterstaff of the Acrobat

Outcome: `atom_widening`

I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall`.

The unit does fit the existing top-level `magic_item` kind, and its overall shape would be a `composite` magic item:

- passive held-item bonuses
- a bonus-action activation to change form
- a reaction activation with a short/long-rest use counter

The problem is that an honest encoding still needs unsupported mechanics.

## What already fits

- `modify_roll_numeric` with `weaponFilter: specific_item` for the `+2` attack-roll bonus.
- `modify_damage_numeric` with `weaponFilter: specific_item` for the `+2` damage-roll bonus.
- `modify_roll_advantage` with `skillFilter: acrobatics` for Acrobatic Assist.
- `triggered_reaction` / `modify_ac` / `use_count` / `short_or_long_rest` for Attack Deflection.
- `alter_item_kind` already exists as an effect atom.

## Why that is still not enough

### 1. Form-scoped mechanics are required

Three riders are restricted by the weapon's current form:

- `Quarterstaff and 10-Foot Pole Forms Only`
- `Quarterstaff Form Only`
- `Quarterstaff Form Only`

The current passive/activation gate surface can express:

- holding the item
- wearing the item
- wielding coarse weapon kinds
- boolean combinations of those

It cannot express:

- item is currently in named form `quarterstaff`
- item is currently in named form `10-foot pole`
- grant applies in one set of forms but not another

Without that gate, authoring Acrobatic Assist or Attack Deflection would over-apply them while the item is a `6-inch rod`.

Proposed widening:

- `EquipmentPredicate.item_form`

### 2. Form change needs an item attachment target

`alter_item_kind` exists, but activation phases cannot target the held item itself. Attachments are only:

- `self`
- `target`
- `area`
- `mark`

This item's bonus-action activation changes the weapon, not the bearer.

Proposed widening:

- `Attachment.item`

### 3. Light emission is a missing atom

The item can emit or extinguish green Dim Light out to 10 feet. The surface has no light-production atom, and v4 taxonomy also does not include one.

Proposed widening:

- new atom `emit_light`

Evidence:

> "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

### 4. Returning after a thrown attack is a missing atom

The ranged form adds a deterministic "flies back to your hand" rider after a ranged attack. That is not modeled by any current effect atom.

Proposed widening:

- new atom `return_item_after_thrown_attack`

Evidence:

> "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

## Classification rationale

This is not `structural_widening` because the existing `magic_item` + `composite` family is still the right top-level fit.

This is not only `surface_widening` because at least one required mechanic, light emission, is missing from the v4 atom inventory entirely.

So the narrowest honest classification is `atom_widening`.
