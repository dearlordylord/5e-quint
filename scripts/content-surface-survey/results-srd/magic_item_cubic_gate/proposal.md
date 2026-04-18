# Proposal: magic_item_cubic_gate

## Outcome: `atom_widening`

## What fits

The outer frame maps cleanly to `ActivatedAbilityMechanics`:

```
activationCost: { kind: "standard_action", action: "magic" }
resource:       { kind: "charge_pool", cap: { kind: "fixed", uses: 3 } }
resetCadence:   { kind: "dawn", regain: { kind: "fixed", expr: { dice: 1, dieSize: 3 } } }
```

The Plane Shift activation can be approximated as `transport_exile` with `destination: "different_plane"`, and the Gate/Plane Shift dichotomy (press once vs. press twice) maps onto a `CastTimeEffectModeChoice` with two options.

## What is missing

### 1. `open_planar_portal` atom (blocking — new atom required)

**SRD text:** "Pressing one side of the cube, you cast *Gate*, opening a portal to the plane of existence keyed to that side."

The Gate spell creates a **bidirectional portal** — a circular passage (20 ft. diameter per SRD) between the current plane and the destination plane. Creatures on either side can move through it. The portal persists while the caster concentrates on it.

`transport_exile` is the closest existing atom, but it sends one or more targets to another plane one-way. There is no "both sides can cross" semantics, no spatial presence (portal occupies an area in space), and no persistence model beyond the basic `concentrate` lifecycle.

A new atom is needed, tentatively:

```typescript
{
  readonly kind: "open_planar_portal";
  readonly destination: ExileDestination | "face_keyed";   // see widening 2
  readonly diameterFeet: number;                            // 20 for Gate
}
```

This atom would emit a `block_travel`-category node in the tracer (a planar passage is bidirectional travel enablement), likely with a `persist`/`concentrate` lifecycle, and an `area` attachment of the portal's diameter.

### 2. `GrantedSpellTargetRestriction.face_keyed_plane` (secondary — surface widening)

**SRD text:** "The six sides of the cube are each keyed to a different plane of existence, one of which is the Material Plane. The other sides are linked to planes determined by the GM."

The destination of both Gate and Plane Shift is not freely chosen from all planes — it is constrained to one of the six DM-assigned face options selected at activation time by which physical face the bearer presses.

Existing `GrantedSpellTargetRestriction` variants (`self_only`, `visible_target_within_feet`) do not cover this. A new variant is needed:

```typescript
| {
    readonly kind: "face_keyed_plane";
    readonly faceCount: number;           // 6 for this item
    readonly planeAssignment: "dm_assigned";
  }
```

This is secondary to the portal-atom blocker: even if we encoded via `grant_spell_access`, the plane constraint has no home in the current surface.

## What could be encoded today (partial)

Plane Shift could be encoded without the plane constraint:

```json
{
  "kind": "transport_exile",
  "destination": "different_plane"
}
```

This is mechanically honest for "transport targets to another plane" but omits the face-keying constraint. A `surface_widening` note could accompany it.

Gate cannot be encoded without the new atom and is **not** omittable — it is half the item's active payload.

## Classification rationale

`atom_widening` rather than `surface_widening`: the missing "bidirectional planar portal" concept is not present in v4 taxonomy at all. `transport_exile` covers one-way exile to another plane; the portal shape is a distinct mechanical primitive (traversable from both sides, area-occupying, cancellable by dropping concentration) with no v4 equivalent. The face-keying restriction is a secondary `surface_widening` on top.
