# Proposal: Gate — surface_widening

## Unit

Gate (SRD 5.2.1, 9th-level Conjuration)  
Concentration, 1 minute · Action · 60 ft (point) · V/S/M (diamond 5,000+ GP)

## Why it does not fit

### Gap 1 — missing `OngoingOperation` variant: `create_planar_portal`

The `ongoing_effect` family is structurally correct for Gate:
- concentration, 1-minute duration ✓
- attaches to a point within 60 ft range ✓

But `OngoingOperation = RollModifierOperation | DamageOnHitOperation`. Neither variant can express "open a traversable portal to another plane that transports any creature passing through it." The closest v4 atom is `transport_exile`, but it lives in the _effect_ layer, not the _operation_ layer. `OngoingOperation` has no wrapper for it.

**Proposed widening:** Add a third union member to `OngoingOperation`:

```typescript
export type CreatePlanarPortalOperation = {
  readonly kind: "create_planar_portal";
  readonly destination: { readonly kind: "named_plane" } | { readonly kind: "any_plane" };
  readonly transport: { readonly kind: "transport_exile" };
  readonly shape: PortalShape;
};
```

### Gap 2 — missing area shape: `circular_portal`

The existing `Area` attachment shape vocabulary only contains `sphere`. Gate's portal is a circular disk (5–20 ft diameter, caster-chosen orientation) with a mechanically distinct traversable front and non-traversable back. A `sphere` misrepresents the geometry and the traversal rule.

**Proposed widening:** Extend the area shape union to include:

```typescript
| {
    readonly kind: "circular_portal";
    readonly diameterFeetMin: number;
    readonly diameterFeetMax: number;
    readonly oriented: true;  // front/back distinction is load-bearing
  }
```

## Out-of-core elements (dm_agenda)

Two Gate mechanics are legitimately outside core mechanics per ARCHITECTURE.md:

1. **Named creature summoning** — The portal "opens next to the named creature and transports it to the nearest unoccupied space on your side." The creature then acts freely: "it might leave, attack you, or help you" — explicitly DM-adjudicated. The creature's response has no deterministic mechanical outcome.

2. **Deity/planar ruler prevention** — "Deities and other planar rulers can prevent portals created by this spell from opening in their presence or anywhere within their domains." This is pure DM ruling with no mechanical resolution path.

Both are caller-owned narrative decisions. The mechanical travel-through-portal effect (item 1 above) is the in-core part; the creature's subsequent behavior is not.

## Classification

- **Outcome:** `surface_widening`
- **Narrowest honest fit:** `ongoing_effect` family, concentration, 1 min
- **Blocking gaps:** `OngoingOperation` missing a portal-creation variant; `Area` shape vocabulary missing oriented circular disk
- **Not `structural_widening`:** The existing `ongoing_effect` family is the right shape — no new family or kind is needed, only two new variants of existing surface types
