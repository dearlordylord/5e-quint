# Proposal: Giant Ancestry (Goliath) — surface widening gaps

## Unit

- **Slug**: `species_goliath_giant_ancestry`
- **Kind**: `species_trait`
- **Outcome**: `structural_widening`

## What the surface can express now

Several blockers from the prior survey pass have since been resolved in `types.ts`:

| Previously missing | Status |
|---|---|
| `SpeciesTraitRecord` kind in `UnitRecord` | ✅ Now present |
| `UseCountCap.proficiency_bonus` | ✅ Now present |
| `teleport` effect atom | ✅ Now present |
| `modify_speed` effect atom | ✅ Now present |
| `reduce_damage_taken` effect atom | ✅ Now present |

With these in place, individual sub-options can be expressed:

- **Cloud's Jaunt**: `ActivatedAbilityMechanics`, `bonus_action` cost, `teleport` to `unoccupied_visible_space` ≤30 ft, `UseCountCap.proficiency_bonus`, long rest reset — all atoms present.
- **Hill's Tumble**: `apply_condition prone`, `choose_up_to` target with `typeFilter: ["large", ..., "tiny"]` size gate — structurally fine once trigger issue is solved.
- **Frost's Chill**: `damage` (1d6 cold) + `modify_speed` (-10) with `RiderExpiry.caster_turn_start` — atoms present.
- **Stone's Endurance**: `reduce_damage_taken` with `DiceAmount { dice: 1, dieSize: 12, abilityModifier: "con" }` — atom present.
- **Storm's Thunder**: `damage` (1d8 thunder) on the attacker — atom present.

## Remaining blockers

### 1. No build-time pick-one-of-N mechanics shape (primary blocker)

`SpeciesTraitMechanics = PassiveMechanics | ActivatedAbilityMechanics`. Giant Ancestry is one unit with six sub-options, each with a different activation cost and effect. The character picks one permanently at build time.

The surface has no composite or choice wrapper for `SpeciesTraitMechanics`. An honest single-record encoding would need something like:

```typescript
// Proposed addition
export type ChoiceSpeciesTraitMechanics = {
  readonly family: "choice";
  readonly label: string;           // "Giant Ancestry"
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanics | ActivatedAbilityMechanics;
  }>;
  readonly resource: ActivationResource;
  readonly resetCadence: ResetCadence;
};
```

Or alternatively, `CompositeSpeciesTraitMechanics` (parallel to `CompositeClassFeatureMechanics`) with a shared resource header so all options draw from the same PB use pool.

### 2. No `on_caster_attack_hit` activation cost variant

Fire's Burn, Frost's Chill, and Hill's Tumble activate "when you hit a target with an attack roll and deal damage to it." This is not a standard reaction (it doesn't consume the reaction quota) and is not captured by any `ClassFeatureActivationCost` variant. Needed:

```typescript
| { readonly kind: "on_caster_attack_hit" }
```

This complements `replace_attack` (which spends an attack slot) — the new variant fires after a hit lands, optionally consuming a use.

Pressure count: 3 of the 6 Giant Ancestry sub-options.

### 3. No `take_damage` reaction trigger

Stone's Endurance and Storm's Thunder fire "when you take damage." `ReactionTrigger` has `hit_by_attack_roll` (covers one damage source) but not a general "take any damage" trigger. Storm's Thunder further requires the damage source to be within 60 feet.

Proposed addition to `ReactionTrigger`:

```typescript
| {
    readonly kind: "take_damage";
    readonly sourceRangeFeet?: number;  // Storm's Thunder: 60 ft
  }
```

Pressure count: 2 of the 6 sub-options.

## Encoding path once gaps are filled

Once the choice structure and activation cost/trigger gaps are resolved, the full Giant Ancestry unit encodes cleanly:

- Shared resource: `UseCountCap.proficiency_bonus`, `long_rest` reset
- 6 options, each as an `ActivatedAbilityMechanics` member of the choice:
  1. Cloud's Jaunt — `bonus_action`, `teleport` 30 ft
  2. Fire's Burn — `on_caster_attack_hit`, `damage` 1d10 fire
  3. Frost's Chill — `on_caster_attack_hit`, `damage` 1d6 cold + `modify_speed` -10 until `caster_turn_start`
  4. Hill's Tumble — `on_caster_attack_hit`, `apply_condition prone` (target size filter: Large or smaller)
  5. Stone's Endurance — `reaction` (trigger: `take_damage`), `reduce_damage_taken` 1d12+con
  6. Storm's Thunder — `reaction` (trigger: `take_damage`, sourceRangeFeet=60), `damage` 1d8 thunder to source
