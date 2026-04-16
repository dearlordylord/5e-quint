# Proposal: Otherworldly Presence (Tiefling) — structural_widening

## Unit

- **Slug:** species_tiefling_otherworldly_presence
- **Kind:** species_trait
- **Source text:** "You know the *Thaumaturgy* cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait."

## Blocking gap: no species_trait UnitRecord kind

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord` branch. The v4 taxonomy (`TAXONOMY_atoms_graph.md`) includes `species_trait_root` as a source atom and lists it in the source-root coverage snapshot (validation streams: "species + backgrounds × 1 round (13 units)"), but the surface was never widened to carry a species-trait record.

No existing kind can host this unit honestly:

| Candidate kind | Why it fails |
|---|---|
| `class_feature` | Requires `className` (Tiefling is a species, not a class), `acquiredAtLevel` in a class sense, `activationCost`, `resource` (use_count), and `resetCadence`. None apply. |
| `spell` | Thaumaturgy is the granted cantrip, not the trait being encoded. |
| `mastery` | Wrong source atom, wrong mechanics family entirely. |

## Required widening 1: SpeciesTraitRecord

A new top-level record kind is needed:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

And `UnitRecord` would become:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

The tracer would also need a new `traceSpeciesTraitUnit` branch.

## Required widening 2: passive grant_spell_access mechanics family

Otherworldly Presence is a passive permanent grant — no activation, no use-count, no reset cadence. The mechanic is "you permanently know this cantrip." The v4 atom `grant_spell_access` exists but the surface has no mechanics type to carry it for species traits.

A minimal new family:

```typescript
export type GrantSpellKnowledgeMechanics = {
  readonly family: "grant_spell_knowledge";
  readonly spellId: string;           // "thaumaturgy"
  readonly spellcastingAbility: Ability | SpellcastingAbilityRef;
};

export type SpeciesTraitMechanics = GrantSpellKnowledgeMechanics /* | ... */;
```

## Required widening 3: cross-trait spellcasting ability reference

The cantrip's spellcasting ability is not a fixed `Ability` value. It is "the same spellcasting ability you use for your Fiendish Legacy trait" — chosen by the player when selecting the legacy. The surface only has `Ability` as a closed enum; there is no indirection variant.

A new surface type is needed:

```typescript
export type SpellcastingAbilityRef =
  | { readonly kind: "fixed"; readonly ability: Ability }
  | { readonly kind: "same_as_trait"; readonly traitId: string };
```

For Otherworldly Presence:

```typescript
spellcastingAbility: { kind: "same_as_trait", traitId: "species_tiefling_fiendish_legacy" }
```

## Scope of the widening

All three widenings are additive — no existing record kind, mechanics type, or surface type changes. The taxonomy already contains `species_trait_root` and `grant_spell_access`, so no new v4 atoms are needed. The widening is purely at the surface layer (`types.ts`) and tracer (`tracer.ts`).

## Atoms that would appear in a clean trace (projected)

Once the widening lands, the trace would include:

- `species_trait_root` (source)
- `activate` or a new passive procedure atom (if passive grants get their own procedure shape)
- `grant_spell_access` (effect) — grants Thaumaturgy knowledge

Relations: `roots`, `grants`

No resource, no scaling, no window atoms — this is the simplest possible species-trait shape.
