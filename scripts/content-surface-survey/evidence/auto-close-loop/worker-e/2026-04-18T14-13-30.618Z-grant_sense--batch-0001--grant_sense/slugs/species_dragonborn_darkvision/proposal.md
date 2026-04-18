# Proposal: species_dragonborn_darkvision

## Unit
**Darkvision (Dragonborn)** — species trait, SRD 5.2.1  
Section: `Character-Origins.md#Dragonborn`

## Outcome
`structural_widening`

## Rule Text
> ***Darkvision.*** You have Darkvision with a range of 60 feet.

## Why it Cannot be Encoded

### Gap 1 — `SpeciesTraitRecord` absent from `UnitRecord` (root cause)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy lists `species_trait_root` as a source atom (confirming intent to model species traits), but the surface type has not been widened to include the kind. No species trait of any shape can be encoded until this is added.

### Gap 2 — No passive / always-on mechanics family

Darkvision has no activation cost, no use count, no reset cadence. It is a permanent grant from character creation. `ClassFeatureMechanics` only has an `activation` family. No existing mechanics family can honestly represent an always-on passive trait. A new family is needed:

```typescript
export type SpeciesTraitPassiveMechanics = {
  readonly family: "passive";
  readonly effect: SpeciesTraitEffect;
};
```

### Gap 3 — `grant_sense` effect not in any surface effect union

v4 taxonomy includes `grant_sense` as an effect atom. Darkvision is precisely a sense grant. However `grant_sense` appears in neither `ClassFeatureEffect`, `MasteryEffect`, `ReactionEffect`, nor any other effect union in `types.ts`. A typed variant is needed:

```typescript
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: "darkvision" | "blindsight" | "tremorsense" | "truesight";
  readonly rangeFeet: number;
};
```

## Recommended Schema Additions

```typescript
// New effect atom (gap 3)
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: "darkvision" | "blindsight" | "tremorsense" | "truesight";
  readonly rangeFeet: number;
};

// New effect union for species traits
export type SpeciesTraitEffect =
  | GrantSenseEffect
  | { readonly kind: "grant_resistance"; readonly damageType: DamageType };
  // widen as more traits land

// New passive mechanics family (gap 2)
export type SpeciesTraitPassiveMechanics = {
  readonly family: "passive";
  readonly effect: SpeciesTraitEffect;
};

export type SpeciesTraitMechanics = SpeciesTraitPassiveMechanics;
// widen with "activation" family when Draconic Flight lands

// New record kind (gap 1)
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

// Updated union
export type UnitRecord =
  | SpellRecord
  | ClassFeatureRecord
  | MasteryRecord
  | SpeciesTraitRecord;
```

## Encoded Form (blocked until gaps closed)

Once the above are added, Darkvision would encode as:

```dhall
{ kind = "species_trait"
, id = "species_dragonborn_darkvision"
, name = "Darkvision (Dragonborn)"
, provenance = { kind = "srd-5.2.1", section = "Character-Origins.md#Dragonborn" }
, description = "You have Darkvision with a range of 60 feet."
, mechanics =
    { family = "passive"
    , effect = { kind = "grant_sense", sense = "darkvision", rangeFeet = 60 }
    }
}
```

Tracer atoms: `species_trait_root`, `grant_sense`  
Relations: `roots`, `grants`

## Context: All Five Dragonborn Traits Share Gap 1

All five Dragonborn traits in the survey queue require `SpeciesTraitRecord` before any can be encoded:

| Trait | Additional gaps |
|---|---|
| Draconic Ancestry | data-table / choice shape (new subgraph) |
| Breath Weapon | area save-gate, use-count = PB, activation family |
| Damage Resistance | `grant_resistance` in `SpeciesTraitEffect` |
| **Darkvision** | `grant_sense` in `SpeciesTraitEffect`, passive family |
| Draconic Flight | bonus-action activation, `modify_speed` (fly), use-count 1, long rest |

Closing gap 1 (`SpeciesTraitRecord`) and gap 2 (`passive` family) unblocks Darkvision and Damage Resistance immediately.
