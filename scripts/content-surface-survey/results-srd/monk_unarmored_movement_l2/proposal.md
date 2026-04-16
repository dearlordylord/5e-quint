# Proposal: Widening for `monk_unarmored_movement_l2`

**Outcome:** `structural_widening`

---

## Unit summary

> Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield. This bonus increases when you reach certain Monk levels, as shown on the Monk Features table.

Unarmored Movement is a **passive, always-on conditional bonus** to walking speed, scaling by monk class level.

---

## Why the unit does not fit

### 1. No passive family in `ClassFeatureMechanics`

The only current family is `activation`, which structurally requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Unarmored Movement has **none** of these. It is not activated (no action or bonus action cost), it has no use count (it is always on), and it has no reset cadence (it doesn't expire). Encoding it as `activation` with `activationCost: free` and a sentinel use count would produce a false trace claiming the monk "activates" Unarmored Movement and consumes a resource each time.

### 2. `ClassFeatureEffect` is missing `modify_speed`

The current union:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The effect here is a walking speed increase — the v4 atom `modify_speed` — which is not representable in the current union.

### 3. No enablement condition predicate

The bonus fires only while the monk is **not wearing armor and not wielding a Shield**. The surface has no predicate type to gate an always-on effect on an equipment state. This is structurally distinct from a save gate or target filter.

---

## Proposed widenings

### A. New `passive_conditional` family (structural)

Add a second `ClassFeatureMechanics` family for features that are permanently active given a condition:

```typescript
export type PassiveConditionalMechanics = {
  readonly family: "passive_conditional";
  readonly condition: EnablementCondition;   // see §C
  readonly effect: ClassFeaturePassiveEffect; // widened union (see §B)
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | PassiveConditionalMechanics;
```

Graph shape: `class_feature_root → persist → <effect atoms> (while condition holds)`

### B. New `modify_speed` variant in `ClassFeatureEffect` (surface)

```typescript
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly feetDelta: ThresholdTiers<number> | LinearPerLevel<number> | number;
  readonly speedKind: "walk" | "climb" | "swim" | "fly" | "all";
};
```

For Unarmored Movement:
- `speedKind: "walk"`
- `feetDelta`: `ThresholdTiers<number>` with `axis: "class"`:
  - base: 10
  - tiers: L6→15, L10→20, L14→25, L18→30

This also serves Barbarian Fast Movement (L5 +10 ft walk, while not wearing heavy armor) and Ranger Roving.

### C. New `EnablementCondition` predicate type (surface)

```typescript
export type EnablementCondition =
  | { readonly kind: "not_wearing_armor" }
  | { readonly kind: "not_wielding_shield" }
  | {
      readonly kind: "all_of";
      readonly conditions: ReadonlyArray<EnablementCondition>;
    };
```

Unarmored Movement uses `all_of: [not_wearing_armor, not_wielding_shield]`.

This same type would serve Monk Unarmored Defense, Barbarian Unarmored Defense, and other armor-conditional features without duplication.

---

## Comparable features that need the same widening

| Feature | Family needed | Effect needed | Condition needed |
|---|---|---|---|
| Monk Unarmored Movement L2 | `passive_conditional` | `modify_speed` | not_wearing_armor + not_wielding_shield |
| Barbarian Fast Movement L5 | `passive_conditional` | `modify_speed` | not_wearing_heavy_armor |
| Ranger Roving L6 | `passive_conditional` | `modify_speed` | (unconditional) |
| Monk Unarmored Defense L1 | `passive_conditional` | `modify_ac` (formula) | not_wearing_armor + not_wielding_shield |

The `passive_conditional` family has significant pressure across multiple classes. It should be promoted in the next widening pass.

---

## Tracer implications

Once the widening lands, the tracer should emit for Unarmored Movement:

```
class_feature_root
  → persist (always-on)
    → modify_speed (walk, +10 ft)
      → scale_numeric_bonus (axis=class, tiers L6/10/14/18)
    → enablement_condition (not_wearing_armor ∧ not_wielding_shield)
```

No new v4 atoms are needed beyond `modify_speed` (already in the v4 inventory). The only atom used is `persist` (already in the taxonomy under Lifecycle Atoms) and `modify_speed` (already in Effect Atoms). All gaps are at the **surface type** and **family** level, not at the atom taxonomy level.
