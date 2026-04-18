## Cubic Gate

Outcome: `surface_widening`

`Cubic Gate` fits the existing `magic_item` + `activation` family for most of its shell:

- `activationCost = { kind = "action" }` for the Magic action
- `resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 3 } }`
- `resetCadence = { kind = "dawn", regain = Some 1d3 }`
- spell choice between `gate` and `plane_shift`

The blocker is narrower and local to `grant_spell_access`.

## Missing surface shape

The surface can currently restrict granted casts by:

- `dcOverride`
- `targetRestriction = { kind = "self_only" }`

It cannot restrict a spell's destination / plane-selection parameter.

`Cubic Gate` does not grant unconstrained `Gate` or `Plane Shift`. Each cast is bound to the plane keyed to the pressed face of the cube. That is a deterministic mechanical restriction, not DM agenda.

If encoded today as plain `grant_spell_access` for `gate` and `plane_shift`, the trace would falsely imply that the wielder can choose any legal destination those spells normally allow.

## Proposed widening

Add a new optional variant on `grant_spell_access`, e.g.:

`destinationRestriction`

Possible shape:

```ts
type GrantedSpellDestinationRestriction =
  | { kind: "keyed_plane_choice"; source: "item_face" }
```

or a slightly more general spell-parameter restriction field if the surface wants to avoid a destination-only special case.

## Evidence

> Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side.

> Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side.
