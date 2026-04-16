# Proposal: structural_widening for `sorcerer_ability_score_improvement_l4`

## Unit

**Name:** Ability Score Improvement (sorcerer L4)
**Kind:** `class_feature` / sorcerer / acquired at level 4

## Source Text

> "You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Sorcerer levels 8, 12, and 16."

## Why the unit does not fit

### 1. No existing ClassFeatureMechanics family covers permanent level-up grants

The only current family is `activation` (`ClassFeatureActivationMechanics`), which requires:
- `activationCost` — "free" or "bonus_action"
- `resource` — `UseCountResource` (use count + cap)
- `resetCadence` — rest-based refill
- `effect` — `ClassFeatureEffect`

The ASI feature has **none** of these. It is granted once, permanently, when the character reaches sorcerer level 4. It has no activation trigger during play, no uses, and no reset cadence. Forcing it into `activation` would require fabricating a use-count cap of 1 with no meaningful reset — a dishonest trace that obscures the actual mechanic (permanent character-state change).

### 2. No ClassFeatureEffect variant covers feat grants or ability score changes

`ClassFeatureEffect` is currently:
```
GrantExtraActionEffect | HealHpEffect
```

Neither covers:
- Granting a feat (ASI feat or any qualifying feat)
- Permanently increasing one or two ability scores

### 3. The v4 TAXONOMY explicitly defers `modify_ability_score`

From `TAXONOMY_atoms_graph.md` §12 (Known Remaining Weak Spots):
> "`modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)"

This confirms the atom does not exist in v4 and the taxonomy authors recognized the gap.

## Classification

**`structural_widening`** — no honest family or effect variant exists.

## Proposed widenings

### A. New ClassFeatureMechanics family: `level_up_grant`

A new family to cover features that are delivered permanently at a specific class level with no in-play activation:

```typescript
export type ClassFeatureLevelUpGrantMechanics = {
  readonly family: "level_up_grant";
  readonly grant: LevelUpGrantEffect;
};
```

This family would be appropriate for: ASI (all classes, levels 4/8/12/16/19), Epic Boon (level 19), and any other "you gain X at this level" features with no use-count or reset.

### B. New ClassFeatureEffect variant: `grant_feat`

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // The feat is chosen by the player at level-up from a qualifying set.
  // The default choice is the ASI feat.
  readonly defaultFeatId: string;
  readonly playerChooses: true;
};
```

The v4 taxonomy has `grant_proficiency` as an effect atom; `grant_feat` is the analogous atom for feat grants.

### C. Corresponding tracer handling

The tracer's `traceClassFeatureMechanics` switch would need a `case "level_up_grant"` branch, and `traceClassFeatureEffect` would need a `case "grant_feat"` branch.

## Scope note

The same widening applies to ALL class ASI entries (barbarian L4/8/12/16/19, bard L4, cleric L4, druid L4, fighter L4/6/8/12/14/16/19, monk L4/8/12/16/19, paladin L4/8/12/16/19, ranger L4/8/12/16/19, rogue L4/8/10/15/19, sorcerer L4/8/12/16/19, warlock L4/8/12/16/19, wizard L4/8/12/16/19). Resolving this widening once unblocks the entire category.
