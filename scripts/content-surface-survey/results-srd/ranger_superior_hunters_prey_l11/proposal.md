# Proposal: Superior Hunter's Prey (ranger L11)

**Outcome**: `structural_widening`  
**Slug**: `ranger_superior_hunters_prey_l11`

## Unit Text

> Once per turn when you deal damage to a creature marked by your *Hunter's Mark*, you can also deal that spell's extra damage to a different creature that you can see within 30 feet of the first creature.

## Why It Doesn't Fit

### 1. No passive-trigger class feature family

`ClassFeatureMechanics` has exactly one family: `activation`. The `activation` shape requires:
- `activationCost` — a deliberate player choice (action, bonus action, or free)
- `resource` — a `use_count` with a numeric cap
- `resetCadence` — a rest-based refill

Superior Hunter's Prey has none of these. The feature fires automatically when a game event occurs (dealing damage to a marked target). The "once per turn" constraint is a cooldown, not a resource that resets on rest. There is no deliberate activation step.

**Required widening**: A new `ClassFeatureMechanics` family — call it `passive_rider` — for features that modify or extend existing mechanics without explicit player activation and without a rest-based resource pool.

### 2. No damage-event trigger for class features

The trigger predicate is "when you deal damage to a creature marked by your Hunter's Mark." This is:
- Not an action decision boundary (so not `activationCost: free`)
- Not an attack-roll hit (so not `on_hit_window`)
- Conditioned on target state (carrying the Hunter's Mark mark from a specific spell)

A new trigger kind is needed, tentatively:

```typescript
export type ClassFeatureTrigger =
  | { readonly kind: "on_damage_window"; readonly condition: "target_marked_by_unit"; readonly unitId: string }
```

### 3. No "once per turn" reset cadence or usage limit for class features

`RestResetCadence` has four variants: `short_or_long_rest`, `long_rest`, `short_rest`, `partial_short_full_long`. None model a per-turn cooldown.

`MasteryUsageLimit` has `once_per_turn` but it is typed exclusively for `MasteryMechanics`. The same concept needs to be available to class feature passive riders.

**Required widening**: A `ClassFeatureUsageLimit` type (or extend the existing `MasteryUsageLimit` to be shared) that includes `{ kind: "once_per_turn" }`.

### 4. No cross-unit damage reference

The damage amount is not a fresh DiceExpr — it is "that spell's extra damage," meaning the Hunter's Mark `DamageOnHitOperation.amount` (1d6 Force, authored in `hunters_mark.json`). No effect type in the surface can represent a damage amount that is a reference to another unit's authored damage expression.

A new effect kind is needed:

```typescript
export type DamageCrossRefEffect = {
  readonly kind: "damage_cross_ref";
  readonly sourceUnitId: string;           // "hunters_mark"
  readonly sourceOperationKind: "damage_on_hit";
};
```

### 5. No secondary-target selection for class feature effects

The effect targets "a different creature within 30 feet of the first creature." `SecondaryTargetSelection` exists in `GrantWeaponAttackRider` (mastery only) with constraint `within_5ft_and_reach`. A new selection shape is needed for range-limited secondary targets:

```typescript
export type SecondaryTargetByRange = {
  readonly kind: "secondary_creature_within_range";
  readonly rangeFeet: number;     // 30
};
```

## Proposed Surface Shape

```typescript
export type ClassFeatureTrigger = {
  readonly kind: "on_damage_window";
  readonly condition: "target_marked_by_unit";
  readonly unitId: string;
};

export type ClassFeatureUsageLimit = { readonly kind: "once_per_turn" };

export type DamageCrossRefEffect = {
  readonly kind: "damage_cross_ref";
  readonly sourceUnitId: string;
  readonly sourceOperationKind: "damage_on_hit";
  readonly target: {
    readonly kind: "secondary_creature_within_range";
    readonly rangeFeet: number;
  };
};

export type PassiveRiderMechanics = {
  readonly family: "passive_rider";
  readonly trigger: ClassFeatureTrigger;
  readonly usageLimit: ClassFeatureUsageLimit;
  readonly effect: DamageCrossRefEffect;
};

export type ClassFeatureMechanics = ClassFeatureActivationMechanics | PassiveRiderMechanics;
```

## v4 Atom Impact

All five widenings are **surface-level** (new type variants / new family shape). The required v4 atoms already exist:
- `on_hit_window` or a new `on_damage_window` — the trigger window
- `damage` — the effect atom
- The secondary target is modeled with the existing `target` attachment atom

However, the tracer would need a new branch for `passive_rider` mechanics, and a new edge/atom for the cross-unit damage reference (`damage_cross_ref`), which is not in the v4 atom inventory. The cross-unit reference is a new kind of relation not captured by any existing relation type.

**Classification**: `structural_widening` — the `passive_rider` family does not exist in `ClassFeatureMechanics`, and a cross-unit damage reference has no precedent in any existing surface type or v4 atom.
