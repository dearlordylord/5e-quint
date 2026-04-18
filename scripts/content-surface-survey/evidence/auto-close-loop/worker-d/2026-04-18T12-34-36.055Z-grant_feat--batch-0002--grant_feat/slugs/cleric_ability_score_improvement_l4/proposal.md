# Proposal: structural_widening for cleric_ability_score_improvement_l4

## Unit

**Ability Score Improvement (Cleric L4)** — SRD 5.2.1, Classes/Cleric#Level 4: Ability Score Improvement

> "You gain the Ability Score Improvement feat (see 'Feats') or another feat of your choice for which you qualify. You gain this feature again at Cleric levels 8, 12, and 16."

## Why the unit does not fit

### Gap 1 — No passive-advancement family in ClassFeatureMechanics

The only `ClassFeatureMechanics` family is `activation`:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

Where `ClassFeatureMechanicsHeader` requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

ASI has **none** of these:
- No activation cost — the player does not spend any action/resource to gain it.
- No use_count resource — it is granted once, permanently, at a specific class level.
- No reset cadence — it is never expended and therefore never refills.

Forcing ASI into `activation` would require inventing fictional values (e.g., `activationCost: { kind: "free" }`, `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`, `resetCadence: { kind: "long_rest" }`) that misrepresent the mechanic. ASI is character advancement state, not a runtime-activated feature.

### Gap 2 — No `grant_feat` effect in ClassFeatureEffect

Even if a passive family existed, the `ClassFeatureEffect` union covers only:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The effect of ASI is granting a feat choice. No variant exists for this. The v4 TAXONOMY also explicitly defers `modify_ability_score` as "out-of-scope for the core mechanics graph" (§12), confirming this is a known open gap.

## Proposed widenings

### 1. New family: `passive_advancement`

A new `ClassFeatureMechanics` family for features that are permanently granted at a specific class level, with no runtime activation step:

```typescript
export type ClassFeaturePassiveAdvancementMechanics = {
  readonly family: "passive_advancement";
  readonly effect: ClassFeatureAdvancementEffect;
};
```

This covers the common pattern of level-gated grants: ASI slots, Extra Attack, Proficiency upgrades, language grants, etc.

### 2. New effect type: `grant_feat`

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // The default feat granted; player may substitute any qualifying feat.
  readonly defaultFeat: string;
  readonly playerChoice: boolean;
};
```

This corresponds to v4 atom `grant_proficiency` in spirit (permanent passive grant), but covers the feat-grant shape specifically.

### 3. New atom: `grant_feat` (v4 effect atoms)

The v4 atom inventory should add `grant_feat` to the Effect Atoms section (§9). This is analogous to `grant_proficiency` and `grant_spell_access` — all are permanent passive grants at level-up.

## Scope note

This pattern recurs at every class's level-4, 8, 12, 16, and 19 ASI slots (barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard). A single widening resolves all of them. The Epic Boon slots at level 19 use the same structural shape.
