# Widening Proposal: Nature's Ward (druid L10)

**Outcome:** `structural_widening`

## Unit text

> You are immune to the Poisoned condition, and you have Resistance to a damage type associated
> with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.

## Why the unit does not fit the current surface

`ClassFeatureMechanics` is currently defined as a single union member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` inherits from `ClassFeatureMechanicsHeader`, which mandates:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Nature's Ward has **none of these**. It is:

- **Not activated** — there is no cost, no decision point, no timing; it is always active.
- **Not resource-gated** — there is no use count, no charge pool, no quota.
- **Not reset-cadenced** — it never expires or resets; it is permanent for as long as the druid is level 10+ in the Circle of the Land subclass.

Encoding it as `activation` with `activationCost: { kind: "free" }` and a fabricated `use_count` resource would produce a demonstrably false trace (the tracer would emit `activate`, `use_count`, and `rest_window` nodes that have no grounding in the SRD text).

## Required widenings

### 1. New `passive` family in `ClassFeatureMechanics` (structural)

A new family covering always-on features that grant permanent effects without activation:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;  // see below
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

Other candidate members for the same family in the SRD corpus: Unarmored Defense (monk), Evasion (rogue, monk), Feral Instinct (barbarian), Aura of Protection (paladin), Proficiency Bonus scaling features.

### 2. `grant_resistance` in `ClassFeatureEffect` / new `ClassFeaturePassiveEffect` (surface widening)

`grant_resistance` is present as a v4 atom but is not reachable from any class feature effect type. A passive effect union needs to include it:

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType | FeatureLinkedResistance;
};
```

### 3. New atom: `grant_condition_immunity` (atom widening)

`remove_condition` ends an active condition. Condition immunity prevents the condition from being applied in the first place — a distinct runtime state. v4 does not have this atom. Proposed addition to the Effect Atoms section:

- `grant_condition_immunity` — the bearer cannot acquire the named condition. Distinct from `remove_condition` (reactive removal) and from `apply_condition` (the inverse).

Evidence: _"You are immune to the Poisoned condition"_ — the SRD uses "immune" as a categorical prevention, not a repeated removal.

### 4. Feature-linked resistance selection (surface widening)

The resistance type is not fixed at authoring time — it is bound to the druid's current land choice from Circle Spells. This requires a new surface variant (or a projection mechanism) that can express "the resistance type is determined by another feature's runtime selection":

```typescript
export type FeatureLinkedResistance = {
  readonly kind: "feature_linked";
  readonly featureId: string;  // e.g. "druid_circle_of_the_land_spells_l3"
};
```

This is analogous to how a spell slot level parameterizes upcasting, but the parameter source is a character-build selection rather than a cast-time decision. Whether this is a surface shape or a deeper architecture question (projection vs. authoring) should be resolved before closing this widening.

## What was NOT attempted

No `.dhall` source and no `.json` artifact were written. There is no surface family that can honestly contain this unit, so creating a placeholder record would produce a misleading trace with fabricated activation atoms.
