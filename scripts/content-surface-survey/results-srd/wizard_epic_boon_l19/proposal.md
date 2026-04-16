# Proposal: wizard_epic_boon_l19 — structural_widening

## Unit

**Epic Boon (wizard L19)** — SRD 5.2.1, Classes/Wizard#Level 19: Epic Boon

> You gain an Epic Boon feat (see "Feats") or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.

## Why it does not fit

The only `ClassFeatureMechanics` family is `activation`, which requires three fields that have no honest mapping for Epic Boon:

| Required field | Epic Boon value | Problem |
|---|---|---|
| `activationCost` | none | You don't activate Epic Boon; you gain it permanently at level 19 |
| `resource` (`use_count`) | none | There are no uses — the feat is a permanent trait |
| `resetCadence` | none | Nothing resets; rests are irrelevant |
| `effect` | `grant_feat_choice` | No such variant exists in `ClassFeatureEffect` |

The existing `ClassFeatureEffect` union is `GrantExtraActionEffect | HealHpEffect`. Neither applies. A `grant_feat_choice` effect is structurally novel.

## Pattern scope

This is not wizard-specific. Every class's level 19 entry reads identically:

> "You gain an Epic Boon feat or another feat of your choice for which you qualify."

The same structural gap blocks all twelve Epic Boon features. The same pattern also applies to Ability Score Improvement (level 4, 8, 12, 16, 19 for most classes), Extra Attack (granted permanently at level 5), and every other level-milestone progression feature — none of which are activated abilities with use counts or reset cadences.

## Proposed widenings

### 1. New class feature family: `milestone_grant`

A permanent benefit granted at a level threshold. No activation cost, no use count, no reset cadence. The mechanic fires exactly once at level-up and persists for the character's lifetime.

```typescript
export type ClassFeatureMilestoneGrantMechanics = {
  readonly family: "milestone_grant";
  readonly effect: ClassFeatureMilestoneEffect;
};
```

### 2. New effect variant: `grant_feat_choice`

Covers features that grant a permanent feat selection, optionally narrowed to a named feat category.

```typescript
export type GrantFeatChoiceEffect = {
  readonly kind: "grant_feat_choice";
  // Optional: restrict to a named category (e.g. "epic_boon"). Omit for open choice.
  readonly category?: string;
};
```

With these two additions, Epic Boon encodes as:

```dhall
{ family = "milestone_grant"
, effect = { kind = "grant_feat_choice", category = Some "epic_boon" }
}
```

## Tracer atoms needed

The tracer would emit:

- `class_feature_root` → (existing)
- `grant_feat_choice` → new effect atom (not in v4 taxonomy)

The v4 taxonomy has `grant_proficiency`, `grant_spell_access`, and `grant_extra_action` as effect atoms — `grant_feat_choice` would extend this family.

## Classification

- **Outcome:** `structural_widening`
- **Missing:** new family (`milestone_grant`) + new effect atom (`grant_feat_choice`) + new surface type variant
- **Confidence:** high — the activation family's required fields are categorically inapplicable; no coercion path exists that is not dishonest
