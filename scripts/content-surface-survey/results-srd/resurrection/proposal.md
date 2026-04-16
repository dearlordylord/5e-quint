# Proposal: Resurrection — structural_widening

## Unit

- **Name**: Resurrection
- **Slug**: resurrection
- **Level**: 7 (Necromancy)
- **Provenance**: srd-5.2.1

## Outcome

`structural_widening` — the primary gap is a missing activation phase family shape (no direct-effect phase), not merely a missing atom.

---

## Gap 1 — No direct-effect activation phase (structural)

**The blocker.** `ActivationPhase` is currently `attack_roll | save_gate`. Resurrection applies its effects unconditionally to a touched, dead creature: no attack roll, no saving throw, no resolution gate of any kind. There is no honest phase variant for this.

Minimum new variant needed:

```typescript
| {
    readonly kind: "direct_effect";
    readonly attachment: Attachment;
    readonly effects: ReadonlyArray<Effect>;
  }
```

This shape recurs across the resurrection spell family (Raise Dead, Revivify, True Resurrection) and any other instantaneous spell that fires effects unconditionally on a valid target.

---

## Gap 2 — `heal_hp` absent from spell `Effect` union (surface_widening)

`HealHpEffect` exists for class features but the spell `Effect` union is `DamageEffect | NoneEffect`. Resurrection restores **all** Hit Points. Lifting `HealHpEffect` (or a superset) into the spell Effect union is required.

A secondary question: "all Hit Points" is not a fixed dice expression — it equals the target's current maximum HP. This may need a new `DiceAmount` variant or a special sentinel value (`{ kind: "all_hp" }`).

Evidence: *"The creature returns to life with all its Hit Points."*

---

## Gap 3 — `remove_condition` / `cleanse` absent from spell `Effect` union (surface_widening)

The v4 atom `remove_condition` exists but is not in the spell Effect union. Resurrection neutralizes poisons and restores missing body parts (a body-restoration effect that has no atom at all).

Evidence: *"This spell also neutralizes any poisons that affected the creature at the time of death. This spell closes all mortal wounds and restores any missing body parts."*

---

## Gap 4 — Decaying numeric penalty with per-rest step-down (atom_widening)

The target receives a −4 penalty to D20 Tests that decays by 1 each Long Rest until it reaches 0. Two sub-problems:

1. **No rest-based decay lifecycle.** `modify_roll_numeric` has no step-down schedule. The closest lifecycle is `persist → expire`, but expire fires once at a fixed time — it cannot model a per-rest decrement.

2. **RollKind is too narrow.** "D20 Tests" covers attack rolls, saving throws, AND ability checks. The current `RollKind` union is `"attack_roll" | "saving_throw"` — ability checks are absent.

Sketch of the needed shape:

```typescript
export type DecayingRollPenalty = {
  readonly kind: "modify_roll_numeric_decaying";
  readonly initialDelta: number;       // -4
  readonly decayPerRest: number;       // 1 (reduction per rest)
  readonly restKind: RestKind;         // "long"
  readonly on: ReadonlyArray<RollKind>; // ["attack_roll", "saving_throw", "ability_check"]
};
```

Evidence: *"The target takes a −4 penalty to D20 Tests. Every time the target finishes a Long Rest, the penalty is reduced by 1 until it becomes 0."*

---

## Gap 5 — Post-cast caster-state penalty (atom_widening / new_subgraph)

If the target was dead ≥ 365 days, the caster suffers until their next Long Rest:
- Cannot cast spells
- Has Disadvantage on all D20 Tests

Three novel dimensions simultaneously:

| Dimension | Gap |
|---|---|
| Effect target | Applied to the **caster**, not the spell's attachment target |
| Condition gate | Fired only if a property of the target (time since death) meets a threshold |
| Effect kind | "Block spell casting" — no existing effect atom covers this |

This is the most novel mechanical shape in the survey to date. It resembles an `anchored_trigger` (conditional release) but fires on the caster rather than planting a trigger on the environment. No existing subgraph covers it.

Evidence: *"Casting this spell to revive a creature that has been dead for 365 days or longer taxes you. Until you finish a Long Rest, you can't cast spells again, and you have Disadvantage on D20 Tests."*

---

## Summary of required changes before encoding

| Priority | Gap | Classification |
|---|---|---|
| 1 | `direct_effect` activation phase | structural_widening |
| 2 | `heal_hp` in spell Effect union | surface_widening |
| 3 | `remove_condition` / body-restore in spell Effect union | surface_widening |
| 4 | Decaying numeric penalty with per-rest step-down | atom_widening |
| 4b | `ability_check` in RollKind | surface_widening |
| 5 | Post-cast caster-state impairment (conditional on target property) | atom_widening / new_subgraph |
