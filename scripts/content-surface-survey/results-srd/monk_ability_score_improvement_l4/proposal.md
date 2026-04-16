# Proposal: Structural Widening for Passive Level-Grant Class Features

## Unit
`monk_ability_score_improvement_l4` — Ability Score Improvement (Monk L4)
SRD 5.2.1 provenance · `class_feature` kind

## Why the unit cannot be encoded honestly

The current `ClassFeatureMechanics` type is:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

Only one family exists: `activation`. Its header is mandatory:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Ability Score Improvement has **none** of these:

| Field | Required shape | ASI value |
|---|---|---|
| `activationCost` | `free` \| `bonus_action` | N/A — not an activation |
| `resource` | `{ kind: "use_count"; cap: ... }` | No use count exists |
| `resetCadence` | `short_or_long_rest` \| `long_rest` \| … | No rest reset exists |

Additionally, `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` has no variant for granting a feat. Using `grant_extra_action` would be a fabricated trace. Using `heal_hp` would be nonsense. There is no honest encoding.

## Evidence from source text

> "You gain the Ability Score Improvement feat (see 'Feats') or another feat of your choice for which you qualify."

This is a permanent, passive character-advancement feature: applied once at level 4 (and again at levels 8, 12, 16 per the feature text). It is not activated, not resource-gated, and not rest-resetting.

## Taxonomy note

TAXONOMY v4 §12 "Known Remaining Weak Spots" explicitly records:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope).

ASI is pre-runtime character state — it modifies the character sheet at the moment of level-up. This is not `dm_agenda` (the outcome is deterministic and rule-governed), but it is out-of-scope for the current combat-mechanics surface.

## Proposed widenings

### 1. New family: `passive_grant`

A new `ClassFeaturePassiveGrantMechanics` family for permanent, passive class features that apply unconditionally at a given class level:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveGrantMechanics;
```

No `activationCost`, `resource`, or `resetCadence` fields — these concepts do not apply.

### 2. New effect variant: `grant_feat_choice`

```typescript
export type GrantFeatChoiceEffect = {
  readonly kind: "grant_feat_choice";
  readonly defaultFeatId: string;  // "feat_ability_score_improvement"
};

export type ClassFeaturePassiveEffect = GrantFeatChoiceEffect /* | ... */;
```

The `defaultFeatId` captures the specific feat the feature names as the default option (ASI feat), while "or another feat of your choice" is the player-choice dimension.

## Scope of widening

Every class in the SRD has ASI-equivalent entries at multiple levels (L4, L8, L12, L16 for most classes; Epic Boon at L19). This single `passive_grant` family + `grant_feat_choice` effect unblocks an entire category of cross-class entries currently unrepresentable. It is the narrowest honest family needed.

## Classification

`structural_widening` — no existing `ClassFeatureMechanics` family can encode a passive, permanent, level-granted feat choice without fabricating mandatory fields that do not exist for this feature.
