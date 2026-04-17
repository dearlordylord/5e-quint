## Verdict

`Amulet of the Planes` fits the existing `magic_item` top-level kind and the `activation` mechanics family:

- attunement-gated magic item
- Magic action activation
- `ability_check_gate` with DC 15 Intelligence (Arcana)

I did **not** author `content/magic_item_amulet_of_the_planes.dhall` because the item's core transport effect does not fit the current surface honestly.

## Why The Current Surface Fails

The blocking gap is the current `EffectAtom.teleport` payload:

- it only models `maxFeet`
- it only allows `destination: "unoccupied_visible_space"`

That is enough for `Misty Step` / `Dimension Door` style same-plane repositioning, but not for this item.

`Amulet of the Planes` needs both of these destination shapes:

1. Successful check:
   - cast-equivalent travel to a **location you are familiar with on another plane of existence**
2. Failed check:
   - **you and each creature and object within 15 feet of you** travel to a **random destination**
   - the random destination is not freeform DM agenda; it is determined by an explicit `1d100` table in the item text

Because the failed-check branch is the item's main deterministic mechanic, omitting it would be misleading. This is not a secondary rider like narrative sound range or GM-chosen flavor text.

## Narrowest Honest Classification

`surface_widening`

Reason:

- the existing top-level kind is correct: `magic_item`
- the existing family is correct: `activation`
- the missing concept is a **new variant / widening of an existing surface atom** (`teleport`), not a brand-new v4 taxonomy atom

The v4 taxonomy already has `teleport`; the authored surface is just too narrow.

## Proposed Widening

Widen `EffectAtom.teleport` so destination is not restricted to visible same-plane spaces.

Minimum pressure from this item:

- named familiar location on another plane
- random interplanar destination resolved from a closed destination table

One plausible direction:

```ts
type TeleportDestination =
  | "unoccupied_visible_space"
  | { kind: "familiar_location_on_named_plane" }
  | { kind: "random_destination_table"; tableId: string }
```

And either:

- make `maxFeet` optional for interplanar cases, or
- replace `maxFeet` with a destination descriptor that can represent non-distance-bounded travel

## Evidence

> While wearing this amulet, you can take a Magic action to name a location that you are familiar with on another plane of existence.

> On a successful check, you cast Plane Shift.

> On a failed check, you and each creature and object within 15 feet of you travel to a random destination determined by rolling 1d100 and consulting the following table.
