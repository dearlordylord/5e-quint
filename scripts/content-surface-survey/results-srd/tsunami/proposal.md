# Tsunami — Widening Proposal

**Outcome:** `structural_widening`

No `content/tsunami.dhall`, `content/tsunami.json`, or `content/tsunami.trace.md` were produced. Encoding Tsunami honestly requires surface shapes that do not exist.

---

## Spell summary

Tsunami (level 8 conjuration, Concentration ≤ 6 rounds, 1-minute cast, 1-mile range) creates a massive wall of water with three distinct mechanical phases:

1. **Appearance burst** — area save gate (STR, spell save DC): 6d10 bludgeoning on fail, half on success.
2. **Turn-start recurring damage** — at the start of each caster turn: wall moves 50 ft; Huge-or-smaller creatures inside make a STR save for 5d10 bludgeoning (decreasing by 1d10 each round); wall height decreases 50 ft/round; spell ends at height 0.
3. **Movement gate** — creatures inside the wall must pass a STR (Athletics) ability check vs spell save DC to move; failure means no movement.
4. **Exit effect** — creatures leaving the wall fall to the ground.

---

## Why no existing family fits

### 1. `ongoing_effect` — wrong operation grammar

`OngoingOperation` is `roll_modifier | damage_on_hit`. Neither is a save gate. There is no mechanism in `ongoing_effect` for a turn-start trigger that prompts a conditional resolution. The operation model is for passive, always-active riders (Bless) or attack-hit riders (Hunter's Mark) — not for periodic gated damage.

### 2. `activation` — one-shot only

`ActivationMechanics` holds a `phases: ReadonlyArray<ActivationPhase>` that fires once at cast time. Phase kinds are `attack_roll` and `save_gate`. There is no way to express "re-fire this phase at the start of each caster turn for the duration." The appearance burst alone could fit activation, but the recurring subsequent saves cannot.

### 3. `triggered_reaction` / `anchored_trigger` — structurally wrong

Both are wrong families. `triggered_reaction` is for reaction-cast spells. `anchored_trigger` is for plant-then-release on a discrete event.

---

## Proposed widenings

### W-1: New family or subgraph — `ongoing_activation`

A concentration spell that re-fires one or more save gate (or attack roll) phases at the start of each caster turn. Shape sketch:

```typescript
export type OngoingActivationMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_activation";
  readonly onAppearance?: ReadonlyArray<ActivationPhase>;   // fires once at cast
  readonly onTurnStart: ReadonlyArray<ActivationPhase>;     // fires each caster turn start
};
```

This would require `turn_start_window` to be wired into the tracer for spell families (it currently only appears in mastery rider expiry).

### W-2: New `LevelAxis` variant — `'round'`

Tsunami's recurring damage decreases linearly per round elapsed: 5d10 at round 1, 4d10 at round 2, …, 1d10 at round 5. The current `LevelAxis` union is:

```typescript
type LevelAxis = "character" | "class" | "slot" | "subclass" | "proficiency_bonus";
```

Adding `"round"` and allowing negative `perLevel` on `LinearPerLevel<T>` would cover this and similar decrement patterns (e.g., Delayed Blast Fireball's accumulation could use a positive round axis).

```typescript
// Extended:
type LevelAxis = ... | "round";

// Usage:
const damage: DiceAmount = {
  kind: "linear_per_level",
  axis: "round",
  base: { dice: 5, dieSize: 10 },
  perLevel: { dice: -1 },   // negative = decrement
  startingAtLevel: 1,
};
```

### W-3: New `ActivationPhase` / `OngoingOperation` variant — `ability_check_gate`

Creatures inside the wall must succeed on a STR (Athletics) check against the caster's spell save DC to move. This is an `ability_check` (v4 taxonomy atom exists) gating movement — distinct from both `saving_throw` and `attack_roll`. Neither `ActivationPhase` nor `OngoingOperation` has this variant.

Minimal shape:

```typescript
export type AbilityCheckGate = {
  readonly kind: "ability_check_gate";
  readonly skill?: string;        // e.g. "athletics"
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;        // e.g., block_movement (new effect atom needed)
  readonly onSuccess: Effect;
};
```

This also exposes a missing `Effect` kind: `block_movement` or `restrict_movement` (not in v4 effect inventory).

### W-4: New `Attachment` variant or lifecycle atom — `moving_area`

The wall moves 50 ft away from the caster at the start of each turn. The current `area` attachment is fixed at cast time. Options:

- New attachment variant `moving_area` with a `displacement` field (direction + feet per trigger).
- Or a new lifecycle atom `translate` that modifies an area's origin on each `turn_start_window`.

The v4 taxonomy's `force_move` effect applies to creatures, not to the spell's own area — so it doesn't cover wall movement.

### W-5: `fall_on_exit` area boundary effect

Creatures leaving the wall fall to the ground. The v4 taxonomy has `fall_on_end` (fires when the spell ends), but not "fall when a creature voluntarily exits the spell's area." This is an on-exit trigger on the area boundary.

---

## Encoding scope

The **appearance burst** (single save gate, area, 6d10 bludgeoning) fits the existing `activation` family cleanly and could be encoded now. It is only the recurring phase + diminishing damage + movement gate + moving area that require widening. If the survey allows partial-fit annotation, the appearance burst counts as `surface_widening`; the full spell is `structural_widening`.
