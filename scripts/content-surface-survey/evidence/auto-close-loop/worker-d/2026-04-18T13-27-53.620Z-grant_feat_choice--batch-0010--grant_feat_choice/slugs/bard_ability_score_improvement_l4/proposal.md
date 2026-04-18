# Proposal: structural_widening — Ability Score Improvement (bard L4)

## Unit

- **Slug:** `bard_ability_score_improvement_l4`
- **Kind:** `class_feature`
- **Source:** SRD 5.2.1 § Classes/Bard#Level 4: Ability Score Improvement

## Source text

> You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Bard levels 8, 12, and 16.

## Why it does not fit

### Gap 1 — Missing `ClassFeatureMechanics` family (structural)

The only current family is `"activation"`, typed as:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};

type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

ASI has none of these fields:

| Field | ASI value | Reason absent |
|---|---|---|
| `activationCost` | none | not player-invoked; fires once upon reaching the level |
| `resource` | none | there is no pool to deplete |
  | `resetCadence` | none | there is no rest cycle; the grant is permanent |

Forcing any of these fields to a placeholder value would produce a lying trace. The correct shape is a **permanent level-up grant** — a new family is needed.

**Proposed family name:** `"level_grant"` (or `"passive_grant"`)

```typescript
export type ClassFeatureLevelGrantMechanics = {
  readonly family: "level_grant";
  readonly effect: ClassFeatureLevelGrantEffect;
};
```

### Gap 2 — Missing effect atom: `grant_feat_choice` (atom_widening)

Even if the family existed, `ClassFeatureEffect` is currently:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The ASI mechanic is: "choose the ASI feat **or** another feat for which you qualify." This is an open-ended feat-menu selection from the feat catalog. No existing effect atom covers this:

- `grant_proficiency` — too narrow (skills/tools/weapons, not feats)
- `grant_spell_access` — wrong domain
- `grant_extra_action` — unrelated
- `heal_hp` — unrelated

**Proposed atom:** `grant_feat_choice`

```typescript
export type GrantFeatChoiceEffect = {
  readonly kind: "grant_feat_choice";
  // The "default" feat offered; player may substitute any qualifying feat.
  readonly defaultFeatId: string;
};
```

The `defaultFeatId` would be `"ability_score_improvement"` for all standard class ASI slots.

## Scope of the gap

Every class's L4 (and L8/L12/L16/L19) ASI entry has this exact shape. This is a recurring pattern across all 12 classes — not an isolated edge case. One new family + one new effect atom unblocks all of them uniformly.

## Relation to v4 taxonomy

The v4 TAXONOMY_atoms_graph.md notes `modify_ability_score` as out-of-scope as a **runtime effect**. That is consistent with this proposal: `grant_feat_choice` is a character-progression atom (fires at level-up, not during combat), one layer above `modify_ability_score`. If the ASI feat is selected, the feat's own mechanics (outside the runtime) handle the score change. The `grant_feat_choice` atom only needs to record that a feat slot was granted and which default feat the class offers.

## Recommended next step

1. Add `family: "level_grant"` to `ClassFeatureMechanics` union in `types.ts`.
2. Add `GrantFeatChoiceEffect` to `ClassFeatureEffect` union.
3. Add a `traceClassFeatureLevelGrant` handler in `tracer.ts` emitting a `class_feature_root → activate(level_grant) → grant_feat_choice` subgraph.
4. Re-encode all class ASI slots using the new family.
