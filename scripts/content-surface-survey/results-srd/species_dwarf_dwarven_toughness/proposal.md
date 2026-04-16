# Widening Proposal: Dwarven Toughness (Dwarf)

**Slug:** `species_dwarf_dwarven_toughness`
**Outcome:** `structural_widening`
**Classification confidence:** high

---

## Rule text

> ***Dwarven Toughness.*** Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.

---

## Why it doesn't fit

### 1. `kind: "species_trait"` is absent from `UnitRecord`

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The tracer's top-level switch would throw on any JSON with `"kind": "species_trait"`. Adding a fake `"kind": "class_feature"` would be dishonest — a Dwarf species trait is not a class feature.

### 2. No passive-modifier mechanics family exists

`ClassFeatureMechanics` currently has one family: `"activation"`, which requires:
- `activationCost` — meaningless (the trait is always-on)
- `resource` (use_count) — meaningless (no uses to track)
- `resetCadence` — meaningless (never resets because it never depletes)

Forcing Dwarven Toughness into `activation` with `activationCost: { kind: "free" }` and a dummy resource would produce a misleading trace — the tracer would show `activate → use_count → rest_window`, none of which exist in the actual rule.

---

## What the correct encoding would require

### New type: `SpeciesTraitRecord`

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

Added to `UnitRecord`:
```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

### New mechanics family: `passive_modifier`

```typescript
export type PassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: PassiveModifierEffect;
};
```

### New effect type: `ModifyMaxHpEffect`

The v4 atom `modify_max_hp` exists but `ClassFeatureEffect` only allows `GrantExtraActionEffect | HealHpEffect`. A species-trait mechanics family needs its own effect union that includes:

```typescript
export type ModifyMaxHpEffect = {
  readonly kind: "modify_max_hp";
  readonly amount: DiceAmount;  // linear_per_level, axis=character, base=1, perLevel=1
};
```

---

## What the Dhall encoding would look like (for reference)

```dhall
{ kind = "species_trait"
, id = "species_dwarf_dwarven_toughness"
, name = "Dwarven Toughness"
, provenance = { kind = "srd-5.2.1", section = "Character-Origins#Dwarf" }
, description = "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."
, mechanics =
    { family = "passive_modifier"
    , effect =
        { kind = "modify_max_hp"
        , amount =
            { kind = "linear_per_level"
            , axis = "character"
            , base = { dice = 0, dieSize = 1, flat = 1 }
            , perLevel = { flat = 1 }
            , startingAtLevel = 1
            }
        }
    }
}
```

---

## Tracer impact

After the widening, the trace for this unit would look like:

```
species_trait_root → [roots] → passive (no procedure needed, or a new `passive` atom)
                   → [grants] → modify_max_hp
                              → [modifies via] → scale_numeric_bonus (axis=character, +1/level from L1)
```

The `modify_max_hp` atom is already in v4 taxonomy. `scale_numeric_bonus` is already in v4. Only the container shape is new.

---

## TAXONOMY cross-reference

TAXONOMY_atoms_graph.md §12 explicitly records this gap:

> `modify_max_hp` per-level scaling (Dwarven Toughness). Current atom covers it; growth cadence is character-progression metadata.

The taxonomy is correct — the atom is fine. The surface layer has not yet been widened to expose it via a species-trait container.
