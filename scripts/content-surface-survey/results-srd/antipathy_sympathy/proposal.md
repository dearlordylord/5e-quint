# Proposal: Antipathy/Sympathy widening requirements

## Classification: `atom_widening`

The spell's structure fits the `ongoing_effect` family (10-day timed duration, area trigger around a designated target, per-creature Wis save gate). However five gaps prevent honest encoding; the most fundamental is a missing v4 atom.

---

## Gap 1 — `compelled_movement` atom (atom_widening)

**SRD text:**
> The Frightened creature must use its movement on its turns to get as far away as possible from the target, moving by the safest route.
> The Charmed creature must use its movement on its turns to get as close as possible to the target.

Standard `apply_condition frightened` imposes "can't willingly move toward the source of fear" (SRD Rules Glossary). Standard `apply_condition charmed` imposes no movement restriction at all. Neither mandates *active* directed movement.

Antipathy/Sympathy add a **compelled movement obligation** — each turn, the affected creature is required to spend its movement fleeing or approaching. This is a distinct behavioral override with no v4 equivalent.

**Proposed atom:**
```typescript
| {
    readonly kind: "compelled_movement";
    readonly direction: "away_from_attachment" | "toward_attachment";
    // "safest route" is DM-agenda; the surface only records the direction obligation.
  }
```

This atom would appear as an `ongoing_effect` operation effect, paired with the `apply_condition` on the same `on_creature_enters_area` → `save_gate` → `onFail` composite.

---

## Gap 2 — `RepeatSaveSpec.cadence: distance_exceeded` (surface_widening)

**SRD text:**
> If the Frightened or Charmed creature ends its turn more than 120 feet away from the target, the creature makes a Wisdom saving throw.

The existing `RepeatSaveSpec.cadence` union only has:
- `"end_of_target_turn"` — fires unconditionally
- `"on_target_takes_damage"` — fires on any damage

A **distance-gated** cadence is needed:
```typescript
| {
    readonly cadence: "ends_turn_beyond_range_feet";
    readonly feet: number;
    readonly onSuccess: "ends_on_target";
  }
```

---

## Gap 3 — Open-ended creature kind filter (surface_widening)

**SRD text:**
> Then specify a kind of creature, such as red dragons, goblins, or vampires.

The trigger at 120 feet fires only for creatures matching a caster-specified open-ended description. The closed 14-entry `CreatureType` enum ("beast", "humanoid", etc.) cannot represent "red dragons" or "goblins" — those are specific monster categories, not SRD creature types.

**Proposed addition to `OngoingTrigger.on_creature_enters_area`** (or as a filter on the `area` attachment):
```typescript
readonly creatureKindFilter?: { readonly kind: "caster_specified_text" };
```

The `caster_specified_text` sentinel tells the tracer/runtime this is an open-ended DM/player description resolved at cast time rather than a closed enum check. The actual text is runtime-owned (not authored in the unit).

---

## Gap 4 — Post-save temporary immunity (surface_widening)

**SRD text:**
> A creature that successfully saves against this effect is immune to it for 1 minute, after which it can be affected again.

After successfully saving, the creature is immune to *this specific effect* for 1 minute. This is distinct from:
- `grant_condition_immunity` (permanent, broad)
- spell ending on successful save

**Proposed addition to `RepeatSaveSpec` or `save_gate.onSuccess`:**
```typescript
readonly temporaryImmunityMinutes?: number;
```

When present on the save-gate node, a successful save grants immunity to re-triggering this save gate for the specified duration rather than ending the effect entirely.

---

## Gap 5 — CastingTime: hours (surface_widening, minor)

Casting time is 1 hour. The current surface has `kind: "minutes"` (with `ritual: boolean`) which could accept `amount: 60`, but `hours` is semantically distinct and appears on several 8th-9th level spells. A first-class `hours` variant would be cleaner:

```typescript
| { readonly kind: "hours"; readonly amount: number }
```

---

## Secondary omission: Sympathy proximity lock

> If the creature is within 5 feet of the target, the creature can't willingly move away.

This "within 5 feet → movement restriction" requires a positional predicate (range ≤ 5 ft) gating a `set_speed` or movement-restriction effect. No surface vocabulary exists for distance-predicated ongoing effects of this kind. It could be modeled as part of the `compelled_movement` atom semantics (implied by "must be as close as possible") rather than as a separate predicate, if the atom captures the "stays adjacent once adjacent" invariant. Recorded here for completeness.

---

## Encoding strategy once gaps are filled

The spell would encode as `ongoing_effect` with:
- `attachment: { kind: "target", selection: { mode: "one" } }` — the designated creature/object
- An `on_creature_enters_area` trigger with a 120-ft sphere centered on the target and a `creatureKindFilter: { kind: "caster_specified_text" }`
- `save_gate` (Wis, caster spell save DC) with `onFail: composite([apply_condition(choose: frightened|charmed), compelled_movement(...)])` driven by a cast-time choice
- `repeatSave: { cadence: "ends_turn_beyond_range_feet", feet: 120, onSuccess: "ends_on_target", temporaryImmunityMinutes: 1 }`
- For Sympathy: an additional `on_attached_damaged` trigger with a Wis save (standard `repeatSave` with `on_target_takes_damage` cadence)
