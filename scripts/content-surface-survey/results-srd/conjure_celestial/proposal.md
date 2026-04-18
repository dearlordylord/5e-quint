# Proposal: Conjure Celestial surface widenings

## Unit

**Spell**: Conjure Celestial (SRD 5.2.1, Level 7 Conjuration)

## Family assessment

The unit is clearly `ongoing_effect` with an area (cylinder) attachment and concentration duration. Most structural pieces exist:

- `area` attachment (cylinder) ✓
- `emit_light` for the bright-light fill ✓
- `reposition_attachment` atom for cylinder movement ✓
- `on_creature_enters_area` trigger ✓
- `on_attached_turn_start` trigger (creature ends turn in area) ✓
- `heal_hp` effect atom ✓
- `OngoingEffect.save_gate` variant for the Searing Light damage ✓
- `linear_per_level` scaling with `axis="slot"` for the upcast (+1d12 to both healing and damage per slot above 7) ✓

Three things are missing.

---

## Widening 1 — `OngoingEffect.choose_effect` (hard blocker)

### RAW text

> "you can bathe it in one of the lights:"  
> **Healing Light** — "The target regains Hit Points equal to 4d12 plus your spellcasting ability modifier."  
> **Searing Light** — "The target makes a Dexterity saving throw, taking 6d12 Radiant damage on a failed save or half as much damage on a successful one."

This choice is made **per creature, at trigger resolution time**, not once at cast time. Every time the cylinder's ongoing trigger fires (creature enters area, creature ends turn in area), the caster picks which light applies to that creature.

### Why existing shapes don't work

- `CastTimeEffectModeChoice` in `direct` phases is a **single global cast-time pick** that sets the spell's mode for its whole duration. Conjure Celestial's choice is made fresh for every creature every time it's triggered.
- Two parallel `OngoingOperation` entries (one for `heal_hp`, one for `save_gate`) would apply **both** effects to every creature — structurally dishonest.
- There is no conditional / exclusive-or composition in `OngoingEffect`.

### Proposed shape

Add a `choose_effect` variant to `OngoingEffect`:

```typescript
| {
    readonly kind: "choose_effect";
    readonly label: string;
    readonly options: ReadonlyNonEmptyArray<{
      readonly id: string;
      readonly displayName: string;
      readonly effect: OngoingEffect;
    }>;
  }
```

This mirrors `CastTimeEffectModeChoice` semantically but fires at trigger resolution time rather than cast time. The caster chooses one option per trigger firing.

---

## Widening 2 — `OngoingTrigger.on_caster_moves`

### RAW text

> "when you move on your turn, you can also move the Cylinder up to 30 feet."

The cylinder repositions **as part of the caster using their movement**, not at the start of their turn and not by spending an action or bonus action.

### Why existing shapes don't work

- `on_caster_turn_start` fires unconditionally even if the caster doesn't move — incorrect semantics.
- `on_caster_spends_action` requires spending a standard action or bonus action quota; movement is a separate resource. The caster can move and reposition the cylinder without using any action.

### Proposed shape

Add `on_caster_moves` to `OngoingTrigger`:

```typescript
| { readonly kind: "on_caster_moves" }
```

Paired with a `reposition_attachment` effect (already in `EffectAtom`) and `maxMoveFeet: 30`.

---

## Widening 3 — Per-target per-turn frequency cap on `OngoingOperation`

### RAW text

> "A creature can be affected by this spell only once per turn."

Multiple triggers can fire for the same creature in one turn (e.g., the cylinder moves into their space AND they are there at the start of their turn). The spell caps effects at one per creature per turn.

### Why existing shapes don't work

`OngoingOperation` has no `usageLimit` or frequency field. `UsageLimit` at the operation level exists for masteries (`once_per_turn` on the whole mastery) but not on individual ongoing operations, and not scoped per-target rather than globally.

### Proposed shape

Add an optional `targetLimit` field to `OngoingOperation`:

```typescript
readonly targetLimit?: { readonly kind: "once_per_target_per_turn" };
```

---

## Encoding notes (for when widenings land)

With all three widenings:

```
ongoing_effect
  attachment: area (cylinder, r=10ft, h=40ft, origin: point_within_range 90ft)
  duration: concentration up to 10 minutes
  operations:
    - trigger: on_creature_enters_area
      effect: choose_effect
        - Healing Light: heal_hp { 4d12+spellcasting mod, linear +1d12/slot ≥8 }
        - Searing Light: save_gate { dex, caster_spell_save_dc,
            onFail: damage { 6d12 radiant, linear +1d12/slot ≥8 },
            onSuccess: half_damage }
      targetLimit: once_per_target_per_turn

    - trigger: on_attached_turn_start
      effect: (same choose_effect as above)
      targetLimit: once_per_target_per_turn

    - trigger: passive
      effect: emit_light { brightRadiusFeet: 10 }  (filling the cylinder)

    - trigger: on_caster_moves
      effect: reposition_attachment { maxMoveFeet: 30 }
```

The initial cast (apply lights to all creatures already in the cylinder at cast time) would use an `initialPhase` with a `direct` + area attachment that fires the same per-creature choose_effect.
