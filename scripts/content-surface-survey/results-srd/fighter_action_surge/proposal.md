# Proposal: surface_widening for Action Surge (fighter_action_surge)

## Summary

Action Surge fits the `class_feature` → `activation` family honestly. The core mechanic (grant one extra action, Magic excluded, short/long rest reset) and the L17 use-count scaling (1 use → 2 uses at class level 17) both encode cleanly using existing surface types. The tracer emits a well-formed mermaid graph with no exceptions.

One secondary constraint from the SRD is not expressible:

> *"Starting at level 17, you can use it twice before a rest but only once on a turn."*

The phrase **"only once on a turn"** is a per-turn usage fence that applies only at L17 (when the rest-pool cap is 2). There is no `usageLimit` or `perTurnLimit` field on `ClassFeatureActivationMechanics`.

## Missing surface shape

### New optional field: `ClassFeatureActivationMechanics.usageLimit`

```typescript
// Mirrors MasteryUsageLimit — the one already used by MasteryMechanics.
export type ClassFeatureUsageLimit = { readonly kind: "once_per_turn" };

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
  readonly usageLimit?: ClassFeatureUsageLimit;   // NEW
};
```

When present, the tracer would emit the same `use_count` fence + `turn_start_window` pair that the mastery tracer already emits for `MasteryUsageLimit` (see `traceMasteryMechanics`, line ~1475), preserving graph consistency across unit kinds.

## Encoding notes

- All atoms in the trace (`activate`, `class_feature_root`, `grant_extra_action`, `rest_window`, `restrict_action_set`, `scale_numeric_bonus`, `use_count`) are in v4.
- The use-count cap is encoded as `threshold_tiers` (axis=class, base=1, L17→2). This is more faithful than the existing `action_surge.json`'s `fixed(1)`, which silently omits the level-17 scaling.
- Without `usageLimit`, the encoded trace is truthful for L2–L16 and partially truthful for L17 (correct rest-pool size, missing per-turn fence).

## Classification

`surface_widening` — the family and all v4 atoms exist; only a new optional field on `ClassFeatureActivationMechanics` is needed.
