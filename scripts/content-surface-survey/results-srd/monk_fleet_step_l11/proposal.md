# Proposal: Fleet Step (Monk L11) — structural_widening

## Unit

**Name**: Fleet Step  
**Slug**: `monk_fleet_step_l11`  
**Source text**:

> When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action.

## Why it does not fit

### Gap 1 — No passive/triggered class feature family

The current `ClassFeatureMechanics` union contains exactly one member: `ClassFeatureActivationMechanics` (family `"activation"`). That family requires:

- `activationCost` — the player explicitly activates the feature (free or bonus action)
- `resource: UseCountResource` — tracks how many times it can be used
- `resetCadence: RestResetCadence` — the resource refills on a rest

Fleet Step has none of these. It is **not player-activated**: it fires automatically whenever the turn-structure condition is satisfied (monk takes a Bonus Action that isn't Step of the Wind). There is no use count — it works every turn. There is no rest reset — there is nothing to reset.

Forcing it into `activation` would require fabricating a `resource` and `resetCadence` that have no basis in the rule. That produces a false trace.

**Proposed widening**: A new `ClassFeatureMechanics` family, e.g. `"passive_trigger"`, shaped roughly as:

```typescript
export type ClassFeaturePassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly trigger: ClassFeatureTrigger;   // e.g. bonus_action_window with optional filter
  readonly effect: ClassFeatureTriggerEffect;
};
```

This is the same structural gap surfaced by features like Martial Arts' bonus-unarmed-strike rider, Sneak Attack's conditional damage, and similar "fires automatically when X" class mechanics.

### Gap 2 — No `grant_feature_use_at_waived_cost` effect

The effect of Fleet Step is: **grant the monk use of Step of the Wind without consuming a Bonus Action** (the Focus Point cost of the base Step of the Wind feature presumably still applies, but the BA slot is not charged again).

Existing `ClassFeatureEffect` variants:
- `grant_extra_action` — grants a generic additional action (not a named feature, not a cost-waive)
- `heal_hp` — irrelevant

Neither can represent "invoke feature X without paying its normal action-economy cost." A new effect variant is needed, e.g.:

```typescript
export type GrantNamedFeatureUseEffect = {
  readonly kind: "grant_named_feature_use";
  readonly featureId: string;           // "step_of_the_wind"
  readonly waiveCost: "bonus_action";   // the cost that is waived
};
```

### Gap 3 — No exclusion filter on window triggers

The trigger condition is "a Bonus Action *other than* Step of the Wind." The current surface has no filter grammar on class-feature window triggers. A closed exclusion filter shape is needed, e.g.:

```typescript
export type BonusActionTriggerFilter =
  | { readonly kind: "exclude_feature"; readonly featureId: string };
```

## Atom inventory check

The v4 taxonomy already has `bonus_action_window` (window category) and `activate` (procedure). The subgraph shape needed is:

```
class_feature_root
  → passive_trigger procedure
    → bonus_action_window (filter: exclude step_of_the_wind)
      → grant_named_feature_use (step_of_the_wind, waive: bonus_action)
```

No new v4 *atoms* are required — the missing piece is at the **surface schema level** (no passive trigger family, no named-feature-use effect variant, no trigger filter grammar). Classification is therefore `structural_widening` rather than `atom_widening`.

## Recommended surface changes

1. Add `"passive_trigger"` as a new `ClassFeatureMechanics` family with a `trigger` + `effect` shape.
2. Add `grant_named_feature_use` (or equivalent) to `ClassFeatureTriggerEffect`.
3. Add an optional `filter` field to the bonus-action trigger shape (exclusion list of feature IDs).

These three changes would make Fleet Step, Martial Arts' bonus-unarmed-strike, and similar "conditional passive rider on a turn event" features encodable without fabricating activation/use-count data.
