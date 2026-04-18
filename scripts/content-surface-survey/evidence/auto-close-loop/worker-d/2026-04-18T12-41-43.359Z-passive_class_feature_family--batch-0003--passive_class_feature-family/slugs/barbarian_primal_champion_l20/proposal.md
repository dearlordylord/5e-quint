# Proposal: barbarian_primal_champion_l20

## Outcome: `structural_widening`

## Unit

**Name:** Primal Champion (Barbarian L20)  
**Kind:** `class_feature`  
**SRD text:**

> You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25.

## Why it doesn't fit

### Gap 1 — No passive class-feature family

`ClassFeatureMechanics` has exactly one family:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

`ClassFeatureMechanicsHeader` mandates `activationCost`, `resource`, and `resetCadence`. Primal Champion has none of these:

| Field | SRD says | What exists |
|---|---|---|
| `activationCost` | No action required — passive | requires `free` or `bonus_action` |
| `resource` | No resource consumed | requires `use_count` |
| `resetCadence` | No rest reset — it's permanent | requires a rest kind |

Forcing `activationCost: { kind: "free" }` + a placeholder `resource` + `resetCadence` would fabricate mechanics absent from the SRD. The SRD text describes a one-time permanent increase at level 20, not a per-rest activated ability.

### Gap 2 — No `modify_ability_score` effect atom

`ClassFeatureEffect` is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither branch applies. The required effect is "increase STR and CON each by 4, capping at 25." The v4 atom inventory (TAXONOMY_atoms_graph.md §12) explicitly records `modify_ability_score as a runtime effect` as a residue candidate marked **out-of-scope for the core mechanics graph**. Primal Champion is the clearest barbarian-class pressure case for promoting it.

## What widening is needed

### 1. New `ClassFeatureMechanics` family: `passive`

A minimal passive family would require no activation machinery:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: PassiveClassFeatureEffect;
};
```

This covers features that take effect automatically at the moment of level-up (or on acquisition) with no turn-level action economy cost. Examples beyond Primal Champion: Indomitable Might (L18), some species traits modeled as class features.

### 2. New effect atom: `modify_ability_score`

```typescript
export type ModifyAbilityScoreEffect = {
  readonly kind: "modify_ability_score";
  readonly scores: ReadonlyArray<Ability>;  // which scores are raised
  readonly delta: number;                    // additive amount
  readonly cap?: number;                     // optional hard maximum
};
```

For Primal Champion: `scores: ["str", "con"]`, `delta: 4`, `cap: 25`.

The cap is a first-class field because SRD 5.2.1 consistently pairs ability-score boosts at high levels with a raised maximum (usually 25 or 30 for epic features), which differs from the normal 20 cap. Without modeling the cap, the atom would be incomplete.

### 3. Updated `ClassFeatureEffect` union

```typescript
export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | ModifyAbilityScoreEffect;   // new
```

## Tracer impact

No new atom in v4, so the tracer would need a new branch in `traceClassFeatureEffect` for `modify_ability_score`. The atom category would be `effect`. A minimal v4 label could be `modify_ability_score` (new), traced as:

```
class_feature_root → activate (passive) → modify_ability_score (+4 STR, CON, cap 25)
```

Or, if the passive family is modeled as a non-procedure source directly:

```
class_feature_root → modify_ability_score (+4 STR, CON, cap 25)
```

## Files NOT written

Per protocol: no `.dhall`, no `.json`, no `.trace.md`. The unit cannot be honestly encoded in any current surface shape.
