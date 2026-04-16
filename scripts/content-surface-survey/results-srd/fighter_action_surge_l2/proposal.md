# Proposal: fighter_action_surge_l2

## Outcome: `surface_widening`

## Summary

Action Surge (fighter L2) encodes cleanly into `ClassFeatureActivationMechanics` for the core mechanic and for the L17 use-count scaling (`threshold_tiers` with base=1, tier at L17→2). Typecheck passes; the tracer emits a valid mermaid graph.

One secondary constraint is not expressible in the current surface:

> "Starting at level 17, you can use it twice before a rest **but only once on a turn**."

## What is missing

`ClassFeatureActivationMechanics` has no per-turn usage limit field. By contrast, `MasteryMechanics` already has:

```typescript
export type MasteryUsageLimit = { readonly kind: "once_per_turn" };
// used in OnHitTriggerMechanics: usageLimit?: MasteryUsageLimit
```

The same concept needs to be available on class feature mechanics.

## Proposed widening

Add an optional `usageLimit` field to `ClassFeatureActivationMechanics`:

```typescript
export type ClassFeatureUsageLimit = { readonly kind: "once_per_turn" };

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
  readonly usageLimit?: ClassFeatureUsageLimit;   // new
};
```

This is a `surface_widening`: no new v4 atom is required (the concept is already present in mastery's inventory). The widening is a new optional field on an existing surface type, making `ClassFeatureActivationMechanics` expressive enough to represent the L17 constraint:

```dhall
, usageLimit = Some { kind = "once_per_turn" }
```

## Classification reasoning

- The per-turn constraint only activates at L17 and governs how two uses may be spent in a session, not the core effect.
- All atoms in the trace (`activate`, `use_count`, `scale_numeric_bonus`, `grant_extra_action`, `restrict_action_set`, `rest_window`, `class_feature_root`) exist in v4.
- No new v4 atom is forced — the concept maps to an existing mastery-level shape.
- Therefore: `surface_widening`, not `atom_widening`.
