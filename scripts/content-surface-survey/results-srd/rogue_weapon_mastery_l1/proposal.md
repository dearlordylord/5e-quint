# Proposal: Rogue Weapon Mastery L1

## Unit

**Rogue, Level 1 — Weapon Mastery**

> Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows.
>
> Whenever you finish a Long Rest, you can change the kinds of weapons you chose.

## Classification: `atom_widening`

The `passive` family and `class_feature` UnitRecord kind both fit this feature structurally. The blocker is a missing effect atom.

---

## Gap 1 (primary): Missing `grant_mastery_access` atom

### What the SRD says

The feature confers the right to activate the mastery property of N weapon kinds the character is proficient with. Mastery properties are already modeled as separate `MasteryRecord` units (`mastery_sap`, `mastery_topple`, `mastery_cleave`, etc.). This feature is the entitlement that unlocks those records for chosen weapon kinds.

### Why no existing atom covers it

- `grant_proficiency` — grants attack/damage proficiency eligibility, not mastery-property activation rights. Mechanically distinct: you can be proficient with daggers without having Weapon Mastery.
- `grant_feat` — feats are a different category; mastery records are `MasteryRecord`, not `FeatRecord`.
- `grant_spell_access` — spells only.
- No other EffectAtom variant references mastery records at all.

### Proposed atom

```typescript
| {
    readonly kind: "grant_mastery_access";
    // How many weapon kinds the bearer may activate mastery for
    readonly count: number | ThresholdTiers<number>;
    // Filter pool: "proficient" means any weapon the character has proficiency with
    readonly pool: "proficient_weapons";
  }
```

The `count` field accepts `ThresholdTiers<number>` to cover classes (like Barbarian) where the count grows at higher levels. For the Rogue, `count` is a fixed `2` through L20.

---

## Gap 2 (secondary): Rest-triggered reassignment of a passive grant parameter

### What the SRD says

> Whenever you finish a Long Rest, you can change the kinds of weapons you chose.

The Rogue replaces ALL choices on long rest (unlike the Barbarian variant which replaces one). This is a rest-triggered reconfiguration of a build-time parameter, not a use-count refill. No existing `ResetCadence` or activation pattern models this: the current surface supports rest-triggered pool refills but has no concept of "on rest, replace the items selected from a build-time choice."

### Proposed variant

A `reconfigurable` flag or a dedicated variant on `grant_mastery_access`:

```typescript
readonly reconfigureOnRest?: {
  readonly cadence: RestResetCadence;
  readonly replaceCount: number | "all";
};
```

For Rogue: `cadence = { kind: "long_rest" }`, `replaceCount = "all"`.
For Barbarian: `cadence = { kind: "long_rest" }`, `replaceCount = 1`.

This is a secondary gap — it is only meaningful once `grant_mastery_access` exists. If the atom lands without the reconfiguration field, the rest-reassignment mechanic would need a separate proposal pass.

---

## Precedent

`barbarian_weapon_mastery_l1` was classified `atom_widening` for the same primary gap. The Rogue variant differs only in (a) pool scoping ("proficient" vs "Simple or Martial Melee") and (b) `replaceCount = "all"` vs `replaceCount = 1` on long rest. Both differences are parameters on the same missing atom, not new gaps.
