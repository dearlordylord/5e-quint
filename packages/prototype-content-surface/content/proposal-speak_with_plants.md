# Proposal: Speak with Plants — widening requirements

## Outcome: `atom_widening`

Speak with Plants is a 3rd-level Transmutation spell with a 30-ft Emanation, 10-minute timed duration (no concentration), and V/S components. It cannot be honestly encoded under the current surface vocabulary. Three independent gaps block it.

---

## Gap 1 — Missing `AreaOrigin` variant: `caster_emanation` (surface_widening)

**Classification:** surface_widening (new variant of existing `AreaOrigin` type)

The spell's range is a 30-foot **Emanation** — an area centered on and moving with the caster. The current `AreaOrigin` union has:

- `point_within_range` — a fixed point chosen by the caster within range (Fireball, Thunderwave)
- `on_primary_target` — centered on an attack target

Neither captures the emanation pattern. An emanation originates from the caster's current position at cast time and moves with them (or in SRD 5.2.1 wording, is "immobile" — i.e., fixed at cast-time position). In either reading, the origin is self rather than a chosen point or an attack target.

**Proposed addition:**

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" }
  | { readonly kind: "caster_emanation" };   // NEW: area centered on caster at cast time
```

Pressure cases: Spirit Guardians, Antilife Shell, Aura of Life, Circle of Power — all use emanations from the caster.

---

## Gap 2 — Missing atom: `modify_terrain` (atom_widening)

**Classification:** atom_widening (no v4 atom exists)

The spell's primary combat-relevant mechanical effect is deterministic terrain state modification:

> "You can also turn Difficult Terrain caused by plant growth … into ordinary terrain that lasts for the duration. Or you can turn ordinary terrain where plants are present into Difficult Terrain that lasts for the duration."

This is a concrete, rules-defined effect: Difficult Terrain halves movement speed. Converting terrain state is mechanically significant and has a clear on/off binary. No v4 atom covers this. The closest atoms are:

- `modify_speed` — modifies a creature's speed, not the terrain state itself
- `block_travel` — blocks passage entirely, not the same as cost-to-traverse
- `apply_condition` — applies a creature-level condition, not an area-terrain state

**Proposed atom:**

```
modify_terrain
  category: effect
  description: Changes an area's terrain state (e.g., Difficult → normal, or normal → Difficult) for a duration. Parameters: fromState, toState, filter (e.g., "caused by plant growth").
```

Immediate pressure case: Spike Growth (creates difficult terrain in an area), Plant Growth. This atom would also serve as the runtime projection boundary for movement-cost recalculations.

---

## Gap 3 — Missing atom: `grant_language_comprehension` (atom_widening)

**Classification:** atom_widening (no v4 atom exists)

The spell grants a scoped, persisting mechanical ability:

> "If a Plant creature is in the area, you can communicate with it as if you shared a common language."

This is a deterministic, rules-defined grant: the caster can exchange verbal/meaningful communication with Plant-type creatures in the emanation. It is NOT:

- `telepathic_link` — that is specifically a two-way mental/telepathic channel, not language comprehension
- `grant_sense` — that grants a sensory mode (darkvision, tremorsense), not comprehension ability
- `create_companion` / `command_companion` — those model creature control

The creature-communication aspect is mechanically real (it enables the Influence action against Plant creatures, or at minimum establishes a language channel that has social mechanics implications). The separate "question plants about past events" portion (non-creature plants) is DM agenda — there is no deterministic resolution for what plants have "witnessed" or how useful their answers are. Those two aspects should be distinguished:

- **Creature communication** (Plant creature type) → `grant_language_comprehension` atom, scoped to creature type
- **Non-creature plant interrogation** → DM agenda, out of core

**Proposed atom:**

```
grant_language_comprehension
  category: effect
  description: Grants the caster the ability to communicate with a specified category of creature/object as if sharing a common language. Parameters: scope (creature_type, object_type, etc.).
```

Pressure cases: Speak with Animals (same pattern, beast creatures), Speak with Dead, Tongues (universal, targets a single creature).

---

## DM agenda note

The querying-of-non-creature-plants mechanic ("question plants about events in the spell's area within the past day, gaining information about creatures that have passed, weather, and other circumstances") is DM agenda. The answers depend entirely on DM adjudication of what nearby vegetation could plausibly have "observed." There is no deterministic resolution surface to model here. This component should remain out of core.

---

## Summary

| Gap | Kind | Classification |
|-----|------|----------------|
| `AreaOrigin.caster_emanation` missing | new variant | surface_widening |
| `modify_terrain` atom missing | new atom | atom_widening |
| `grant_language_comprehension` atom missing | new atom | atom_widening |
| Plant interrogation (non-creature) | DM agenda | out of core |

Dominant classification: **atom_widening**. No Dhall/JSON authored — no `OngoingOperation` variant exists that could honestly carry terrain modification or language comprehension, and forcing a `roll_modifier` or `damage_on_hit` operation would produce a false trace.
