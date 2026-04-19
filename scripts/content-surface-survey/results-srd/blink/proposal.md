# Proposal: Blink (surface_widening)

## Unit

**Blink** — Level 3 Transmutation spell (SRD 5.2.1)

## Classification

`surface_widening` — the required atoms (`transport_exile`, `teleport`) exist in the v4 taxonomy and the TS surface. Two variants of existing surface types are missing, preventing honest encoding.

## Gaps

### 1. Missing `on_caster_turn_end` / `on_attached_turn_end` in `OngoingTrigger`

**SRD text:** "Roll 1d6 at the end of each of your turns for the duration."

`OngoingTrigger` has turn-start variants (`on_caster_turn_start`, `on_attached_turn_start`) and `on_creature_ends_turn_in_area` (area-attachment-scoped only). There is no turn-end variant for self/target attachments.

**Proposed addition to `OngoingTrigger`:**
```typescript
| { readonly kind: "on_caster_turn_end" }
| { readonly kind: "on_attached_turn_end" }
```

The tracer would emit a `turn_end_window` node (parallel to `turn_start_window`) with label `"turn_end_window\n(caster)"`.

Turn-end and turn-start are mechanically distinct: turn-end fires after the creature's last action but before the next creature's turn, while turn-start fires before the creature's first action. The distinction matters for action-economy interactions (e.g., effects that modify upcoming actions cannot be applied at turn-end to take effect on the same turn).

### 2. Missing `random_table` variant in `OngoingEffect`

**SRD text:** "On a roll of 4-6, you vanish from your current plane of existence and appear in the Ethereal Plane."

The d6 threshold outcome is a random table: 1–3 = nothing, 4–6 = `transport_exile`. This pattern exactly matches the existing `random_table` `ActivationPhase` shape, but `OngoingEffect` does not include this variant.

**Proposed addition to `OngoingEffect`:**
```typescript
| {
    readonly kind: "random_table";
    readonly roll: RandomTableRoll;
    readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
  }
```

This reuses the exact shape already present on `ActivationPhase.random_table`. The tracer already handles `random_table` in the activation path; an `OngoingEffect` branch would delegate to the same subgraph.

## Secondary gap (conditional return — not blocking, but notable)

The return clause ("You return to the other plane at the start of your next turn") would encode as a second `on_caster_turn_start` operation with effect `teleport { maxFeet: 10, destination: "unoccupied_visible_space" }`. However, this return should only fire when the caster *is currently on the Ethereal Plane* — a predicate on planar location that falls outside the current `OngoingPredicate` vocabulary (`at_hp_threshold` only). This conditional is DM-resolved in practice and could be omitted as DM-agenda, leaving the return as an unconditional start-of-turn teleport (always-on while the spell persists). This is an acceptable approximation if the primary gaps are resolved.

## Omitted mechanics (correctly out-of-scope)

- **Ethereal perception clause** ("you can perceive the plane you left... cast in shades of gray... can't see anything more than 60 feet away"): narrative/DM-managed, no mechanical effect on rolls or outcomes. Correctly omitted per ARCHITECTURE.md.
- **"Creatures on the other plane can't perceive you unless..."**: DM-agenda (special-ability detection is creature-stat territory, not spell-surface territory).

## Proposed encoding (if gaps are resolved)

```
family: ongoing_effect
level: 3
school: transmutation
castingTime: { kind: "action" }
range: { kind: "self" }
components: { v: true, s: true, m: false }
duration: { kind: "timed", value: { unit: "minute", amount: 1 } }
attachment: { kind: "self" }
operations:
  - trigger: { kind: "on_caster_turn_end" }                   ← MISSING
    effect:
      kind: "random_table"                                     ← MISSING in OngoingEffect
      roll: { die: 6 }
      outcomes:
        - { min: 1, max: 3, label: "no effect" }
        - { min: 4, max: 6, label: "ethereal shift",
            phases: [
              { kind: "direct", attachment: { kind: "self" },
                effects: [{ kind: "transport_exile", destination: "ethereal_plane" }] }
            ]
          }
  - trigger: { kind: "on_caster_turn_start" }
    effect:
      kind: "teleport"
      maxFeet: 10
      destination: "unoccupied_visible_space"
      # NOTE: should only fire when on Ethereal Plane — conditional predicate not representable
```
