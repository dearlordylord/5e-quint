# Proposal: Forbiddance — Structural Widening

## Outcome: `structural_widening`

No honest encoding is possible. No Dhall/JSON/trace files were produced.

---

## Why no existing family fits

Forbiddance has two mechanically distinct layers:

**Layer 1 — Always-on area prohibition (never event-triggered):**
> "creatures can't teleport into the area or use portals... The spell proofs the area against planar travel"

This is a persistent `block_travel` property of the warded area. It is active for the full duration with no trigger event. It does not fit:
- `anchored_trigger` — wholly event-driven; the trigger→release structure requires something to fire the release. A permanent prohibition has no release event.
- `ongoing_effect` — requires an `OngoingOperation` (`roll_modifier` | `damage_on_hit`); neither covers passive area prohibition.
- Any other existing family.

**Layer 2 — Typed creature damage on enter/end-of-turn:**
> "When a creature of a chosen type enters the spell's area for the first time on a turn or ends its turn there, the creature takes 5d10 Radiant or Necrotic damage"

This is event-triggered damage, closest in shape to `anchored_trigger`. But it fails for two reasons:
1. `AnchoredSignal` is architecturally caller-owned (ARCHITECTURE.md: notification effects are not core-mechanics atoms). Damage is deterministic core mechanics — using a new `damage` signal variant would violate the architecture boundary.
2. Multiple missing surface variants (see below).

---

## Required widenings

### 1. New family: `area_ward`

A new `SpellMechanics` family that can express:
- A persistent anchor on a floor area (with size in sq ft, not just cube/sphere)
- An always-on prohibition effect (block_travel variants: teleportation, portals, planar travel)
- An event-triggered damage rider gated by creature-type filter + password exemption

Sketch:
```typescript
export type AreaWardEffect =
  | { readonly kind: "block_travel"; readonly modes: ReadonlyArray<"teleportation" | "portal" | "planar"> }
  | { readonly kind: "typed_damage"; readonly damageType: DamageType | "caster_choice"; readonly amount: DiceAmount; readonly filters: ReadonlyArray<AreaWardFilter> };

export type AreaWardFilter =
  | { readonly kind: "creature_type_whitelist"; readonly types: ReadonlyArray<CreatureType>; readonly chosenAtCast: true }
  | { readonly kind: "password_exemption"; readonly chosenAtCast: true };

export type AreaWardTrigger =
  | { readonly kind: "enters_area" }
  | { readonly kind: "ends_turn_in_area" };

export type AreaWardMechanics = SpellMechanicsHeader & {
  readonly family: "area_ward";
  readonly anchor: { kind: "floor_area"; maxSqFt: number; heightFt: number };
  readonly prohibitions: ReadonlyArray<AreaWardEffect & { kind: "block_travel" }>;
  readonly triggers: ReadonlyArray<AreaWardTrigger>;
  readonly onTrigger: ReadonlyArray<AreaWardEffect>;
};
```

### 2. New surface variants (needed regardless of family choice)

| Missing variant | Location | Justification |
|---|---|---|
| `AnchoredEvent.ends_turn_in_area` | `AnchoredEvent` | Damage fires on enter OR end-of-turn; only `enters_area` exists |
| `AnchoredFilter.creature_type_whitelist` | `AnchoredFilter` | Type-based filtering, not identity-based |
| `AnchoredFilter.password_exemption` | `AnchoredFilter` | Runtime speech check, no existing variant |
| `CastingTime.minutes` + `ritual: true` | Already exists | This part maps correctly |

### 3. New `DamageType` value: `caster_choice`

> "the creature takes 5d10 Radiant or Necrotic damage (your choice when you cast this spell)"

Damage type is chosen at cast time, not fixed. Neither `radiant` nor `necrotic` alone is correct. A `"caster_choice": [DamageType]` pattern (or a union variant) is needed.

### 4. New `AnchorTarget` variant: `floor_area`

The current area anchor is `{ kind: "area"; shape: { kind: "cube"; maxSideFeet: number } }`. Forbiddance's area is defined by sq ft of floor space + ceiling height — a different parameterization.

---

## What fits cleanly

- Casting time: `{ kind: "minutes", amount: 10, ritual: true }` — fits existing `CastingTime`
- Duration: `{ kind: "timed", value: { unit: "day", amount: 1 } }` — fits existing `Duration`
- Components: `{ v: true, s: true, m: "ruby dust worth 1,000+ GP" }` — fits
- Spell level 6, school `abjuration` — fits
- Range: Touch — fits (`{ kind: "touch" }`)
- Spell slot (level 6) — fits

---

## v4 atom coverage

All mechanics map to existing v4 atoms:
- `block_travel` (§9 Effect Atoms) — for the travel prohibition
- `damage` (§9) — for the typed creature damage
- `area` (§3 Attachment Atoms) — for the ward's attachment
- `persist` + `expire` (§6 Lifecycle) — for the 1-day duration
- `post_action_window` or a new `turn_end_window` sub-variant — for end-of-turn trigger

No new v4 atoms are needed. All gaps are at the surface type (encoding) level, not the taxonomy level — except possibly `creature_type_whitelist` and `caster_choice_damage_type` which are surface encoding concepts without direct atom equivalents.
