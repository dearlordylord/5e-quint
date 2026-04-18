# Sovereign Glue

## Verdict

`atom_widening`

Sovereign Glue has a plausible `magic_item` + `activation` outer shape, but its payload does not fit the current authored surface honestly.

## Why It Doesn't Fit

The current surface can target objects, spend an action, and model persistence windows, but it cannot express the actual rule being applied:

- create a permanent adhesive bond between two objects;
- let that bond finish setting after 1 minute;
- restrict removal to a closed set of named breakers.

No existing effect atom covers "two objects become bonded together until a named solvent or Wish breaks the bond." Using `block_travel`, `alter_item_kind`, or any spell-access proxy would produce a false trace.

## Required Widenings

### 1. New effect atom: `bond_objects`

Needed to represent the item's core mechanic directly.

Pressure text:

> This viscous, milky-white substance can form a permanent adhesive bond between any two objects.

Likely payload pressure:

- attachment to two selected objects;
- optional set time before the bond becomes active;
- closed list of named breakers (`universal_solvent`, `oil_of_etherealness`, `wish`).

### 2. New non-spell activation range/targeting header

Activated abilities for non-spell units currently have no range field; the tracer hardcodes their context as `Self`. That is fine for self-buffs and spell-access items, but not for an item that is directly applied to object surfaces.

Pressure text:

> One ounce of the glue can cover a 1-foot square surface. Applying an ounce of Sovereign Glue takes a Utilize action...

An honest encoding needs at least touch/object application semantics for item activations.

### 3. New rolled-cap resource variant

The item's stock is not fixed at the record level.

Pressure text:

> When found, a container contains 1d6 + 1 ounces.

Current `charge_pool` / `use_count` caps are fixed or progression-based, not randomly initialized per found item instance.

## Notes

`Oil of Slipperiness` as the required storage coating is not the main blocker; it is a storage constraint, not the item's primary mechanical payload. The primary blocker is the missing persistent object-bond effect.
