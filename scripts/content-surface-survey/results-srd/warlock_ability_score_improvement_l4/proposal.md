# Proposal: structural_widening — Ability Score Improvement (warlock L4)

## Unit

- **Slug:** `warlock_ability_score_improvement_l4`
- **Kind:** `class_feature` / `warlock` / acquired at level 4
- **Source text:** "You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Warlock levels 8, 12, and 16."

## Why it does not fit

### 1. No matching ClassFeatureFamily

The only value of `ClassFeatureMechanics` is `ClassFeatureActivationMechanics` (family: `"activation"`). That family models features which are **activated during play** — they consume a resource (use_count), have an activation cost (free or bonus_action), and reset on a rest cadence.

Ability Score Improvement is none of those things. It is a **permanent character-progression grant** made once at level-up. There is no activation, no expendable resource, and no rest reset. Forcing it into the `"activation"` family would be dishonest:

- `activationCost` — inapplicable; there is no on-turn cost
- `resource` (UseCountResource) — inapplicable; there is no expendable pool
- `resetCadence` — inapplicable; the benefit is permanent, not recovered on rest
- `effect` — no available variant covers feat grants

### 2. No matching ClassFeatureEffect

The closed union `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` does not include any variant for granting a feat or modifying ability scores.

The v4 taxonomy (`TAXONOMY_atoms_graph.md`) explicitly notes:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope).

While this designates the concept as out-of-scope for the core mechanics atom graph, it does not make the feature `dm_agenda` — the mechanic is fully deterministic (the player picks a specific feat or adds specific amounts to specific scores, per SRD Feats rules). The gap is that the surface has no structural home for it.

## Proposed widening

### A. New ClassFeatureFamily: `level_up_grant`

A new mechanics family for class features that are one-time permanent benefits granted at level-up, not activatable during play:

```typescript
export type ClassFeatureLevelUpGrantMechanics = {
  readonly family: "level_up_grant";
  readonly grant: ClassFeatureLevelUpGrantEffect;
};
```

This would then be added to the `ClassFeatureMechanics` union.

### B. New ClassFeatureEffect variant: `grant_feat`

A new effect that records what is granted at level-up:

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // "choice" means the player picks at level-up from qualifying feats.
  // A specific featId could also be used when the feat is fixed.
  readonly selection: "ability_score_improvement_or_qualifying_feat";
};
```

This maps to a new v4 atom (e.g., `grant_feat`) or, if the taxonomy prefers, treating this as pre-runtime character state rather than a core mechanics atom.

## Scope of impact

Every `ability_score_improvement_lN` feature across all twelve classes has the same structure. This single structural widening (new `level_up_grant` family + `grant_feat` effect) would resolve all of them. The tier-2 survey batch includes at least:

- `barbarian_ability_score_improvement_l4`
- `bard_ability_score_improvement_l4`
- `cleric_ability_score_improvement_l4`
- `druid_ability_score_improvement_l4`
- `fighter_ability_score_improvement_l4`
- `monk_ability_score_improvement_l4`
- `paladin_ability_score_improvement_l4`
- `ranger_ability_score_improvement_l4`
- `rogue_ability_score_improvement_l4`
- `sorcerer_ability_score_improvement_l4`
- `warlock_ability_score_improvement_l4`
- `wizard_ability_score_improvement_l4`

Plus repeated instances at levels 8, 12, 16, 19 (Epic Boon) across classes.

## Relationship to v4 taxonomy

The v4 taxonomy does not include a `grant_feat` atom and explicitly defers `modify_ability_score`. The structural widening proposed here is at the surface/family level, not purely an atom-level addition. The tracer would need a new `traceClassFeatureLevelUpGrant` path. The atom emitted would depend on whether `grant_feat` is added to v4 or whether ASI is treated as permanently out-of-core (in which case `dm_agenda` reclassification might be appropriate, but the current wording of that category — "DM adjudication", "narrative", "DM-decided outcomes" — does not fit a deterministic player choice governed by published feat rules).
