# Proposal: structural_widening — Ability Score Improvement (paladin L4)

## Summary

Ability Score Improvement cannot be encoded honestly in the current surface. The unit is a **permanent character-progression grant** that fires automatically at class level 4 (and 8, 12, 16). The existing `ClassFeatureMechanics` has only one family — `activation` — which models turn-based features with an activation cost, a use-count resource, and a rest-reset cadence. None of those constructs apply here.

## Gaps identified

### 1. Missing family: passive level-up grant

The `activation` family shape is:

```typescript
type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};

type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;  // free | bonus_action
  readonly resource: UseCountResource;                   // use_count with cap
  readonly resetCadence: RestResetCadence;               // rest-based refill
};
```

ASI has **no activation cost** (it is not used on a turn), **no use-count resource** (it is acquired permanently), and **no reset cadence** (there is nothing to refill). Encoding it under `activation` with fabricated values (e.g., `{ kind: "free" }` + `{ kind: "fixed", uses: 1 }` + `{ kind: "long_rest" }`) would produce a trace that describes a once-per-long-rest consumable — which is not what ASI is.

**Proposed family:** `passive_grant` (or `level_grant`).

Minimum shape needed:

```typescript
type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;   // what is granted
  // acquiredAtLevel (already on ClassFeatureRecord) covers the level trigger.
  // recurrence could optionally list additional levels [8, 12, 16] if the
  // feature is received multiple times at distinct levels.
};
```

### 2. Missing effect atom: `grant_feat`

The `ClassFeatureEffect` union is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

There is no variant for granting a feat (or a choice among qualifying feats). The v4 taxonomy (§9 Effect Atoms) lists `grant_proficiency` and `grant_spell_access` but not `grant_feat`.

**Proposed new effect:**

```typescript
type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly choice: "fixed" | "player_choice";
  readonly featId?: string;         // if choice === "fixed"
  // qualifications (e.g., level prereqs) are authoring-side metadata,
  // not a runtime atom, so they stay in description text.
};
```

### 3. Missing player-choice modeling

The grant is "the ASI feat **or another feat of your choice**." This is a player-directed selection at level-up time. The taxonomy lists `choose` as a procedure atom, but the class-feature surface has no shape for a level-up-time player choice distinct from cast-time target selection.

Whether to model this as a `choose` procedure atom or a variant flag on `GrantFeatEffect` is a design decision for the project owner. For the purposes of this survey it is recorded as a secondary gap — the primary blocker is the missing family and the missing `grant_feat` effect.

## Scope note

This structural gap is **not paladin-specific**. Every class has an ASI feature at L4 (and again at L8, L12, L16, L19 for some). The corpus contains at minimum 11 class × multiple level entries with the identical pattern. Encoding a single `passive_grant` family + `grant_feat` effect would unblock all of them simultaneously.

## taxonomy §12 note

The `modify_ability_score` atom is explicitly deferred in TAXONOMY_atoms_graph.md §12 as out-of-scope ("pre-runtime character state"). This means even after adding `grant_feat`, the downstream effect of the ASI feat itself (the +2 to an ability score) cannot be traced through the core graph. That is consistent with current taxonomy scope — the tracer would stop at `grant_feat` as the leaf effect.
