# Proposal: Planar Binding — atom_widening

## Unit

**Planar Binding** — Level 5 Abjuration, SRD 5.2.1

## Why it doesn't fit

The spell's structure maps cleanly to the `activation` family (1-hour cast, single save_gate phase at completion, timed duration). All header fields are representable. The save itself (`CHA`, `caster_spell_save_dc`) is expressible. The blocker is entirely the **Effect on failure**: the current `Effect = DamageEffect | NoneEffect` has no variant for behavioral command-binding.

## Blocker 1 — Missing `bind_creature` atom (primary)

**Evidence**: "A bound creature must follow your commands to the best of its ability."

The on-fail effect is a persistent compelled-service relationship: the target is forced to obey the caster's commands for the duration. This is mechanically distinct from:

- `apply_condition` — conditions (prone, charmed, etc.) are status flags with fixed mechanical consequences. "Bound to serve" is an open-ended behavioral contract that depends on what commands the caster issues, and includes a hostile-intent nuance ("strives to twist your commands").
- `command_companion` (v4 atom) — this atom governs directing a creature you created or summoned through your own spell (Find Familiar, Conjure Elemental). Planar Binding binds a *pre-existing or externally summoned* creature; the relationship is compelled, not cooperative.

**Proposed atom**: `bind_creature`

A new Effect atom representing a persistent, compelled-service contract imposed on a creature. Runtime semantics would track: caster identity, bound creature identity, duration, and (if needed) an "intent" flag (cooperative vs. hostile) that gates command-interpretation rulings.

**Scope**: `bind_creature` is also the Effect needed for **Geas** (SRD 5.2.1), which is a closely related compelled-service spell. Modeling one gets you the other.

## Blocker 2 — No slot-scaled Duration variant (surface_widening)

**Evidence**: "The duration increases with a spell slot of level 6 (10 days), 7 (30 days), 8 (180 days), and 9 (366 days)."

The spell header's `duration` field is a fixed `Duration` variant (`instantaneous | concentration | timed`). There is no `ThresholdTiers<DurationValue>` shape or a `DurationAmount` analogue to `DiceAmount`. To honestly encode the higher-level scaling, a new Duration variant is needed:

```typescript
// Proposed addition to Duration
| {
    readonly kind: "timed_slot_scaled";
    readonly base: DurationValue;
    readonly tiers: ReadonlyArray<{
      readonly atSlotLevel: number;
      readonly value: DurationValue;
    }>;
  }
```

This is a surface_widening, not an atom_widening — the scaling concept exists (threshold_tiers), it just isn't available on the Duration type.

## Blocker 3 — No cross-spell duration extension atom

**Evidence**: "If the creature was summoned or created by another spell, that spell's duration is extended to match the duration of this spell."

This is an inter-spell lifecycle mutation: Planar Binding can reach into another active spell (e.g., Conjure Elemental) and overwrite its `expire` node's target time. No v4 atom or relation covers one spell modifying another spell's lifecycle.

**Proposed atom** (deferred): `sync_spell_duration` or a modifier on the `extend` atom. This is lower priority — it's a conditional secondary effect that only fires when the target was created by another spell. Leaving it out of an initial `bind_creature` encoding would produce an honest partial trace, not a misleading one.

## Suggested encoding path (after widenings)

```
activation family:
  castingTime: { kind: "minutes", amount: 60, ritual: false }
  duration: { kind: "timed_slot_scaled", base: { unit: "hour", amount: 24 },
               tiers: [
                 { atSlotLevel: 6, value: { unit: "day", amount: 10 } },
                 { atSlotLevel: 7, value: { unit: "day", amount: 30 } },
                 { atSlotLevel: 8, value: { unit: "day", amount: 180 } },
                 { atSlotLevel: 9, value: { unit: "day", amount: 366 } }
               ] }
  phases: [{
    kind: "save_gate",
    attachment: { kind: "target", selection: { mode: "one" } },
    ability: "cha",
    dc: { kind: "caster_spell_save_dc" },
    onFail: { kind: "bind_creature" },   // NEW ATOM
    onSuccess: { kind: "none" }
  }]
```

The cross-spell duration extension could be added as a secondary effect or a separate `conditional_effect` rider once that atom is designed.

## Classification

- **Primary**: `atom_widening` — `bind_creature` is not in the v4 taxonomy
- **Secondary**: `surface_widening` — `Duration` needs a slot-scaled variant
- **Tertiary**: `atom_widening` — cross-spell duration extension (deferred; lower priority)
