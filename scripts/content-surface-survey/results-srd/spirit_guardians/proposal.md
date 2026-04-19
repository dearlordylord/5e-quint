# Surface Widening Proposal: Spirit Guardians

## Summary

Spirit Guardians encodes cleanly as `ongoing_effect` (family fits, JSON typechecks, tracer succeeds) with four surface gaps. Three of the four gaps are pre-existing patterns already documented in Cloudkill, Moonbeam, and Web. One (cast-time creature exclusion) is new pressure from this unit.

## Encoded mechanics (clean)

- **Area attachment**: emanation r=15 ft, origin=self (follows caster)
- **Duration**: concentration, up to 10 minutes
- **Speed halved** (`set_speed_ratio` 1/2, passive trigger)
- **Wis save on creature entry** (`on_creature_enters_area`): fail=3d8 choice dam, success=half
- **Wis save on turn end in area** (`on_creature_ends_turn_in_area`): same
- **Upcast scaling**: `linear_per_level` axis=slot, base=3d8, +1d8 per level above 3
- **Damage type**: encoded as `CastTimeChoice<DamageType>` options=[radiant, necrotic] — see gap 4 below

## Gap 1: `on_area_enters_creature_space` trigger

**RAW**: "whenever the Emanation enters a creature's space" — fires when the **caster moves** and the self-centered emanation passes over a stationary creature.

**Current surface**: `on_creature_enters_area` captures creature-initiated entry only. No trigger exists for area-initiated overlap (caster-moves-area-into-creature).

**Proposed shape**:
```typescript
| { readonly kind: "on_area_enters_creature_space" }
```
Added to `OngoingTrigger`. Semantics: fires when the effect's attached area moves over a creature's space (typically because the attachment's origin is `self` and the caster moved). This is the same widening deferred in Cloudkill and Moonbeam.

## Gap 2: per-operation once-per-turn dedup

**RAW**: "A creature makes this save only once per turn." — If the caster moves over a creature AND the creature ends its turn in the area in the same turn, only one save should fire. The two operations independently would both trigger.

**Current surface**: `OngoingOperation` has no frequency cap or dedup field.

**Proposed shape** (one of two options):

Option A — field on `OngoingOperation`:
```typescript
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly maxTimesPerCreaturePerTurn?: number;  // NEW
};
```

Option B — shared operation group with dedup semantics:
```typescript
// Group operations that share a once-per-turn budget
export type OngoingOperationGroup = {
  readonly operations: ReadonlyNonEmptyArray<OngoingOperation>;
  readonly dedup?: { readonly kind: "once_per_creature_per_turn" };
};
```

Option A is simpler and covers Spirit Guardians + Cloudkill + Moonbeam + Web. Option B is more general (multiple operations sharing a budget). Given the existing pressure, Option A suffices.

This is the same blocker that keeps Web's `on_creature_enters_area` sibling deferred.

## Gap 3: cast-time creature exclusion on area

**RAW**: "When you cast this spell, you can designate creatures to be unaffected by it." — A free-selection exclusion list chosen at the moment of casting. These creatures ignore speed halving and the save gate entirely.

**Current surface**: no exclusion mechanism on `Attachment.area`. `AnchoredFilter.creature_exemption_list` exists for anchored triggers (Alarm) but is not applicable here.

**Proposed shape**:
```typescript
export type Attachment =
  | { readonly kind: "area"
    ; readonly shape: AreaShapeSpec
    ; readonly origin: AreaOrigin
    ; readonly occupantDispositionFilter?: AreaOccupantDispositionFilter
    ; readonly castTimeExclusions?: { readonly kind: "creature_list_chosen_at_cast" }  // NEW
    ; readonly rangeOrigin?: AttachmentRangeOrigin
    }
  // ...
```

The `creature_list_chosen_at_cast` sentinel records that a free exclusion list exists without modeling the list itself (which is runtime state). Downstream phases can observe the flag as a targeting filter.

Alternatively, this could be expressed as `occupantDispositionFilter` extended with a `cast_time_exclusion_list` variant. The sentinel-vs-extension choice depends on whether alignment-based filters (e.g., Protection from Evil and Good) and cast-time-exclusion lists should share grammar.

## Gap 4: `DamageTypeRef.alignment_derived`

**RAW**: "3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil)." — The damage type is determined by the caster's alignment, a character-sheet property established before the spell is cast. This is distinct from `CastTimeChoice` (player freely picks from options).

**Current encoding**: `CastTimeChoice<DamageType>` with options=[radiant, necrotic]. This is the closest available surface primitive but conflates alignment-gating with player agency.

**Proposed shape**:
```typescript
export type DamageTypeRef =
  | DamageType
  | CastTimeChoice<DamageType>
  | {  // NEW
      readonly kind: "alignment_derived";
      readonly onGoodOrNeutral: DamageType;
      readonly onEvil: DamageType;
    };
```

This is the only SRD unit so far with alignment-derived damage type selection. If no other units share this pattern, it may not warrant a new variant in the surface — encoding as `CastTimeChoice` is a defensible approximation for survey purposes.

## Priority assessment

| Gap | Pressure | Pre-existing | Priority |
|---|---|---|---|
| once-per-turn dedup | 3+ units (SG, Cloudkill, Moonbeam, Web) | Yes | High |
| on_area_enters_creature_space | 3+ units (SG, Cloudkill, Moonbeam) | Yes | Medium |
| cast-time creature exclusion | 1 unit (SG) | No | Medium |
| alignment_derived damage type | 1 unit (SG) | No | Low |

The dedup field (Gap 2) has the broadest impact: it unblocks all three partially-encoded area-hazard spells from adding their missing entry trigger. Landing it alongside `on_area_enters_creature_space` would allow Cloudkill, Moonbeam, Web, and Spirit Guardians to all go clean.
