# Proposal: Widening for Conjure Animals

**Outcome:** `structural_widening`

## Why no existing family fits

Conjure Animals creates a **persistent, mobile companion entity** — a Large spectral pack that occupies its own position in space. The spell has four distinct mechanical layers:

1. **Companion creation at cast time** — the pack appears at a point within 60 ft.
2. **Caster-controlled movement** — the caster can move the pack 30 ft on their turn (bonus on top of their own movement).
3. **Proximity-triggered save gate** — when the pack moves within 10 ft of a creature, or a creature enters/ends its turn within 10 ft of the pack, the caster may force a DEX save → 3d10 Slashing on fail (once per turn per creature, upcast: +1d10/slot above 3).
4. **Passive proximity benefit to caster** — advantage on STR saves while the caster is within 5 ft of the pack.

None of the current four spell families (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`) can encode this shape honestly:

| Family | Why it fails |
|--------|-------------|
| `ongoing_effect` | Operations are `roll_modifier` or `damage_on_hit` — neither creates a companion, nor models positional proximity triggers. |
| `activation` | One-shot resolution; the pack persists and has ongoing positional logic. |
| `triggered_reaction` | Reaction-shaped (cast as reaction to a trigger); Conjure Animals is cast as an Action. |
| `anchored_trigger` | Plants a **fixed** location trigger; the pack is **mobile** and caster-controlled. |

## Required widenings

### 1. New spell family: `conjure_companion` (structural)

A new `SpellMechanics` family is needed for spells that create a persistent, mobile entity with:
- a spatial position (placed at cast, moveable on caster's turn)
- optional passive effects on the caster while near the companion
- proximity-triggered effects on nearby creatures (zone of effect around companion)

This family maps to the v4 `create_companion` effect atom and `companion` attachment atom, which are in the taxonomy but not exposed by any current surface family.

Relevant v4 atoms already present: `create_companion`, `command_companion`, `companion`.

Shape sketch:

```typescript
export type ConjureCompanionMechanics = SpellMechanicsHeader & {
  readonly family: "conjure_companion";
  readonly companion: {
    readonly movementFeet: number;         // caster can move it N ft on their turn
    readonly movementCost: "free";         // no action cost, happens with caster movement
  };
  readonly passiveEffects?: ReadonlyArray<ProximityPassiveEffect>;   // caster benefits while near
  readonly proximityZone: {
    readonly radiusFeet: number;
    readonly triggers: ReadonlyArray<ProximityTrigger>;  // enters, ends_turn, companion_moves_near
    readonly onTrigger: ActivationPhase;                  // save_gate with effect
    readonly oncePerCreaturePerTurn: boolean;
  };
};
```

### 2. New window atom: `proximity_window` (atom widening)

The save gate fires on "creature enters / ends turn within N ft of companion, or companion moves within N ft of creature." This is a distinct trigger from any existing window atom:

- `post_action_window` — fires after a creature's action, not on proximity.
- `on_hit_window` — fires on a weapon/spell attack hit, not on proximity.

A new `proximity_window` atom is needed to express zone-of-control triggers around a companion or area.

### 3. New surface construct: proximity-conditioned passive rider (surface widening)

The caster gains Advantage on STR saves while within 5 ft of the pack. This is an ongoing passive effect on the *caster* gated on a runtime spatial condition (proximity to companion). The current surface has no mechanism to express "effect on caster while near attachment."

This could be modeled as a new `ProximityPassiveEffect` shape on the `conjure_companion` family, or as a variant of `OngoingOperation` with a `target: "caster"` + `condition: "within_N_ft_of_companion"` field.

## Upcast scaling note

The +1d10 Slashing per slot above 3 is straightforward and maps cleanly to `DiceAmount` with `kind: "linear_per_level"`, `axis: "slot"`. No new surface shape needed here — this would work once a suitable family exists.

## Once-per-turn-per-creature limit note

"A creature makes this save only once per turn." This is a rate-limit constraint on the proximity trigger not currently expressible in the surface. It could be modeled as a boolean flag `oncePerCreaturePerTurn: true` on the proximity zone configuration.

## Summary

Conjure Animals requires a new `conjure_companion` spell family. The existing atom vocabulary (`create_companion`, `companion`, `command_companion`, `save_gate`, `damage`) is almost sufficient — the missing pieces are:
1. The family shape itself
2. A `proximity_window` window atom for zone-of-control triggers
3. A proximity-conditioned passive-rider construct for the caster benefit
