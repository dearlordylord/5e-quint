# Proposal: Transport via Plants — structural_widening

## Unit

- **Name:** Transport via Plants
- **Level:** 6 Conjuration
- **Slug:** `transport_via_plants`

## Why it does not fit any existing family

Transport via Plants creates a persistent two-anchor portal through which any creature can move. The mechanics are:

1. **Two anchor points:** a source plant (within 10 ft) and a destination plant (any distance, same plane, previously seen or touched by the caster).
2. **Movement trigger:** any creature that steps into the source plant and spends 5 ft of movement is transported to the destination plant.
3. **Timed duration:** 10 minutes, no concentration.

### `anchored_trigger` — closest but structurally insufficient

`AnchoredTriggerMechanics` was designed for Alarm: one anchor, one event, one or more notification signals. Three things break for Transport via Plants:

| Requirement | Current type | Gap |
|---|---|---|
| Source anchor: Large plant (object) | `AnchorTarget`: `location` (door/window) or `area` (cube) | No plant/object variant |
| Destination anchor | Not in the type at all | Missing field entirely |
| Release payload: move creature to destination | `AnchoredSignal`: `audible` \| `mental` | Transport is not a notification signal |

The third gap is fundamental. The release payload here is not a notification — it physically moves a creature across an arbitrary distance. Even if the missing `AnchorTarget.plant` variant and a `destination` field were added, `AnchoredSignal` would still need a transport variant, and that variant's semantics (move creature to destination anchor) are orthogonal to signal semantics.

### `ongoing_effect` — incorrect operation model

`OngoingOperation` is `RollModifierOperation | DamageOnHitOperation`. Neither applies. The spell creates no roll-result modification and no hit-rider damage; its entire payload is the portal transit.

### `activation` and `triggered_reaction` — wrong procedure model

Not one-shot, not reaction-shaped.

## Proposed new family: `portal_link`

A `portal_link` spell family would need:

```typescript
// Proposed shape (not authoritative — sketch only)
export type PortalLinkMechanics = SpellMechanicsHeader & {
  readonly family: "portal_link";
  readonly source: PortalAnchor;           // new: plant/object anchor
  readonly destination: PortalAnchor;      // new: second anchor point
  readonly transitCost: MoveCost;          // "5 feet of movement"
  readonly openTo: "any_creature" | ...;   // who can use the portal
};

export type PortalAnchor =
  | { readonly kind: "plant"; readonly minSize: "large_or_larger" }
  | ...; // extend as other portal-entry spells land (Arcane Gate, etc.)

export type MoveCost = { readonly kind: "movement_feet"; readonly feet: number };
```

The release effect maps to v4 atom `transport_exile` (creature relocated to destination anchor). The `portal_link` procedure atom could be a new entry under procedure atoms, or it could reuse `store` with the release triggered by the transit event — but the two-anchor shape makes the subgraph structurally distinct from Alarm's one-anchor subgraph.

## Related pressure

Arcane Gate (tier 3, XPHB) creates a similar two-portal teleportation ring. Tree Stride (tier 2, SRD) is a related iterative variant. All three would benefit from the same `portal_link` or `bidirectional_portal` family. This is not single-unit pressure.

## Outcome

`structural_widening` — a new mechanics family is required. Do not force this unit into `anchored_trigger`.
