# Proposal: Indomitable Might (Barbarian L18) — Structural Widening

## Unit

**Name:** Indomitable Might  
**Kind:** class_feature (barbarian L18)  
**Provenance:** srd-5.2.1, Classes/Barbarian#Level 18: Indomitable Might

> If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.

---

## Why it does not fit

### Gap 1 — Missing class feature family: `passive`

`ClassFeatureMechanics` has exactly one family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation"
```

`ClassFeatureActivationMechanics` structurally requires:

- `activationCost` — Indomitable Might has none; it fires automatically.
- `resource: UseCountResource` — there is no use count; it is unlimited.
- `resetCadence: RestResetCadence` — there is nothing to reset.

Indomitable Might is **permanently active** for the character's lifetime. Forcing it into `"activation"` would misrepresent it as a discrete activated ability with a resource gate.

**Proposed widening:** A new `"passive"` (or `"always_on"`) family for `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

No `activationCost`, `resource`, or `resetCadence` fields — the feature simply exists as a permanent property of the creature.

---

### Gap 2 — Missing effect variant: ability-score floor on roll totals

The mechanic is: **when a Strength check or Strength saving throw total is less than the barbarian's Strength score, substitute the Strength score for the total.**

Formally: `effective_total = max(roll_total, STR_score)`

This is a conditional floor keyed to an ability score. The current `ClassFeatureEffect` union is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant can express this. The v4 taxonomy includes `modify_roll_substitute`, which is the closest atom, but:

1. It is not surfaced in `ClassFeatureEffect`.
2. Even if it were, the substitute source ("own ability score, evaluated at roll-time") is a new grammar variant — current `modify_roll_substitute` usage (e.g., Glibness-style) substitutes a fixed value or a different roll, not a dynamic ability-score reference.

**Proposed widening:** A new `ClassFeaturePassiveEffect` variant (or extension of `ClassFeatureEffect`) for ability-score-floor on rolls:

```typescript
export type AbilityScoreFloorEffect = {
  readonly kind: "ability_score_floor";
  // Which roll categories the floor applies to
  readonly on: ReadonlyArray<"ability_check" | "saving_throw">;
  // Which ability score provides the floor
  readonly ability: Ability;
  // Optionally restrict to checks/saves of a specific ability
  readonly restrictToAbility?: Ability;
};
```

For Indomitable Might: `on: ["ability_check", "saving_throw"]`, `ability: "str"`, `restrictToAbility: "str"`.

---

## Atom-level mapping (when widening is implemented)

| v4 atom | role |
|---|---|
| `class_feature_root` | source root |
| `modify_roll_substitute` (extended) | the floor substitution effect |

Relations: `roots`, `grants`, `attaches_to`

The subgraph is minimal — one root, one passive effect, no windows or resources.

---

## Classification

- **Outcome:** `structural_widening`
- **Confidence:** high
- **Primary gap:** Missing `"passive"` family in `ClassFeatureMechanics`
- **Secondary gap:** Missing ability-score-floor variant in `ClassFeatureEffect` / `modify_roll_substitute`

Both gaps must be closed before this unit can be honestly encoded. The passive family is the blocker; the effect variant is a prerequisite for the tracer to emit a meaningful graph.
