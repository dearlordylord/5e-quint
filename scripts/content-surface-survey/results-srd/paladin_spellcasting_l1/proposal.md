# Proposal: `paladin_spellcasting_l1` — structural_widening

## Summary

`Spellcasting (paladin L1)` cannot be honestly encoded. The feature is a **passive persistent capability grant** — it establishes a spell slot pool, grants access to a prepared spell list, and sets a spellcasting ability modifier. None of these concepts fit the single existing `ClassFeatureMechanics` family (`"activation"`), which is designed for discrete activated abilities with a use-count resource and a point-in-time effect.

No `.dhall` or `.json` was authored. No trace was produced.

---

## Gap Analysis

### 1. Missing family: `spellcasting_grant`

The `ClassFeatureMechanics` discriminated union contains only one member:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation"
```

A new family is needed:

```typescript
export type ClassFeatureSpellcastingMechanics = ClassFeatureMechanicsHeader_-style & {
  readonly family: "spellcasting_grant";
  readonly spellcastingAbility: Ability;          // "cha" for paladin
  readonly slotProgression: SpellSlotProgression; // class-level-indexed slot table
  readonly preparedSpells: PreparedSpellsConfig;  // count scaling + list reference
  readonly focus?: SpellcastingFocus;             // "holy_symbol" etc.
};
```

This gap will recur for every spellcasting class in the survey (bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard).

### 2. Missing effect variant: `grant_spell_slots`

Even if spellcasting were shoehorned into `"activation"`, no `ClassFeatureEffect` variant covers granting a spell slot pool. The v4 resource atom `spell_slot` represents an individual slot consumed by a spell cast — it is not a pool-grant mechanism.

The new variant needs to express:
- A slot pool keyed by class level (using the class's spell slot progression table)
- Long-rest reset cadence

### 3. Missing effect variant / surface concept: `grant_spell_list_access`

The v4 atom `grant_spell_access` exists in the taxonomy but is absent from `ClassFeatureEffect`. The prepared-spells pattern also needs:
- A reference to the class spell list
- A prepared-count that scales with class level (e.g., 2 at L1, growing per Paladin Features table)
- A preparation-change rule (replace one on Long Rest)

The preparation-change rule is likely character-sheet metadata rather than a core mechanics atom.

### 4. Missing concept: spellcasting ability assignment

`Charisma is your spellcasting ability for your Paladin spells.` This determines:
- Spell attack rolls: `d20 + Proficiency Bonus + Charisma modifier`
- Spell save DC: `8 + Proficiency Bonus + Charisma modifier`

There is no surface representation for this. It is not a `ClassFeatureEffect` and is not a scaling node. It is a modifier-source assignment that affects downstream resolution atoms (`attack_roll`, `save_gate`).

---

## Widening Classification

| Gap | Kind | Scope |
|-----|------|-------|
| Missing `spellcasting_grant` family | `new_subgraph` | `ClassFeatureMechanics` discriminated union |
| Missing `grant_spell_slots` effect | `new_variant` | `ClassFeatureEffect` |
| Missing `grant_spell_list_access` effect | `new_variant` | `ClassFeatureEffect` (+ v4 atom promotion) |
| Missing spellcasting ability assignment | `new_variant` | `ClassFeatureEffect` or new dedicated field |

The dominant pressure is the missing family — all other gaps are symptoms of the same structural absence.

---

## Recommended Shape (sketch only)

```typescript
// New family discriminant
export type ClassFeatureSpellcastingGrantMechanics = {
  readonly family: "spellcasting_grant";
  readonly spellcastingAbility: Ability;
  readonly slotProgression: "paladin" | "ranger" | "full_caster"; // or explicit table
  readonly preparedSpellsScaling: LinearPerLevel<number>;         // axis=class
  readonly spellList: ClassName;                                   // "paladin"
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeatureSpellcastingGrantMechanics;  // new
```

The `slotProgression` may need a richer type — half-casters (paladin, ranger) and full-casters (cleric, druid, bard, sorcerer, wizard) use different slot tables, and warlocks use Pact Magic (a separate slot pattern entirely).

---

## Cross-class Impact

This widening unblocks the following survey units (all share the same structural gap):
- `bard_spellcasting_l1`
- `cleric_spellcasting_l1`
- `druid_spellcasting_l1`
- `ranger_spellcasting_l1`
- `sorcerer_spellcasting_l1`
- `wizard_spellcasting_l1`
- `warlock_pact_magic_l1` (variant: short-rest slot pool)

Implementing the family once covers all eight.
