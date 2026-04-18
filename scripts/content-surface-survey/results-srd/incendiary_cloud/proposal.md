# Proposal: surface_widening — Incendiary Cloud

## Summary

Incendiary Cloud is mechanically identical to Cloudkill (also classified `surface_widening`): a concentration sphere with three save triggers (appearance, entry, end-of-turn), a once-per-turn deduplication rule, and directional auto-movement at caster turn start. No Dhall was authored because the primary ongoing threat (end-of-turn save) has no honest surface expression.

## Spell mechanics (SRD 5.2.1)

- **Level 8, Conjuration, Action cast, VS, Concentration 1 min, Range 150 ft**
- Area: 20-ft-radius Sphere centered on a point within range
- Area property: Heavily Obscured (environmental, out of core scope)
- **Save trigger 1 — appearance**: each creature in area makes Dex save → 10d8 Fire (fail) or half (success)
- **Save trigger 2 — entry**: creature entering the sphere or the sphere moving into its space → same save
- **Save trigger 3 — end of turn**: creature ending its turn in the sphere → same save
- **Deduplication**: a creature makes this save at most once per turn
- **Movement**: sphere moves 10 ft away from caster in caster-chosen direction at start of each caster turn
- **Early end**: dispersed by strong wind (DM agenda)

## What fits the current surface

- `ongoing_effect` family — correct
- `area` attachment, `sphere` shape, `point_within_range` origin — all present
- `initialPhase` save_gate for the appearance save — present
- `on_creature_enters_area` trigger for the entry save — present
- `save_gate` ongoing effect with `{ kind: "damage", damageType: "fire", amount: { kind: "fixed", expr: { dice: 10, dieSize: 8 } } }` and `{ kind: "half_damage" }` on success — all present
- VS components, level 8, concentration, 1-minute duration — all present

## Blocking gaps

### 1. `on_creature_ends_turn_in_area` — missing `OngoingTrigger` variant

`OngoingTrigger` has `on_attached_turn_start` (fires at start of a creature's turn) but no end-of-turn equivalent. "Ends its turn there" fires at the END of the creature's turn — a different combat phase. Using `on_attached_turn_start` would be factually wrong and produce a misleading trace.

**Proposed widening**: Add `{ readonly kind: "on_attached_turn_end" }` (or equivalently `on_creature_ends_turn_in_area`) to the `OngoingTrigger` union. This variant fires at the end of each attached creature's turn (for area attachments: each creature inside the area at the end of that creature's turn).

### 2. `once_per_turn_save_gate` — no per-turn deduplication mechanism

The spell fires saves from three independent triggers, but RAW specifies a creature takes the save at most once per turn. There is no field on `OngoingOperation`, `save_gate`, or `OngoingTrigger` to express "skip if already resolved this turn for this creature."

**Proposed widening**: Add an optional `atMostOncePerTurn?: true` flag on `OngoingOperation` (or on the `save_gate` variant of `OngoingEffect`) that marks the operation as deduplicating across a single creature's turn.

### 3. `automatic_directional_reposition` — `reposition_attachment` semantics don't match

`reposition_attachment` models a caster spending an action to freely reposition an illusion within the spell's range. Incendiary Cloud's movement is:
- **Automatic** (not a caster action choice)
- **Triggered** by `on_caster_turn_start`
- **Directional** (10 ft away from caster in a caster-chosen direction, not free within range)
- **Bounded distance** (exactly 10 ft, not maxMoveFeet-from-current-position)

No existing combination of trigger + effect atom captures this. `reposition_attachment` with `on_caster_turn_start` would imply the caster spends an action and can move it anywhere within range.

**Proposed widening**: Either (a) add a new `OngoingTrigger` + effect variant for `drift_attachment { distanceFeet, directionSource: "away_from_caster" | "caster_choice" }`, or (b) generalize `reposition_attachment` with `automatic?: true` and `distanceFeet` instead of `maxMoveFeet` to cover the fixed-distance automatic drift pattern.

## Out-of-core items (no widening needed)

- **"Heavily Obscured"** — environmental visibility property of the area. Caller-owned per ARCHITECTURE.md §1; no atom needed in core.
- **"Dispersed by strong wind (Gust of Wind)"** — early-end condition requiring DM-adjudicated weather state. DM agenda.

## Precedent

Cloudkill (`result.json`: `surface_widening`) has identical gaps. The same three widenings apply to both spells. Resolving them for either spell resolves both.
