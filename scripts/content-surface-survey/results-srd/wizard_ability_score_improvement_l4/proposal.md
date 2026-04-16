# Proposal: wizard_ability_score_improvement_l4

## Outcome

`structural_widening`

## Why the unit does not fit

**Ability Score Improvement (Wizard L4)** is a level-up advancement grant. The character receives it permanently at class level 4 (and again at 8, 12, 16). It is not activated during play.

The current `ClassFeatureMechanics` type is `ClassFeatureActivationMechanics` only:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation"
// requires: activationCost | resource (use_count) | resetCadence | effect
```

For ASI, every one of these required fields is inapplicable:

| Field | Activation family requires | ASI reality |
|---|---|---|
| `activationCost` | `free` or `bonus_action` | No in-play activation at all — benefit conferred at level-up |
| `resource` | `use_count` with cap | No uses to track; granted once per tier |
| `resetCadence` | rest-based refill | Not applicable; permanently conferred |
| `effect` | `GrantExtraActionEffect` \| `HealHpEffect` | Needs `modify_ability_score` or `grant_feat` |

Encoding ASI with `family: "activation"` would produce a knowingly false trace (Action Surge shape applied to a character-creation benefit). Per the task guardrails, no content files were authored.

## Proposed widenings

### 1. New ClassFeatureMechanics family: `character_advancement`

A new payload family for permanent level-up benefits that require no activation, no resource tracking, and no rest reset. Shape sketch:

```typescript
export type CharacterAdvancementMechanics = {
  readonly family: "character_advancement";
  readonly grantedAtLevels: ReadonlyArray<number>; // e.g. [4, 8, 12, 16]
  readonly grants: ReadonlyArray<CharacterAdvancementGrant>;
};
```

This pattern recurs across all 12 classes (ASI at L4/8/12/16, epic boons at L19, etc.) — it is systemic, not narrow.

### 2. New atom: `modify_ability_score`

The ASI feat's core mechanic: permanently increase one ability score by 2, or two scores by 1 each. The v4 taxonomy explicitly defers this:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)

This unit is pre-runtime character state. When the taxonomy promotes this atom, the `character_advancement` family's effect payload can reference it directly.

### 3. New atom: `grant_feat`

The feature allows choosing a qualifying feat instead of taking the ASI score increase. No existing `ClassFeatureEffect` variant represents "grant a feat choice from the feat list." `grant_spell_access` is the closest analog for a parallel pool resource, but feats are not spells.

## Scope note

The `character_advancement` family gap is not unique to wizard. Every SRD class has ASI at level 4 and additional ASI/epic-boon instances at higher levels. When this family is added, all `*_ability_score_improvement_l*` and `*_epic_boon_l*` slugs in the survey queue can be re-encoded uniformly.
