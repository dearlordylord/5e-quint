# Proposal: Sending — dm_agenda classification

## Classification

**Outcome:** `dm_agenda`

## Why dm_agenda

Sending's core mechanic is narrative communication. The spell:

1. **Delivers a message** — the content is entirely caller-owned (player/DM decides what is said and how the target responds). No deterministic mechanical resolution exists.
2. **Enables a reply** — the target "can answer in a like manner immediately." Whether and how they reply is pure narrative.
3. **Has a 5% cross-plane failure** — a d100 roll with a narrative outcome (message arrives or not). The caster learning the result is informational feedback, not a mechanical effect.
4. **Allows the target to block future Sendings** — a per-creature campaign/social state with no combat-mechanical consequence.

Per `ARCHITECTURE.md`: "notification surfaces, and other caller-owned facts are **not** core-mechanics atoms." Sending's entire purpose falls on the caller-owned side of that boundary.

## Why no existing family applies

Even setting aside the dm_agenda boundary, the surface vocabulary cannot encode Sending honestly:

- `activation` — requires `ActivationPhase[]` where each phase is `attack_roll` or `save_gate`. Sending has neither.
- `ongoing_effect` — requires a persistent mechanical operation on an attachment. Sending is instantaneous with no persistent effect.
- `triggered_reaction` / `anchored_trigger` — wrong shape entirely.

## Surface gaps observed (for future widening reference)

These gaps would exist even if a suitable non-dm_agenda family were introduced for communication spells:

### 1. `Range` missing `unlimited` variant

```typescript
// Current:
export type Range =
  | { readonly kind: "self" }
  | { readonly kind: "touch" }
  | { readonly kind: "point"; readonly feet: number };

// Needed:
  | { readonly kind: "unlimited" }
```

Sending's range is explicitly unlimited and cross-planar. The `point(feet)` variant cannot honestly represent this.

### 2. `ActivationPhase` missing `probability_check` kind

The 5% cross-plane failure is a raw d100 roll — not a saving throw (no ability score, no DC, no proficiency bonus), not an attack roll. If ever modeled, a new phase kind is needed:

```typescript
| {
    readonly kind: "probability_check";
    readonly failureChancePct: number;   // e.g. 5
    readonly onFail: Effect;
    readonly onSuccess: Effect;
  }
```

### 3. No atom for `block_spell_access`

The target's ability to block future Sending invocations for 8 hours is a per-creature, duration-bounded immunity to a specific named spell. The v4 atom inventory has no atom that covers this:

- `apply_condition` — only covers SRD conditions, not spell-specific immunity
- `block_targeting` — not defined in types.ts surface; even if present, covers targeting generally, not per-spell immunity from a specific caster
- `negate_named_effect` — a reaction effect for blocking damage/effects of a named spell at cast time, not a persistent immunity

A new atom `block_spell_access` (or similar) would be required if this mechanic were ever modeled.

## Files not written

Per protocol: no `sending.dhall`, no `sending.json`, no `sending.trace.md` — the unit does not fit the authored surface and forcing it would produce a false trace.
