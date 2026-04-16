# Proposal: Surface Widenings Required for Sanctuary

## Unit

- **Name:** Sanctuary
- **Slug:** sanctuary
- **Kind:** spell
- **Source:** srd-5.2.1 (Abjuration, Level 1)

## What Fits

Sanctuary fits the `ongoing_effect` spell family at the header level:

| Field | Value | Fits? |
|---|---|---|
| `kind` | `"spell"` | ✓ |
| `family` | `"ongoing_effect"` | ✓ |
| `level` | `1` | ✓ |
| `school` | `"abjuration"` | ✓ |
| `castingTime` | `{ kind: "bonus_action" }` | ✓ |
| `range` | `{ kind: "point", feet: 30 }` | ✓ |
| `components` | `{ v: true, s: true, m: "a shard of glass from a mirror" }` | ✓ |
| `duration` | `{ kind: "timed", value: { unit: "minute", amount: 1 } }` | ✓ (partial — self-break missing) |
| `attachment` | `{ kind: "target", selection: { mode: "one" } }` | ✓ |
| `operation` | ??? | **✗ — no variant fits** |

## Gap 1: Missing `OngoingOperation` variant — `targeting_interception`

### Problem

`OngoingOperation` is currently:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

- `RollModifierOperation` — adds a dice bonus to attack rolls or saving throws *made by the warded creature or caster*.
- `DamageOnHitOperation` — fires when the *caster* hits a creature in the attachment scope, dealing extra damage.

Sanctuary's mechanic is neither of these. It fires when **any other creature designates the warded creature as a target** of an attack roll or damaging spell, then requires that attacking creature to pass a WIS saving throw or forfeit their targeting attempt.

### Required shape

A third `OngoingOperation` variant is needed:

```typescript
export type TargetingInterceptionOperation = {
  readonly kind: "targeting_interception";
  // What triggers the interception: an attacker designating the attachment
  // as the target of an attack roll or a damaging spell.
  readonly interceptOn: ReadonlyArray<"attack_roll" | "damaging_spell">;
  // The save the attacker must pass to proceed.
  readonly gate: {
    readonly ability: Ability;       // "wis"
    readonly dc: DcSource;           // { kind: "caster_spell_save_dc" }
  };
  // What happens if the attacker fails the save.
  readonly onFail: "block_targeting";   // maps to v4 block_targeting atom
  // What happens if the attacker succeeds.
  readonly onSuccess: "allow";
};
```

### v4 atom coverage

All atoms required by this shape already exist in v4:
- `save_gate` — the WIS check on the attacker
- `block_targeting` — the fail outcome (v4 §9 Effect atoms)
- The window that opens is conceptually a new kind: "when this creature is designated as a target" — closest v4 atom would be a new `targeting_window`, but `block_targeting` may subsume this if it can attach to the ongoing persistence. **This deserves a follow-up taxonomy question.**

### SRD evidence

> "any creature who targets the warded creature with an attack roll or a damaging spell must succeed on a Wisdom saving throw or either choose a new target or lose the attack or spell"

---

## Gap 2: Missing self-termination condition on `Duration`

### Problem

The current `Duration` type:

```typescript
export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue };
```

Sanctuary is `timed` (1 minute, non-concentration), but it also self-terminates early when the warded creature takes hostile action. There is no field in `Duration` or `SpellMechanicsHeader` to express this condition.

The v4 lifecycle atom `self_break` exists but there is no surface slot to attach it.

### Required shape

`Duration.timed` should optionally accept a `breakOn` array:

```typescript
// Extended timed duration with optional self-break conditions.
// Maps to the v4 self_break lifecycle atom when present.
| {
    readonly kind: "timed";
    readonly value: DurationValue;
    readonly breakOn?: ReadonlyArray<SelfBreakCondition>;
  }

export type SelfBreakCondition =
  | { readonly kind: "warded_creature_makes_attack_roll" }
  | { readonly kind: "warded_creature_casts_spell" }
  | { readonly kind: "warded_creature_deals_damage" };
```

Alternatively, a more general `WardBreakCondition` keyed to the subject (warded creature vs. caster) could be introduced.

### SRD evidence

> "The spell ends if the warded creature makes an attack roll, casts a spell, or deals damage."

---

## Classification

| | |
|---|---|
| **Outcome** | `surface_widening` |
| **New atoms required** | None — `save_gate`, `block_targeting`, `self_break` all exist in v4 |
| **New surface variants required** | 2 (see above) |
| **Family fit** | `ongoing_effect` — all header fields valid; `operation` field blocked |

## Authoring Blocked On

1. A new `targeting_interception` variant of `OngoingOperation` in `types.ts`.
2. An optional `breakOn` field (or equivalent) on `Duration.timed` to wire up `self_break`.

Both are mechanical-semantic additions that require a red/green widening pass before Sanctuary can be encoded without lying.
