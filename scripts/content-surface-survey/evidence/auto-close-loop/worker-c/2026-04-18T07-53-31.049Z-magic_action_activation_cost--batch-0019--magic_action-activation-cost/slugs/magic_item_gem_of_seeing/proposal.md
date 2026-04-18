# Gem of Seeing

## Verdict

`surface_widening`

## Why it stops

The unit is structurally close to an existing `magic_item` activation:

- charge pool: 3 charges
- activation cost: Magic action
- reset cadence: daily at dawn, regain `1d3`
- timed effect: 10 minutes
- effect atom: `grant_sense` with `sense = "truesight"` and `rangeFeet = 120`

That means no new top-level `UnitRecord` kind, payload family, or atom is forced.

The blocker is narrower: the current surface cannot encode the gating clause:

> "For the next 10 minutes, you have Truesight out to 120 feet **when you peer through the gem**."

## Missing surface shape

The existing gating vocabulary is too coarse:

- `PassiveMechanics.condition` / activation `condition` supports `holding_item`
- but this item does **not** grant unconditional truesight for 10 minutes merely because the user is holding the gem

Encoding it with `holding_item` would be misleading, because the RAW requires active use of the gem as a viewing medium.

## Proposed widening

Add a new predicate variant for item-mediated viewing, for example:

```ts
type EquipmentPredicate =
  | ...
  | { readonly kind: "peering_through_item" };
```

That would let an activation-shaped magic item honestly express:

- activation consumes 1 charge
- effect lasts 10 minutes
- `grant_sense(truesight, 120 ft)` applies only while `peering_through_item`

## Why this is not `atom_widening`

The mechanics already fit existing atoms:

- `grant_sense`
- `charge`
- `duration_window`
- `action_quota`
- `attunement_slot`

The missing piece is a new variant of an existing surface type, not a new v4 atom.
