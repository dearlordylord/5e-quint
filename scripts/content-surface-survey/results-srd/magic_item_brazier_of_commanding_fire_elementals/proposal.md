# Proposal: Brazier of Commanding Fire Elementals

**Outcome:** `surface_widening`

## Summary

The Brazier encodes cleanly as a `magic_item` with `spawned_creature` mechanics (Fire Elemental via catalog_ref, 1 use/dawn, Magic action activation, 1-hour duration, bonus-action dismissal, shared initiative). One surface gap prevents a fully honest encoding.

## Missing Surface Feature

### `EquipmentPredicate.proximity_to_item`

**SRD text:** "While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental."

The activation is gated on the activator being within 5 feet of the brazier. A brazier is a large stationary wondrous item (floor- or table-placed), not something held or worn. Existing `EquipmentPredicate` variants cover:

- `holding_item` — requires the item to be held (censer analog: "gently swinging")
- `wearing_item` — requires the item to be worn
- `wielding_weapon` — weapon only
- `wearing_armor` / `not_wearing_armor` — armor only
- `unarmored`, `peering_through_item` — not applicable

None cover proximity to a stationary item. The encoding omits the condition field entirely (treated as "always accessible"), which is looser than the SRD but honest about the gap.

**Proposed variant:**
```typescript
| {
    readonly kind: "proximity_to_item";
    readonly withinFeet: number;
  }
```

This would also apply to the Stone of Controlling Earth Elementals and any other floor-placed elemental-summoning items with proximity requirements.

## Secondary Gaps (not blocking, shared with censer)

- Spawn placement "in an unoccupied space as close to the brazier as possible" is not representable; the surface carries only a coarse `Range` header.
- `commandRangeFeet` and `defaultBehavior` are not stated in the SRD text; conservative placeholder values (0 / `dodge_and_avoid`) are used.
- `"understands your languages"` is not representable in the catalog_ref creature payload.
