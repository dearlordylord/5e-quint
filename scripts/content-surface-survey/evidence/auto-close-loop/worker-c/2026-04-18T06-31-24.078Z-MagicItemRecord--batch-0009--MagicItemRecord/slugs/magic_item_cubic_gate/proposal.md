# Cubic Gate

## Verdict

`surface_widening`

`Cubic Gate` fits the existing `magic_item` record kind and `activation` mechanics family for:

- charge pool (`3` charges)
- dawn recharge (`1d3` expended charges daily at dawn)
- action-gated activation
- spell-casting via `grant_spell_access`

I did **not** author `content/magic_item_cubic_gate.dhall` because the current surface cannot encode the item's central restriction honestly: the selected cube face determines the destination plane of the cast.

## Why The Existing Surface Is Insufficient

Current `grant_spell_access` can express:

- spell id
- charge-based cast cost
- optional fixed DC override
- optional target restriction

It cannot express:

- a spell-parameter override that binds `Gate` or `Plane Shift` to a destination plane supplied by the item
- a cast-time choice among item-keyed destinations where one side maps to the Material Plane and the others map to GM-determined planes

If I encoded this as a plain charge-cast `grant_spell_access` for `gate` and `plane_shift`, the trace would falsely imply the wielder can use each spell with its normal destination freedom. That is not what the item does.

## Proposed Widening

Add a new optional variant on `grant_spell_access`, for example:

`destinationOverride`

Possible shape:

```ts
type GrantedSpellDestinationOverride =
  | {
      readonly kind: "plane_keyed_choice";
      readonly source: "item_face";
      readonly options:
        | { readonly kind: "closed"; readonly planes: ReadonlyNonEmptyArray<ExileDestination | string> }
        | { readonly kind: "material_plus_dm_defined" };
    };
```

The exact shape can change, but the surface needs some way to say:

- this item grants access to `Gate` or `Plane Shift`
- the destination is not freely chosen
- the destination is the plane keyed to the selected face

## Evidence

- "The six sides of the cube are each keyed to a different plane of existence, one of which is the Material Plane."
- "Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."
- "Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."
