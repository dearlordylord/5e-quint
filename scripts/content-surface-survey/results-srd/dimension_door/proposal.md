# Proposal: Dimension Door — atom_widening

## Unit

**Dimension Door** — Level 4 Conjuration spell (SRD 5.2.1, `srd52: true`)

## Why it doesn't fit

Dimension Door's primary mechanic is **unconditional voluntary teleportation** to a caster-chosen destination within 500 ft. The caster (and optionally one willing adjacent creature) arrives exactly at the declared spot with no attack roll and no saving throw.

The current surface cannot encode this honestly:

1. **`ActivationPhase` has no teleport variant.** The union is `attack_roll | save_gate`. Both variants model a resolution that rolls against a target's defense. Dimension Door has no such resolution — the caster declares a destination and arrives there. Forcing it into a save_gate (e.g., "DC 0 save against nothing") or omitting the phase entirely would be a false trace.

2. **`Effect` has no teleport atom.** The `Effect` union is `damage | none`. There is no atom for "displace caster to chosen coordinates."

3. **v4 atom `transport_exile` is not the right atom.** `transport_exile` models involuntary planar banishment (Banishment, Plane Shift, Maze). Dimension Door is voluntary, same-plane, caster-chosen destination. These are mechanically distinct: `transport_exile` is adversarial and plane-crossing; `teleport` is autonomous and in-plane.

## Proposed widenings

### 1. New effect atom: `teleport`

A voluntary, caster-chosen positional displacement that bypasses intervening space. Distinct from:
- `transport_exile` — involuntary, plane-crossing
- `move` — constrained traversal (cannot bypass walls)
- `force_move` — adversarial push/pull

Minimum shape needed by this spell:

```
teleport {
  range: Range          -- maximum displacement (500 ft for Dimension Door)
  includeCompanions: boolean | companion_grammar   -- whether the caster may bring adjacent willing creatures
}
```

### 2. New `ActivationPhase` variant: teleport phase

The existing phase kinds model binary roll-based resolutions (hit/miss, fail/succeed). Teleportation is unconditional at the resolution level — the caster chooses a destination and arrives. A new phase kind is needed:

```typescript
| {
    readonly kind: "teleport";
    readonly attachment: Attachment;  // self (caster) + optional companion
    readonly onArrival: Effect;       // typically none
    readonly onBlocked: Effect;       // 4d6 Force damage + displacement fails
  }
```

### 3. Companion-inclusion grammar (surface_widening)

The spell brings "one willing creature within 5 feet" along — the companion teleports to "a space within 5 feet of your destination." This is not a `target` attachment (the companion is not targeted for an effect; they are included in the displacement). A new attachment kind or a secondary-inclusion field on the teleport phase would be needed.

Minimal representation: a `companion` field on the teleport phase with `{ kind: "willing_adjacent"; count: 1 }`.

### 4. Occupancy-failure branch (surface_widening or new subgraph)

"If you or the companion would arrive in a space occupied by a creature or completely filled by one or more objects, you and any creature traveling with you each take 4d6 Force damage, and the teleportation fails."

This is not a save_gate or attack_roll branch. It is a **destination-occupancy check**: at arrival, if the target space is blocked, apply damage to all teleporting creatures and cancel the displacement. No existing phase or window atom models this pattern.

Possible representation: an `onBlocked` branch on the teleport phase (see §2 above), with `Effect = { kind: "damage"; damageType: "force"; amount: { kind: "fixed"; expr: { dice: 4, dieSize: 6 } } }` applied to all teleporting creatures and displacement cancelled.

## Summary table

| Gap | Classification | Required change |
|---|---|---|
| No `teleport` effect atom in v4 | `atom_widening` | Add `teleport` to v4 effect atoms and `Effect` union |
| No teleport `ActivationPhase` variant | `surface_widening` | Add `{ kind: "teleport" }` to `ActivationPhase` |
| No companion-inclusion grammar | `surface_widening` | Add `companion` or `includes` field to teleport phase |
| No occupancy-failure branch | `surface_widening` | Add `onBlocked: Effect` to teleport phase |

The dominant gap is the missing `teleport` atom — everything else cascades from encoding teleportation as a first-class mechanic.
