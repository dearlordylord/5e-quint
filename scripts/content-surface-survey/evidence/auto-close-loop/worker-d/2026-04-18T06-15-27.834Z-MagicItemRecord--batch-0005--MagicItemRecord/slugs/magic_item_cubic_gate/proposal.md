## Cubic Gate

Outcome: `surface_widening`

`Cubic Gate` fits the existing `magic_item` top-level kind and the existing `activation` mechanics family:

- `activationCost`: Magic action
- `resource`: `charge_pool` with cap 3
- `resetCadence`: `dawn` regaining `1d3`

The blocker is narrower. The current surface can only express a granted spell plus limited target restrictions (`self_only`, `visible_target_within_feet`). It cannot express that casts made through the item have their planar destination constrained by the pressed face of the cube.

That matters for both spell modes:

- `Gate`: the portal opens to the plane keyed to the chosen side
- `Plane Shift`: the targets are transported to the plane keyed to the chosen side

If encoded today as ordinary `grant_spell_access` for `gate` and `plane_shift`, the trace would lie by implying normal destination selection for those spells.

### Proposed widening

Add a destination-level restriction/override on `grant_spell_access`, for example a new variant under the existing grant-specific restriction surface:

- `destinationRestriction: { kind: "keyed_plane_face" }`

or an equivalently scoped spell-parameter override attached to `grant_spell_access`.

The important constraint is that the override applies only to casts made through this item, not to the underlying spell record globally.
