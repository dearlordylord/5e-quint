# Proposal: Sovereign Glue — atom_widening

## Unit

**Sovereign Glue** — Wondrous Item, Legendary (SRD 5.2.1)

## What Fits

The unit's overall structure encodes cleanly:

- **Kind**: `magic_item` ✓
- **Family**: `activation` (Utilize action cost, charge pool resource) ✓
- **Attachment**: `object` with `count: 2` ✓ — two objects are bonded
- **Resource**: `charge_pool`, `cap: { kind: "fixed", uses: 7 }` (1d6+1 ounces, median), `initialCount: { kind: "fixed", expr: { dice: 1, dieSize: 6, flat: 1 } }` ✓
- **Reset cadence**: `never` ✓ — consumable item, no refill
- **Activation cost**: `standard_action` with action `"utilize"` ✓

## What Doesn't Fit

### 1. Missing atom: `bond_objects`

The core effect — permanently joining two objects so they cannot be separated except by specific means — has no honest EffectAtom in the current surface. The effect is:

- Not a condition applied to a creature
- Not a speed, sense, resistance, or AC modifier
- Not a container storage profile
- Not `alter_item_kind` (the objects are not changed; they are joined)
- Not `block_travel` (that prevents creature movement through areas)

The atom needs to express: "these two objects are physically joined into one unit."

**Proposed shape:**
```typescript
| {
    readonly kind: "bond_objects";
    readonly permanent: true;
    readonly breakableBy?: ReadonlyNonEmptyArray<{
      readonly kind: "named_item" | "named_spell";
      readonly id: string;
    }>;
  }
```

### 2. Missing surface variant: delayed effect activation

RAW text: "Applying an ounce of Sovereign Glue takes a Utilize action, and the **applied glue takes 1 minute to set**."

The Utilize action is the activation cost, but the mechanical effect (the bond forming) does not resolve immediately — it resolves 1 minute after application. The current `ActivatedAbilityHeader` has no field for a post-activation delay window before the effect takes hold.

This differs from:
- `CastingTime.minutes` (full cast time, not a two-phase apply-then-set sequence)
- `duration` (how long an effect persists *after* resolving, not when it resolves)

**Proposed surface addition:**
```typescript
type ActivatedAbilityHeader = {
  // ...existing fields...
  readonly activationDelay?: {
    readonly unit: "minute" | "hour";
    readonly amount: number;
  };
};
```

When present, the effect resolves after the delay elapses rather than on the activation turn.

### 3. Breaking conditions

The bond is broken "only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell." This is a new constraint shape: a permanent effect with a named-item / named-spell breakability predicate.

The `bond_objects` atom should carry a `breakableBy` field listing the specific item IDs and spell IDs that can dissolve the bond. This parallels how `negate_named_effect` names a specific spell, but operates as a break-condition on a persistent bond rather than a one-shot negation.

## Classification

**`atom_widening`** — The item kind and mechanics family both exist. The gap is entirely at the EffectAtom level (`bond_objects`) plus a secondary surface-level delay variant. No structural widening is needed (no new family or record kind required).

## Priority

Medium. Sovereign Glue is a single item, but the `bond_objects` atom class would also serve:
- Sovereign Glue (the canonical case)
- Any future adhesion/binding item (Glue of Holding, Webs as object-binding)

The delayed-effect surface variant has very narrow pressure (Sovereign Glue is the only SRD item with a 1-minute set time); it could be deferred or handled as a descriptive note rather than a typed field.
