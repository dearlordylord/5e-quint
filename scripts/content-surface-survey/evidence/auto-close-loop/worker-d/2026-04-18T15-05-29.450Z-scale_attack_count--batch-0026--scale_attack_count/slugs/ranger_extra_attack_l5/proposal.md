# Proposal: ranger_extra_attack_l5

## Outcome

`structural_widening`

## Unit

- **Name:** Extra Attack (Ranger L5)
- **Kind:** `class_feature` / ranger / acquired at level 5
- **Source text:** "You can attack twice instead of once whenever you take the Attack action on your turn."

## Why the current surface cannot encode this honestly

### The only class feature family is `"activation"`

`ClassFeatureMechanics = ClassFeatureActivationMechanics`, which requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

All three fields are mandatory. Extra Attack has none of them:

| Field | Extra Attack | Reason |
|---|---|---|
| `activationCost` | n/a | Not activated; always applies |
| `resource` (use_count) | n/a | Unlimited; not consumed |
| `resetCadence` | n/a | Never expended, never reset |

### `grant_extra_action` is the wrong effect

`ClassFeatureEffect` offers `GrantExtraActionEffect | HealHpEffect`. Neither fits:

- `grant_extra_action` — this is the Action Surge pattern: grants an additional full action on your turn, which the player chooses to spend. Extra Attack does not grant an extra action; it changes how the existing **Attack action** resolves, yielding 2 attack rolls per activation instead of 1. These are mechanically distinct.
- `heal_hp` — obviously inapplicable.

Encoding Extra Attack as `grant_extra_action` would produce a false trace: the graph would imply the player gains an extra action budget, which is wrong. The correct atom from v4 is `scale_attack_count`.

### The passive/always-on shape has no surface representation

Extra Attack is a permanent character-state modifier. It does not fire on an activation event — it is always true whenever the attack action resolves. The surface has no mechanism for expressing "this feature permanently changes a per-action parameter."

## Proposed widening

### 1. New class feature family: `"passive_modifier"`

A new `ClassFeatureMechanicsHeader`-free family for features that permanently modify character behavior without activation semantics:

```typescript
export type ClassFeaturePassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family has no `activationCost`, `resource`, or `resetCadence` because those concepts do not apply to always-on modifiers.

### 2. New effect: `grant_extra_attack` (or reuse `scale_attack_count` atom)

```typescript
export type GrantExtraAttackEffect = {
  readonly kind: "grant_extra_attack";
  // total attacks per Attack action (replaces the default of 1)
  readonly totalAttacks: number | ThresholdTiers<number>;
};
```

This maps directly to the v4 `scale_attack_count` atom.

The v4 taxonomy already documents:
> `scale_attack_count` — **new**. The number of attacks per Attack action grows with level. Example: Extra Attack (2 → 4), Fighter's Two Extra Attacks / Three Extra Attacks.

The atom exists in v4; only the surface type and tracer case are missing.

## Breadth of impact

This widening is required for **every Extra Attack class feature** in the SRD:

| Unit | Class | Level |
|---|---|---|
| Extra Attack | Fighter | 5 |
| Extra Attack | Ranger | 5 |
| Extra Attack | Paladin | 5 |
| Extra Attack | Monk | 5 |
| Two Extra Attacks | Fighter | 11 |
| Three Extra Attacks | Fighter | 20 |

All share the same passive permanent attack-count modifier shape. One family + one effect covers all six.

## No false encoding authored

Per guardrails: no `.dhall`, `.json`, or `.trace.md` files were created. The surface must be widened before this unit can be honestly encoded.
