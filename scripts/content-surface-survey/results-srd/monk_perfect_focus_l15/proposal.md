# Proposal: Widenings for `monk_perfect_focus_l15`

## Unit

**Perfect Focus (Monk L15)**
SRD 5.2.1, `Classes/Monk#Level 15: Perfect Focus`

> When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have 3 or fewer.

---

## Outcome: `structural_widening`

Perfect Focus cannot be honestly encoded against the current surface. The only `ClassFeatureMechanics` family is `"activation"`, which models a player-chosen ability with a declared activation cost, an owned use-count resource, and a reset cadence. Perfect Focus has none of these properties:

- It is **passive** — it fires automatically when Initiative is rolled, not when the player chooses to spend an action or bonus action.
- It modifies a **shared resource pool** (Focus Points, owned by Monk's Focus L2), not a dedicated use count belonging to this feature.
- It requires a **threshold check** on the current Focus Points value (≤ 3).
- It is **conditionally suppressed** by whether a sibling feature (Uncanny Metabolism) was used on the same Initiative roll.

Encoding this as `activation` with `kind: "free"` would produce a trace claiming the monk actively chooses to trigger this effect and consumes a per-feature use count — both of which are false.

---

## Required Widenings

### 1. New class feature family: `passive_trigger`

A new `ClassFeatureMechanics` family for effects that fire automatically on a named game event, without player agency.

```typescript
export type ClassFeaturePassiveTriggerMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "passive_trigger";
  readonly trigger: ClassFeaturePassiveTrigger;
  readonly condition?: ClassFeatureCondition;  // optional conditional gate
  readonly effect: ClassFeaturePassiveEffect;
};
```

Pressure cases that would also fit this family:
- Barbarian Persistent Rage L15 (passive — Rage no longer ends early)
- Fighter Survivor L18 (passive HP regeneration at turn start)
- Barbarian Feral Instinct L7 (passive advantage on Initiative)

### 2. New trigger type: `initiative_roll`

```typescript
export type ClassFeaturePassiveTrigger =
  | { readonly kind: "initiative_roll" }
  | { readonly kind: "turn_start" }
  | { readonly kind: "turn_end" }
  // ... other passive triggers
```

This maps to the `initiative_window` atom in v4 taxonomy (currently used by the tracer for initiative-scoped effects). A surface variant is needed to author it.

### 3. New conditional gate: `resource_below_threshold`

```typescript
export type ClassFeatureCondition =
  | {
      readonly kind: "resource_below_threshold";
      readonly resourceId: string;       // e.g., "focus_points"
      readonly threshold: number;        // exclusive upper bound: ≤ threshold triggers
    }
  | {
      readonly kind: "feature_not_used";
      readonly featureId: string;        // e.g., "monk_uncanny_metabolism_l2"
    }
  | {
      readonly kind: "all_of";
      readonly conditions: ReadonlyArray<ClassFeatureCondition>;
    };
```

Perfect Focus requires both gates simultaneously:
- `resource_below_threshold` (Focus Points ≤ 3)
- `feature_not_used` (Uncanny Metabolism not used this Initiative roll)

### 4. New class feature effect: `refill_resource_to_minimum`

```typescript
export type RefillResourceToMinimumEffect = {
  readonly kind: "refill_resource_to_minimum";
  readonly resourceId: string;    // e.g., "focus_points"
  readonly minimumValue: number;  // restore until the pool reaches this value
};
```

This is distinct from `heal_hp` (HP pool, not a focus point pool) and from rest-based cadence resets (which refill everything, not to a threshold). The semantics are: "if current < minimumValue, restore (minimumValue − current) units."

---

## Atom Impact

No new v4 atoms are required. The `initiative_window` atom already exists in the taxonomy (v4, §4). The tracer would emit:

```
initiative_window → passive_trigger → refill_to_minimum (focus_points, min=4)
```

using existing window, procedure, and resource atom kinds. The widening is entirely at the **surface type** layer (new family, new condition variants, new effect variant), not at the atom taxonomy layer.

---

## Classification Rationale

`structural_widening` (not `surface_widening`) because:
- It is not a variant of an existing shape within the `activation` family
- The unit requires a fundamentally different family (`passive_trigger`) that does not exist
- Multiple surface type additions are forced, none of which can be expressed by extending an existing variant of an existing type
