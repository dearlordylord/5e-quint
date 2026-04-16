# Proposal: Fast Movement (barbarian L5)

## Outcome: structural_widening

## Unit

> **Level 5: Fast Movement**
> Your speed increases by 10 feet while you aren't wearing Heavy armor.

## Why it doesn't fit

### Gap 1 — Missing `passive` class-feature family (structural)

`ClassFeatureMechanics` is currently a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` inherits `ClassFeatureMechanicsHeader`, which has three required fields:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Fast Movement has none of these. It is always-on — no activation cost, no use count, no reset. There is no honest way to fill these fields. Encoding it as `activation` with `kind: "free"` and a fake `use_count` would produce a false trace that implies the feature is gated by a resource pool and a rest cycle.

**Required addition:** A new `passive` family (or equivalently `always_on`) for class features that are permanently active:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

### Gap 2 — `modify_speed` missing from `ClassFeatureEffect` (surface widening)

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`modify_speed` is a v4 atom (section 9 of TAXONOMY_atoms_graph.md) but is not surfaced in `ClassFeatureEffect`. A passive speed modifier needs it:

```typescript
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly delteFeet: number;
};
```

### Gap 3 — No conditional predicate on passive effects (surface widening)

The bonus fires only "while you aren't wearing Heavy armor." The surface has no mechanism to express a runtime gate on a passive modifier. At minimum, a closed `PassiveCondition` predicate enum is needed:

```typescript
export type PassiveCondition =
  | { readonly kind: "not_wearing_armor_category"; readonly category: "heavy" | "medium" | "light" }
  | { readonly kind: "always" };
```

This predicate would attach to the passive effect and be evaluated each turn by the projection layer.

## Proposed shape (pending all three additions)

```dhall
{ kind = "class_feature"
, id = "barbarian_fast_movement_l5"
, name = "Fast Movement"
, className = "barbarian"
, acquiredAtLevel = 5
, provenance = { kind = "srd-5.2.1", section = "Classes/Barbarian#Level 5: Fast Movement" }
, description = "Your speed increases by 10 feet while you aren't wearing Heavy armor."
, mechanics =
    { family = "passive"
    , effect =
        { kind = "modify_speed"
        , delteFeet = 10
        , condition = { kind = "not_wearing_armor_category", category = "heavy" }
        }
    }
}
```

## Priority assessment

The `passive` family gap is **high pressure** — many class features are passive (Unarmored Defense, Danger Sense, Extra Attack's attack-count boost, Feral Instinct, etc.). This widening will recur frequently as the barbarian feature list is encoded.

`modify_speed` is also reusable across multiple features (Monk Unarmored Movement, Ranger Roving, Longstrider spell if modeled as a feature rider, etc.).

The armor-category predicate is narrower but will also recur for Unarmored Defense, Unarmored Movement, and similar "while not wearing armor" conditionals.
