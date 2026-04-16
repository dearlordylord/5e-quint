# Proposal: Hold Monster surface widenings

## Unit

Hold Monster — Level 5 Enchantment (SRD 5.2.1)

## Summary

Hold Monster almost fits the `activation` family with a single `save_gate` phase. Two surface gaps block honest encoding.

---

## Gap 1 — `Condition` type too narrow

**Current:**
```typescript
export type Condition = "prone";
```

**Required:** Add `"paralyzed"` (and likely `"stunned"`, `"charmed"`, `"frightened"` etc. as other spells land).

**Evidence:** *"The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration."*

**Classification:** `surface_widening` — new variant of existing type. No new v4 atom needed; `apply_condition` already exists.

**Minimal fix:**
```typescript
export type Condition = "prone" | "paralyzed";
```

---

## Gap 2 — No repeat-save escape-hatch subgraph

**Problem:** The spell grants the target a repeated WIS save at the end of each of its turns; on success the spell ends. This is the standard SRD pattern for "save-ends" conditions (Hold Person, Hold Monster, Stunned from Monk, etc.). The v4 atom `repeat_save` is already in the inventory as a resolution atom, but there is no surface type that:

1. Places a `repeat_save` resolution on the affected creature's turn boundary, and  
2. Wires that resolution so that on success the condition is removed and the spell expires.

The closest existing surface shape is `ActivationPhase`, but neither `attack_roll` nor `save_gate` variants carry a "recur at end of target's turn" lifecycle hook.

**Evidence:** *"At the end of each of its turns, the target repeats the save, ending the spell on itself on a success."*

**Classification:** `surface_widening` — the required atom (`repeat_save`) is already in v4. What is missing is a surface type that connects it to an applied condition with a self-break lifecycle.

**Proposed surface shape (sketch):**

One approach: extend `SaveGateRiderResult` (mastery) / `Effect` (spell) with an `apply_condition_with_repeat_save` effect that bundles:
- the condition applied on fail
- the repeat_save resolution (axis: target's turn end)
- the break result on success (remove condition + end spell)

```typescript
// New effect variant for save-ends conditions
export type ApplyConditionWithRepeatSaveEffect = {
  readonly kind: "apply_condition_with_repeat_save";
  readonly condition: Condition;
  readonly repeatSave: {
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly fireTiming: "end_of_target_turn";
    readonly onSuccess: "remove_condition_and_end_spell";
  };
};
```

A simpler alternative: add `repeat_save` as a new `ActivationPhase` kind that fires once per target turn, with `onSuccess` ending the spell and `onFail` maintaining the condition — but this would require threaded-phase semantics the current tracer doesn't support.

**Recommended approach:** Bundle it into the condition effect as above, so the `activation` family's existing `save_gate` phase + `onFail` effect carries both the immediate condition and its per-turn escape hatch in one composable atom.

---

## What does fit without widening

- `activation` family with `save_gate` phase
- `attachment: target, mode: choose_up_to` with `SlotScaling<number>` (handles the +1 target per slot above 5 higher-level scaling)
- `concentration` duration with `upTo: 1 minute`
- `action_quota`, `spell_slot ≥ 5`, `concentration_lock`, `concentrate`, `expire`

All header fields (range, components, school, level) encode without changes.

---

## Priority

Both widenings are moderate-pressure: the `Condition` widening is high-confidence (multiple spells will need it), and the `repeat_save` subgraph is high-confidence (Hold Person is an identical pattern; Power Word Stun uses the same escape hatch).
