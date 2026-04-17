# Sending Stones

## Verdict

`Sending Stones` fits the existing `magic_item` kind and broadly fits the `activation` family, but it does **not** fit the current surface honestly enough to author a real content file.

The missing pieces are all surface-shape gaps around `grant_spell_access`, not a missing top-level family.

## Why It Does Not Fit Cleanly

The current item/spell-access surface can express:

- a magic item that lets you cast a named spell;
- an activation resource with a dawn reset.

It cannot express these `Sending Stones` constraints:

1. The cast's target is not chosen normally.
The target is forced to be the bearer of the paired stone.

Evidence:

> "The target is the bearer of the other stone."

2. The cast is blocked if no valid paired bearer exists.
This is stronger than a narrative note. It changes whether the spell is cast at all.

Evidence:

> "If no creature bears the other stone, you know that fact as soon as you use the stone, and you don't cast the spell."

3. The item's magic depends on the state of the paired counterpart.
Current `ItemDestructionPolicy` only models self-destruction-on-use patterns, not "paired item destroyed => this one becomes nonmagical."

Evidence:

> "If one of the stones in a pair is destroyed, the other one becomes nonmagical."

## Narrowest Honest Classification

`surface_widening`

Reason:

- `magic_item` already exists.
- `activation` already exists.
- `grant_spell_access` already exists.
- The blocker is missing variants/fields on existing surface shapes, not a missing top-level family and not a new v4 atom requirement.

## Suggested Surface Widenings

### 1. Widen `grant_spell_access` with cast constraints

Add an optional closed field for item-imposed spell-casting constraints, for example:

- target override to a paired bearer;
- cast precondition that a paired bearer exists.

This keeps the mechanic inside the existing spell-access concept instead of inventing a separate fake activation effect.

### 2. Widen item lifecycle for paired dependencies

Add a lifecycle/destruction variant for pair-linked magic items, e.g.:

- paired item destroyed => this item becomes nonmagical.

## Why I Did Not Author a Placeholder

Encoding this as a generic once-per-dawn `grant_spell_access` for `sending` would incorrectly imply:

- the user can cast `Sending` with its normal target selection;
- the cast always occurs when activated;
- the stone remains magical regardless of the paired stone's state.

That would produce a misleading trace, so I stopped at the proposal/result files.
