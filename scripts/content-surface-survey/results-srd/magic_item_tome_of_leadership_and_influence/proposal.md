# Tome of Leadership and Influence

## Verdict

`atom_widening`

The unit does not fit the current authored surface honestly, so no `content/magic_item_tome_of_leadership_and_influence.dhall` was written.

## Why It Does Not Fit

The item is not a passive grant:

- The benefit is not "while you wear/attune/use" a persistent item.
- The item grants a one-time permanent character improvement after completing a study process.

The item is also not representable as the current activated-item family:

- `ClassFeatureActivationCost` models immediate activation costs (`free`, `action`, `bonus_action`, `reaction`, `replace_attack`).
- The item instead requires a deterministic study regimen: `48 hours over a period of 6 days or fewer`.
- `RestResetCadence` models rest/dawn/never refill patterns, not "goes dormant for 100 years, then regains magic."

## Missing Pieces

### 1. New atom: `modify_ability_score`

The existing `set_ability_score` atom is the wrong semantics. It models:

- set to a fixed value, or
- floor to a fixed minimum,

typically while an item is worn or attuned.

This tome instead says:

> your Charisma increases by 2, to a maximum of 30

That is an additive permanent increase with an upper cap, not a set/floor effect.

Suggested shape:

```ts
{
  kind: "modify_ability_score";
  ability: Ability;
  delta: number;
  maximum?: number;
}
```

### 2. Surface widening: study-regimen activation gate

The activation surface needs a way to express deterministic non-combat study/training requirements.

Pressure text:

> If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines

This is not DM-agenda; it is a concrete requirement. But it is not representable as any current activation cost or duration shape.

### 3. Surface widening: dormancy / recharge-after-long-elapsed-time lifecycle

The item is not destroyed and does not reset on a rest cadence.

Pressure text:

> The manual then loses its magic but regains it in a century

This wants an item lifecycle/dormancy variant, not `ItemDestructionPolicy`.

## Why This Is Not `structural_widening`

The top-level kind already exists: `magic_item`.

The general family also exists in principle: this is still an item with a deterministic benefit and a lifecycle. The problem is that the current surface lacks:

- the correct effect atom for additive ability-score increase, and
- activation/lifecycle variants for study and century-scale dormancy.

So the narrowest honest classification is `atom_widening`, with secondary surface gaps.
