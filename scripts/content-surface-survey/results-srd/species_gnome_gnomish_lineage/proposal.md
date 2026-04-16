# Proposal: Gnomish Lineage (Gnome) — structural_widening

## Blocking gap

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord` kind. The unit cannot be assigned to any existing `UnitRecord` variant. This is the primary structural gap — the same one that blocked Elven Lineage and every other species trait in this survey pass.

No dhall, JSON, or trace files were written. Encoding a fake `ClassFeatureRecord` or `SpellRecord` for this unit would produce a dishonest trace.

---

## Required widenings (in priority order)

### 1. `SpeciesTraitRecord` + species-trait mechanics families (structural)

Add a new top-level record kind to `UnitRecord`:

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

`SpeciesTraitMechanics` needs at minimum:
- A `passive` family (for always-on traits like Darkvision, Gnomish Cunning — already validated in other workers).
- An `innate_spellcasting` family (Forest Gnome, Tiefling Fiendish Legacy, etc.).
- A `lineage_choice` or `choose` family (Gnomish Lineage, Elven Lineage, Tiefling Fiendish Legacy — all present a player choice at character creation).
- An `object_creation` family (Rock Gnome's clockwork device).

### 2. `innate_spellcasting` mechanics family (surface)

Forest Gnome grants:
- Minor Illusion cantrip (always known, no slot ever needed)
- Speak with Animals always-prepared; castable slot-free N times where N = Proficiency Bonus; Long Rest reset; also castable via spell slots

The `proficiency_bonus` axis already exists in `LevelAxis`, so `UseCountResource` with `cap: { kind: "threshold_tiers", axis: "proficiency_bonus", ... }` is expressible at the type level once the family exists. The `grant_spell_access` v4 atom covers the cantrip and prepared-spell grants. The dual-mode casting ("slot-free uses OR use your own spell slots") needs an `innate_spellcasting` mechanics shape that can express both paths.

### 3. `lineage_choice` subgraph (surface/structural)

Both Forest Gnome and Rock Gnome are mutually exclusive options chosen once at character creation. The v4 `choose` procedure atom exists, but no surface family represents a character-creation branch of this form. The `lineage_choice` family should carry an array of named options (each with their own mechanic payload) and model the choice as a `choose` procedure with permanent commitment.

### 4. `create_object` subgraph for Rock Gnome (surface)

Rock Gnome's clockwork device involves:
- A 10-minute extended cast of Prestidigitation (long cast, not combat)
- A `create_object` effect (v4 atom exists)
- A persistence duration of 8 hours (`timed` duration)
- An activation cost (Bonus Action by any creature with a touch)
- An active cap of 3 devices simultaneously
- Dismantling via Utilize action

The atoms are present in v4, but no surface family assembles them into a `create_object` mechanics shape. The 3-device simultaneous cap is also novel — `use_count` tracks consumable charges, not co-existing objects.

---

## v4 atoms used by this unit (already in inventory)

All atoms below exist in v4 and require no new atom additions:

| Atom | Used by |
|---|---|
| `choose` | lineage selection |
| `grant_spell_access` | Minor Illusion, Speak with Animals, Mending, Prestidigitation |
| `use_count` | slot-free Speak with Animals uses (PB-keyed) |
| `rest_window` | Long Rest reset |
| `create_object` | Rock Gnome clockwork device |
| `persist` / `expire` | 8-hour device duration |
| `bonus_action_quota` | device activation cost |
| `species_trait_root` | source atom |

The gap is entirely at the surface and structural level — no new v4 atoms are needed for this unit.
