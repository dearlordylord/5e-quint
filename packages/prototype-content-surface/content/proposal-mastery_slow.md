# Proposal: Surface Widening for Mastery `Slow`

## Unit

- **Slug:** `mastery_slow`
- **SRD text:** Equipment.md §Mastery Properties — Slow (line 109–111)
- **Full text:**
  > If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet.

## What Fits

| Surface shape | Status |
|---|---|
| `MasteryMechanics` family `on_hit_trigger` | ✓ exists |
| `trigger: { kind: "weapon_hit" }` | ✓ exists (no melee restriction) |
| `optional: true` | ✓ supported ("you can reduce") |
| v4 atom `modify_speed` | ✓ in taxonomy |
| `usageLimit` absent (no once-per-turn limit stated) | ✓ supported |

## What Is Missing

### 1. `MasteryEffect` missing `modify_speed` variant (blocker)

`MasteryEffect` currently has three variants:
- `ModifyRollAdvantageRider` — Sap
- `SaveGateRider` — Topple
- `GrantWeaponAttackRider` — Cleave

Slow needs a fourth variant for reducing Speed on hit. The v4 atom `modify_speed` exists in the taxonomy, but no `MasteryEffect` shape exposes it.

**Proposed addition to `types.ts`:**
```typescript
export type ModifySpeedRider = {
  readonly kind: "modify_speed";
  readonly delta: number;          // negative for reduction, e.g. -10
  readonly expiresOn: RiderExpiry;
};

// Add to MasteryEffect union:
export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider
  | ModifySpeedRider;            // NEW
```

### 2. `RiderExpiry` missing `turn_start` variant (blocker)

Slow expires "until the start of your next turn." The current `RiderExpiry` options are:
- `{ kind: "target_uses_or_turn_start" }` — Sap-specific: expires at attacker turn start **or** when the target uses its next attack roll (the OR clause is not present in Slow)
- `{ kind: "end_of_next_turn" }` — wrong boundary (end, not start)

A clean `turn_start` variant is needed for Slow (and likely other future masteries with this expiry):

```typescript
export type RiderExpiry =
  | { readonly kind: "target_uses_or_turn_start" }
  | { readonly kind: "end_of_next_turn" }
  | { readonly kind: "turn_start" };    // NEW — expires at start of attacker's next turn, no OR clause
```

### 3. Stacking cap (residue, not a blocker for encoding)

Slow states: "the Speed reduction doesn't exceed 10 feet" even if the target is hit multiple times. There is no current surface or v4 atom concept for a per-effect stacking cap. This is likely runtime-enforcement metadata rather than a new atom, but it cannot be expressed in the authored surface at all.

This is a residue observation — it does not block encoding once the above two gaps are filled, but the authored record will be silent about the stacking cap unless a `stackingCap` field is added.

## Proposed Dhall (once widening is applied)

```dhall
{ kind = "mastery"
, id = "mastery_slow"
, name = "Slow"
, provenance = { kind = "srd-5.2.1", section = "Equipment#Slow" }
, description = "If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet."
, mechanics =
    { family = "on_hit_trigger"
    , trigger = { kind = "weapon_hit" }
    , optional = True
    , effect =
        { kind = "modify_speed"
        , delta = -10
        , expiresOn = { kind = "turn_start" }
        }
    }
}
```

## Tracer impact

Once `ModifySpeedRider` is added, the tracer's `traceMasteryEffect` would need a new `case "modify_speed":` branch emitting a `modify_speed` effect node with a `turn_start_window` expiry (from the existing `traceRiderExpiry` helper after adding the `turn_start` case).
