# Proposal: surface_widening for Circle of Death

## Unit

**Circle of Death** — SRD 5.2.1, Level 6 Necromancy spell  
Section: `Spells/Descriptions-A-D#Circle of Death`

## Encoding outcome

The spell encodes correctly as an `activation` / `save_gate` spell. Typecheck passes and the tracer emits a complete, accurate mermaid graph. No tracer throws. Atoms and relations used are all existing v4 inventory.

## Gap: no `half_damage` Effect variant

The SRD text reads:

> "taking 8d8 Necrotic damage on a failed save or **half as much damage** on a successful one"

The `save_gate` phase has `onFail: Effect` and `onSuccess: Effect` as independent fields. The current `Effect` union is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

There is no variant to express "damage equal to half of whatever onFail deals." The encoded workaround uses two independent `DiceAmount` values:

- `onFail`: `linear_per_level`, axis=slot, base=8d8, +2d8/slot above 6
- `onSuccess`: `linear_per_level`, axis=slot, base=4d8, +1d8/slot above 6

These values are numerically correct at every slot level (4d8 = half of 8d8, 5d8 = half of 10d8, etc.). However, the invariant **success = fail / 2** is unenforceable in the surface — it is merely maintained by convention in the authored Dhall.

## Proposed widening

Add a new `Effect` variant (narrowest fix):

```typescript
export type HalfDamageEffect = { readonly kind: "half_damage" };
export type Effect = DamageEffect | HalfDamageEffect | NoneEffect;
```

Used on the `onSuccess` branch of a `save_gate` phase, `half_damage` means: apply half of the damage computed by the `onFail` branch (rounded down per SRD). The tracer would emit a single `damage` node for the fail branch, and a `damage (half)` node for the success branch, linked to the fail node via a new `halves` relation (or simply annotated).

Alternatively, a boolean flag on `save_gate`:

```typescript
{
  readonly kind: "save_gate";
  // ...
  readonly halfDamageOnSuccess: boolean;
}
```

When `true`, the success branch need not be specified separately — it is derived. This approach is simpler for the ~80% of area-damage spells that use exactly the "full on fail, half on success" pattern (Fireball, Lightning Bolt, Ice Storm, etc.).

## Pressure

This pattern is extremely common in SRD spells. Every area-of-effect save-for-damage spell (Fireball, Lightning Bolt, Cone of Cold, Ice Storm, Shatter, Thunderwave, etc.) uses the same "half on success" mechanic. Without the widening, every such spell must duplicate its scaling chain in the success branch — producing redundant `scale_die_count` nodes and losing the semantic that the two branches are not independently variable.

## Classification

`surface_widening` — all atoms and relations needed exist in v4; only a new variant of an existing surface type (`Effect`) or a flag on `save_gate` is required.
