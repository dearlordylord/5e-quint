# Proposal: Widening for `paladin_faithful_steed_l5`

## Outcome

`structural_widening`

## Unit

**Faithful Steed (paladin L5)** — class feature acquired at paladin level 5.

> You can call on the aid of an otherworldly steed. You always have the *Find Steed* spell prepared.
>
> You can also cast the spell once without expending a spell slot, and you regain the ability to do so when you finish a Long Rest.

---

## Why it does not fit

### Problem 1 — Single-effect constraint in ClassFeatureMechanics

The current surface:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // <-- singular
};
```

Faithful Steed grants **two co-equal effects** at level-up time:
- A passive, always-on spell-preparation grant (no activation, no cost, permanent)
- An active free-cast resource (use_count=1, long rest reset, no spell slot consumed)

There is no existing family that allows multiple effects per feature record. Encoding either effect alone would be dishonest — the feature is defined by both together.

### Problem 2 — Missing ClassFeatureEffect variant: `grant_spell_access`

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

"You always have *Find Steed* prepared" is a permanent spell-access grant. The v4 taxonomy already defines `grant_spell_access` as an effect atom, but no corresponding `ClassFeatureEffect` variant exists. A new variant is needed:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: "always_prepared";   // vs. "learned" (wizard-style) etc.
};
```

### Problem 3 — Missing ClassFeatureEffect variant: `grant_free_spell_cast`

"You can also cast the spell once without expending a spell slot" is a use-count resource whose activation produces a spell cast without consuming a slot. This is distinct from `grant_extra_action` (a generic action grant) and not representable by any current `ClassFeatureEffect`. A new variant is needed:

```typescript
export type GrantFreeSpellCastEffect = {
  readonly kind: "grant_free_spell_cast";
  readonly spellId: string;
  // slot cost is implicitly 0; uses the caster's spell save DC / attack bonus
};
```

This pairs with `use_count` (cap: fixed 1) and `resetCadence: long_rest` in the mechanics header.

---

## Proposed widenings

### W1: New `ClassFeatureMechanics` family — `multi_grant`

To honestly represent features that deliver multiple distinct effects at acquisition time, a new family is needed:

```typescript
export type ClassFeatureMultiGrantMechanics = {
  readonly family: "multi_grant";
  readonly effects: ReadonlyArray<ClassFeatureEffect>;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeatureMultiGrantMechanics;
```

Alternatively, the `activation` family could be widened to support an `effects` array, but this would break all existing `activation` records (which use a single `effect` field).

### W2: New `ClassFeatureEffect` variant — `grant_spell_access`

Covers the "always prepared" half of Faithful Steed and any future class feature that adds spells to the always-prepared list (e.g., Oath spell lists, Ranger Favored Enemy).

### W3: New `ClassFeatureEffect` variant — `grant_free_spell_cast`

Covers the "free cast once per long rest" pattern. This pattern appears in several class features across the SRD (e.g., various subclass features that grant one free cast of a spell per rest), so this widening has multi-unit pressure potential.

---

## v4 Atom Coverage

The v4 taxonomy already contains:
- `grant_spell_access` (§9 Effect Atoms) — covers W2 at the atom level, but no surface variant exists
- `use_count` (§7 Resource Atoms) — covers the free-cast quota
- `rest_window` (§4 Window Atoms) — covers the long-rest reset

W3's `grant_free_spell_cast` would trace to `activate` + `use_count` + `spell_slot` (with zero cost) at the atom level — all existing atoms. The surface variant is the gap.

W1 (the multi-effect structural gap) has no atom-level consequence; it is purely a surface shape problem.

---

## Classification rationale

`structural_widening` (not merely `surface_widening`) because:

1. The composite nature forces a structural change: the current `ClassFeatureMechanics` has exactly one family (`activation`) with exactly one `effect` field. Representing both components of this feature requires either a new family or an array-effects structural change.
2. Even if the single-effect constraint were relaxed, two new `ClassFeatureEffect` variants are needed before the unit typechecks.

The narrower `surface_widening` classification was considered but rejected because Problem 1 forces a family-level structural change, not merely a new variant of an existing shape.
