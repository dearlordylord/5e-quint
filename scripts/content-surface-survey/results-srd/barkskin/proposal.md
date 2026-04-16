# Proposal: Barkskin — surface_widening

## Unit

- **Slug:** barkskin
- **Kind:** spell (srd-5.2.1)
- **Level:** 2, Transmutation
- **Casting Time:** Bonus Action
- **Range:** Touch
- **Duration:** 1 hour (timed, non-concentration)

## Mechanic

> "the target has an Armor Class of 17 if its AC is lower than that."

Barkskin sets a **minimum AC floor** of 17 on a touched creature for 1 hour. The effect is persistent (timed duration, not concentration), applies to a single target (touch), and costs a Bonus Action.

## Family fit

The `ongoing_effect` family is the honest fit:
- Timed duration ✓
- Single-target attachment (touch) ✓
- Bonus-action casting time ✓
- Persistent modifier, no activation phases, no reaction ✓

The only blocker is in the `operation` slot.

## Gap: OngoingOperation lacks an AC modifier variant

```typescript
// current
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can express AC modification. The v4 atom `modify_ac` exists and is reachable through `ReactionEffect` in `TriggeredReactionMechanics`, but there is no path to it from the `ongoing_effect` family.

## Gap: AC floor vs AC delta

The existing `modify_ac` in `ReactionEffect` carries a numeric delta:
```typescript
{ readonly kind: "modify_ac"; readonly delta: number }
```

Barkskin's mechanic is not a delta — it is a **conditional floor**: `AC = max(currentAC, 17)`. Shield's +5 and Barkskin's floor-17 are mechanically distinct operations. Collapsing them into a single `delta` field would misrepresent one or both.

## Proposed widening

### Option A: New variant in OngoingOperation + floor mode on modify_ac

```typescript
export type SetAcFloorOperation = {
  readonly kind: "set_ac_floor";
  readonly value: number;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | SetAcFloorOperation;
```

### Option B: Unified modify_ac with mode discriminant (shared across ReactionEffect and OngoingOperation)

```typescript
export type ModifyAcEffect =
  | { readonly kind: "modify_ac"; readonly mode: "delta"; readonly value: number }
  | { readonly kind: "modify_ac"; readonly mode: "floor"; readonly value: number };
```

Then promote `ModifyAcEffect` into `OngoingOperation` as well as `ReactionEffect`.

Option A is narrower and less likely to disturb existing encoded units (Shield, etc.). Option B is more expressive if future spells combine both modes.

## Pressure count

- Barkskin is the first pressure case for an ongoing AC-floor.
- Shield of Faith (concentration, +2 AC delta, bonus action) would exercise `mode: "delta"` in the same `ongoing_effect` family — giving a second pressure case to justify the split.

## Atoms touched

- `modify_ac` (v4 — already exists; surface path is missing)
- `activate` (procedure, already exists)
- `bonus_action_quota` (resource, already exists)
- `spell_slot` (level 2, already exists)
- `target` (attachment, already exists)
- `persist` + `expire` (lifecycle, already exists)

No new v4 atoms required.
