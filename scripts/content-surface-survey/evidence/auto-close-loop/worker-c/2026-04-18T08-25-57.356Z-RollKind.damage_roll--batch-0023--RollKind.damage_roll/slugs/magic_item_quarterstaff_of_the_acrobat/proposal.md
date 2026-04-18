# Proposal: Quarterstaff of the Acrobat — atom_widening

`Quarterstaff of the Acrobat` fits the existing `magic_item` top-level kind, and its overall structure wants the existing `composite` family:

- a passive held-item part for the `+2` attack and damage bonuses;
- an activated part for changing forms;
- a triggered-reaction part for `Attack Deflection`.

I did not author a partial record because several core mechanics would still be false or silently omitted.

## What already fits

- `magic_item` record kind
- `composite` magic-item mechanics
- passive held-item gating via `condition: { kind: "holding_item" }`
- `modify_roll_numeric` for `+2` attack rolls with a `specific_item` weapon filter
- `modify_damage_numeric` for `+2` damage rolls with a `specific_item` weapon filter
- triggered reaction with a `reaction` activation cost, `use_count`, and `short_or_long_rest` reset for `Attack Deflection`
- `alter_item_kind` for the quarterstaff / rod / 10-foot-pole form change itself

## Why it still fails honestly

### 1. Emitted light is a missing atom

The staff can be toggled to emit or extinguish light:

> "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

The current surface has no light-production effect atom. This is not a missing family; it is missing effect vocabulary.

Recommended widening:

- Add an `emit_light` effect atom, likely carrying:
  - bright vs dim light payload
  - radius in feet
  - optional color / descriptive metadata if the project wants to preserve `"green"`
- The activation can then toggle that effect on/off.

This is `atom_widening`.

### 2. Form-conditional riders need a surface predicate over current item form

Multiple mechanics depend on the current runtime form of the same item:

> "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)."

> "Attack Deflection (Quarterstaff Form Only)."

> "Ranged Weapon (Quarterstaff Form Only)."

The surface can already encode `alter_item_kind`, but it cannot say:

- this passive applies only while the item's current form is `quarterstaff`;
- this passive applies while current form is one of `{quarterstaff, ten_foot_pole}`;
- this triggered reaction is available only in `quarterstaff` form.

`EquipmentPredicate` only knows coarse equipment state (`holding_item`, `wearing_item`, `wielding_weapon`, etc.), not runtime item-form state.

Recommended widening:

- Add a new predicate / condition variant that can inspect current item form, for example:
  - `item_form_is`
  - `item_form_in`

This is `surface_widening`, but it is secondary to the atom gap above.

### 3. Thrown-property grant plus immediate return is missing atom support

Quarterstaff form gains a weapon-property rider:

> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

The current surface has no honest place for:

- granting a weapon property to the item;
- setting that property's weapon ranges;
- applying an immediate post-attack return-to-hand effect.

`modify_range` exists in v4 taxonomy but is not surfaced here, and even that would not by itself encode "weapon gains Thrown" plus deterministic return after the attack.

Recommended widening:

- Add a new effect atom for granting a weapon property with payload, or a bounded weapon-behavior subgraph that can express:
  - `Thrown`
  - normal/long ranges
  - immediate return to wielder after ranged attack

This is also `atom_widening`.

## Classification

`atom_widening`

Why not `surface_widening` only:

- The runtime form predicate is indeed a surface gap.
- But the emitted-light toggle and the thrown-and-return weapon behavior require new mechanics concepts not present in the current effect surface or v4-derived authored vocabulary.

So the narrowest honest overall classification is `atom_widening`.
