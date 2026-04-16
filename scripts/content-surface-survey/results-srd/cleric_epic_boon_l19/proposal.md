# Proposal: widening required for Epic Boon (cleric L19)

## Unit

- **Slug:** `cleric_epic_boon_l19`
- **Kind:** `class_feature`
- **Source text:** "You gain an Epic Boon feat (see 'Feats') or another feat of your choice for which you qualify. Boon of Fate is recommended."

## Why it does not fit

### Gap 1 — Missing ClassFeatureMechanics family (structural)

The current surface has exactly one family for class features: `activation`. Its header type requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Epic Boon has none of these properties. It is a **permanent level-up reward**: when the character reaches level 19, they acquire a feat. There is no:
- activation cost (nothing is spent to trigger it)
- resource pool (no "uses" to track)
- reset cadence (no rest refills anything — the feat is permanently owned)

Forcing it into `activation` with `activationCost: { kind: "free" }` and a dummy `use_count` with 1 use and no real reset cadence would produce a misleading trace that implies a resettable per-encounter resource when the rule is a one-time character-sheet permanent gain.

### Gap 2 — Missing `grant_feat` effect atom

Even if the family gap were resolved, `ClassFeatureEffect` only provides:
- `grant_extra_action` — grants an additional action in combat
- `heal_hp` — restores hit points

Neither models "permanently add a feat to the character's feat list." The v4 atom inventory includes `grant_proficiency` and `grant_spell_access` but has no `grant_feat` atom.

## Proposed widenings

### 1. New `ClassFeatureMechanics` family: `passive_grant`

A new family for class features that are awarded permanently at level acquisition, with no activation trigger, no resource pool, and no reset cadence:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveGrantEffect;
};
```

This family is broadly applicable: Ability Score Improvements, language/tool grants, and similar non-activated level-up rewards share the same shape.

### 2. New `ClassFeaturePassiveGrantEffect` variant: `grant_feat`

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  // The feat category (e.g., "epic_boon") is authoring metadata;
  // the specific feat chosen is player-time, not rule-time.
  readonly category: "epic_boon" | "general";
  readonly recommended?: string; // feat slug, e.g., "feat_boon_of_fate"
};
```

### 3. New v4 atom: `grant_feat`

Category: `effect`. Represents the permanent addition of a feat to a creature's feature list. Distinct from `grant_proficiency` (skills/tools/weapons) and `grant_spell_access` (spell list expansion).

## Scope note

This widening is not cleric-specific. All 12 class Epic Boon features at level 19 share the exact same rule text structure ("You gain an Epic Boon feat or another feat of your choice for which you qualify"). Resolving this widening once covers all of them.
