# Proposal: `rogue_rogue_subclass_l3` — structural_widening

## Unit

**Name**: Rogue Subclass (rogue L3)  
**Kind**: `class_feature`  
**Provenance**: SRD 5.2.1 — `Classes/Rogue.md#Level 3: Rogue Subclass`

> You gain a Rogue subclass of your choice. The Thief subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Rogue levels. For the rest of your career, you gain each of your subclass's features that are of your Rogue level or lower.

## Why it does not fit

The only `ClassFeatureMechanics` family in `types.ts` is:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

`ClassFeatureMechanicsHeader` mandates:
- `activationCost` — this feature is not activated on a turn.
- `resource: UseCountResource` — there is no use-count resource.
- `resetCadence: RestResetCadence` — there is no rest-based reset.

Encoding this as `activation` would require fabricating an `activationCost`, a `use_count` cap, and a rest reset cadence that do not exist in the SRD text. The feature is a **one-time level-up selection**, not a combat action.

No existing `ClassFeatureEffect` kind covers it either:
- `grant_extra_action` — wrong; this is not an extra action.
- `heal_hp` — wrong; no HP is restored.

## Required widening

### New `ClassFeatureMechanics` family: `subclass_selection`

```typescript
export type SubclassSelectionMechanics = {
  readonly family: "subclass_selection";
  // The subclass pool is open (player choice); the actual subclass
  // features are resolved at the subclass level, not here.
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | SubclassSelectionMechanics;
```

This family carries no activation cost, no resource, and no reset cadence. Its entire mechanic is: "at this level, the player permanently selects a named subclass and gains its feature track."

### Alternative: `passive` family with `grant_subclass` effect

If a broader `passive` family is introduced for features that are always-on or one-time grants (e.g., Expertise, Thieves' Cant), a `grant_subclass` effect could sit inside it:

```typescript
export type GrantSubclassEffect = {
  readonly kind: "grant_subclass";
  readonly className: ClassName;
};
```

The `passive` family approach would also cover other non-activatable features (proficiency grants, language grants, etc.) and may be more reusable.

## Scope

This gap affects every subclass-selection feature across all 12 classes:
- `barbarian_barbarian_subclass_l3`
- `bard_bard_subclass_l3`
- `cleric_cleric_subclass_l3`
- `druid_druid_subclass_l3`
- `fighter_fighter_subclass_l3`
- `monk_monk_subclass_l3`
- `paladin_paladin_subclass_l3`
- `ranger_ranger_subclass_l3`
- `rogue_rogue_subclass_l3` ← this unit
- `sorcerer_sorcerer_subclass_l3`
- `warlock_warlock_subclass_l3`
- `wizard_wizard_subclass_l3`

All 12 are structurally identical and will require the same widening.

## v4 atom impact

The `subclass_feature_root` source atom already exists in v4 (for encoding the individual subclass features). The selection mechanic itself doesn't cleanly map to any existing v4 atom — it is closer to a character-progression gate (`choose` procedure + implicit `grant` of a feature track) than a combat-resolution atom. The tracer would need a new subgraph shape for this family.
