# Proposal: Surface Widenings for Conjure Fey

**Unit:** Conjure Fey (spell, level 6, conjuration)
**Outcome:** `surface_widening`
**Family:** `ongoing_effect` (correct structural home — persistent concentration effect with per-turn operations)

---

## What the spell does

Conjure Fey creates a Medium spirit at a point within 60 ft. The spirit occupies a space and serves as a mobile melee-range origin: the caster makes attacks against creatures within 5 ft of the spirit. When the spirit appears, the caster may make one melee spell attack (3d12 + spellcasting mod psychic, +Frightened until start of caster's next turn). On later turns, as a Bonus Action, the caster teleports the spirit up to 30 ft and makes the attack again from the new position.

The spirit has no stat block, no independent actions, and no command economy — it is not a spawned creature. It is a persistent mobile attack origin fully controlled by the caster.

---

## Gap 1: `apply_condition` lacks an expiry field

**Evidence:** "the target has the Frightened condition until the start of your next turn"

The current `apply_condition` atom applies a condition with no duration or expiry. Conditions are usually assumed to last for the host effect's duration or until explicitly removed. But the Frightened condition here expires on the caster's next turn start — a turn-scoped expiry that is independent of the spell's 10-minute concentration duration.

`modify_roll_advantage` already carries `count` and `expiresOn: RiderExpiry` for analogous per-hit riders (e.g., Vicious Mockery). The parallel extension for `apply_condition` is:

```typescript
// Proposed addition to EffectAtom apply_condition:
| {
    readonly kind: "apply_condition";
    readonly condition: Condition | ...;
    readonly expiresOn?: RiderExpiry;  // absent = lasts for host effect duration
  }
```

Where `RiderExpiry` already includes `{ kind: "caster_turn_start" }` (added for Heat Metal).

---

## Gap 2: Attack origin from spirit's position

**Evidence:** "you can make one melee spell attack against a creature within 5 feet of it"

The attack targets a creature within 5 ft of the **spirit**, not the caster. This is a positional constraint on the attack whose origin is the spirit's current location. `AreaOrigin` only has:
- `point_within_range` — a fixed point selected at cast time
- `on_primary_target` — secondary effect origin
- `self` — from the caster

None of these captures "from the spirit's current position, which changes when the spirit is repositioned."

**Proposed widening:** Add a new `AreaOrigin` variant:

```typescript
| { readonly kind: "from_effect_attachment" }
```

This allows an attack or area to originate from the effect's own attachment (the spirit), which is tracked as a repositionable position. This generalizes cleanly — any persistent attachment that can be repositioned (via `reposition_attachment`) becomes a valid origin for subsequent attacks.

Alternatively, `AttachmentRangeOrigin` (currently `"caster" | "spell_sensor"`) could gain a third variant `"effect_attachment"` for attacks/areas whose range is measured from the persistent effect position.

---

## Gap 3: Coupled multi-step Bonus Action (reposition + attack)

**Evidence:** "As a Bonus Action on your later turns, you can teleport the spirit to an unoccupied space you can see within 30 feet of the space it left **and** make the attack against a creature within 5 feet of it."

The Bonus Action performs two things atomically:
1. Reposition the spirit (`reposition_attachment`, 30 ft max)
2. Make a melee spell attack against a creature within 5 ft of the new position

`OngoingOperation` is a single `trigger → effect` pair. Modeling these as two separate operations with `on_caster_spends_action (bonus_action)` triggers would:
- Imply the player can spend two separate Bonus Actions (incorrect)
- Leave the sequencing (must reposition before attacking) implicit

**Proposed widening:** Add a `steps` list to `OngoingOperation` (or a `composite_operation` variant) to allow multiple effects that share one trigger and action cost:

```typescript
// Option A: extend OngoingOperation
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly followedBy?: OngoingEffect;  // fires after effect, same activation
};

// Option B: composite OngoingEffect
| {
    readonly kind: "sequence";
    readonly steps: ReadonlyNonEmptyArray<OngoingEffect>;
  }
```

Option B is cleaner because it keeps the multi-step logic inside the effect layer rather than adding protocol fields to the operation header.

---

## Encoding shape (once gaps are resolved)

```
family: ongoing_effect
attachment: { kind: "area", shape: { kind: "emanation", radiusFeet: 0 }, origin: { kind: "point_within_range" } }
  — represents the spirit's position; reposition_attachment moves this point

initialPhase: attack_roll {
  attachment: target (one creature within 5 ft of spirit),
  attackKind: melee_spell_attack,
  onHit: [
    damage { kind: "linear_per_level", axis: "slot", base: 3d12+spellcasting_mod psychic, perLevel: +1d12, startingAtLevel: 7 },
    apply_condition { condition: "frightened", expiresOn: { kind: "caster_turn_start" } }
  ]
}

operations: [
  {
    trigger: { kind: "on_caster_spends_action", cost: { kind: "bonus_action" } },
    effect: sequence [
      reposition_attachment { maxMoveFeet: 30 },
      attack_roll { attackKind: melee_spell_attack, onHit: [...same as initial...] }
    ]
  }
]
```

---

## Classification

All three gaps are variants or composition extensions of existing surface types, not missing v4 taxonomy atoms. The `ongoing_effect` family, `reposition_attachment` atom, `melee_spell_attack` attack kind, `apply_condition`, and `on_caster_spends_action` trigger all exist. No new top-level atom is required.
