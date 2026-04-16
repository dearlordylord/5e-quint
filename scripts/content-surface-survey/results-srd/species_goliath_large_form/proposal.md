# Proposal: Widening required for Large Form (Goliath)

**Slug:** `species_goliath_large_form`
**Outcome:** `structural_widening`

## Unit summary

> Starting at character level 5, you can change your size to Large as a Bonus Action if you're in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest.

## Why it cannot be encoded

### 1. No `species_trait` kind in `UnitRecord` (structural)

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`

There is no `SpeciesTraitRecord` type and no `species_trait` branch in the tracer's top-level `switch`. The unit cannot be processed at all — not even partially. This is the primary blocker. A new kind and a new mechanics family (analogous to `ClassFeatureActivationMechanics`) must be added before any species trait can be encoded.

### 2. `modify_speed` missing from any effect union (surface widening)

The trait grants +10 Speed for the duration. `modify_speed` exists in the v4 atom inventory but is absent from `ClassFeatureEffect` (`grant_extra_action | heal_hp`). Whatever effect union a `SpeciesTraitRecord` introduces would need `modify_speed` as a variant from the start.

Proposed variant:
```typescript
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly delta: number; // signed, in feet
};
```

### 3. `ability_check` missing from `RollKind` (surface widening)

The trait grants Advantage on Strength checks. `RollKind` is `"attack_roll" | "saving_throw"`. Ability checks are not representable, so `modify_roll_advantage` cannot be correctly targeted.

Proposed widening:
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

`modify_roll_advantage` would also need an optional `ability` filter field (only STR checks, not all ability checks), or the effect could be expressed as a narrower variant. Exact design is deferred.

### 4. No `change_size` effect atom (atom widening)

The trait transforms the creature's size to Large for the duration. No v4 atom exists for this. `alter_item_kind` is scoped to items and does not apply here.

Proposed atom (v4 addition):
```
change_size — effect — sets a creature's active size to a named size category for a duration
```

Proposed surface variant:
```typescript
export type ChangeSizeEffect = {
  readonly kind: "change_size";
  readonly targetSize: "Large"; // widen as needed
};
```

### 5. No level-unlock gate for species traits (surface widening)

The trait becomes available only "starting at character level 5." `ClassFeatureRecord` handles this with `acquiredAtLevel`, but the concept does not exist in any species-trait record shape. A `SpeciesTraitRecord` should include an optional `availableAtCharacterLevel` field (or similar) to model level-gated traits.

## Graph shape (if widening were resolved)

The trait would trace as a `species_trait` activation:

```
species_trait_root
  → activate
    consumes: bonus_action_quota
    consumes: use_count (max 1, long_rest)
    grants: persist (timed, 10 min)
      persists_until: expire
    grants: change_size (Large)
      attaches_to: self
    grants: modify_roll_advantage (advantage, ability_check / STR)
      attaches_to: self
    grants: modify_speed (+10 ft)
      attaches_to: self
```

Atoms needed beyond current inventory: `change_size` (new), `ability_check` RollKind variant (new).
Atoms already in inventory: `activate`, `bonus_action_quota`, `use_count`, `persist`, `expire`, `modify_roll_advantage`, `modify_speed`, `self`.

## Recommendation

Add `SpeciesTraitRecord` with an `activation` mechanics family mirroring `ClassFeatureActivationMechanics`, then widen the effect union to include `modify_speed`, `change_size`, and extend `RollKind` with `ability_check`. These four changes together would make this unit (and similar species traits) encodable.
