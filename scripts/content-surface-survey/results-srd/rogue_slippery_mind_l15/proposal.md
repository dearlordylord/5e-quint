# Proposal: Widening for Slippery Mind (rogue L15)

## Unit

**Slippery Mind** — Rogue level 15 class feature  
SRD 5.2.1, Classes/Rogue#Level 15: Slippery Mind

> "Your cunning mind is exceptionally difficult to control. You gain proficiency in Wisdom and Charisma saving throws."

## Why It Does Not Fit

The current `ClassFeatureMechanics` type is a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:
- `activationCost` — how the player invokes it
- `resource` — what use-count pool it draws from
- `resetCadence` — when the pool refills
- `effect` — one of `GrantExtraActionEffect | HealHpEffect`

Slippery Mind has **none of these**. It is a permanent trait granted at character level 15. It cannot be invoked; there is no resource to consume; there is nothing to reset. Encoding it as `activation` with `activationCost: free` and a placeholder effect would produce a false trace that implies player agency and a resource lifecycle that do not exist.

Additionally, even if a passive family were available, `ClassFeatureEffect` has no `grant_proficiency` variant. The v4 taxonomy lists `grant_proficiency` as a valid effect atom (§9), but it is absent from the TypeScript surface.

## Required Widenings

### 1. `ClassFeaturePassiveMechanics` — new class-feature family

A new family for permanently-granted class features with no activation lifecycle:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family omits `activationCost`, `resource`, and `resetCadence` — they are inapplicable to permanently-granted traits.

Other passive rogue features that would use this pattern: Thieves' Cant (L1), Reliable Talent (L7), Elusive (L18).

### 2. `GrantProficiencyEffect` — new variant of `ClassFeatureEffect` (or `ClassFeaturePassiveEffect`)

```typescript
export type GrantProficiencyEffect = {
  readonly kind: "grant_proficiency";
  readonly proficiencyKind: "saving_throw" | "skill";
  readonly abilities: ReadonlyArray<Ability>;   // for saving_throw
  // skill names would go in a separate field; omitted here
};
```

Maps to v4 atom `grant_proficiency` (§9 Effect Atoms). Slippery Mind would use:
```
{ kind: "grant_proficiency", proficiencyKind: "saving_throw", abilities: ["wis", "cha"] }
```

## Tracer Impact

Once `ClassFeaturePassiveMechanics` and `GrantProficiencyEffect` are added:
- The tracer's `traceClassFeatureMechanics` switch needs a `"passive"` arm
- `traceClassFeatureEffect` needs a `"grant_proficiency"` arm emitting a `grant_proficiency` atom node

## Classification

- **outcome**: `structural_widening`  
- **confidence**: `high`

The feature is unambiguously passive and permanent. No surface-level variant of the existing `activation` family can represent it honestly.
