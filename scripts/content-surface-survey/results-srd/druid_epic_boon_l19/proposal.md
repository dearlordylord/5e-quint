# Proposal: structural_widening — Epic Boon (druid L19)

## Unit

- **Slug:** `druid_epic_boon_l19`
- **Kind:** `class_feature`
- **SRD text:** "You gain an Epic Boon feat (see 'Feats') or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."

## Why it does not fit

The current `ClassFeatureMechanics` is a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:

| Field | Required shape | What Epic Boon needs |
|---|---|---|
| `activationCost` | `free` \| `bonus_action` | N/A — no activation; this is a level-up grant |
| `resource` | `UseCountResource` (use_count) | N/A — no uses; it is granted once, permanently |
| `resetCadence` | `RestResetCadence` | N/A — nothing to reset |
| `effect` | `GrantExtraActionEffect` \| `HealHpEffect` | Neither applies; effect is "gain a feat" |

There is no honest value for any of these four fields. Forcing the unit into `activation` would produce a trace that lies about the rule: it would imply the feature is activated per-turn or per-rest and consumes a charge, none of which is true.

## Missing 1 — new family: `passive_grant`

The mechanic is a **one-time permanent character-progression grant** triggered by reaching a class level. No existing family captures this. A new `ClassFeaturePassiveGrantMechanics` family is needed:

```typescript
// Sketch — not normative
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;  // widened — see below
};
```

This family would cover:
- Epic Boon (all 12 classes at L19)
- Ability Score Improvement (all classes at L4, L8, L12, L16, L19 variants)
- Any other "you gain X permanently at level N" feature

## Missing 2 — new `ClassFeatureEffect` variant: `grant_feat`

`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. Neither variant represents "gain a feat from a pool." A new variant is needed:

```typescript
// Sketch — not normative
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // The pool of eligible feats — open choice, or constrained to a category.
  readonly pool: "epic_boon" | "any_qualifying";
  // Optional recommended default (authoring hint, not enforced at runtime).
  readonly recommended?: string;
};
```

The `pool` field distinguishes:
- Epic Boon features: pool = `"epic_boon"` (restricted to feats with the Epic Boon category)
- Standard Ability Score Improvement: pool could be `"any_qualifying"` or split into a separate effect kind

## Scope of impact

This pattern is **class-table-wide**. Confirmed instances in the survey corpus:

| Slug | Level | Pool |
|---|---|---|
| `barbarian_epic_boon_l19` | 19 | epic_boon |
| `bard_epic_boon_l19` | 19 | epic_boon |
| `cleric_epic_boon_l19` | 19 | epic_boon |
| `druid_epic_boon_l19` | 19 | epic_boon |
| `fighter_epic_boon_l19` | 19 | epic_boon |
| `monk_epic_boon_l19` | 19 | epic_boon |
| `paladin_epic_boon_l19` | 19 | epic_boon |
| `ranger_epic_boon_l19` | 19 | epic_boon |
| `rogue_epic_boon_l19` | 19 | epic_boon |
| `sorcerer_epic_boon_l19` | 19 | epic_boon |
| `warlock_epic_boon_l19` | 19 | epic_boon |
| `wizard_epic_boon_l19` | 19 | epic_boon |

Plus all Ability Score Improvement features across all classes at L4/L8/L12/L16.

Both widenings together resolve the entire recurring category. Neither widening introduces a new v4 atom — `grant_feat` maps cleanly to the existing `grant_proficiency`-adjacent region of the effect atom inventory and could be added without touching the taxonomy graph.

## Recommendation

Add `passive_grant` as a second `ClassFeatureMechanics` family alongside `activation`. Add `grant_feat` as a third `ClassFeatureEffect` variant. This unblocks all 12 Epic Boon units and all ASI units in one schema increment.
