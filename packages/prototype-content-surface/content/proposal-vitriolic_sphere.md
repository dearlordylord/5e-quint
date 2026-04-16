# Proposal: surface_widening for Vitriolic Sphere

## Unit

- **Slug**: `vitriolic_sphere`
- **Kind**: spell
- **Provenance**: srd-5.2.1
- **Level**: 4, Evocation, Instantaneous

## Rule text

> You point at a location within range, and a glowing, 1-foot-diameter ball of acid streaks there and explodes in a 20-foot-radius Sphere. Each creature in that area makes a Dexterity saving throw. On a failed save, a creature takes 10d4 Acid damage and another 5d4 Acid damage at the end of its next turn. On a successful save, a creature takes half the initial damage only.
>
> Using a Higher-Level Spell Slot: The initial damage increases by 2d4 for each spell slot level above 4.

## What fits the current surface

| Mechanic | Surface type | Verdict |
|---|---|---|
| `activation` family | `ActivationMechanics` | ✓ fits |
| `save_gate` phase | `ActivationPhase` | ✓ fits |
| `area` sphere attachment | `Attachment { kind: "area", shape: { kind: "sphere", radiusFeet: 20 } }` | ✓ fits |
| Dex save, caster spell save DC | `ability: "dex"`, `dc: { kind: "caster_spell_save_dc" }` | ✓ fits |
| Immediate 10d4 acid on fail | `DamageEffect` with `linear_per_level` axis=slot, base=10d4, perLevel={dice:2}, startingAtLevel=4 | ✓ fits |
| Half initial on success (5d4 base + scaling) | `DamageEffect` with `linear_per_level` axis=slot, base=5d4, perLevel={dice:1}, startingAtLevel=4 | ✓ fits |

## What does NOT fit

### Missing: `DeferredDamageEffect` variant

**Evidence**: "another 5d4 Acid damage at the end of its next turn" (on failed save only)

The `onFail: Effect` field of a `save_gate` phase is typed `DamageEffect | NoneEffect`. Both variants represent **immediate** damage. There is no surface variant for damage that fires at a per-target future trigger (end of the creature's next turn).

This is mechanically distinct from:
- Immediate `DamageEffect` — fires right when the save resolves
- `ongoing_effect` family — a persistent rider on an attachment that fires on repeated future triggers
- Concentration/timed `duration` — persists on the caster, not per-target

The deferred 5d4 is a **per-target, one-shot, scheduled damage**: it fires once for each creature that failed the save, at the end of that creature's next turn.

## Proposed widening

### New `Effect` variant: `DeferredDamageEffect`

```typescript
// Effect that fires once at a specified per-target future trigger.
// Composes existing v4 atoms: persist → turn_end_window → damage.
export type DeferredDamageEffect = {
  readonly kind: "deferred_damage";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
  readonly trigger: DeferredDamageTrigger;
};

export type DeferredDamageTrigger =
  | { readonly kind: "end_of_next_turn" };  // widen as more pressure cases land
```

The updated `Effect` union:
```typescript
export type Effect = DamageEffect | NoneEffect | DeferredDamageEffect;
```

**v4 taxonomy coverage**: All atoms needed exist in v4 — `damage` (effect), `persist` (lifecycle), `turn_end_window` (window). No new atoms are required; only this new surface variant.

### Tracer extension needed

`traceEffect` and `traceDamageScaling` would need cases for `deferred_damage`:
- Emit a `persist` lifecycle node connected to the save gate
- Emit a `turn_end_window` window node connected via `persists_until`
- Emit a `damage` effect node granted by the window
- Apply normal `DiceAmount` scaling off the damage node

## Classification

`surface_widening` — the `activation` family and `save_gate` phase exist; the gap is purely a missing `Effect` variant. All v4 atoms for the deferred damage pattern are present.

## Confidence

High. The deferred damage is the sole blocker. Every other mechanic (area attachment, dex save, immediate damage, slot scaling, success half-damage) is representable with current surface types.
