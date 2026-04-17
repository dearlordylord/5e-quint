# Sovereign Glue

`Sovereign Glue` does not fit the current authored surface honestly.

## Why It Stops

The unit is still a `magic_item`, and its overall behavior is closest to the existing `activation` family:

- spending part of a finite pool (`1d6 + 1 ounces` when found; `1 ounce` per use),
- taking an action to apply it,
- then creating a delayed permanent effect after `1 minute`.

But the current surface cannot represent the core mechanic truthfully:

1. `Attachment` has no object-targeting variant.
   The item bonds `any two objects`, not creatures, self, areas, or marks.

2. `EffectAtom` has no object-bond / adhesive-lock effect.
   The bond is not damage, condition, movement control, travel blocking, or spell access. It is a persistent relationship between two objects that remains until one of a closed set of counters breaks it.

## Narrowest Honest Classification

`atom_widening`

This is not `structural_widening` because the existing `magic_item` + `activation` shape is still the right family. The blocker is the missing mechanical vocabulary inside that family.

## Proposed Widenings

### `Attachment.object`

Needed so an activation can target objects or surfaces rather than creatures.

Evidence:

> This viscous, milky-white substance can form a permanent adhesive bond between any two objects.

### `bond_objects` effect atom

Needed for:

- joining two objects into one persistent bonded state,
- preserving that state after a setting delay,
- breaking it only via specific counters.

Evidence:

> Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell.

## Secondary Modeling Pressure

- Finite ounces are compatible with the existing consumable-item direction (`charge_pool` + `never` reset), but the initial found quantity is randomized (`1d6 + 1 ounces`) and would need caller-owned item-instance state if the repo ever wants to model stock precisely.
- The `1 minute to set` timing could likely reuse existing duration/lifecycle machinery once the underlying object-bond effect exists.
