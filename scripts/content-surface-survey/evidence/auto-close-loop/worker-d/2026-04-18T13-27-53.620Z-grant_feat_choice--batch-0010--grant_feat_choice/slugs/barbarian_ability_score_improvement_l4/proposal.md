# Proposal: barbarian_ability_score_improvement_l4

## Classification: structural_widening

## Unit

**Ability Score Improvement (barbarian L4)** — SRD 5.2.1, Classes/Barbarian#Level 4: Ability Score Improvement

> You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.

## Why it does not fit

The only `ClassFeatureMechanics` family is `activation`, which requires:

- `activationCost` — must be `free` or `bonus_action`
- `resource` — must be a `use_count` with a cap
- `resetCadence` — must specify a rest refill cadence
- `effect` — must be a `GrantExtraActionEffect` or `HealHpEffect`

The Ability Score Improvement feature has **none** of these:

| Required field | ASI reality |
|---|---|
| `activationCost` | Not applicable — this is a level-up benefit, not an activated ability |
| `resource` | Not applicable — no use-count; the choice is made once permanently at level-up |
| `resetCadence` | Not applicable — the benefit is permanent, no rest refill |
| `effect` | Not applicable — no existing atom covers "grant a feat choice" |

Encoding this as `activation` would require fabricating fields that do not exist in the rule. That would produce a misleading trace.

## Proposed widenings

### 1. New mechanics family: `passive_grant`

A new `ClassFeatureMechanics` family for level-up benefits that are **permanently applied** with no activation, no use-count, and no rest-reset. The family shape:

```
family: "passive_grant"
effect: <PassiveGrantEffect>
```

This pattern appears across all 12 classes (ASI at L4, L8, L12, L16 for every class; Epic Boon at L19 for every class). It is the most common class-feature pattern in the SRD after spellcasting.

### 2. New effect atom: `grant_feat_choice`

A new `ClassFeatureEffect` variant (and new v4 atom candidate) for features that permanently grant a feat selection from a pool. Shape:

```
kind: "grant_feat_choice"
defaultFeat?: string           // e.g. "ability_score_improvement"
constraint: "any_qualifying"  // or a named closed pool
```

This is structurally analogous to `grant_spell_access` in the v4 taxonomy but applied to feats rather than spells. The TAXONOMY v4 residue notes `modify_ability_score` as out-of-scope "as a runtime effect" — but the feat-grant surface is a character-advancement mechanism (not a runtime combat effect), making it distinct from that residue item. It still lacks a surface home.

## Cross-class impact

This widening is high-priority: it unblocks every ASI feature across all 12 classes (barbarian L4/8/12/16, bard L4/8/12/16, etc.) plus every Epic Boon L19 entry. These together represent a significant fraction of the class-feature catalog. Once `passive_grant` + `grant_feat_choice` land, they serve a large batch of currently-blocked units.

## Confidence: high

The structural gap is unambiguous. There is no coercion path that produces an honest trace.
