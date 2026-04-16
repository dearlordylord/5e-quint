# Proposal: species_goliath_powerful_build

**Outcome:** `structural_widening`  
**Unit:** Powerful Build (Goliath) — species trait, SRD 5.2.1

---

## Why it doesn't fit

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `SpeciesTraitRecord`. The v4 taxonomy names `species_trait_root` as a source atom (§1), but `types.ts` defines no record shape, no mechanics family header, and no payload union for species traits.

Forcing this unit into `ClassFeatureRecord` would require fabricating:
- `className` — Powerful Build belongs to a species, not a class.
- `acquiredAtLevel` — species traits are not acquired at a class level.
- A `ClassFeatureMechanics` payload — no family covers passive always-on advantage grants.

That fabrication would produce a misleading trace. Per protocol, no Dhall or JSON content file is produced.

---

## Mechanics breakdown

### 1. Grapple-escape advantage rider

> You have Advantage on any ability check you make to end the Grappled condition.

**Mechanic:** Passive, always-on advantage on a specific subset of ability checks.

**What exists:** `modify_roll_advantage` in `MasteryEffect` and implicitly via `RollModifierOperation`. But `RollKind = "attack_roll" | "saving_throw"` — **ability checks are absent**.

**Gap required:**
- `"ability_check"` added to `RollKind` (or a parallel `AbilityCheckKind`), gated optionally by condition context (ending Grappled).
- A filter predicate narrowing which ability checks qualify (escaping a specific condition rather than all ability checks).

**Classification of this gap:** `surface_widening` — a new variant of `RollKind`, plus a condition-filter shape on the modifier.

### 2. Carrying-capacity size modifier

> You also count as one size larger when determining your carrying capacity.

**Mechanic:** Passive property affecting an encumbrance calculation (SRD Equipment — Lifting and Carrying: carrying capacity = Strength score × 15 × size multiplier). This is a character-sheet rule, not a combat mechanic.

**ARCHITECTURE.md context:** The core models deterministic combat outcomes. Carrying capacity is a logistics/encumbrance concern owned by the caller. This sub-mechanic is likely `dm_agenda` / out-of-core.

**If the surface is to record it:** A new `modify_size_category` effect (passive, specifying domain = `encumbrance`) would be needed. No existing atom covers size-category changes for non-combat rule calculations. (`grant_hover`, `modify_speed`, `modify_ac` are all combat-runtime atoms.)

**Classification of this gap:** `atom_widening` — a new atom for passive size-category modification in non-combat rule domains.

---

## Required widenings (summary)

| Priority | Kind | Name | Blocker for |
|---|---|---|---|
| 1 (primary) | `new_subgraph` | `SpeciesTraitRecord` + species_trait mechanics family | Any species trait encoding |
| 2 | `new_variant` | `"ability_check"` in `RollKind` | Grapple-escape advantage rider |
| 3 | `new_atom` | `modify_size_category` (encumbrance domain) | Carrying capacity rider |

---

## Notes

- The carrying-capacity sub-mechanic may be permanently out-of-core (encumbrance is caller-owned). Before adding `modify_size_category`, the project owner should decide whether encumbrance rules belong in the core atom graph at all.
- The grapple-escape rider also implies a **condition-scoped ability check filter** (only checks to end Grappled, not all ability checks). This is narrower than just adding `"ability_check"` to `RollKind` — a predicate shape is needed too.
- Giant Ancestry and Large Form (the other two Goliath traits in scope) have their own gaps and are tracked under separate worker slugs.
