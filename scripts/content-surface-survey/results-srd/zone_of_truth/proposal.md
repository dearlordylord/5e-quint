# Proposal: Zone of Truth — structural_widening

## Unit

- **Slug**: `zone_of_truth`
- **Kind**: spell, level 2 Enchantment
- **Provenance**: SRD 5.2.1

## Why no existing family fits honestly

### Gap 1 — No family for persistent area + per-creature triggered save

Zone of Truth creates a **timed (non-concentration) area** that evaluates each creature
separately when it **enters** the area for the first time on its turn or **starts its turn**
there. The save fires once per creature per entry event; creatures that fail cannot speak a
deliberate lie for the remainder of the spell.

Existing families:

| Family | Why it fails |
|---|---|
| `activation` | `save_gate` phase fires **once at cast** against the current target selection. There is no mechanism for "re-evaluate each creature on entry/turn-start." |
| `ongoing_effect` | Operations are `roll_modifier` or `damage_on_hit` only. No save gate exists in this family. |
| `anchored_trigger` | Stores a planted trigger that releases a **signal** (audible or mental). No save gate; no condition application; signals are caller-owned notification, not behavioral constraints. |
| `triggered_reaction` | Reaction spell shape (fires when an external trigger occurs to the caster). Not applicable. |

The distinguishing structural pattern is:

```
persistent_area_save
  ├── area attachment (sphere, origin: point within range)
  ├── per_creature_event: enters_area | turn_start_in_area
  ├── save_gate (per creature, fires on the event)
  │   ├── on_fail  → apply_condition (behavioral_constraint)
  │   └── on_success → none
  └── condition persists while creature remains in area (expires on exit or spell end)
```

This pattern recurs across many SRD spells (Spirit Guardians, Entangle, Web,
Stinking Cloud, Sleet Storm, etc.) — it is a high-pressure structural gap, not a narrow
single-spell edge case.

### Gap 2 — `Condition` type does not cover behavioral speech constraints

The effect on a failed save is:

> "a creature can't speak a deliberate lie while in the radius"

This is not any of the 14 standard SRD conditions (blinded, charmed, deafened, exhaustion,
frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone,
restrained, stunned). The current `Condition` type in `types.ts` contains only `"prone"`.

The behavioral speech constraint needs one of:
- A new `Condition` variant (e.g., `"compelled_honesty"`) in the closed `Condition` enum, or
- A dedicated effect atom (e.g., `restrict_speech`) distinct from `apply_condition`.

The former is cleaner if Condition is being widened to cover all SRD conditions; the latter
makes sense only if speech constraints are treated as a mechanically distinct effect class.

## What is NOT a gap

- **Caster knows save results**: "You know whether a creature succeeds or fails on this save."
  Per ARCHITECTURE.md, the caster knowing save results is a notification surface — caller-owned,
  not a core mechanics atom. No atom or relation is needed for this.

- **Creature awareness of the spell**: "An affected creature is aware of the spell." This is
  narrative/notification, not a mechanical resolution boundary.

- **Evasive behavior**: "can avoid answering questions to which it would normally respond with
  a lie. Such a creature can be evasive yet must be truthful." The truthfulness constraint is
  DM-adjudicated in content but the mechanical boundary (save gate → condition applied) is
  deterministic. This is not a `dm_agenda` case — the spell has real mechanical structure.

## Proposed family sketch

```typescript
// New family: persistent_area_save
// Covers: Zone of Truth, Spirit Guardians, Entangle, Web, Stinking Cloud, etc.

export type AreaEntryEvent =
  | { readonly kind: "enters_area_first_time_on_turn" }
  | { readonly kind: "starts_turn_in_area" }
  | { readonly kind: "either" };  // zone_of_truth uses both

export type PersistentAreaSaveMechanics = SpellMechanicsHeader & {
  readonly family: "persistent_area_save";
  readonly area: {
    readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
    readonly origin: AreaOrigin;
  };
  readonly trigger: AreaEntryEvent;
  readonly save: {
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: Effect;       // needs Condition widening for zone_of_truth
    readonly onSuccess: Effect;
  };
  // Whether the condition persists only while in the area or for the spell's full duration
  readonly conditionPersistence: "while_in_area" | "full_duration";
};
```

For Zone of Truth, `conditionPersistence` is `"while_in_area"` (leaving the area does not
break the effect on a creature that already failed — actually re-reading: the SRD says the
creature "can't speak a deliberate lie while in the radius", meaning the constraint is only
active while inside; there is no stated persistence after leaving). A creature that leaves
and re-enters would need to make the save again.

## Condition widening needed

Minimum viable widening to express the Zone of Truth effect:

```typescript
export type Condition =
  | "prone"
  | "compelled_honesty";  // new: can't speak a deliberate lie (Zone of Truth)
```

Longer-term, the `Condition` type should be widened to all 14 SRD conditions as more
spells are encoded (Hold Person uses `"incapacitated"`/`"paralyzed"`, Blindness/Deafness
uses `"blinded"`/`"deafened"`, etc.).
