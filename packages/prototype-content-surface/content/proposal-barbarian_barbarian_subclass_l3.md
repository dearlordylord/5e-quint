# Proposal: structural_widening for `barbarian_barbarian_subclass_l3`

## Unit

**Name:** Barbarian Subclass (barbarian L3)  
**Kind:** class_feature  
**Provenance:** srd-5.2.1 — Classes/Barbarian.md § Level 3: Barbarian Subclass

## Source text

> You gain a Barbarian subclass of your choice. The Path of the Berserker subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass's features that are of your Barbarian level or lower.

## Why encoding fails

The current `ClassFeatureMechanics` union has exactly one member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:
- `activationCost` — free or bonus_action
- `resource` — UseCountResource (use_count with cap)
- `resetCadence` — when the resource refills
- `effect` — GrantExtraActionEffect | HealHpEffect

This feature has **none** of those. It is a passive, permanent, one-time character-build decision:

- No action taken (not an activation).
- No resource consumed (no use-count, no pool).
- No reset cadence (nothing refills because nothing is spent).
- The "effect" is gaining access to a subclass tree — not covered by any current `ClassFeatureEffect` variant.

Forcing this into `activation` would require fabricating an activationCost (`free`), a use-count cap and reset (e.g., fixed/1 + long_rest), and one of two effects — all of which would produce a false trace.

## Proposed widenings

### 1. New ClassFeatureMechanics family: `passive_grant`

A second mechanics family alongside `activation` for features that are acquired permanently and never activated:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family would cover:
- Subclass selection (this unit and all 11 parallel "subclass" features across classes)
- Ability Score Improvement selection
- Fighting Style selection
- Any "you gain X permanently" feature with no activation cost and no resource pool

### 2. New ClassFeatureEffect variant: `grant_subclass_access`

```typescript
export type GrantSubclassAccessEffect = {
  readonly kind: "grant_subclass_access";
  readonly subclassChoiceOf: ClassName;
  // Features are acquired at or below the character's current class level.
};
```

This atom represents: the character selects a subclass at acquisition time, and thereafter gains each subclass feature whose required level is ≤ their current class level.

The closest v4 atom is `grant_spell_access` (which grants access to a spell list), but subclass features are not spells and the acquisition rule (level-gated automatic unlock) is structurally different from spell learning.

### 3. Tracer branch for `passive_grant`

`traceClassFeatureMechanics` would need a `case "passive_grant"` branch in its switch that emits `class_feature_root → activate (or a new `unlock` procedure atom?) → grant_subclass_access → subclass_feature_root`.

The procedure atom `activate` is technically wrong for a passive unlock — the v4 taxonomy has `grant` as a procedure atom that might map here better.

## Cross-class impact

The same `structural_widening` applies to all "subclass" class features in the survey corpus:

- bard_bard_subclass_l3
- cleric_cleric_subclass_l3
- druid_druid_subclass_l3
- fighter_fighter_subclass_l3
- monk_monk_subclass_l3
- paladin_paladin_subclass_l3
- ranger_ranger_subclass_l3
- rogue_rogue_subclass_l3
- sorcerer_sorcerer_subclass_l3
- warlock_warlock_subclass_l3
- wizard_wizard_subclass_l3

A single `passive_grant` + `grant_subclass_access` widening unblocks all of them.

## Minimum viable widening

1. Add `passive_grant` as a second `ClassFeatureMechanics` family with a `ClassFeaturePassiveEffect` union.
2. Add `grant_subclass_access` as the first `ClassFeaturePassiveEffect` variant.
3. Extend the tracer's `traceClassFeatureMechanics` switch to handle `"passive_grant"`.

No existing types.ts types need modification — this is a pure extension.
