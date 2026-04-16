# Proposal: Widenings required for Roving (Ranger L6)

## Unit

**Roving** — Ranger class feature, acquired at level 6.

> Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed.

## Outcome

`structural_widening`

## Root Gap: No passive family for ClassFeatureMechanics

The entire `ClassFeatureMechanics` type is currently:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

The only family is `"activation"`, which requires `activationCost + resource + resetCadence`. Roving has none of these — it is a permanent passive stat modification that takes effect as soon as the feature is acquired and applies continuously (conditioned on armor type). Forcing it into `activation` with `{ kind: "free" }` cost and a fabricated single-use resource would produce a dishonest trace.

A **`passive` family** is needed:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effects: ReadonlyArray<PassiveClassFeatureEffect>;
  // Optional condition guard evaluated at runtime (e.g., armor restriction)
  readonly condition?: PassiveConditionGuard;
};
```

All three of Roving's effects belong under this family.

## Gap 1: modify_speed not in ClassFeatureEffect

The v4 atom `modify_speed` exists in the taxonomy (Effect atoms, §9). It is not surfaced as a `ClassFeatureEffect` variant.

Roving needs:

```typescript
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly speedType: "walk";   // which speed is modified
  readonly delta: number;       // +10 (ft)
};
```

## Gap 2: grant_alternate_speed not in ClassFeatureEffect

Roving grants Climb Speed and Swim Speed each equal to the character's walking Speed. This is not a flat addend but a **derived assignment** — the granted speed tracks the base walking speed. No existing effect captures "grant a new movement type whose value equals another speed."

A new variant is needed:

```typescript
export type GrantAlternateSpeedEffect = {
  readonly kind: "grant_alternate_speed";
  readonly speedType: "climb" | "swim" | "fly" | "burrow";
  readonly value: { readonly kind: "equal_to_walk_speed" };
};
```

## Gap 3: Conditional (armor-type) guard on passive effects

The Speed bonus is conditional: *"while you aren't wearing Heavy armor."* The surface has no predicate type for passive guards. This is a deterministic, runtime-checkable condition (armor category on the creature), not a roll or save.

A minimal `PassiveConditionGuard` would be:

```typescript
export type ArmorTypeGuard = {
  readonly kind: "not_wearing_armor_category";
  readonly category: "heavy";   // closed enum; "medium" needed for Fast Movement
};

export type PassiveConditionGuard = ArmorTypeGuard; // widen as pressure arrives
```

Note: Barbarian **Fast Movement** (L5) shares the same guard shape (`"while you aren't wearing Heavy armor"`), so this predicate has immediate second-consumer justification.

## Encoding sketch (blocked until families exist)

```
class_feature_root (Roving, ranger L6)
  └─ passive [family]
       ├─ modify_speed (+10 ft, walk)          [condition: not_wearing_armor_category: heavy]
       ├─ grant_alternate_speed (climb = walk)
       └─ grant_alternate_speed (swim  = walk)
```

## Atoms required (all in v4 taxonomy)

| Atom | Category | Status |
|------|----------|--------|
| `class_feature_root` | source | present in surface |
| `modify_speed` | effect | in v4 inventory; **not in ClassFeatureEffect** |
| (unnamed) grant alternate speed | effect | not in v4 inventory; **needs new atom** |

The "grant alternate speed" concept may warrant a new v4 atom distinct from `modify_speed`, since it sets a speed type to a derived value rather than adding a numeric delta to an existing speed.

## Summary

| Gap | Kind | Blocking? |
|-----|------|-----------|
| No `passive` family for ClassFeatureMechanics | `structural_widening` | Yes — nowhere to hang any of the effects |
| `modify_speed` not in ClassFeatureEffect | `surface_widening` | Yes |
| No `grant_alternate_speed` effect | `atom_widening` | Yes |
| No armor-type condition guard | `surface_widening` | Yes (for the conditional on the speed bonus) |

All four gaps must be addressed before this unit can be encoded honestly.
