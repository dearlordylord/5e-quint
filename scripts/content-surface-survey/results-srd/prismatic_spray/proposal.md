# Proposal: Prismatic Spray surface widenings

**Unit:** `prismatic_spray` (Spell, Level 7, Evocation, SRD 5.2.1)  
**Outcome:** `surface_widening`  
**Blockers:** 4 (all new variants of existing surface types; no new v4 atoms required)

---

## Spell overview

Prismatic Spray fires eight simultaneous rays from the caster into a 60-foot Cone. Every creature in the Cone makes a single Dexterity saving throw, and then **per creature** the DM rolls 1d8 to determine which of eight rays hits that creature. The ray then applies its specific effect, most of which also use the initial Dex save result.

The ray table:

| d8 | Ray | Fail | Success |
|----|-----|------|---------|
| 1 | Red | 12d6 Fire | Half damage |
| 2 | Orange | 12d6 Acid | Half damage |
| 3 | Yellow | 12d6 Lightning | Half damage |
| 4 | Green | 12d6 Poison | Half damage |
| 5 | Blue | 12d6 Cold | Half damage |
| 6 | Indigo | Restrained + counted Con saves (3 fail → Petrified) | — |
| 7 | Violet | Blinded + one Wis save at start of caster's next turn (fail → different plane) | — |
| 8 | Special | Roll twice, rerolling 8s | — |

---

## Blocker 1: Per-target random table (primary blocker)

**What the spell requires:** "For each target, roll 1d8 to determine which color ray affects it." Each creature in the 60-foot Cone is independently assigned a ray via a separate die roll.

**What the surface provides:** The `random_table` `ActivationPhase` has no `attachment` field:

```typescript
| {
    readonly kind: "random_table";
    readonly roll: RandomTableRoll;
    readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
  }
```

Without an attachment, this is a single global roll whose single outcome applies to a single unscoped resolution context. There is no way to express "repeat this roll independently for each creature in the area."

**Proposed widening:** Add an optional `attachment` field to `random_table` ActivationPhase, mirroring `save_gate` and `attack_roll`:

```typescript
| {
    readonly kind: "random_table";
    readonly attachment: Attachment;   // NEW
    readonly roll: RandomTableRoll;
    readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
  }
```

When `attachment` is an area, the tracer would emit one `random_table` resolution node per creature in the area at resolution time. This is the same scoping model already used by `save_gate` with area attachments (e.g. Fireball, Cone of Cold).

---

## Blocker 2: Indigo ray — counted-outcome repeat save

**What the spell requires:** The target makes a Con save at the end of each of its turns. The results are tracked independently in two counters:
- 3 cumulative successes → Restrained condition ends (freed)
- 3 cumulative failures → Petrified permanently (until Greater Restoration or similar)
- Counters are non-consecutive (e.g. S, F, S, F, S = freed on the fifth save)

**What the surface provides:** `RepeatSaveSpec`:

```typescript
export type RepeatSaveSpec = {
  readonly cadence: "end_of_target_turn" | "on_target_takes_damage";
  readonly onSuccess: "ends_on_target";
  readonly onFailAgain?: EffectAtom;
};
```

`onSuccess: "ends_on_target"` is a single-success terminal — it ends the effect the first time the target succeeds. The Indigo ray requires 3 successes. There is no counter field, no separate failure counter, and no per-threshold effect on either side.

**Proposed widening:** New `RepeatSaveSpec` variant for counted-threshold outcomes:

```typescript
| {
    readonly cadence: "end_of_target_turn" | "on_target_takes_damage";
    readonly onSuccess: {
      readonly kind: "counted";
      readonly threshold: number;      // 3 for Indigo
      readonly effect: EffectAtom;     // remove_condition restrained
    };
    readonly onFail: {
      readonly kind: "counted";
      readonly threshold: number;      // 3 for Indigo
      readonly effect: EffectAtom;     // apply_condition petrified (permanent)
    };
  }
```

The counters accumulate independently; whichever reaches its threshold first resolves its effect and ends the repeat-save window.

---

## Blocker 3: Violet ray — one-shot deferred save at start of caster's next turn

**What the spell requires:** On a failed initial Dex save, the target gains the Blinded condition and then makes a **one-shot** Wisdom saving throw at the **start of the caster's next turn**. On failure, Blinded ends AND the creature is transported to another plane (DM's choice).

**Two sub-issues:**

### 3a: Cadence = start of caster's next turn (one-shot)

`RepeatSaveSpec.cadence` options are `"end_of_target_turn"` and `"on_target_takes_damage"`. The Violet ray fires at the **start of the caster's** (not target's) next turn.

`OngoingTrigger` already has `on_caster_turn_start`, but that belongs to the `ongoing_effect` spell family. Prismatic Spray is instantaneous — switching to `ongoing_effect` family would be dishonest.

The deferred one-shot save on the caster's turn also has no analog in `RepeatSaveSpec` (which implies indefinite repetition until a terminal condition).

**Proposed widening:** Add `start_of_caster_next_turn` to `RepeatSaveSpec.cadence` plus a `oneShotOnly: true` flag (or a dedicated variant) to express "fire exactly once on the named trigger":

```typescript
readonly cadence:
  | "end_of_target_turn"
  | "on_target_takes_damage"
  | { readonly kind: "start_of_caster_next_turn"; readonly oneShotOnly: true };  // NEW
```

### 3b: On failure — transport to another plane (DM's choice)

`ExileDestination` includes `"different_plane"` which covers "another plane of existence." The DM's-choice framing is DM agenda, not core mechanics — the surface can record the destination as `"different_plane"` without needing to express which plane. This sub-issue resolves cleanly against the existing surface once the cadence blocker is addressed.

---

## Blocker 4: Outcome 8 — roll-twice meta-outcome

**What the spell requires:** "The target is struck by two rays. Roll twice, rerolling any 8." Outcome 8 is not itself an effect — it is a directive to resolve the table twice more for the same target, excluding this meta-entry, and apply both results.

**What the surface provides:** `RandomTableOutcome.phases` is `ReadonlyNonEmptyArray<ActivationPhase> | undefined`. A nested `random_table` phase would be an independent new roll on a new table definition — it cannot reference the enclosing table, cannot enforce "reroll 8", and cannot compose two results together for a single target.

**Proposed widening:** New `RandomTableOutcome` variant for meta-roll directives:

```typescript
| {
    readonly min: number;
    readonly max: number;
    readonly label: string;
    readonly rollAgain: {
      readonly kind: "same_table";
      readonly count: number;         // 2 for Prismatic Spray
      readonly rerollValues: ReadonlyNonEmptyArray<number>;  // [8]
    };
  }
```

The tracer emits this as a self-referential `random_table` node rather than spawning new independent table definitions.

---

## Summary

All four widenings are new variants of existing surface types. The v4 atom inventory (damage, apply_condition, transport_exile, repeat_save, random_table) already covers the underlying mechanics of every ray; the gaps are in the surface-level grammar for composing those atoms in this spell's specific structure.

| Blocker | Classification | Surface type |
|---------|---------------|--------------|
| Per-target random table | `surface_widening` | `ActivationPhase` (random_table) |
| Indigo counted save | `surface_widening` | `RepeatSaveSpec` |
| Violet one-shot caster-turn save | `surface_widening` | `RepeatSaveSpec.cadence` |
| Roll-twice meta-outcome | `surface_widening` | `RandomTableOutcome` |
