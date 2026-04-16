# Proposal: save-gated ongoing effect (Bane)

## Unit

**Bane** — SRD 5.2.1 enchantment, level 1, concentration up to 1 minute.

## Gap

Bane is structurally Bless's negative mirror:

| Field | Bless | Bane |
|---|---|---|
| school | enchantment | enchantment |
| level | 1 | 1 |
| casting time | action | action |
| range | 30 ft | 30 ft |
| duration | concentration, 1 min | concentration, 1 min |
| attachment | target, choose_up_to (scale +1/slot) | target, choose_up_to (scale +1/slot) |
| operation | roll_modifier +1d4 | roll_modifier −1d4 |
| cast-time save? | none | CHA save (only failures get the rider) |

The difference is one line: Bane gates its ongoing roll_modifier behind an initial CHA save thrown on every targeted creature at cast time. **Only those who fail receive the persistent rider.**

The current surface has no way to express this:

- **`ongoing_effect` family** — applies the operation unconditionally to all targets in the attachment. No mechanism for "only attach to targets who failed a save."
- **`activation` family** — supports `save_gate` phases with `onFail: Effect`, but `Effect = DamageEffect | NoneEffect`. There is no `Effect` variant for "apply an ongoing roll modifier for the duration of the spell." Activation phases model one-shot outcomes; Bane's modifier repeats on every subsequent attack roll and saving throw.

## Proposed widening

**Narrowest fix (Option A): New Effect variant for ongoing modifier**

Add to `Effect`:

```typescript
export type OngoingModifierEffect = {
  readonly kind: "ongoing_modifier";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: DiceDelta;
};

export type Effect = DamageEffect | NoneEffect | OngoingModifierEffect;
```

This lets an `activation` spell's `save_gate` phase encode "on fail, attach a persistent roll modifier for the spell's duration." The lifecycle/duration is already modeled by the spell's `duration` field (concentration). The tracer would need a new branch in `traceEffect` for this variant, emitting a `modify_roll_numeric` atom (already in v4).

**Alternative fix (Option B): `saveGateOnCast` in OngoingEffectMechanics**

Add an optional field to `OngoingEffectMechanics`:

```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;
  readonly saveGateOnCast?: {
    readonly ability: Ability;
    readonly dc: DcSource;
  };
};
```

The attachment would then only be applied to targets who fail the cast-time save. The tracer would emit a `save_gate` resolution node before the attachment when `saveGateOnCast` is present.

## Atoms involved

All required v4 atoms already exist:
- `save_gate` (resolution) — for the cast-time CHA throw
- `modify_roll_numeric` (effect) — for the −1d4 rider
- `concentrate` / `expire` (lifecycle) — for concentration duration
- `spell_slot`, `action_quota` (resource) — standard
- `target` (attachment) — with slot-scaled `choose_up_to`
- `scale_target_count` (scaling) — +1 target per slot above 1

No new v4 atom is needed. This is a surface type variant gap only.

## Classification

`surface_widening` — a new variant of an existing surface type (`Effect` or `OngoingEffectMechanics`) is needed. The payload family concept is sound; the gap is the missing bridge between cast-time save resolution and persistent operation attachment.
