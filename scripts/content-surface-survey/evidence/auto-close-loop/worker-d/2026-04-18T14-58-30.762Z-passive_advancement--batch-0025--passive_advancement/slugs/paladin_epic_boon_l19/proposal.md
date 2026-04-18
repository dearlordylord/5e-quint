# Proposal: structural_widening — Epic Boon (paladin L19)

## Unit

- **Slug**: `paladin_epic_boon_l19`
- **Kind**: `class_feature`
- **Provenance**: `srd-5.2.1`, Classes/Paladin — Level 19: Epic Boon
- **Text**: "You gain an Epic Boon feat (see 'Feats') or another feat of your choice for which you qualify. Boon of Truesight is recommended."

## Why it does not fit

The content surface defines `ClassFeatureMechanics` as a union with a single member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` has `family: "activation"` and mandates:

- `activationCost` — how the player spends an action/bonus action to trigger it
- `resource` — a use-count pool that depletes
- `resetCadence` — how the pool refills on rest
- `effect` — one of `{GrantExtraActionEffect | HealHpEffect}`

**Epic Boon has none of these.** It is a permanent, passive character-advancement grant that occurs at level-up. There is nothing to activate, no pool, no rest reset, and no combat-runtime effect in the `ClassFeatureEffect` union.

Forcing it into `activation` would require fabricating an `activationCost`, a `resource`, a `resetCadence`, and picking whichever effect is least-wrong — all of which would be falsehoods. The tracer would emit a graph that does not match the rule.

## Gap 1: Missing `passive_advancement` family

The surface needs a new `ClassFeatureMechanics` family for features that are **received permanently at level-up**, not activated. These features have:

- No activation cost
- No use-count resource
- No rest reset
- A permanent effect that modifies the character sheet from the moment the level is gained

Candidate shape (illustrative, not prescriptive):

```typescript
export type ClassFeaturePassiveAdvancementMechanics = {
  readonly family: "passive_advancement";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family would also cover: Ability Score Improvement (all classes, L4/L8/…), Primal Knowledge, Fighting Style (passive benefit), Expertise, and every other "choose X and gain it permanently" feature.

## Gap 2: Missing `grant_feat` effect atom

The `ClassFeatureEffect` union currently holds:
- `GrantExtraActionEffect` — grants an extra action on the caster's turn
- `HealHpEffect` — heals HP

A `grant_feat` effect atom is needed to model any feature that permanently grants a feat. At minimum it needs a **feat scope** — the set the player may choose from:

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly scope: FeatScope;
};
```

## Gap 3: Missing `FeatScope` variant type

The feat selection here is scoped: "Epic Boon feat **or** another feat of your choice for which you qualify." This is a two-tier scope:

1. Preferred category: `epic_boon_feat`
2. Fallback: any feat for which the character qualifies (open choice with DM-gated qualification check)

No surface type exists for scoped feat selection. This differs from `TargetSelection` (which selects creatures) and from `SlotScaling` (which is numeric). A new `FeatScope` type is needed:

```typescript
export type FeatScope =
  | { readonly kind: "category"; readonly category: FeatCategory }
  | { readonly kind: "any_qualifying" }
  | { readonly kind: "category_or_any_qualifying"; readonly preferredCategory: FeatCategory };
```

Where `FeatCategory` is a closed enum of feat groupings (e.g., `"epic_boon"`, `"general"`, `"fighting_style"`, `"origin"`).

## Classification

- **Outcome**: `structural_widening`
- **Confidence**: high
- **Scope**: This gap recurs identically for every class's L19 Epic Boon (barbarian, bard, cleric, druid, fighter, monk, ranger, rogue, sorcerer, warlock, wizard), and also for all Ability Score Improvement features and other passive level-up grants.

## No Dhall/JSON authored

Per protocol, no `.dhall`, `.json`, or `.trace.md` was authored because no honest encoding is possible under the current surface schema.
