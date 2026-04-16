# Proposal: Resistance encoding gap

## Outcome: `atom_widening`

## Unit

- **Name:** Resistance
- **Slug:** resistance
- **Kind:** spell (cantrip, abjuration, concentration 1 min, touch)

## What fits

The `ongoing_effect` family is the right family — Resistance is a concentration spell that attaches a persistent effect to a touched creature. All of the header maps cleanly:

- Level 0 (cantrip) → `level: 0`
- School A (abjuration) → `school: "abjuration"`
- Casting time: 1 action → `castingTime: { kind: "action" }`
- Range: touch → `range: { kind: "touch" }`
- Components: V, S → `components: { v: true, s: true, m: false }`
- Duration: concentration, up to 1 minute → `duration: { kind: "concentration", upTo: { unit: "minute", amount: 1 } }`
- Attachment: one target (touch) → `attachment: { kind: "target", selection: { mode: "one" } }`

## What does NOT fit

### 1. Missing atom: `reduce_damage_taken`

The spell's core mechanic — "the creature reduces the total damage taken by 1d4" — requires a damage-interception atom that does not exist in v4.

The v4 taxonomy has `grant_resistance` (halving incoming damage) and `damage` (dealing damage). Neither covers "reduce incoming damage of a specific type by a rolled dice expression." The taxonomy explicitly notes in §12:

> `reduce_damage_taken` distinct from `grant_resistance` (Uncanny Dodge, Deflect Attacks). Not promoted; single-group pressure.

With Resistance, this becomes two-stream pressure (class-feature reactions + this spell). The atom should model:

- Trigger: creature in attachment scope receives damage of a specified type
- Effect: subtract a `DiceAmount` from total damage taken
- Expiry: once per turn (per spell text)

### 2. Missing `OngoingOperation` variant

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`. Neither variant models incoming-damage interception:

- `RollModifierOperation` — modifies attack rolls or saving throws before resolution
- `DamageOnHitOperation` — rider that fires when the *caster* hits a creature (outgoing direction)

Resistance fires when the *target* receives damage (incoming direction) from any source. A new variant is needed, tentatively:

```typescript
export type ReduceDamageOnReceiveOperation = {
  readonly kind: "reduce_damage_on_receive";
  readonly damageType: DamageType;     // chosen at cast
  readonly reduction: DiceAmount;
  readonly usageLimit?: { readonly kind: "once_per_turn" };
};
```

### 3. Damage type chosen at cast time

The caster selects a damage type when casting ("you choose a damage type"), and this choice gates the trigger throughout the spell's duration. The surface has no representation for cast-time parameters that filter operation triggers. This is a secondary gap: once `reduce_damage_on_receive` exists, the `damageType` field can carry this, but the authoring surface needs to accept the concept of "chosen at cast" for damage type selection — similar to how `AnchoredFilter` handles `chosenAtCast: true` for creature exemption lists.

## Proposed widening path

1. **Add atom `reduce_damage_taken` to v4** — incoming-damage interception by a dice expression, distinct from `grant_resistance`.
2. **Add `ReduceDamageOnReceiveOperation` to `OngoingOperation`** in `types.ts`.
3. **Wire the tracer** to emit `reduce_damage_taken` + `on_receive_window` (or analogous) when it encounters the new operation kind.

Once these are in place, Resistance encodes cleanly as `ongoing_effect` with a single `reduce_damage_on_receive` operation on a one-target touch attachment.
