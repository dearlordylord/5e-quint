# Proposal: Barkskin — surface_widening

## Unit

- **Slug:** barkskin
- **Kind:** spell
- **Level:** 2 Transmutation
- **Source:** srd-5.2.1

## What fits

The `ongoing_effect` spell family is the correct fit for Barkskin's structure:

| Header field | Value | Surface support |
|---|---|---|
| castingTime | bonus_action | ✓ `{ kind: "bonus_action" }` |
| range | touch | ✓ `{ kind: "touch" }` |
| duration | timed 1 hour | ✓ `{ kind: "timed", value: { unit: "hour", amount: 1 } }` |
| concentration | no | ✓ not concentration |
| attachment | one willing creature (touch) | ✓ `{ kind: "target", selection: { mode: "one" } }` |
| components | V S M (handful of oak bark) | ✓ |

The `ongoing_effect` family with a `persist` lifecycle and `expire` at 1 hour traces cleanly. A level 2 spell slot node attaches normally. Bonus action casting time maps to `bonus_action_quota`.

## What does not fit

**Effect text:** "the target has an Armor Class of 17 if its AC is lower than that."

This is a **conditional AC floor**: AC = max(target.AC, 17). It is mechanically distinct from every existing operation in `OngoingOperation`:

- `roll_modifier` — modifies attack rolls or saving throws with a ±NdM delta. Not AC.
- `damage_on_hit` — adds damage on a weapon hit. Not AC.

The closest existing surface atom is `modify_ac` in `ReactionEffect`:

```typescript
export type ReactionEffect =
  | { readonly kind: "modify_ac"; readonly delta: number }
  | ...
```

This cannot be used because:

1. **It is not part of `OngoingOperation`.** `modify_ac` is only a `ReactionEffect`, wired to `TriggeredReactionMechanics`. Adding it to an `ongoing_effect` spell would require a type change.

2. **The semantics are wrong.** `modify_ac` with `delta: number` is an unconditional additive modifier (Shield: +5 AC, always). Barkskin's mechanic is a conditional replacement: it only applies if the target's AC is already below 17. These compose differently — stacking two +5 Shield effects is meaningful; stacking two AC-17-floor effects is idempotent.

## Proposed widening

### Option A: New `OngoingOperation` variant — `modify_ac_floor`

```typescript
export type ModifyAcFloorOperation = {
  readonly kind: "modify_ac_floor";
  readonly floor: number;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifyAcFloorOperation;  // new
```

This names the floor semantics explicitly. The tracer emits a `modify_ac` effect atom (v4 inventory) with a label clarifying that this is a floor, not a delta.

### Option B: Generalize `modify_ac` to include floor variant

```typescript
export type ModifyAcEffect =
  | { readonly kind: "modify_ac"; readonly delta: number }         // additive (Shield)
  | { readonly kind: "modify_ac"; readonly floor: number };        // conditional floor (Barkskin, Mage Armor)
```

This unifies the atom under one name but distinguishes the operation shape. Requires updating the `ReactionEffect` union and adding the new shape to `OngoingOperation`.

**Recommendation: Option A** — it keeps the delta and floor shapes separate and avoids colliding with the existing `ReactionEffect.modify_ac` definition. The v4 atom inventory has `modify_ac`; the tracer can emit it for both shapes via different surface types.

## Comparable units

- **Mage Armor** (another tier-2 spell) has the same AC-floor pattern: AC = 13 + Dex modifier, applied when not wearing armor. It is in the same survey queue and will hit the same gap.
- **Shield** (existing tier-1 encoded) uses `modify_ac` as a reaction delta — this is the additive case. Barkskin is the persistent-floor case. Both are `modify_ac` atoms, different surface shapes.

## Classification

`surface_widening` — the `ongoing_effect` family exists and the header encodes cleanly. The gap is one missing operation variant in `OngoingOperation`. The v4 atom `modify_ac` is sufficient; no new atom is needed.
