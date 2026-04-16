# Proposal: Call Lightning — structural_widening

## Unit

**Call Lightning** · Level 3 Conjuration · SRD 5.2.1

## Outcome

`structural_widening` — No existing `SpellMechanics` family can encode this spell honestly.

## Why the current surface cannot encode this

Call Lightning has two mechanically distinct phases:

1. **Cast phase (one-shot on cast):** Choose a point under the storm cloud. Fire a lightning bolt. Each creature within 5 ft of that point makes a DEX save → 3d10 lightning on fail, half on success.
2. **Sustained phase (repeatable during concentration):** Until the spell ends, the caster may spend a **Magic action** on each turn to fire another lightning bolt at the same or a different point, identical resolution.

The spell persists up to 10 minutes (concentration). The sustained phase is the dominant gameplay loop — the initial bolt on cast is almost incidental.

### Why `ongoing_effect` doesn't fit

`OngoingOperation` only offers:
- `roll_modifier` — a passive numeric modifier to rolls. Call Lightning is not a roll modifier.
- `damage_on_hit` — an on-hit rider on attack rolls. Call Lightning is triggered by the **caster choosing to spend a Magic action**, not by an attack roll hit.

Neither variant can express a player-activated save_gate that fires on demand.

### Why `activation` doesn't fit

`ActivationMechanics` is one-shot on cast: a sequence of phases resolved at cast time. Call Lightning fires its first bolt at cast, but the bolt can be repeated on every subsequent turn as long as concentration holds. Encoding the initial bolt as an `activation` would omit the entire repeatable-activation loop that defines the spell.

Forcing the spell into `activation` with a single `save_gate` phase would produce a trace that says "one-time save_gate for 3d10 lightning" — actively wrong about the spell's rules.

### Why `anchored_trigger` doesn't fit

`anchored_trigger` models passively armed triggers released by environment events (Alarm, Glyph of Warding). Call Lightning's lightning strikes are player-chosen, not event-triggered. The caster decides when and where to fire; nothing else releases the bolt.

## Proposed widening

### 1. New family: `persistent_activation` (structural)

A new `SpellMechanics` family for concentration spells that grant a **repeatable player-activated action** during the spell's duration.

Tentative shape:
```typescript
export type PersistentActivationMechanics = SpellMechanicsHeader & {
  readonly family: "persistent_activation";
  readonly repeatCost: { readonly kind: "magic_action" }; // cost to fire each activation
  readonly attachment: Attachment;                         // where the effect attaches on each firing
  readonly activation: ActivationPhase;                   // the resolution logic (save_gate, attack_roll, etc.)
};
```

Graph shape:
```
spell_root → activate → concentration_lock + spell_slot
activate → grants → action_window (magic action, repeatable)
action_window → opens_window → on_cast_window (initial) + post_action_window (subsequent)
post_action_window → grants → save_gate (DEX, caster spell DC)
save_gate → attaches_to → area (sphere r=5 ft, origin: chosen point within 120 ft)
save_gate → branches_on_save → damage (3d10 lightning, on fail)
save_gate → branches_on_save → damage (half, on success)
damage → modifies ← scale_die_count (axis=slot, +1d10 per slot above 3)
```

### 2. New `OngoingOperation` variant: `save_gate_operation` (surface widening)

Even if `persistent_activation` is added as a family, the operation type for the firing resolution needs a save_gate variant in the operation vocabulary. Currently `OngoingOperation = RollModifierOperation | DamageOnHitOperation`. A `SaveGateOperation` is needed:

```typescript
export type SaveGateOperation = {
  readonly kind: "save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly attachment: Attachment;
  readonly onFail: Effect;
  readonly onSuccess: Effect;
};
```

This is also applicable beyond Call Lightning — any concentration spell that grants a repeatable save-gated damage effect (cf. Moonbeam, Spirit Guardians) would use this shape.

### 3. New surface type: `conditional_damage_bonus` (surface widening, secondary)

The outdoor-storm bonus (`+1d10 when outdoors in an existing storm`) is a runtime context predicate. It is not slot-scaling, level-scaling, or any existing `DiceAmount` variant. This pressure is secondary but worth recording:

```typescript
export type ConditionalDamageBonus = {
  readonly kind: "conditional";
  readonly condition: "caster_outdoors_in_storm"; // or a broader enum
  readonly bonus: DiceExprDelta;
};
```

## Scope of widening

This is `structural_widening` (not just `surface_widening`) because:
- No existing `SpellMechanics["family"]` discriminant covers "concentration + repeatable Magic action → save_gate."
- The `activation` and `ongoing_effect` families would each require dishonest use to produce any trace at all.

The `save_gate_ongoing_operation` and `conditional_damage_bonus` pressures are `surface_widening` and can be addressed once the structural family is in place.

## Related pressure cases

Other spells in the SRD that follow the same "concentration + repeatable action" pattern:
- **Moonbeam** — repeated Magic action → save_gate → radiant damage on creatures that enter/start in beam
- **Spirit Guardians** — passive area + save_gate on move-through (slightly different trigger, but similar recurring effect)
- **Flaming Sphere** — bonus action → move sphere + save_gate on adjacency

These suggest `persistent_activation` (or a `repeatable_activation` sub-shape) is a high-value widening that will recur across many druid/cleric spells.
