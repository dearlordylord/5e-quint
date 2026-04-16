# Proposal: `subclass_selection` ClassFeatureMechanics Family

## Unit
`cleric_cleric_subclass_l3` — "Cleric Subclass (cleric L3)"

## Gap

The unit's text is:

> "You gain a Cleric subclass of your choice. A subclass is a specialization that grants you features at certain Cleric levels. For the rest of your career, you gain each of your subclass's features that are of your Cleric level or lower."

This is a **class-progression gate** — a permanent, one-time character-building decision made at level 3. It has no:
- Activation cost (it is not activated; it happens automatically on leveling)
- Use-count resource or reset cadence
- Mechanical effect expressible as `GrantExtraActionEffect | HealHpEffect`

The current `ClassFeatureMechanics` discriminated union has exactly one member:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect; // GrantExtraActionEffect | HealHpEffect
};
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

There is no honest way to force "choose a subclass" into this shape.

## Proposed widening

Add a new `ClassFeatureMechanics` family:

```typescript
export type SubclassSelectionMechanics = {
  readonly family: "subclass_selection";
  // No activation cost, resource, or effect — this is a permanent
  // character-building gate. The subclass features that follow are
  // separate UnitRecords encoded individually.
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | SubclassSelectionMechanics;
```

The `ClassFeatureRecord` shape is otherwise unchanged: `className` and `acquiredAtLevel` already carry the context needed to identify when and for which class the selection occurs.

The tracer would need a new branch:

```typescript
case "subclass_selection":
  // Emit a single class_feature_root node — nothing further to trace.
  // The subclass's own features are separate traced units.
  return procId; // or a no-op procedure node
```

## Scope

This gap is identical for every class's "gain a subclass" entry at level 3 (and equivalent subclass-expansion levels). Affected slugs in the current survey queue include:

- `barbarian_barbarian_subclass_l3`
- `bard_bard_subclass_l3`
- `cleric_cleric_subclass_l3` (this unit)
- `druid_druid_subclass_l3`
- `fighter_fighter_subclass_l3`
- `monk_monk_subclass_l3`
- `paladin_paladin_subclass_l3`
- `ranger_ranger_subclass_l3`
- `rogue_rogue_subclass_l3`
- `sorcerer_sorcerer_subclass_l3`
- `warlock_warlock_subclass_l3`
- `wizard_wizard_subclass_l3`

A single widening resolves all twelve simultaneously.

## Classification
`structural_widening` — the family/kind is missing, not a variant of an existing shape or a new atom.
