# Proposal: Surface widenings for Hunter's Mark

## Unit

**Hunter's Mark** — SRD 5.2.1, Level 1 Divination, Concentration up to 1 hour

## Outcome

`surface_widening` — the `ongoing_effect` family encodes the primary mechanic
(+1d6 Force on attack-roll hits against the marked creature, with Bonus-Action
mark transfer on target's 0-HP drop) cleanly. Two secondary mechanics require
new variants of existing surface types.

## What encoded cleanly

| Mechanic | Surface shape | Result |
|---|---|---|
| Bonus Action cast, V-only | `CastingTime.bonus_action`, `Components` | ✓ |
| 90-foot range | `Range.point` | ✓ |
| Concentration ≤ 1 hour | `Duration.concentration` | ✓ |
| Mark one creature | `Attachment.mark`, `selection.mode = "one"` | ✓ |
| +1d6 Force on attack-roll hits | `DamageOnHitOperation` | ✓ |
| Transfer mark (Bonus Action) when target drops to 0 HP | `MarkTransfer` with `target_drops_to_0_hp` | ✓ |

## What did NOT encode — proposed widenings

### 1. `advantage_on_check` — new `OngoingOperation` variant

**Evidence:** "You also have Advantage on any Wisdom (Perception or Survival)
check you make to find it."

The spell grants the caster Advantage on specific skill checks while the mark
persists. The current `OngoingOperation` union is:

```typescript
type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

`RollModifierOperation` adds a numeric `DiceDelta` to attack rolls or saving
throws — it does not model advantage/disadvantage, and it does not scope to
skill checks. A new variant is needed:

```typescript
type AdvantageOnCheckOperation = {
  readonly kind: "advantage_on_check";
  readonly mode: "advantage" | "disadvantage";
  readonly ability: Ability;                     // "wis"
  readonly skills?: ReadonlyArray<string>;        // ["perception", "survival"]
  readonly qualifier?: "to_find_attachment";      // scope guard
};
```

The `qualifier` field (or equivalent) is important: the Advantage is narrowly
scoped to locating the marked creature, not a blanket WIS check boost. Whether
that qualifier is a closed enum or a free label is a separate design question.

---

### 2. `operations` array — structural change to `OngoingEffectMechanics`

Hunter's Mark has **two simultaneous ongoing effects**: `damage_on_hit` and
the `advantage_on_check` from widening #1 above. The current surface has:

```typescript
type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;   // singular
};
```

To model both effects faithfully, change `operation` to an array:

```typescript
type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operations: ReadonlyArray<OngoingOperation>;
};
```

All existing single-operation units (`bless`, etc.) would use a single-element
array. The tracer's `traceOngoingOperation` call becomes a loop. No new atoms
needed — the existing `damage_on_hit` and proposed `advantage_on_check` nodes
would both attach to the same `mark` attachment via separate subgraphs.

**Note:** This widening is only required if widening #1 is accepted. If the
Advantage rider is classified as out-of-scope for the surface (e.g., the
surface is restricted to combat-resolution mechanics only), the singular
`operation` field is sufficient for the remaining units.

---

### 3. Slot-scaling `Duration` — new variant or field on `concentration`

**Evidence (upcast):** "Your Concentration can last longer with a spell slot of
level 3-4 (up to 8 hours) or 5+ (up to 24 hours)."

The current `Duration.concentration` shape has a fixed ceiling:

```typescript
{ readonly kind: "concentration"; readonly upTo: DurationValue }
```

Hunter's Mark's upcast changes this ceiling in tier steps. Two options:

**Option A:** Add an optional `upcasting` field to `concentration`:

```typescript
{
  readonly kind: "concentration";
  readonly upTo: DurationValue;
  readonly upcasting?: ThresholdTiers<DurationValue>;  // axis: "slot"
}
```

**Option B:** A new duration kind `concentration_scaling` that makes the
tiered structure explicit and non-optional.

Either approach only requires adding a variant/field to an existing type; no
new family is needed. The tracer's `traceDuration` would emit an additional
`scale_concentration_ceiling` scaling atom (or fold it into the `expire` label)
when upcasting is present.

---

## Scope note

Widening #1 and #2 relate to the **exploration-layer** mechanic (tracking a
quarry across terrain). If the surface is intentionally scoped to
**combat-resolution mechanics only**, both can be deferred as out-of-scope
without compromising the encoded JSON. Widening #3 (upcast duration) is
independently useful for any concentration spell with slot-dependent duration.
