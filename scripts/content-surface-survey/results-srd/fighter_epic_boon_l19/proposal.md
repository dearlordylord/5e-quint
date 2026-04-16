# Proposal: Epic Boon (fighter L19) — structural_widening

## Unit

**Name:** Epic Boon (fighter L19)  
**Slug:** `fighter_epic_boon_l19`  
**Kind:** `class_feature` (fighter, L19)  
**SRD text:** "You gain an Epic Boon feat (see 'Feats') or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended."

## Why the unit cannot be encoded honestly

### Problem 1: No `passive_grant` family in `ClassFeatureMechanics`

`ClassFeatureMechanics` currently has a single family: `activation` (`ClassFeatureActivationMechanics`). That family requires:

- `activationCost` — how the player spends a turn resource to trigger the feature
- `resource` — a `UseCountResource` with a cap and uses
- `resetCadence` — how those uses refill on rest

Epic Boon has **none of these properties**. There is no trigger. There is no pool of uses. There is no rest reset. The fighter simply owns the feat permanently from level 19 onwards — it is a character-sheet acquisition, not an activatable feature.

Forcing this into `activation` would require inventing a fake `use_count` cap (e.g. `{ kind: "fixed", uses: 1 }`) and a nominal `resetCadence` that have no SRD basis. That is a lie.

### Problem 2: No `grant_feat` effect atom

Even if a passive family existed, `ClassFeatureEffect` only contains:
- `GrantExtraActionEffect` — grants an extra action
- `HealHpEffect` — restores HP

The v4 taxonomy (TAXONOMY_atoms_graph.md) has `grant_proficiency` and `grant_spell_access` as effect atoms, but **no `grant_feat` atom**. Granting a feat is mechanically distinct from granting proficiency or spell access — a feat can carry any combination of passive bonuses, active abilities, stat increases, or even its own atom subgraph.

### Problem 3: Open-choice selection

The feat is not predetermined. The player selects one feat from the Epic Boon category (or any feat they qualify for). The current surface has no way to express "a feat chosen by the player from a category." This is an open-choice picker — similar to how Ability Score Improvement grants a stat increase of the player's choice, or how Fighting Style grants one fighting style of the player's choice. These open-choice patterns at the class-feature level are not modeled.

## Proposed widening

### W1: New `ClassFeatureMechanics` family — `passive_grant`

A `passive_grant` family would model class features that are permanent character-sheet acquisitions triggered at level-up, not by the player at runtime. Shape sketch:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveGrantEffect;
};
```

This family would have no `activationCost`, `resource`, or `resetCadence` — those concepts do not apply.

### W2: New `ClassFeatureEffect` variant — `grant_feat`

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly selection: FeatSelection;
};
```

Where `FeatSelection` expresses either a fixed feat (`{ mode: "fixed"; featId: string }`) or an open player choice optionally constrained to a category (`{ mode: "open_choice"; category?: string }`).

### W3: New v4 atom — `grant_feat`

The tracer would need a corresponding `grant_feat` atom in the effect category. This atom is distinct from `grant_proficiency` and `grant_spell_access` — a feat is a composite unit that may itself contain atoms, making `grant_feat` more of a delegation edge than a terminal effect. The taxonomy would need to record this shape.

## Breadth of impact

This widening unblocks a high-frequency pattern. Every class in SRD 5.2.1 has a Level 19 Epic Boon entry (12 classes × 1 entry = 12 identical-structure units). Additionally, Ability Score Improvement (a feat grant constrained to `{ ASI feat only }`) appears at multiple levels across all classes. The `passive_grant` family + `grant_feat` effect would handle all of these.

## Narrowest honest classification

**`structural_widening`** — the shape mismatch is at the family level (`activation` is the wrong family; a new `passive_grant` family is required), not merely a missing variant within an existing family.
