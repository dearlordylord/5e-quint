# Proposal: surface_widening for Blink

## Unit

- **Slug:** `blink`
- **Kind:** spell
- **Level:** 3, Transmutation
- **Provenance:** SRD 5.2.1

## Gap Summary

Blink cannot be honestly encoded because `OngoingOperation` has no variant for a **per-turn probabilistic roll check**. A new variant is needed.

## Rule Text (Evidence)

> Roll 1d6 at the end of each of your turns for the duration. On a roll of 4-6, you vanish from your current plane of existence and appear in the Ethereal Plane (the spell ends instantly if you are already on that plane). While on the Ethereal Plane, you can perceive the plane you left, which is cast in shades of gray, but you can't see anything there more than 60 feet away. You can affect and be affected only by other creatures on the Ethereal Plane, and creatures on the other plane can't perceive you unless they have a special ability that lets them perceive things on the Ethereal Plane.
>
> You return to the other plane at the start of your next turn and when the spell ends if you are on the Ethereal Plane. You return to an unoccupied space of your choice that you can see within 10 feet of the space you left.

## Why `ongoing_effect` Is the Right Family

- **Duration:** timed, 1 minute (non-concentration) → maps to `duration: timed`
- **Attachment:** self (no other creature targeted) → maps to `attachment: self`
- **Persistent per-turn effect:** something fires each turn for the spell's duration → fits `ongoing_effect` semantics

None of `activation`, `triggered_reaction`, or `anchored_trigger` applies:
- Not instant/one-shot → not `activation`
- No reaction trigger → not `triggered_reaction`
- No spatial anchor on a location → not `anchored_trigger`

## What Is Missing

### Proposed widening: `PerTurnRollCheckOperation` (new `OngoingOperation` variant)

`OngoingOperation` currently:
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither existing variant can represent Blink's mechanic:
- `RollModifierOperation` modifies the result of *existing* dice rolls (e.g., Bless adds 1d4 to attack rolls).
- `DamageOnHitOperation` opens an `on_hit_window` and deals bonus damage.

Blink needs a new variant that expresses:

```
at turn_end_window:
  roll die (1d6)
  if result in threshold [4..6]:
    apply transport_exile (→ Ethereal Plane)
    grant return_on_end (at turn_start_window or spell end)
    while displaced:
      apply block_targeting (material-plane creatures cannot target/affect)
      apply perception restriction (can see material plane in gray, max 60 ft)
```

Proposed shape (illustrative, not prescriptive for types.ts):

```typescript
export type PerTurnRollCheckOperation = {
  readonly kind: "per_turn_roll_check";
  readonly window: "turn_end";           // fires at turn_end_window
  readonly die: DiceExpr;               // 1d6
  readonly threshold: { readonly min: number; readonly max: number }; // 4-6
  readonly onThreshold: PerTurnRollEffect;
};

export type PerTurnRollEffect =
  | { readonly kind: "planar_displacement"; readonly returnAt: "turn_start" | "spell_end" };
  // future: other threshold effects
```

## V4 Atoms Used (All Exist)

| Atom | Category | Role |
|------|----------|------|
| `transport_exile` | effect | displacement to Ethereal Plane |
| `return_on_end` | lifecycle | return to material plane at turn start or spell end |
| `turn_end_window` | window | when the d6 roll fires |
| `turn_start_window` | window | when the caster returns |
| `self` | attachment | spell targets the caster |
| `block_targeting` | effect | material-plane creatures can't affect the displaced caster |

No new v4 atoms are required. The gap is purely at the `OngoingOperation` surface type level.

## Secondary Gap: Planar Isolation State

While displaced, the caster has:
1. **Perception restriction:** can see material plane but not beyond 60 feet, in grayscale. → partially expressible as a `grant_sense` modifier, but the "limited range while displaced" is a conditional perception state not currently modeled
2. **Targeting isolation:** bidirectional — can only affect/be affected by Ethereal Plane creatures. → `block_targeting` covers the inbound direction; outbound restriction has no current atom

These secondary gaps are real but subordinate to the blocking gap above. Encoding is not possible without the `PerTurnRollCheckOperation` variant regardless.

## Classification

`surface_widening` — new variant of existing surface type `OngoingOperation` needed; all v4 atoms present.
