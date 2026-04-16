# Proposal: surface widenings for Blindness/Deafness

**Unit:** Blindness/Deafness (spell, level 2, transmutation, SRD 5.2.1)  
**Outcome:** `surface_widening`

No dhall or JSON was authored. All blockers are variants of existing surface types; v4 atom inventory already covers the needed concepts.

---

## Spell summary

> One creature that you can see within range must succeed on a Constitution saving throw, or it has the Blinded or Deafened condition (your choice) for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.
> Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 2.

Key properties:
- Casting time: 1 Action
- Range: 120 ft (point)
- Components: V
- Duration: 1 minute (timed, NOT concentration)
- Save: CON

---

## Widening 1 — `apply_condition` in spell `Effect` union

**Current state:** `Effect = DamageEffect | NoneEffect`

The `ActivationPhase.save_gate.onFail` takes an `Effect`. There is no `ApplyConditionEffect` variant. The v4 atom `apply_condition` exists and is already used via `SaveGateRiderResult` in the mastery surface, but that type is mastery-specific and not reused in `Effect`.

**Proposed addition:**
```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

---

## Widening 2 — `Condition` union missing `"blinded"` and `"deafened"`

**Current state:** `export type Condition = "prone";`

Blindness/Deafness is the canonical source for both `"blinded"` and `"deafened"`. These are SRD standard conditions and will be needed across many spells, class features, and masteries.

**Proposed addition:**
```typescript
export type Condition = "prone" | "blinded" | "deafened";
```

(Further conditions — stunned, paralyzed, charmed, frightened, incapacitated, poisoned, restrained, grappled, exhaustion — will be needed as more units are encoded.)

---

## Widening 3 — `repeat_save` `ActivationPhase` variant

**Current state:** `ActivationPhase = { kind: "attack_roll" } | { kind: "save_gate" }`

The spell has a recurring per-turn save that terminates the spell on success. This is not an `activation` phase in the one-shot sense — it is a persistent save that repeats at a defined trigger (end of target's turn). v4 has `repeat_save` in the Resolution atom inventory.

This is functionally a lifecycle sub-mechanic on an ongoing timed spell: the condition persists until the repeat save succeeds. It could be modeled as:

**Option A:** A new `ActivationPhase` variant:
```typescript
| {
    readonly kind: "repeat_save";
    readonly trigger: "end_of_target_turn";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onSuccess: Effect; // typically remove_condition or spell_end
  }
```

**Option B:** A dedicated `RepeatSaveBreaker` field on `ActivationMechanics` (since it always accompanies the initial save and uses the same ability/DC).

**Option C:** Extend `Duration` with a `repeat_save_breaker` sub-field that attaches to `timed` duration spells.

Option C is narrowest (single-source-of-truth for duration + save break), but Option A aligns better with the phase-sequencing graph model in the tracer. Recommend Option B or C to avoid requiring the tracer to handle an implicit "after initial phase, loop" subgraph.

---

## Widening 4 — Caster-choice-of-condition mechanic

**Current state:** No surface type models "caster picks one of N conditions at cast time."

The spell applies blinded **or** deafened at the caster's discretion, not randomly or conditionally. This is a cast-time authorial choice that must be bound to the effect.

**Option A:** Add a `ChoiceEffect` variant:
```typescript
export type ChoiceEffect = {
  readonly kind: "caster_choice";
  readonly options: ReadonlyArray<Effect>;
};
```

**Option B:** Make `ApplyConditionEffect.condition` accept a union or array:
```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition | ReadonlyArray<Condition>; // array = caster picks one
};
```

Option A is more honest about the semantics (a true choice node in the graph). Option B is simpler but overloads the condition field. Either would unlock encoding.

---

## What fits today

With the above widenings resolved, the spell fits cleanly as an `activation` spell with:
- Phase 1: `save_gate` (CON, caster spell save DC) → onFail: `apply_condition` (blinded or deafened, caster choice)
- Phase 2 (new): `repeat_save` at end of target's turn → onSuccess: spell ends / condition removed
- Attachment: `target`, `choose_up_to` with `SlotScaling` (+1 per slot above 2)
- Duration: `timed` (1 minute)

The slot-scaling for target count already fits `SlotScaling<number>` from Bless.
