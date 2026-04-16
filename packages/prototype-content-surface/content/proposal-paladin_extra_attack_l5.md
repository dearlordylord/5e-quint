# Proposal: Extra Attack (paladin L5)

**Outcome:** `surface_widening`

## Unit text

> You can attack twice instead of once whenever you take the Attack action on your turn.

## Why the unit does not fit the current surface

### Problem 1 — No passive ClassFeatureMechanics family

The only existing `ClassFeatureMechanics` family is `"activation"`, defined as:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Extra Attack has none of these:

| Field | Extra Attack | Activation family |
|---|---|---|
| `activationCost` | none — always on | required |
| `resource` | no use count | required |
| `resetCadence` | no rest reset | required |

Extra Attack is a **permanent passive modifier** that changes the Attack action for every use for the rest of the character's career. It cannot be represented as an activation without fabricating a resource structure that has no SRD basis.

### Problem 2 — No ClassFeatureEffect for extra weapon attacks

The existing `ClassFeatureEffect` variants are:
- `GrantExtraActionEffect` — grants an extra *full action* (Action Surge semantics)
- `HealHpEffect` — heals HP

Neither captures "grant an extra weapon attack within the Attack action." This is a distinct mechanic: the Attack action itself now resolves 2 weapon attacks instead of 1.

The v4 taxonomy already names the correct atom: **`scale_attack_count`**. The gap is at the surface type level — there is no `ClassFeatureEffect` variant that maps to this atom.

## Proposed widenings

### 1. New `ClassFeatureMechanics` family: `"passive"`

A `"passive"` family for features that permanently alter character mechanics without activation or resource gates. Shape sketch:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

### 2. New effect variant: `grant_extra_attack`

A `ClassFeaturePassiveEffect` (or extension of `ClassFeatureEffect`) for scaling attack count:

```typescript
export type GrantExtraAttackEffect = {
  readonly kind: "grant_extra_attack";
  // Total attacks per Attack action at this level.
  readonly totalAttacks: number;
};
```

This maps to the v4 `scale_attack_count` atom. `totalAttacks: 2` encodes the L5 Extra Attack across all classes (paladin, fighter, ranger, barbarian, monk). Higher-level Fighter upgrades (Two Extra Attacks at L11 → 3, Three Extra Attacks at L20 → 4) would use the same effect with higher `totalAttacks` values.

## Scope

The same two widenings unblock all cross-class Extra Attack features in the survey queue:
- `paladin_extra_attack_l5`
- `fighter_extra_attack_l5`
- `ranger_extra_attack_l5`
- `barbarian_extra_attack_l5`
- `monk_extra_attack_l5`
- `fighter_two_extra_attacks_l11`
- `fighter_three_extra_attacks_l20`

The v4 taxonomy is already correct. This is a surface schema gap only.
