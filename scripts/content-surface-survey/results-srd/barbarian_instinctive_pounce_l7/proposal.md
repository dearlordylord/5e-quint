# Proposal: Instinctive Pounce (Barbarian L7)

## Unit

> As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.

## Classification: `structural_widening`

## Gap 1 — No family for passive riders on another feature's activation (structural)

The current surface models every `ClassFeatureMechanics` as `ClassFeatureActivationMechanics` (family `"activation"`), which requires:

- `activationCost` — how the player pays to activate this feature
- `resource` — a `use_count` cap
- `resetCadence` — short/long rest refill

Instinctive Pounce has none of these. It fires **unconditionally as part of entering Rage** (the Rage Bonus Action), not as a separately chosen activation. Encoding it as `{ kind: "free" }` activation with a fake unlimited use-count would be dishonest — it misrepresents a passive rider as a player choice and invents a resource that doesn't exist.

**Proposed widening:** A new `ClassFeatureMechanics` family, tentatively `"activation_rider"`, for class features that augment another feature's activation rather than being independently triggered. Candidate shape:

```typescript
export type ClassFeatureActivationRiderMechanics = {
  readonly family: "activation_rider";
  // The feature whose activation this riders on
  readonly parentFeatureId: string;          // e.g. "barbarian_rage"
  // The phase within the parent activation where this fires
  readonly phase: "on_activation";
  readonly effect: ClassFeatureRiderEffect;
};
```

This maps cleanly to the graph: `class_feature_root → activate (parent) → [rider fires during activation] → move effect`.

## Gap 2 — No `move` effect in `ClassFeatureEffect` (surface widening)

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The "move up to half your Speed" effect is a fractional-speed move. The v4 atom inventory includes `move` (effect section), but it is not exposed in `ClassFeatureEffect`. A new variant is needed:

```typescript
export type MoveEffect = {
  readonly kind: "move";
  readonly distance: "half_speed" | "full_speed";   // widen as needed
};
```

This gap is secondary — it only becomes actionable once Gap 1 (the family structure) is resolved.

## Summary

| Gap | Kind | Blocking? |
|---|---|---|
| No `activation_rider` family for passive-rider features | `structural_widening` | Yes — no honest family exists |
| No `move` effect in `ClassFeatureEffect` | `surface_widening` | Yes, after structural gap is resolved |

No `.dhall` or `.json` content file authored. A misleading trace would be worse than no trace.
