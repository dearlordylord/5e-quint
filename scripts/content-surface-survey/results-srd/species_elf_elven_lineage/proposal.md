# Proposal: Elven Lineage (Elf) — structural_widening

## Outcome

**`structural_widening`** — No `UnitRecord` kind exists for species traits.

## Primary Blocker

`types.ts` defines `UnitRecord` as:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy includes `species_trait_root` as a source atom, but the surface types have not been widened to introduce the corresponding record shape. Forcing Elven Lineage into `ClassFeatureRecord` would be dishonest about source kind, has no `className`/`acquiredAtLevel` (it is not a class feature), and would produce a trace claiming `class_feature_root` instead of `species_trait_root`.

## What the Unit Requires

### 1. `SpeciesTraitRecord` (new surface kind)

Minimum shape:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

`SpeciesTraitMechanics` must cover at minimum a `passive` family (always-on effects granted at character creation) and a `choose_lineage` family (the Elven Lineage pattern).

---

### 2. `choose_lineage_branch` (new mechanics family / subgraph)

Elven Lineage presents three distinct named sub-options (Drow, High Elf, Wood Elf). Each branch grants a different set of effects at character levels 1, 3, and 5. This is not reducible to any existing family:

- It is not `activation` — nothing is activated; effects are always-on or level-gated grants.
- It is not `ongoing_effect` — there is no concentration or timed duration.
- It is not `anchored_trigger` — the branch is chosen at character creation, not at spell cast time.

A new `choose_lineage` (or `choose_branch`) mechanics family is needed, with:
- A closed set of named branches
- Per-branch effect lists gated by character level thresholds

---

### 3. Spell-access-once-per-long-rest-without-slot (new resource pattern)

At character levels 3 and 5, each lineage grants a spell that is:
1. Always prepared (no preparation slot consumed)
2. Castable once per long rest without consuming a spell slot
3. Also castable normally using spell slots of the appropriate level
4. Uses a player-chosen spellcasting ability (Int / Wis / Cha, selected at lineage choice)

This pattern does not fit any existing `SpellMechanics` family (which describes individual spell cards, not "access to a spell as a trait"). It would require a new surface shape, tentatively:

```typescript
type LevelGatedSpellAccess = {
  readonly spellId: string;
  readonly atCharacterLevel: number;
  readonly freeUses: UseCountResource;
  readonly resetCadence: RestResetCadence; // long_rest
  readonly spellcastingAbilityChoice: ReadonlyArray<Ability>; // [int, wis, cha]
};
```

---

### 4. Effect shape gaps (within a would-be species trait family)

| Effect | v4 atom | Surface gap |
|---|---|---|
| Darkvision range extension (Drow L1: 60→120 ft) | `grant_sense` | No surface type to host it in a species trait context; range extension (vs. grant-from-scratch) is also a novel variant |
| Speed increase (Wood Elf L1: 30→35 ft) | `modify_speed` | No surface type to host it |
| Cantrip grant, swappable on long rest (High Elf) | `grant_spell_access` | No `swappable_on_long_rest` variant exists |

---

### 5. Companion traits (further pressure, noted for completeness)

These are additional Elf traits adjacent to Elven Lineage, not encoded here but relevant to `SpeciesTraitRecord` design:

- **Fey Ancestry** — Advantage on saves to avoid/end Charmed. Needs `modify_roll_advantage` with a condition-type filter (`on_condition: "charmed"`). Surface currently lacks a condition-scoped roll modifier.
- **Keen Senses** — Proficiency in Insight, Perception, or Survival (player choice). Needs `grant_proficiency` with a choose-one-from-closed-set pattern.
- **Trance** — Sleep immunity + 4-hour long rest. Sleep immunity has no mechanical consequence in core combat (no `sleep` condition in the current condition set). The 4-hour rest clause affects rest duration — adjacent to `dm_agenda`.

---

## Recommended Widening Order

1. Add `SpeciesTraitRecord` + `kind: "species_trait"` to `UnitRecord`.
2. Add `passive` family for simple always-on traits (Darkvision, Fey Ancestry, Keen Senses).
3. Add `choose_lineage` family for the lineage-branch pattern.
4. Add `LevelGatedSpellAccess` surface shape for the once-per-long-rest spell access pattern.
5. Add `grant_sense` + `modify_speed` to the species trait effect vocabulary.
6. Add `swappable_on_long_rest` variant to cantrip/spell access shapes.

## No content files written

Per protocol: the unit does not fit any existing `UnitRecord` kind. No `.dhall`, `.json`, or `.trace.md` files were produced.
