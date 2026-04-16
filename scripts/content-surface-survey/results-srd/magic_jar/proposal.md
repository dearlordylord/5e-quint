# Proposal: Magic Jar — Structural Widening

## Outcome

`structural_widening` — No existing `SpellMechanics` family can represent this unit honestly. No `.dhall` or `.json` authored.

## Why the existing families fail

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Ongoing-effect spells apply a persistent modifier or rider to a target. Magic Jar's "ongoing" state is the caster becoming a disembodied soul — the caster is the attachment, not a modifier on a target. |
| `activation` | One-shot phases resolve damage or conditions against targets. Magic Jar has no damage, no normal condition application, and produces a mutual soul-swap state that persists with its own action economy. |
| `triggered_reaction` | Magic Jar is not a reaction spell. |
| `anchored_trigger` | Closest candidate: the container functions like an anchor and the soul can be "released" into a body. But the release is not a signal (audible/mental); it is a full body takeover with stat replacement. The event/filter grammar covers physical contact and area entry, not "caster chooses to project soul into a specific creature's body." The possession mechanic itself is entirely outside the atom vocabulary. |

## Missing surface concepts

### 1. `soul_displacement` subgraph (structural)

Magic Jar opens with the caster's soul vacating the caster's body and entering an object. This requires a new top-level subgraph shape where:
- The **caster** (not a target) is the entity whose state changes on cast.
- The **caster's body** becomes a separately-trackable catatonic object.
- The **container** becomes an anchor that holds the displaced soul.

No existing procedure-attachment-effect chain represents an agent that self-displaces into an item.

### 2. `possess_creature` effect atom (atom)

Possession is mechanically distinct from all existing effect atoms:

- Not `apply_condition`: Incapacitated is applied to the *host's soul in the container*, not to the possessed body. The caster controls the body normally.
- Not `command_companion`: That governs externally-summoned creatures. Possession places the caster's own consciousness inside a non-companion creature's body.
- Not `transport_exile`: That moves a creature to another plane; the host's soul is displaced to the container (same plane, different vessel).

The possess_creature atom would need to express:
- Target: one Humanoid (with a ward exclusion: creatures under Protection from Evil and Good or Magic Circle are immune)
- Cost: Cha saving throw (caster's spell save DC)
- On fail: caster's soul enters target body; target's soul enters container
- On success: target resists; 24-hour lockout on re-attempting that specific target

### 3. `apply_stat_override` effect atom (atom)

While possessing a body, the caster's HP, Hit Dice, STR, DEX, CON, Speed, and senses are replaced by the host creature's values. The caster retains all other statistics (mental scores, proficiencies, spells, class features, alignments, etc.).

This is a selective stat-block substitution: not `modify_roll_numeric`, not `modify_ac`, not `modify_speed` alone. It is a partial stat-block swap that applies to a specific enumerated set of statistics.

### 4. `Duration.permanent_until_dispelled` variant (surface)

Magic Jar's duration field in the 5etools source is `{type: "permanent", ends: ["dispel"]}`. The current `Duration` union has three variants:

```typescript
type Duration =
  | { kind: "instantaneous" }
  | { kind: "concentration"; upTo: DurationValue }
  | { kind: "timed"; value: DurationValue }
```

A fourth variant is needed:

```typescript
| { kind: "permanent_until_dispelled" }
```

This pattern also applies to Alarm (encoded with a timed approximation) and would apply to any future spells with permanent-ward duration.

### 5. `dual_entity_container_state` subgraph (structural)

The container serves as a multi-occupant soul repository:
- Phase 1: Only caster's soul is in the container (body is catatonic elsewhere).
- Phase 2: Caster's soul has left the container to possess a body; container holds the host's soul (Incapacitated, can perceive).
- Phase 3 (return): Caster's soul re-enters container; host's soul returns to body.

Each soul in the container has independent death conditions depending on whether its body is alive, dead, or out of range at the moment the container is destroyed.

This multi-slot lifecycle has no analog in the current anchor/lifecycle atom set.

## Nearest existing atoms (partial coverage)

If a severely reduced approximation were acceptable (it is not — per guardrails), the closest sketch would be:

- `save_gate` for the possession attempt (Cha save)
- `apply_condition` with `incapacitated` for the host's soul
- `anchored_trigger` for the container-as-anchor shape

But this sketch omits: stat replacement, soul displacement of the caster's own body, the 24-hour retry lockout, dual-occupancy state, host-body death branching, and the permanent duration. The resulting trace would be actively misleading.

## Recommendation

Widen in this order when pressure accumulates:

1. Add `Duration.permanent_until_dispelled` — narrow surface widening, unblocks Alarm cleanup too.
2. Add `possess_creature` effect atom — needed for Dominate Person/Beast/Monster encoding as well.
3. Add `apply_stat_override` effect atom — shared with True Polymorph, Shapechange.
4. Design `soul_displacement` subgraph — Magic Jar-specific structural shape; could share atoms with Astral Projection.
5. Design `dual_entity_container_state` — Magic Jar-specific; lower priority since it is a consequence of soul_displacement.
