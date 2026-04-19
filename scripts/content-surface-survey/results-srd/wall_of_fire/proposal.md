# Proposal: Wall of Fire — surface_widening

## Unit

**Spell**: Wall of Fire (SRD 5.2.1, Level 4 Evocation)

## What was encoded

The spell encodes as `ongoing_effect` family with:

- **Initial phase**: `save_gate` on the wall area — Dex save, 5d8 fire on fail, half on success.
- **Ongoing op 1**: `on_creature_enters_area` → 5d8 fire damage (creature enters the wall's footprint).
- **Ongoing op 2**: `on_creature_ends_turn_in_area` → 5d8 fire damage (creature ends turn inside the wall).
- **Slot scaling**: `linear_per_level` (axis=slot, +1d8 per slot above 4) on all three damage instances.
- **Area shape**: `choice` between `line` (60 ft × 1 ft) and `cylinder` (radius 10 ft, height 20 ft).

Typecheck passes. Tracer emits a valid mermaid graph.

## What is missing — two surface widenings

### 1. One-sided wall mechanic

RAW: _"One side of the wall, selected by you when you cast this spell, deals 5d8 Fire damage... The other side of the wall deals no damage."_

The wall's ongoing damage is **asymmetric** — only one face of the wall (chosen at cast) is the "hot side". Creatures on the cold side of the wall and outside the wall take no damage.

The current surface has no concept of a directional sub-region of an area. `Attachment.area` is symmetric: `on_creature_enters_area` and `on_creature_ends_turn_in_area` fire for any creature in the area footprint regardless of which face they approach from.

**Proposed widening**: A cast-time "hot side" selector on the `ongoing_effect` mechanics, and a corresponding area orientation filter on `OngoingOperation` (something like `{ faceFilter: "hot_side" }`) that restricts which face-approach triggers the operation. This is a new variant of `OngoingOperation` or `AreaOccupantDispositionFilter`-analog for spatial orientation, not a new v4 taxonomy atom.

### 2. "Within 10 feet of the hot side" proximity zone

RAW: _"deals 5d8 Fire damage to each creature that ends its turn within 10 feet of that side or inside the wall"_

The damage zone for the ongoing operation is the **union** of:
- Inside the wall's 1-foot footprint (covered by `on_creature_ends_turn_in_area`)
- Within 10 feet of the hot face, outside the wall (not covered)

There is no trigger for "ends turn within N feet of one face of the area attachment." The `on_creature_ends_turn_in_area` trigger covers only the wall's own footprint.

**Proposed widening**: A new `OngoingTrigger` variant:
```typescript
| {
    readonly kind: "on_creature_ends_turn_near_area_face";
    readonly distanceFeet: number;
    readonly face?: "hot_side"; // paired with hot-side selector above
  }
```
Or alternatively, expand the existing `on_creature_ends_turn_in_area` trigger to accept a `proximityFeet` extension parameter, widening its coverage to "inside OR within N feet."

## Minor surface gap (non-blocking)

The `line` `AreaShapeDescriptor` has no `heightFeet` field. The wall is 20 feet high (RAW), but height does not affect the footprint for 2D grid damage computation — it is relevant only for flying creatures and line-of-sight. The existing encoding omits height without creating a mechanically dishonest trace.

## Classification

`surface_widening`: both missing mechanics require new variants of existing surface types (`OngoingTrigger`, `AreaShapeDescriptor` or a new area orientation filter). Neither requires a new v4 taxonomy atom — all v4 atoms involved (`damage`, `save_gate`, `area`) already exist.
