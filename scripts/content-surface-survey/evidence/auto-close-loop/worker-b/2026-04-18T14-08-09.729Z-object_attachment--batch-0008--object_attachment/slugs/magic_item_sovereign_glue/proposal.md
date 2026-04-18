# Sovereign Glue

`Sovereign Glue` does not fit the current authored surface honestly, so I did not create `content/magic_item_sovereign_glue.dhall`.

## Why It Stops

The unit still belongs in the existing `magic_item` + `activation` family:

- it spends from a finite consumable stock,
- application costs a `Utilize` action,
- it targets objects rather than creatures,
- and it produces a lasting mechanical state.

The blocker is the effect itself. The current surface can target objects, but it cannot express a persistent adhesive bond between two objects, nor the fact that the bond appears only after a 1-minute setting window.

## Narrowest Honest Classification

`atom_widening`

This is not `structural_widening`: the top-level kind and family already exist. The missing piece is the mechanics vocabulary inside that family.

## Proposed Widenings

### `bond_objects` effect atom

Needed for a deterministic world-state change that:

- binds two objects together,
- persists until explicitly broken,
- and records the closed break conditions called out by the item text.

Evidence:

> This viscous, milky-white substance can form a permanent adhesive bond between any two objects.

> Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell.

### `delayed_settlement` subgraph

Needed because the bond is not immediate. The current activation surface can produce immediate effects and can model durations, but it does not have an honest way to say “apply now, resolve the permanent bond after 1 minute of setting.”

Evidence:

> Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set.

## Notes

- `Attachment.object` already exists in the current surface, so object targeting is no longer the primary gap.
- I did not treat the random `1d6 + 1 ounces` found quantity as the main blocker. The core failure is the missing bond mechanic itself.
