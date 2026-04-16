# Proposal: Ray of Frost surface widening

## Unit

**Ray of Frost** — SRD 5.2.1, Evocation cantrip

## What fits

The primary mechanic encodes cleanly:

- Family: `activation` (single `attack_roll` phase)
- `ranged_spell_attack` against one target at 60 ft
- On hit: 1d8 Cold damage, threshold-tiered by character level (L5→2d8, L11→3d8, L17→4d8)
- On miss: none
- Typecheck passes, tracer emits a valid graph

## What does not fit

### On-hit speed reduction

> "its Speed is reduced by 10 feet until the start of your next turn"

This is a mandatory on-hit secondary effect. It requires:

1. **`ModifySpeedEffect` in `Effect`** — the v4 atom `modify_speed` exists in the taxonomy, but `Effect = DamageEffect | NoneEffect`. There is no surface type for a speed-modification effect that can occupy the `onHit` position of an `attack_roll` phase.

2. **Multi-effect `onHit`** — Ray of Frost delivers both damage AND speed reduction on the same hit. The `ActivationPhase` `attack_roll` branch has `onHit: Effect`, a single-effect field. Encoding both effects together requires one of:
   - Changing `onHit` / `onMiss` / `onFail` / `onSuccess` to `ReadonlyArray<Effect>`, or
   - Adding a `CompositeEffect = { kind: "composite"; effects: ReadonlyArray<Effect> }` variant.

## Classification

`surface_widening` — the v4 atom (`modify_speed`) already exists. Only the surface type is missing.

## Proposed additions to `types.ts`

```typescript
// New Effect variant for speed modification riders.
// expiry: reuses RiderExpiry (already in scope for mastery riders).
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly deltaFeet: number;        // negative = reduction
  readonly expiry: RiderExpiry;
};

// Extend Effect union:
export type Effect = DamageEffect | NoneEffect | ModifySpeedEffect;
```

And change phase outcome fields to arrays (or add `CompositeEffect`):

```typescript
// Option A: array-valued outcomes
readonly onHit: ReadonlyArray<Effect>;
readonly onMiss: ReadonlyArray<Effect>;
// (same for save_gate branches: onFail, onSuccess)
```

The `RiderExpiry` shape already covers "until start of next turn" via `{ kind: "end_of_next_turn" }` — no new expiry variant needed.

## Pressure source

Single unit (Ray of Frost), but the `modify_speed` pattern recurs across many freeze/slow spells (Slow, Ray of Enfeeblement, Cone of Cold in SRD). Promoting the variant now preempts repeated gaps.

## Omitted from trace

The generated `content/ray_of_frost.trace.md` captures damage only. The speed-reduction rider is absent from the graph. This is explicitly called out in the dhall comment and result file.
