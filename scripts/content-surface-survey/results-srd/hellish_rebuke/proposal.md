# Proposal: Hellish Rebuke — surface_widening

## Gap

`ReactionTrigger` lacks a variant for "caster takes damage from a visible creature within range."

The existing `hit_by_attack_roll` variant covers only attack roll hits. Hellish Rebuke's trigger fires on **any** damage the caster receives from a creature they can see — including damage from failed saving throws, AoE effects, and other non-attack damage sources. Using `hit_by_attack_roll` would silently narrow the trigger and produce a misleading trace.

## SRD evidence

> "which you take in response to taking damage from a creature that you can see within 60 feet of yourself"

## Proposed widening

Add a new `ReactionTrigger` variant:

```typescript
| {
    readonly kind: "take_damage_from_creature";
    readonly rangeFeet: number;
    readonly requiresVisibleCreature?: true;
  }
```

`rangeFeet` encodes the 60-foot proximity constraint. `requiresVisibleCreature` encodes the line-of-sight requirement ("that you can see"). Both are RAW-specific to this trigger shape and should be explicit fields rather than folded into a prose string.

## What already fits

| Element | Encoding |
|---|---|
| Family | `triggered_reaction` |
| CastingTime | `reaction` (trigger field needs the new variant) |
| `interruptsTrigger` | `false` — Hellish Rebuke doesn't cancel the incoming damage |
| Range | `{ kind: "point", feet: 60 }` |
| Phase | `save_gate` with `attachment: { kind: "target", selection: { mode: "one" } }` |
| Ability | `dex` |
| DC | `{ kind: "caster_spell_save_dc" }` |
| `onFail` | `{ kind: "damage", damageType: "fire", amount: { kind: "linear_per_level", axis: "slot", base: { dice: 2, dieSize: 10 }, perLevel: { dice: 1 }, startingAtLevel: 2 } }` |
| `onSuccess` | `{ kind: "half_damage" }` |
| Duration | `{ kind: "instantaneous" }` |
| Components | `{ v: true, s: true, m: false }` |

Once the `take_damage_from_creature` trigger variant is added, the full unit encodes cleanly with no further widenings.
