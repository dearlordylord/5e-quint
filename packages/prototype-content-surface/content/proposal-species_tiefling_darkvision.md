# Proposal: Widening for `species_tiefling_darkvision`

## Unit

**Darkvision (Tiefling)** — SRD 5.2.1, Character-Origins.md §Tiefling

> You have Darkvision with a range of 60 feet.

## Outcome

`structural_widening`

## Why encoding is blocked

### Gap 1 — No `species_trait` kind in `UnitRecord`

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy lists `species_trait_root` as a valid source atom, but the TypeScript surface never defines a matching record type. Any JSON with `"kind": "species_trait"` would fail typecheck immediately.

### Gap 2 — No mechanics family for passive innate properties

All existing mechanics families require at least one of:

| Family | Requires |
|---|---|
| `activation` (spell) | casting time, spell level, school, range, components, duration |
| `activation` (class feature) | activationCost, resource (use_count), resetCadence |
| `on_hit_trigger` (mastery) | weapon hit trigger |
| `ongoing_effect`, `triggered_reaction`, `anchored_trigger` | spell header |

Darkvision is a **permanent, unconditional sense property** granted at character creation. It has:
- No activation cost
- No resource or use count
- No rest reset
- No trigger
- No duration (it never expires)
- No spell slot

There is no family in the surface that can honestly carry this shape.

## Proposed widenings

### 1. `SpeciesTraitRecord` kind

Add `"species_trait"` as a new discriminant in `UnitRecord`:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

### 2. `passive_grant` mechanics family

A minimal family for permanent, unconditional property grants:

```typescript
export type PassiveGrantEffect =
  | { readonly kind: "grant_sense"; readonly sense: "darkvision"; readonly rangeFeet: number }
  | { readonly kind: "grant_resistance"; readonly damageType: DamageType }
  // ... extend as more species traits are encoded

export type PassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effects: ReadonlyArray<PassiveGrantEffect>;
};

export type SpeciesTraitMechanics = PassiveGrantMechanics;
```

This matches the `grant_sense` and `grant_resistance` atoms already in v4. No new atoms are needed — only a new surface family and record kind.

## What a clean encoding would look like

```dhall
{ kind = "species_trait"
, id = "species_tiefling_darkvision"
, name = "Darkvision (Tiefling)"
, provenance = { kind = "srd-5.2.1", section = "Character-Origins#Tiefling" }
, description = "You have Darkvision with a range of 60 feet."
, mechanics =
    { family = "passive_grant"
    , effects = [ { kind = "grant_sense", sense = "darkvision", rangeFeet = 60 } ]
    }
}
```

## Tracer impact

The tracer would need a new `traceSpeciesTraitUnit` branch and a `tracePassiveGrantMechanics` function. The expected graph:

```
species_trait_root → (grants) → grant_sense [60 ft darkvision]
```

Atoms emitted: `species_trait_root`, `grant_sense`  
Relations emitted: `grants`

## Pressure consistency

This gap is not Tiefling-specific. All species darkvision traits (Dwarf, Elf, Gnome, Orc, Dragonborn, Tiefling) share the same shape. A single `passive_grant` family resolves all of them. The `grant_resistance` effect shape also handles Dragonborn Damage Resistance and several Tiefling Fiendish Legacy resistance variants, giving the family immediate multi-unit coverage.
