# Adamantine Armor

## Verdict

`magic_item` + `passive` is the right family shape, but the effect does not fit the current atom surface honestly.

## Why It Doesn't Fit

RAW:

> While you're wearing it, any Critical Hit against you becomes a normal hit.

The existing surface includes `modify_crit_range`, which models effects like Improved Critical:

- lowering the d20 threshold at which your attacks become critical hits

That is not the same mechanic as Adamantine Armor:

- it does not change your crit threshold
- it does not affect attacks you make
- it changes the outcome of incoming critical hits against the wearer

Encoding Adamantine Armor as `modify_crit_range` would produce a misleading trace.

## Narrowest Honest Gap

This is `atom_widening`, not structural or surface widening:

- `MagicItemRecord` already exists
- `PassiveMechanics` already exists
- the missing piece is a new effect atom for incoming crit suppression

## Proposed Widening

Add a passive effect atom along the lines of:

`suppress_critical_hit`

Possible future refinement if more pressure appears:

- parameterize by scope or source filter
- keep the minimal form as “critical hits against attached target become normal hits”

## Why This Is Not DM Agenda

The rule is deterministic and mechanical. There is no table-owned adjudication here once a critical hit has been identified.
