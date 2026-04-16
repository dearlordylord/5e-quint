# Surface Widening Proposal: Charm Monster

**Unit:** Charm Monster (SRD 5.2.1, level 4 Enchantment)
**Outcome:** `surface_widening`

## What encodes cleanly

The core mechanic fits the `activation` family without any new atoms:

- Single `save_gate` phase with WIS save against caster spell save DC
- `onFail`: `apply_condition: charmed`
- `onSuccess`: `none`
- Duration: `timed` 1 hour
- Attachment: `target` with `choose_up_to` slot scaling (`+1 target` per slot above 4)

Typecheck passes; tracer emits a valid graph.

## Gap 1 — Conditional advantage on the target's saving throw

**Evidence:** "It does so with Advantage if you or your allies are fighting it."

**Problem:** The `save_gate` activation phase has no field to express a conditional roll modifier on the _target's_ throw. There is `modify_roll_advantage` in `EffectAtom`, but that atom applies an advantage/disadvantage modifier as an _effect_ that persists. Here the modifier applies during the initial resolution when the context condition is true at cast time.

**Proposed widening:** Add an optional `targetRollModifier` field to the `save_gate` ActivationPhase variant:

```typescript
{
  readonly kind: "save_gate";
  // ... existing fields ...
  readonly targetRollModifier?: {
    readonly mode: "advantage" | "disadvantage";
    readonly condition: "caster_or_allies_fighting_target" | ...; // closed enum, widened on demand
  };
}
```

This pattern also appears in Charm Person ("If you or your allies are fighting it") and likely other enchantment spells. It is a surface shape gap, not a missing v4 atom — `modify_roll_advantage` already exists.

## Gap 2 — Damage-triggered early expiry

**Evidence:** "the target has the Charmed condition until the spell ends or until you or your allies damage it"

**Problem:** The `Duration` type's `timed` variant only models a fixed time window. There is no mechanism to express event-triggered early expiry. The `break` lifecycle atom exists in v4 but the authored `Duration` surface shape doesn't expose it.

**Proposed widening:** Add an optional `breakOn` field to the `timed` Duration variant (or add a new `timed_with_break` variant):

```typescript
// Option A: extend timed
{ readonly kind: "timed"; readonly value: DurationValue; readonly breakOn?: DurationBreakCondition }

// Option B: new variant
{ readonly kind: "timed_with_break"; readonly value: DurationValue; readonly breakOn: DurationBreakCondition }
```

Where `DurationBreakCondition` could start as:

```typescript
type DurationBreakCondition =
  | { readonly kind: "target_damaged_by_caster_or_allies" }
  | { readonly kind: "target_damaged" };
```

This pattern appears in virtually all charm/compulsion/fear-condition spells in the SRD (Charm Person, Bane, Fear, etc.) and should be expected in future encodings.

## Classification summary

Both gaps are `surface_widening` — new variants or fields on existing surface shapes, using only atoms already present in the v4 taxonomy (`modify_roll_advantage`, `break`). No new v4 atoms are required.
