# Proposal: structural_widening for `warlock_fiend_spells_l3`

## Why this unit does not fit

**Fiend Spells** is a passive class feature. The SRD text is:

> "when you reach a Warlock level specified in the Fiend Spells table, you thereafter **always have the listed spells prepared**."

There is no activation, no use count, no reset cadence. The feature is permanently in effect once the warlock level threshold is reached. It is purely declarative: "at level N, you gain these prepared spells."

The current `ClassFeatureMechanics` union has exactly one family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

Where `ClassFeatureActivationMechanics` structurally requires:
- `activationCost: ClassFeatureActivationCost` — Fiend Spells has none
- `resource: UseCountResource` — Fiend Spells has none
- `resetCadence: RestResetCadence` — Fiend Spells has none

Forcing this feature into the `activation` family would produce a false trace: the graph would emit `use_count`, `rest_window`, and `activate` nodes that have no counterpart in the SRD text. Per the encoding guardrails, a misleading trace is worse than no trace.

## Gap 1 — Missing `passive_grant` family for `ClassFeatureMechanics`

A new mechanics family is needed for class features that are permanently active — not activated, not resourced, not refreshed. The shape would be something like:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;
};
```

For level-gated variants (like Fiend Spells), the effect itself carries the threshold schedule (see Gap 3 below). The family header contains no activation or resource fields.

**Scope of impact:** This pattern recurs throughout the SRD for "Domain Spells" type features:
- Cleric Life Domain Spells (L3)
- Paladin Oath of Devotion Spells (L3)
- Druid Circle of the Land Spells (L3)
- Warlock Fiend Spells (L3) — this unit
- Sorcerer Draconic Spells (L3)

All follow the same shape: passive, no activation, no resource, level-threshold spell grants.

## Gap 2 — Missing `grant_spell_access` variant in `ClassFeatureEffect`

`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`

The v4 taxonomy (TAXONOMY_atoms_graph.md §9 Effect Atoms) already includes `grant_spell_access` as a named atom. The gap is that the surface type union for class features doesn't include it.

A minimal variant for this use case:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spells: ReadonlyArray<string>; // spell IDs from UnitRecord
};
```

With `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | GrantSpellAccessEffect`.

## Gap 3 — Level-gated cumulative spell grants

The Fiend Spells table grants spell batches at levels 3, 5, 7, and 9 — cumulatively (once granted, always prepared). This is a threshold-tier schedule where each tier adds a batch of spell IDs rather than replacing a scalar value.

The existing `ThresholdTiers<T>` can be parameterized over `ReadonlyArray<string>` for spell IDs, but the cumulative-add semantics (L5 batch stacks on top of L3, not replaces) differs from the override semantics used for `DiceAmount` threshold tiers. This should be clearly documented as a distinct payload pattern, or modeled as a flat list with `atLevel` filters per entry.

One clean encoding:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly grants: ReadonlyArray<{
    readonly atLevel: number;
    readonly spellIds: ReadonlyArray<string>;
  }>;
};
```

## Proposed trace (hypothetical, not authored)

```
class_feature_root (warlock_fiend_spells_l3)
  → activate (passive_grant family — no quota consumed)
    → grant_spell_access
        L3: burning_hands, command, scorching_ray, suggestion
        L5: fireball, stinking_cloud
        L7: fire_shield, wall_of_fire
        L9: geas, insect_plague
      → scale_target_count (class level thresholds)
```

Atoms from v4 that would be exercised: `class_feature_root`, `grant_spell_access`.
New atoms/families needed: `passive_grant` (new family), `grant_spell_access` in `ClassFeatureEffect` (new surface variant).

## Classification

`structural_widening` — no existing payload family can honestly represent this unit. The `activation` family structurally requires fields (activationCost, resource, resetCadence) that don't exist in the SRD text for this feature.
