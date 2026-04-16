# Proposal: surface widening for Unarmored Defense (Barbarian L1)

## Unit

- **Slug:** `barbarian_unarmored_defense_l1`
- **Kind:** `class_feature`
- **Provenance:** `srd-5.2.1`, Classes/Barbarian#Level 1: Unarmored Defense

## Source text

> While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.

## Why encoding fails

### Blocking gap 1 — no passive family for `ClassFeatureMechanics`

`ClassFeatureMechanics` is currently a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` structurally requires three fields that do not apply to Unarmored Defense:

| Required field | Unarmored Defense |
|---|---|
| `activationCost` | None — never activated |
| `resource` (use_count + cap) | None — not a limited-use feature |
| `resetCadence` | None — no expenditure to reset |

Forcing these fields to dummy values (`free` / `fixed: 1 use` / any rest) would produce a dishonest trace — the tracer would emit `activate`, `use_count`, and `rest_window` nodes that do not correspond to any mechanical reality of the rule.

**Required widening:** a `"passive"` (or `"constant"`) family for `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly guard?: PassiveGuard;       // condition under which the passive applies
  readonly effect: ClassFeaturePassiveEffect;
};
```

### Blocking gap 2 — no AC formula effect in `ClassFeatureEffect`

Current `ClassFeatureEffect`:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The Unarmored Defense effect is: **replace the base AC formula with `10 + DEX mod + CON mod`**. This is not a delta, not a heal, and not an extra action. The closest existing atom is `modify_ac`, but in the surface it appears only as `ReactionEffect.modify_ac` with a fixed `delta: number`. That shape cannot express an ability-score-sum formula.

**Required widening:** a new `ClassFeatureEffect` variant (and corresponding tracer branch):

```typescript
export type SetAcFormulaEffect = {
  readonly kind: "set_ac_formula";
  readonly base: number;              // 10
  readonly abilityMods: ReadonlyArray<Ability>;  // ["dex", "con"]
};
```

### Secondary gap — equipment guard predicate

The passive applies only under a specific equipment condition: *no armor worn*. The surface has no closed predicate grammar for this kind of guard. A minimal shape for the passive family would need:

```typescript
export type PassiveGuard =
  | { readonly kind: "no_armor_worn" }
  | { readonly kind: "no_armor_worn_shield_allowed" }
  // widen as more conditions land
```

The `shield_allowed` sub-clause is notable: RAW explicitly says the shield benefit is preserved, which is a distinction from Mage Armor (which similarly is suppressed by armor but makes no explicit shield mention in its SRD text).

## v4 taxonomy status

- `modify_ac` is a listed v4 effect atom. The widening needed here is a **surface shape** variant (ability-sum formula vs. fixed delta), not a new atom. If `modify_ac` is generalized at the surface to carry either a delta or a formula expression, the v4 atom remains unchanged.
- The passive family gap is a **structural widening** — it requires a new `ClassFeatureMechanics` discriminant, a new set of surface types, and new tracer branches.

## Parallel cases

Both of the following units are structurally identical to this one and will require the same widening:

- `monk_unarmored_defense_l1` — AC = 10 + DEX + WIS (same passive structure, different ability pair)
- Any future "natural armor" feature that sets a base AC formula from ability scores

The widening, once implemented, should cover all ability-sum AC formula features in a single parametric surface type.

## Outcome

`structural_widening` — the unit cannot be honestly encoded without:

1. A `"passive"` family added to `ClassFeatureMechanics`, and
2. A `set_ac_formula` (or equivalent) variant added to `ClassFeatureEffect`.

No `.dhall`, `.json`, or `.trace.md` files are produced for this unit.
