# Proposal: Arcane Eye — structural_widening

## Unit

**Arcane Eye** — Level 4 Divination, Concentration up to 1 hour  
SRD 5.2.1, Spells/Descriptions-A-D#Arcane Eye

## Why no existing family fits

Arcane Eye creates a persistent, invisible, movable **conjured sensor object** (the eye) that:

1. **Appears at a point** within 30 ft of the caster (not attached to a creature).
2. **Continuously relays** visual information and darkvision 30 ft back to the caster.
3. **Can be moved** 30 ft per round using the caster's Bonus Action.
4. **Persists** for the duration (concentration, up to 1 hour) until dismissed or concentration breaks.

None of the four current spell families honestly encode this:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `OngoingOperation` is `roll_modifier \| damage_on_hit`. Neither represents "conjure a sensor object." The attachment targets a creature; Arcane Eye has no creature attachment. |
| `activation` | Phases are `attack_roll` and `save_gate`. Arcane Eye makes no attack roll and forces no saving throw. |
| `triggered_reaction` | Requires a reaction trigger. Arcane Eye is cast as an Action with no reaction. |
| `anchored_trigger` | Plants a trigger that fires a signal on a matching event. Arcane Eye is continuously active — it doesn't wait for a trip-wire event. |

## What is needed

### Gap 1 — New operation or new family

The core mechanic is **conjuring a persistent sensor object**. The v4 taxonomy already names both `create_object` and `grant_sense` as effect atoms, but neither appears in `types.ts`:

- `Effect = DamageEffect | NoneEffect` — no `create_object`, no `grant_sense`
- `OngoingOperation = RollModifierOperation | DamageOnHitOperation` — neither variant applies

The minimum fix is a new `OngoingOperation` variant (e.g., `create_sensor_object`) that references the v4 `create_object` + `grant_sense` atoms and captures:
- The object's sensory capability (vision, darkvision range)
- The `grant_sense` delivery to the caster

However, `ongoing_effect`'s attachment semantics are creature-oriented, and a point-in-space creation does not fit `Attachment = self | target | area | mark`. A new **spell family** (e.g., `conjure_sensor`) may be cleaner than bending `ongoing_effect`.

### Gap 2 — Recurring command mechanic

> "As a Bonus Action, you can move the eye up to 30 feet in any direction."

This is a **recurring optional action** the caster takes on each of their turns to direct the conjured object. No existing spell mechanics structure represents this. The closest analogue is `ClassFeatureActivationCost.bonus_action`, but that is for one-time class-feature activation, not for recurring in-turn commands on a conjured object.

A new substructure is needed — something like a `command` field on the conjured object that specifies: cost (bonus action), distance (30 ft), movement constraints (blocked by solid barriers, can pass through ≥1 inch openings).

### Gap 3 — Location attachment for non-creature conjuration

Arcane Eye is created at a **point** within 30 ft, not on a creature. The current `Attachment` type has no `location` variant for spell purposes. (The `AnchorTarget` in `anchored_trigger` has `location`, but that is not exposed as a general `Attachment` kind.) A new `Attachment` variant `point` or reuse/export of `location` is needed.

## Prior dishonest encoding

The shared content pool inherited by this worker contains an `arcane_eye.json` from a prior worker that encodes the spell as:

```json
"family": "ongoing_effect",
"operation": { "kind": "roll_modifier", "on": [], "delta": { "dice": 0, "dieSize": 0, "sign": "+" } }
```

This passes typecheck (vacuously) and produces a tracer graph, but is **structurally dishonest**:
- `roll_modifier` with `on: []` modifies no rolls — it is a null effect
- The actual mechanic (sensor conjuration, sensory relay, Bonus Action movement) is entirely absent from the trace
- A misleading trace is worse than no trace

This worker declines to reproduce or inherit that encoding.

## Recommended widening path

**Minimum viable widening:**
1. Add `create_sensor_object` to `OngoingOperation` with fields for object properties (invisibility, invulnerability, sense type, darkvision range) and sensory relay to caster
2. Add `point` variant to `Attachment` (the eye is placed at a point, not on a creature)
3. Add `command_object` substructure to `ongoing_effect` (or the new family) for recurring action costs to direct the object

**Cleaner widening:**
- New spell family `conjure_sensor` with:
  - `object` field (describes the conjured sensor: senses, invulnerability, size constraints)
  - `relay` field (sensory delivery to caster)
  - `command` field (optional recurring action cost to move/direct the object)

Both paths use existing v4 atoms (`create_object`, `grant_sense`). No new v4 atoms are required — only new surface type variants and/or a new mechanics family.
