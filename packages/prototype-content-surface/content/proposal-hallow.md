# Proposal: Surface Widenings for Hallow

## Unit
- **Name**: Hallow
- **Kind**: spell
- **Level**: 5
- **School**: abjuration
- **Outcome**: `surface_widening`

## Why encoding was not attempted

Hallow fits the `ongoing_effect` family conceptually (persistent area effect with passive riders), but encoding is blocked by multiple surface type gaps. Authoring a `.dhall` would require lying about casting time, duration, and all operations. No honest JSON can be produced until the surface is widened.

---

## Gap 1 — `CastingTime.hours` variant

**Missing**: A `{ kind: "hours"; amount: number; ritual?: boolean }` variant of `CastingTime`.

**Current variants**: `action`, `bonus_action`, `reaction`, `minutes`.

**Evidence**: Hallow's casting time is 24 hours. The `minutes` variant maxes out at minute-scale long casts (Alarm uses 1 minute). 24 hours cannot be represented.

**Proposed shape**:
```typescript
| { readonly kind: "hours"; readonly amount: number; readonly ritual: boolean }
```

**Other pressure cases**: Forbiddance (10 minutes — this actually fits `minutes`), Sequester (1 hour), Astral Projection (1 hour). An `hours` variant covers all of these.

---

## Gap 2 — `Duration.permanent` variant

**Missing**: A `{ kind: "permanent"; endsOn: ReadonlyArray<"dispel" | "antimagic"> }` variant of `Duration`.

**Current variants**: `instantaneous`, `concentration` (upTo), `timed` (value).

**Evidence**: Hallow lasts until dispelled — no time limit, no concentration. `timed` cannot represent this without lying about the value.

**Proposed shape**:
```typescript
| { readonly kind: "permanent"; readonly endsOn: ReadonlyArray<"dispel"> }
```

**Other pressure cases**: Forbiddance, Arcane Lock, Glyph of Warding, Hallow, Imprisonment all have permanent-until-dispelled durations.

---

## Gap 3 — `OngoingOperation` area-passive variants

The current `OngoingOperation` union contains only `roll_modifier` and `damage_on_hit`. Hallow requires several area-passive operations, all of which map to existing v4 atoms but have no surface representation:

### 3a — `area_entry_block`
**v4 atom**: `block_travel`  
**Evidence**: "Creatures of the chosen types can't willingly enter the area"  
**Proposed shape**:
```typescript
{
  readonly kind: "area_entry_block";
  readonly creatureTypeFilter: ReadonlyArray<CreatureType>;  // new type needed
  readonly voluntary: true;  // "can't willingly" vs total blockage
}
```

### 3b — `condition_suppress_in_area`
**v4 atom**: `remove_condition` (continuous form)  
**Evidence**: "any creature that is possessed by or that has the Charmed or Frightened condition from such creatures isn't possessed, Charmed, or Frightened by them while in the area"  
This is an ongoing suppression (not a one-time removal) of conditions sourced from a specific creature type.

### 3c — `grant_resistance_in_area` / `grant_vulnerability_in_area`
**v4 atoms**: `grant_resistance`, `bypass_resistance` (as vulnerability)  
**Evidence**: "Creatures of any types you choose have Resistance/Vulnerability to one damage type of your choice while in the area"  
These are passive area riders — creatures gain or lose resistance while inside the hallowed sphere.

### 3d — `apply_condition_in_area` / `block_condition_in_area`
**v4 atom**: `apply_condition`, `remove_condition`  
**Evidence**: Fear ("Creatures have the Frightened condition"), Courage ("Creatures can't gain the Frightened condition")  
Passive area-scoped condition application or blocking.

### 3e — `block_travel_type_in_area`
**v4 atom**: `block_travel`  
**Evidence**: "Creatures can't enter or exit the area using teleportation or interplanar travel"  
Blocks specific movement types (teleportation, planar travel) rather than all travel.

### 3f — Environment effects (Darkness, Daylight, Silence)
**v4 atoms**: (observational/environmental, potentially `create_object` or caller-owned)  
These may be partially or fully `dm_agenda` — darkness and daylight fill the area with light-level effects, silence affects sound. These may be environment-state effects outside the core mechanics model, per `ARCHITECTURE.md` (notification surfaces, environmental state).

### 3g — Tongues (language comprehension)
**v4 atom**: `telepathic_link` (closest)  
This is likely `dm_agenda` — mutual comprehension of all languages is a narrative/social effect with no deterministic combat resolution.

### 3h — Peaceful Rest (block undead creation)
**v4 atom**: potentially `block_travel` or a new `block_effect` variant  
"Dead bodies interred in the area can't be turned into Undead" — this is a state constraint on animate-dead spells. May require a new atom or is partially `dm_agenda`.

---

## Gap 4 — `OngoingEffectMechanics` single `operation` field

**Missing**: Array support for simultaneous operations.

**Current shape**: `readonly operation: OngoingOperation` (single).

**Evidence**: Hallow has two simultaneous active effects — Hallowed Ward (always present) plus the chosen Extra Effect. Both are ongoing area riders.

**Proposed change**: Rename/replace `operation` with `operations: ReadonlyArray<OngoingOperation>` — or keep `operation` for single-operation spells and add an `operations` variant for multi-effect spells via family split.

---

## Gap 5 — Choice-at-cast encoding

**Missing**: A surface mechanism for "choose one from N options at cast time; the choice is bound permanently."

**v4 atom**: `choose` procedure exists in the taxonomy.

**Evidence**: "You bind an extra effect to the area from the list below: [10 options]"

This is a `choose` procedure that fires at cast time and selects one `OngoingOperation` variant to bind permanently. The surface has no encoding for parameterized choices over operation variants.

---

## Summary of widening requirements

| Gap | Kind | v4 atoms available? | Notes |
|-----|------|---------------------|-------|
| `CastingTime.hours` | new_variant | n/a | Straightforward extension |
| `Duration.permanent` | new_variant | n/a | Several spells pressure this |
| `OngoingOperation.area_entry_block` | new_variant | `block_travel` | needs `CreatureType` enum |
| `OngoingOperation.condition_suppress_in_area` | new_variant | `remove_condition` | continuous suppression form |
| `OngoingOperation.grant_resistance/vulnerability_in_area` | new_variant | `grant_resistance` | passive area rider |
| `OngoingOperation.apply/block_condition_in_area` | new_variant | `apply_condition` | passive area rider |
| `OngoingOperation.block_teleport_in_area` | new_variant | `block_travel` | movement-type filter |
| Multiple operations on single spell | new_variant | n/a | change `operation` → `operations[]` |
| Choice-at-cast over operations | new_variant | `choose` | parameterized binding |
| Darkness/Daylight/Silence | possibly dm_agenda | — | environmental state, caller-owned |
| Tongues | possibly dm_agenda | `telepathic_link` | narrative/social |
| Peaceful Rest | new_variant or dm_agenda | — | constraint on animate-dead |

No new v4 atoms are required. All needed mechanics map to existing v4 taxonomy atoms. The gaps are entirely surface-layer: missing type variants that would expose those v4 atoms to the authoring layer.
