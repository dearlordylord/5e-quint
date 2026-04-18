# Proposal: Daylight widening gaps

## Unit

**Daylight** — SRD 5.2.1 spell, level 3, Evocation, 1 action, 60 ft, V/S, 1 hour (timed).

## What fits cleanly

- Family: `ongoing_effect` with a timed 1-hour duration (not concentration).
- `emit_light { brightRadiusFeet: 60, dimAdditionalFeet: 60 }` covers the lighting mechanic exactly.
- `Attachment.object` with `filter: { heldOrWorn: "forbidden" }` covers the object-targeting mode.
- `Attachment.area` with `{ kind: "emanation", radiusFeet: 60 }` and `origin: { kind: "on_primary_target" }` covers the emanation geometry.
- `Attachment.area` with `{ kind: "sphere", radiusFeet: 60 }` and `origin: { kind: "point_within_range" }` covers the sphere geometry.
- `end_ongoing_spells { maxSpellLevel: 3 }` exists as an effect atom for the dispel side.

## Blocker 1 — `on_area_overlap_window` (atom_widening)

**RAW text:** "If any of this spell's area overlaps with an area of Darkness created by a spell of level 3 or lower, that other spell is dispelled."

The dispel fires when Daylight's area and a Darkness spell's area spatially intersect. This is not triggered by:
- a creature moving (`on_creature_enters_area`, `on_creature_moves`)
- a creature's turn (`on_attached_turn_start`, `on_caster_turn_start`)
- a creature taking damage (`on_attached_damaged`)
- a caster hitting with an attack (`on_caster_attack_hit`)
- passive application (`passive` — this would fire the dispel always, not conditionally)

It requires a new trigger concept: **two spell areas coming into spatial overlap**. This fires either:
- once at cast time (if a Darkness area already exists in range), or
- when a new Darkness spell is cast whose area overlaps Daylight's.

Neither case maps to any existing `OngoingTrigger` variant. The v4 taxonomy has no window atom for area-to-area spell interaction. Proposed new atom:

```
on_area_overlap_window:
  spellFilter?: { maxLevel: number, effectKind?: string }
  direction: "either" | "this_enters" | "other_enters"
```

This gate would expose the overlapping spell as the context for `end_ongoing_spells`.

## Blocker 2 — `CastTimeChoice<Attachment>` in `ongoing_effect` (surface_widening)

**RAW text:** "Alternatively, you cast the spell on an object that isn't being worn or carried, causing the sunlight to fill a 60-foot Emanation originating from that object."

Daylight has two mutually exclusive attachment modes the caster chooses at cast time:

| Mode | Attachment | Shape |
|---|---|---|
| Primary | `area`, `origin: point_within_range` | sphere 60 ft |
| Alternative | `object`, `heldOrWorn: forbidden` → emanation | emanation 60 ft |

The `ongoing_effect` family's `attachment` field is a single `Attachment`. There is no `CastTimeChoice<Attachment>` wrapper.

`CastTimeEffectModeChoice` (used inside `direct` phases) is structurally different — it selects between effect bundles, not between top-level attachment geometries. Extending it to cover attachment choice would require either:

**Option A**: Widen `ongoing_effect.attachment` to `Attachment | CastTimeChoice<Attachment>`.

**Option B**: Add a `mode` field to `ongoing_effect` analogous to the `direct` phase's `mode`, where each option pairs an `Attachment` with an optional effect delta.

Option B is cleaner because it mirrors existing precedent (`CastTimeEffectModeChoice`) and avoids polymorphic attachment fields everywhere.

## Non-blocker observation

The "Covering that object with something opaque blocks the sunlight" clause is DM-agenda (caller-owned adjudication of what constitutes opaque covering). No mechanical atom needed.

## Summary

| Gap | Classification | Proposed surface change |
|---|---|---|
| Area-overlap trigger for dispel-darkness | `atom_widening` | New `on_area_overlap_window` trigger in `OngoingTrigger` |
| Cast-time choice between sphere vs object-emanation | `surface_widening` | `CastTimeChoice<Attachment>` in `ongoing_effect`, or `mode` field on `ongoing_effect` |
