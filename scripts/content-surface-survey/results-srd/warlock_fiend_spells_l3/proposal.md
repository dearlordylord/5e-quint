# Proposal: warlock_fiend_spells_l3

## Outcome: `surface_widening`

## What was encoded

The L3 row of the Fiend Spells table: Burning Hands, Command, Scorching Ray, Suggestion — all as `grant_spell_access` with `mode: "prepared"` in a `passive` class-feature. Typecheck passes; tracer emits a clean graph.

## What is missing

The Fiend Spells feature is a progressive table granting spells at warlock levels 3, 5, 7, and 9:

| Warlock Level | Spells |
|---|---|
| 3 | Burning Hands, Command, Scorching Ray, Suggestion |
| 5 | Fireball, Stinking Cloud |
| 7 | Fire Shield, Wall of Fire |
| 9 | Geas, Insect Plague |

The L5/7/9 rows cannot be represented in the current surface. `PassiveMechanics.grants` is a flat unconditional list of `EffectAtom`s. There is no per-grant level predicate — `EquipmentPredicate` covers equipment state (wearing armor, holding an item, etc.), not class/character level thresholds.

## Proposed widening

**New variant of `EquipmentPredicate` (or a parallel `GrantPredicate`):** add a class-level threshold gate that can be applied per-grant within `PassiveMechanics.grants`:

```typescript
// Option A: extend EquipmentPredicate (stretches its semantic scope)
| { readonly kind: "class_level_at_least"; readonly level: number }

// Option B: introduce a parallel GrantPredicate (cleaner separation)
export type GrantPredicate =
  | { readonly kind: "class_level_at_least"; readonly level: number };

// PassiveMechanics grant entries would carry an optional predicate:
export type ConditionalGrant = {
  readonly effect: EffectAtom;
  readonly predicate?: GrantPredicate;
};
```

Option B is preferable — it keeps `EquipmentPredicate` scoped to equipment state and introduces a separate axis for level-gated progression. The `grants` field type would widen from `ReadonlyArray<EffectAtom>` to `ReadonlyArray<EffectAtom | ConditionalGrant>` (or `ReadonlyArray<ConditionalGrant>` with predicate optional).

## Pressure

This pattern is common across SRD subclass features. Any subclass that grants a spell list by level (Fiend, Archfey, Great Old One for Warlock; Circle spells for Druid; Domain spells for Cleric; etc.) hits this gap. High-priority widening.
