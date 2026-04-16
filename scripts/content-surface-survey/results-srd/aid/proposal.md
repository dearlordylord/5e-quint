# Proposal: Aid encoding gap

## Unit

**Aid** — Level 2 Abjuration spell (SRD 5.2.1)

## Outcome

`surface_widening`

## What fits

- **Family:** `ongoing_effect` — timed (8 hours, non-concentration), no attack roll, no save gate. Identical structural shape to Bless.
- **Attachment:** `target` with `choose_up_to` + `SlotScaling` (base 3, +1 per slot above 1 for Bless; Aid is base 3 targets as well). Fits without change.
- **Duration:** `timed` `{ unit: "hour", amount: 8 }`. Fits.
- **Casting time / components / range:** Standard. All fit.

## The gap

`OngoingOperation` is currently:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Aid's core mechanic is **raising the HP maximum** (and granting current HP equal to the raise). This is the v4 atom `modify_max_hp` (TAXONOMY_atoms_graph.md §9, Effect Atoms), but it is not exposed anywhere in `types.ts`.

`heal_hp` (ClassFeatureEffect) is the wrong shape — it restores lost HP up to the current ceiling. Aid *raises* the ceiling, which is a distinct mechanical operation.

## Proposed widening

Add a new `OngoingOperation` variant:

```typescript
export type ModifyMaxHpOperation = {
  readonly kind: "modify_max_hp";
  // Amount the ceiling (and simultaneously current HP) is raised.
  // At base: flat +5. Upcast: +5 per slot level above 2.
  readonly amount: DiceAmount;
  // Whether current HP is also raised by the same amount (Aid: true).
  // Some effects raise only the ceiling; distinguishing is honest here.
  readonly raisesCurrentHp: boolean;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifyMaxHpOperation;
```

### Amount encoding

The upcasting rule ("Each target's Hit Points increase by 5 for each spell slot level above 2") maps to:

```dhall
{ kind = "linear_per_level"
, axis = "slot"
, base = { dice = 0, dieSize = 0, flat = Some 5 }
, perLevel = { flat = Some 5 }
, startingAtLevel = 2
}
```

`DiceExpr` with `dice=0, dieSize=0` is a valid but aesthetically awkward way to represent a pure-flat number. A convenience alias `FlatAmount = { flat: number }` alongside `DiceAmount` could be cleaner, but is a separate concern and not required to unblock Aid.

## Tracer impact

The tracer's `traceOngoingOperation` switch would need a new `"modify_max_hp"` arm emitting:
- A `modify_max_hp` effect atom node (already in the v4 atom inventory)
- A `scale_numeric_bonus` scaling node if `amount.kind !== "fixed"` (existing scaling path)

No new atoms or relations are required — `modify_max_hp` is already in the v4 inventory and `modifies` / `attaches_to` cover the edges.
