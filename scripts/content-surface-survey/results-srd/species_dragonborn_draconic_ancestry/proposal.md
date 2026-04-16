# Proposal: `species_dragonborn_draconic_ancestry`

## Outcome: `structural_widening`

The unit cannot be encoded in any honest form under the current surface. Two structural gaps must be closed before any species trait can be authored.

---

## Gap 1 — Missing `species_trait` kind in `UnitRecord`

`types.ts` defines:

```ts
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The tracer's `traceUnit` switch handles only `"spell"`, `"class_feature"`, and `"mastery"` — a species trait passed to `traceUnit` would hit the exhaustive `never` branch and throw immediately.

The v4 taxonomy (`TAXONOMY_atoms_graph.md §1`) already lists `species_trait_root` as a source atom, confirming the category is recognized. The surface just hasn't been wired up.

**Required addition:**

```ts
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

---

## Gap 2 — Missing mechanics family for passive lineage-parameter choice

Draconic Ancestry's mechanic is:

> Choose a dragon type from a table at character creation. That choice sets a damage type (acid, lightning, fire, poison, or cold) used by Breath Weapon and Damage Resistance.

This is a **deferred-parameter selection**: a one-time player decision made at character creation that stores a typed parameter (damage type) which other traits read. It has:

- No activation cost (no action/bonus action/reaction)
- No use-count or quota
- No attack roll, saving throw, or spell slot
- No runtime effect by itself — it parameterizes sibling traits

None of the existing families can represent this honestly:
- `activation` (class feature): requires `activationCost`, `resource`, `resetCadence`, `effect` — all inapplicable
- `ongoing_effect` / `activation` / `triggered_reaction` / `anchored_trigger` (spell families): require spell-card header fields that don't apply
- `on_hit_trigger` (mastery): requires a weapon-hit trigger

**Required addition:**

A new `SpeciesTraitMechanics` type with a `lineage_choice` family (or analogously named):

```ts
// A choice made at character creation that stores a typed parameter.
// The parameter is read by sibling traits; this trait itself has no
// runtime effect.
export type LineageChoiceMechanics = {
  readonly family: "lineage_choice";
  readonly parameter: "damage_type";            // the kind of value being chosen
  readonly options: ReadonlyArray<DamageType>;  // closed set of valid choices
};

export type SpeciesTraitMechanics = LineageChoiceMechanics; // widen as more families land
```

**Tracer subgraph** (proposed):

The tracer would emit a `species_trait_root` source node, connected via `roots` to a `choose` procedure node, which `grants` a `damage_type_parameter` effect node. The parameter node would carry the closed option set as a label. No scaling, no window, no lifecycle — the only atoms are the root, the choose procedure, and the stored parameter.

---

## Scope note

This gap affects all five Dragonborn species traits in the survey queue:
- `species_dragonborn_draconic_ancestry` (this unit)
- `species_dragonborn_breath_weapon`
- `species_dragonborn_damage_resistance`
- `species_dragonborn_darkvision`
- `species_dragonborn_draconic_flight`

Breath Weapon and Draconic Flight are also mechanically complex (area shape choice, character-level scaling, proficiency-bonus-scaled use count, Bonus Action activation, fly speed grant) and will require additional widening beyond the `species_trait` kind. Damage Resistance is a `grant_resistance` effect, Darkvision is a `grant_sense` effect — both likely encode cleanly once the kind exists. Draconic Ancestry itself needs only the `lineage_choice` family.
