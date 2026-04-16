# Proposal: Widenings for Tactical Shift (Fighter L5)

## Unit

**Name:** Tactical Shift (Fighter L5)  
**Kind:** `class_feature` / fighter / acquired at level 5  
**Source text:**
> Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks.

## Outcome

`structural_widening`

## Why the unit does not fit

### 1. Missing family: passive rider on another feature's activation

The only existing `ClassFeatureMechanics` family is `"activation"`. That family requires three fields:

```typescript
type ClassFeatureMechanicsHeader = {
  activationCost: ClassFeatureActivationCost;  // how the player pays to activate THIS feature
  resource: UseCountResource;                   // how many times THIS feature can be used
  resetCadence: RestResetCadence;              // when THIS feature's uses reset
};
```

Tactical Shift does not have any of these. It is not independently activated. It fires automatically as a conditional bonus when the player activates Second Wind. There is no separate activation cost, no separate use count, and no separate reset cadence — the feature is stateless relative to the engine; it just modifies what happens when Second Wind fires.

Encoding it with a fake `use_count: { kind: "fixed", uses: 1 }` and `resetCadence: { kind: "short_or_long_rest" }` would imply the move can only be used once between rests regardless of how many times Second Wind is activated, which is wrong.

**What is needed:** A new family variant for class features, tentatively `"on_use_trigger"`, that models "when feature X is activated, the bearer may also do Y." The header would include:
- `triggeredBy: string` — id of the feature whose activation opens the window  
- `effect: ClassFeatureEffect` — the rider effect

### 2. Missing surface shape: `grant_movement` in `ClassFeatureEffect`

The effect is: move up to half Speed without provoking Opportunity Attacks.

Current `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. Neither covers movement.

The v4 atom inventory has:
- `move` (effect atom) — movement grant
- `deny_opportunity_attack` (effect atom) — suppresses OA provocation

Both atoms exist in the taxonomy. They are simply not exposed through any surface shape in `ClassFeatureEffect`.

**What is needed:** A new `ClassFeatureEffect` variant, tentatively:

```typescript
export type GrantMovementEffect = {
  readonly kind: "grant_movement";
  readonly amount: "half_speed" | "full_speed";
  readonly denyOpportunityAttacks: boolean;
};
```

## Proposed widenings summary

| # | Kind | Name | Atoms involved |
|---|------|------|----------------|
| 1 | `new_subgraph` | `on_use_trigger` family for `ClassFeatureMechanics` | `activate`, `on_use_trigger` (new window atom candidate) |
| 2 | `new_variant` | `grant_movement` in `ClassFeatureEffect` | v4 `move`, v4 `deny_opportunity_attack` |

Both widenings are required. Widening 2 alone is not sufficient because the family blocker (widening 1) prevents honest encoding regardless of effect coverage.

## Related patterns

This "on-use rider" pattern appears elsewhere in the SRD and will recur:
- Barbarian **Instinctive Pounce** (L7): when you enter Rage, you can move up to half Speed — the same structural shape.
- Monk **Uncanny Metabolism** (L2): when you roll Initiative, you regain one Focus Point — another on-use rider.

The `on_use_trigger` family is not unique to Tactical Shift; it represents a recurring class-feature shape worth modeling as a first-class family.
