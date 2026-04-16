# Proposal: surface_widening for mastery_push

## Unit

**Push** — SRD 5.2.1 weapon mastery property

> If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller.

---

## What fits

| Field | Value | Status |
|---|---|---|
| `kind` | `mastery` | ✓ exists |
| `mechanics.family` | `on_hit_trigger` | ✓ exists |
| `mechanics.trigger` | `{ kind: "weapon_hit" }` | ✓ exists (Push appears on melee and ranged weapons) |
| `mechanics.optional` | `true` | ✓ exists |
| `mechanics.usageLimit` | none specified per-mastery | ✓ omittable |

---

## What's missing

### Gap 1 — `ForceMoveRider` variant in `MasteryEffect` (primary blocker)

`MasteryEffect` is currently:

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider   // Sap
  | SaveGateRider              // Topple
  | GrantWeaponAttackRider;    // Cleave
```

Push's on-hit effect is **forced movement**: displace the target up to 10 feet directly away from the attacker. The v4 atom `force_move` exists and is the correct atom, but there is no `ForceMoveRider` surface type to author against.

**Proposed addition:**

```typescript
export type ForceMoveRider = {
  readonly kind: "force_move";
  readonly distanceFeet: number;           // 10 for Push
  readonly direction: "away_from_attacker";
};
```

`MasteryEffect` would become:

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider
  | ForceMoveRider;
```

The tracer's `traceMasteryEffect` switch would need a `case "force_move"` arm emitting a `force_move` atom node.

### Gap 2 — Target size constraint (secondary)

The SRD restricts Push to targets that are **Large or smaller**. There is no current surface type for a target-size gate on mastery effects or triggers. This is not the primary blocker but will be needed for a complete encoding.

One approach: add an optional `targetSizeMax` field to `ForceMoveRider` (or a general `MasteryConstraint`). This could be deferred until the `ForceMoveRider` variant itself is landed.

---

## Atom audit

No new v4 atoms are required. `force_move` is already in the v4 taxonomy (§9 Effect Atoms). This is a **surface-only** gap.

---

## Recommended Dhall sketch (for when widening is applied)

```dhall
let push =
      { kind = "mastery"
      , id = "mastery_push"
      , name = "Push"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Push" }
      , description =
          "If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller."
      , mechanics =
          { family = "on_hit_trigger"
          , trigger = { kind = "weapon_hit" }
          , optional = True
          , effect =
              { kind = "force_move"
              , distanceFeet = 10
              , direction = "away_from_attacker"
              }
          }
      }

in push
```

(The size constraint `targetSizeMax = "large"` can be added once that surface type is defined.)
