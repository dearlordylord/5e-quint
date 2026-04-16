# Proposal: Delayed Blast Fireball — Structural Widening

**Slug:** `delayed_blast_fireball`  
**Outcome:** `structural_widening`  
**Closest existing family:** `anchored_trigger`

---

## Why anchored_trigger is right but not enough

Delayed Blast Fireball is structurally analogous to Alarm: the caster arms a trigger (the bead) at a chosen point, and it fires later when an event occurs. The `anchored_trigger` family is conceptually correct. But four structural gaps prevent honest encoding.

---

## Gap 1 — AnchoredSignal has no damage payload

**Source text:** *"each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw. A creature takes Fire damage equal to the total accumulated damage on a failed save or half as much damage on a successful one."*

The explosion is a **save-gated area damage effect** — the core mechanical payload. `AnchoredSignal` only supports `audible` and `mental` notification signals (caller-owned, non-core per `ARCHITECTURE.md`). The tracer's `traceAnchoredTrigger` function folds signal content into label strings rather than wiring to `save_gate` + `damage` atoms.

**Proposed widening:** Either (a) add `{ kind: "damage_area"; saveAbility: Ability; dc: DcSource; damageType: DamageType; amount: DiceAmount; onSuccess: "half" | "none" }` to `AnchoredSignal`, and restructure the tracer to wire it into actual `save_gate` + `damage` atoms; or (b) restructure the `anchored_trigger` release to carry a `phases: ReadonlyArray<ActivationPhase>` payload (reusing the existing activation machinery).

Option (b) is cleaner and avoids a new signal kind, but requires the `release` procedure to connect into the activation subgraph.

---

## Gap 2 — DiceAmount has no turn-accumulation kind

**Source text:** *"The spell's base damage is 12d6, and the damage increases by 1d6 whenever your turn ends and the spell hasn't ended."*

The damage is **runtime-accumulating**: it starts at 12d6 and gains +1d6 each time a specific in-combat event fires (caster's turn end). This is not level-based scaling:

- `fixed`: No — the amount isn't known at cast time.
- `threshold_tiers` with axis `character`/`class`/`slot`/`subclass`/`proficiency_bonus`: No — the axis needed is "turns elapsed while concentrating," which is none of the five `LevelAxis` values.
- `linear_per_level`: Same problem — the growth axis is a combat-time event counter, not a character progression axis.

**Proposed widening:** New `DiceAmount` variant:
```typescript
{
  readonly kind: "accumulating_per_event";
  readonly base: DiceExpr;
  readonly perEvent: DiceExprDelta;
  readonly triggerEvent: "caster_turn_end";  // closed enum, widen as needed
}
```

The tracer would emit a new `scale_die_count` scaling node (since dice count grows) linked to the `post_action_window` (turn-end window) of the caster.

Higher-level casting (+1d6 base per slot above 7) is a separate, standard `SlotScaling<DiceExpr>` on the base — representable once the accumulation kind exists.

---

## Gap 3 — Touch/throw/reposition has no surface representation

**Source text:** *"If a creature touches the glowing bead before the spell ends, that creature makes a Dexterity saving throw. On a failed save, the spell ends, causing the bead to explode. On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead enters a creature's space or collides with a solid object, the spell ends, and the bead explodes."*

This is a compound event chain with no existing analog:

1. `physical_contact` event fires on the bead anchor.
2. Opens a `save_gate` (Dex, caster spell save DC).
3. **On fail:** Terminates concentration immediately → bead explodes (release fires).
4. **On success:** Grants the touching creature an ability to **throw** the bead ≤40 ft, **repositioning the anchor point**. If the thrown bead enters a creature's space or collides with a solid object, the release fires at the new location.

The existing `physical_contact` kind is a simple trigger — it has no save gate, no branching, and no mechanism to reposition the anchor. The anchor repositioning particularly breaks the `anchored_trigger` family's implicit invariant that the anchor location is fixed at cast time.

**Proposed widening:** A `touch_interaction` composite event on `AnchoredTriggerMechanics` — a save-gated event where the fail branch fires the release and the success branch allows the creature to reposition the anchor (up to a specified distance) with a secondary trigger condition (enters creature's space / collides with solid object). This is a new subgraph, not just a new variant of `AnchoredEvent`.

---

## Gap 4 — "Spell ends" is not an AnchoredEvent kind

**Source text:** *"When the spell ends, the bead explodes."*

The **primary** detonation trigger is the spell's own termination — either concentration breaks or the 1-minute duration elapses. This maps to the lifecycle atom `expire`, but `AnchoredEvent` only has:
- `physical_contact`
- `enters_area`

Neither represents "the spell's own concentration ending." A new kind like `{ kind: "spell_expires" }` is needed as the default/normal-case detonation trigger.

---

## Secondary effect (out-of-core)

*"flammable objects in the explosion that aren't being worn or carried start burning"*

Environmental ignition is caller-owned per `ARCHITECTURE.md`. Not a core-mechanics atom. No widening needed for this.

---

## Recommended schema direction

```typescript
// New DiceAmount variant
| {
    readonly kind: "accumulating_per_event";
    readonly base: DiceExpr;
    readonly perEvent: DiceExprDelta;
    readonly triggerEvent: "caster_turn_end";
  }

// New AnchoredEvent kind
| { readonly kind: "spell_expires" }

// New AnchoredSignal kind (or restructure release to use ActivationPhase[])
| {
    readonly kind: "damage_area";
    readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
    readonly saveAbility: Ability;
    readonly dc: DcSource;
    readonly damageType: DamageType;
    readonly amount: DiceAmount;
    readonly onSuccess: "half";
  }

// New anchored_trigger field (touch/throw interaction)
readonly touchInteraction?: {
  readonly save: { readonly ability: Ability; readonly dc: DcSource };
  readonly onFail: "detonate";
  readonly onSuccess: {
    readonly kind: "throw_to_reposition";
    readonly maxFeet: number;
    readonly detonateOn: ReadonlyArray<"enters_creature_space" | "collides_with_solid_object">;
  };
};
```

This keeps the `anchored_trigger` family as the home for Delayed Blast Fireball and wires the release to actual `save_gate` + `damage` atoms through the tracer.
