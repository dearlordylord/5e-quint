# Proposal: Widenings Required for Ability Score Improvement (Ranger L4)

## Unit

- **Slug:** `ranger_ability_score_improvement_l4`
- **Kind:** `class_feature`
- **Source:** SRD 5.2.1 — Classes/Ranger#Level 4: Ability Score Improvement

## Source Text

> You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Ranger levels 8, 12, and 16.

## Why It Doesn't Fit

### 1. No `passive_grant` family for class features (structural)

The current `ClassFeatureMechanics` type has a single family: `activation`. That family structurally requires three fields that do not exist for this feature:

- `activationCost` — there is no activation; the feature is received automatically when leveling
- `resource` (`UseCountResource`) — there is no use-count quota
- `resetCadence` (`RestResetCadence`) — there is no rest-based refill because the feature is permanent

Encoding this as `activation` with `{ kind: "free" }` cost and a `{ kind: "fixed", uses: 1 }` resource would misrepresent the mechanic: it would imply the character "uses" a resource to "activate" the feat, then can do so once before resting. None of that matches the rule.

**Needed:** A `passive_grant` (or `level_up_grant`) family with no activation/resource/reset fields — for features that are simply received at a specific class level and persist indefinitely.

### 2. No `grant_feat` effect atom (atom widening)

The `ClassFeatureEffect` union is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant represents "you gain a feat." The v4 atom taxonomy (TAXONOMY_atoms_graph.md) also lacks a `grant_feat` atom. The closest residue entry is `modify_ability_score` (noted as out-of-scope), but that covers the numeric effect of the ASI feat itself — not the mechanic of granting access to a feat selection.

**Needed:** A `grant_feat` effect atom. At minimum this needs to represent:
- That a feat is granted (the `grant_feat` atom)
- Whether it is a specific named feat or a player-choice feat (`freeChoice: boolean`, or an open/closed selection enum)
- The qualification constraint for free-choice grants ("any feat for which you qualify")

### 3. Recurring-at-multiple-levels pattern (surface widening, secondary)

`ClassFeatureRecord` has a single `acquiredAtLevel: number` field. The ASI feature is gained at Ranger levels 4, 8, 12, and 16 — four separate instances. The current surface can model each as a separate `ClassFeatureRecord` with a different `acquiredAtLevel` (as the survey queue appears to already do, given slugs like `ranger_ability_score_improvement_l4` are one entry), but the feature text explicitly states "You gain this feature again at Ranger levels 8, 12, and 16." There is no surface mechanism to express "this is one feature that repeats," which creates a traceability gap between the authored records and the SRD's single feature entry.

This is a softer gap — modeling four separate records at four levels is accurate, just not round-trip equivalent to the SRD prose. It is lower priority than the structural and atom gaps above.

## Classification

**`structural_widening`** — The primary blocker is the absence of a `passive_grant` family. Even if a `grant_feat` atom existed, it could not be placed in any valid `ClassFeatureMechanics` shape without the new family. Both gaps must be addressed together.

## Proposed Surface Changes

### Option A: Minimal passive_grant family

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeaturePassiveEffect =
  | { readonly kind: "grant_feat"; readonly selection: FeatSelection }
  | /* ... future passive effects ... */;

export type FeatSelection =
  | { readonly kind: "named"; readonly featId: string }
  | { readonly kind: "free_choice"; readonly qualifier: "any_you_qualify_for" };
```

The `ClassFeatureMechanics` union becomes:
```typescript
export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveGrantMechanics;
```

### Option B: Unify under activation with optional resource

Allow `resource` and `resetCadence` to be absent on `ClassFeatureActivationMechanics` (using `undefined | ...`). This is structurally simpler but loses the semantic distinction between activated features and passive grants — a cost to legibility.

**Recommendation:** Option A. The semantic gap between "activated feature with quota" and "permanent level-up grant" is large enough to warrant distinct families, consistent with how the spell surface already distinguishes `ongoing_effect`, `activation`, `triggered_reaction`, and `anchored_trigger`.

## Atom Inventory Impact

- **New atom:** `grant_feat` (effect category)
- No new relations needed — `grants` from the `class_feature_root` or procedure node to `grant_feat` reuses existing vocabulary
- No new window/lifecycle atoms needed — the grant is permanent and has no expiry
