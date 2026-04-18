# Cubic Gate

## Verdict

`Cubic Gate` fits the existing `magic_item` + `activation` family structurally:

- `charge_pool` with cap 3
- `dawn` partial recharge (`1d3`)
- `standard_action` / `magic`
- spell grants for `gate` and `plane_shift`

I did **not** author a Dhall/JSON unit because the current surface cannot encode the item's main restriction honestly.

## Missing surface shape

The missing piece is an item-side way to constrain a granted spell's **planar destination**.

Current `grant_spell_access` can override:

- DC
- area
- target restriction
- duration

But `Cubic Gate` needs a further override/restriction:

- when the user presses a face, the resulting `Gate` or `Plane Shift` cast must go to the **plane keyed to that face**
- the cube has a **closed per-item set of six keyed destinations**
- one face is the Material Plane; the other five are GM-chosen, but once keyed they are still deterministic item state, not generic spell freedom

Without that restriction, authoring this as:

- `grant_spell_access { spellId = "gate" ... }`
- `grant_spell_access { spellId = "plane_shift" ... }`

would incorrectly imply ordinary unrestricted casts of those spells.

## Proposed widening

Classify as `surface_widening`.

Suggested addition:

- a new `grant_spell_access` override/restriction variant for spell parameters such as planar destination

Minimal pressure-driven direction:

- add an optional grant-side field that says the cast's destination is chosen from a closed item-provided keyed set
- or a narrower planar-destination override that can bind the cast to `pressed_face_plane`

## Evidence

From the unit text:

> "Gate. Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."

> "Plane Shift. Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."
