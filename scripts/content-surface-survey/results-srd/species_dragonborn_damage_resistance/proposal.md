# Proposal: Widening for `species_dragonborn_damage_resistance`

## Outcome: `structural_widening`

## Unit

**Name:** Damage Resistance (Dragonborn)  
**Slug:** `species_dragonborn_damage_resistance`  
**Kind:** `species_trait`  
**SRD text:** "You have Resistance to the damage type determined by your Draconic Ancestry trait."

## Why it does not fit

### Gap 1 — No `species_trait` kind in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. Forcing this unit into `ClassFeatureRecord` would require fabricating a `className` and `acquiredAtLevel`, which are false. No coercion is honest.

### Gap 2 — No passive mechanics family

The existing mechanics families are:

| Family | Kind |
|---|---|
| `activation` | spell or class_feature |
| `ongoing_effect` | spell |
| `triggered_reaction` | spell |
| `anchored_trigger` | spell |
| `on_hit_trigger` | mastery |

Damage Resistance is **passive and permanent** — it requires no activation, no resource, no rest reset. None of these families apply. A new `passive_grant` (or equivalent) family is needed.

### Gap 3 — Damage type parameterized by character-creation choice

The resistance type is not a fixed `DamageType` value. It is determined by the Draconic Ancestry trait, which the player chooses at character creation. The surface has no way to express "the damage type chosen at character creation" — every current surface type requires a concrete `DamageType` literal.

## What is NOT missing

- The v4 taxonomy atom `grant_resistance` (§9 Effect Atoms) already exists. The atom is correct. Only the surface encoding surface and record kind are missing.
- `DamageType` covers all ten Dragonborn options (acid, lightning, fire, poison, cold) — the union is wide enough.

## Proposed widening

### 1. Add `SpeciesTraitRecord`

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

### 2. Add `passive_grant` mechanics family

```typescript
export type PassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: PassiveGrantEffect;
};

export type SpeciesTraitMechanics = PassiveGrantMechanics;
```

### 3. Add `PassiveGrantEffect` including `grant_resistance`

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType | { readonly kind: "from_trait"; readonly traitId: string };
};

export type PassiveGrantEffect = GrantResistanceEffect /* | ... other passive effects */;
```

The `from_trait` variant captures the indirect parameterization — the damage type is resolved at character creation by consulting the Draconic Ancestry trait, not fixed in the authored unit.

## Tracer impact

The tracer would need a new `traceSpeciesTraitUnit` path and a `tracePassiveGrantEffect` helper. For `grant_resistance`, it would emit:

- Source: `species_trait_root`
- Effect: `grant_resistance` (category `effect`)
- Relation: `roots` → `grant_resistance`

No new v4 atoms needed beyond what the taxonomy already defines.

## Classification

`structural_widening` — the kind and mechanics family are both absent. This is the same structural gap that Dragonborn Breath Weapon and other species traits share; the entire species trait record type needs to be introduced before any of these units can be encoded.
