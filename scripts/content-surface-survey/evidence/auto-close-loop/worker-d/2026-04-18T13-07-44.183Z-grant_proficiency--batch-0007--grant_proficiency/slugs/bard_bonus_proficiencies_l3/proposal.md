# Proposal: bard_bonus_proficiencies_l3

## Outcome: structural_widening

## Unit

> **Bonus Proficiencies (Bard L3)**
> "You gain proficiency with three skills of your choice."

## Why it cannot be encoded today

### Gap 1 — No `passive_grant` class-feature family

`ClassFeatureMechanics` is currently a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` is defined as:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

**Bonus Proficiencies has none of these fields:**

| Field | Applies? | Reason |
|---|---|---|
| `activationCost` | No | The proficiency is permanently granted at level-up, not activated on a turn |
| `resource` (use_count) | No | There is no per-use cap; proficiency is unconditional and permanent |
| `resetCadence` | No | Proficiency never resets; once gained it persists for the character's lifetime |

Forcing the unit into `activation` would require fabricating fields that have no rules basis. That would produce a false trace.

### Gap 2 — `grant_proficiency` missing from `ClassFeatureEffect`

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The v4 taxonomy includes `grant_proficiency` as an effect atom, but it has no corresponding variant in the surface `ClassFeatureEffect` union.

## Proposed widenings

### 1. New class-feature family: `passive_grant`

A `passive_grant` family would cover class features that are permanently conferred at a class level boundary with no activation, no resource, and no reset. Structural shape sketch:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family covers a broad pressure class in the SRD — proficiency grants, language grants, sense grants, and similar permanent level-up bonuses appear across nearly every class.

### 2. New effect variant: `grant_proficiency` in `ClassFeatureEffect`

(Or a new `ClassFeaturePassiveEffect` union, depending on whether passive effects are disjoint from activation effects.)

```typescript
export type GrantProficiencyEffect = {
  readonly kind: "grant_proficiency";
  readonly proficiencyKind: "skill" | "saving_throw" | "weapon" | "armor" | "tool";
  readonly count: number;
  readonly choice: "player_choice" | "fixed";
};
```

For Bonus Proficiencies: `proficiencyKind: "skill"`, `count: 3`, `choice: "player_choice"`.

## Tracer impact

No tracer output was produced — no `.dhall` or `.json` authored — because the structural gap prevents honest encoding. Once `passive_grant` and `grant_proficiency` are added to the surface, this unit should encode cleanly with atoms:

- `class_feature_root`
- `grant_proficiency` (effect)

No windows, resolutions, resources, or scaling atoms required.
