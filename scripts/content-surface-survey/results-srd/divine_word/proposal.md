# Proposal: Divine Word widening requirements

**Outcome:** `atom_widening`  
**Unit:** Divine Word (level 7 Evocation, Bonus Action, instantaneous)

## Why encoding fails

Divine Word cannot be honestly encoded. The blocking issues are ordered by severity below.

---

## 1. HP-threshold conditional subgraph (atom_widening — new subgraph)

**The problem.** Divine Word's save-failure branch is not a single effect — it is a table of effects conditioned on the target's *current HP at cast time*:

| HP range | Effect |
|---|---|
| 0–20 | Instant death |
| 21–30 | Blinded + Deafened + Stunned (1 hour) |
| 31–40 | Blinded + Deafened (10 minutes) |
| 41–50 | Deafened (1 minute) |
| > 50 | No HP-gated effect |

No existing surface type models this. The `ActivationPhase.save_gate` only supports two branches (`onFail: Effect`, `onSuccess: Effect`), where `Effect` is `DamageEffect | NoneEffect`. There is no HP-predicate resolution in v4's resolution atoms.

**Required widening.** A new subgraph: `hp_threshold_gate` — a resolution node that reads the target's current HP and routes to one of N tier-effects. It would attach to the save gate's `onFail` branch:

```
save_gate --branches_on_save--> on_fail
on_fail --opens_window--> hp_threshold_gate
hp_threshold_gate --[tier 0-20]--> kill
hp_threshold_gate --[tier 21-30]--> apply_condition(blinded+deafened+stunned, 1hr)
...
```

---

## 2. Instant kill atom (atom_widening)

**The problem.** The 0–20 HP tier causes unconditional death ("The target dies"). This is not damage — there is no dice roll, no HP deduction. It is a direct state transition from alive to dead. No v4 effect atom covers this. `damage` is semantically incorrect (it implies a roll and HP pool subtraction).

**Required widening.** New v4 effect atom: `kill` (or `reduce_to_0_hp`). Maps to: target's HP becomes 0, death-save or death triggers immediately.

---

## 3. Creature-type predicate (atom_widening)

**The problem.** The secondary effect — planar banishment — applies *regardless of HP* but only to Celestials, Elementals, Fey, and Fiends. There is no creature-type concept anywhere in the v4 atom inventory or the surface type system. No filter, predicate, or restriction atom can express "applies only to [creature type list]."

**Required widening.** New concept: creature-type predicate (filter or gate). Could be modeled as:
- A new `Filter` type on `Attachment` or `Effect` (`creature_type_includes: [...types]`)
- Or a new resolution atom that gates an effect branch on creature type

This would be needed to cleanly scope the `transport_exile` effect to the four affected creature types.

---

## 4. Open-ended multi-target selection (surface_widening)

**The problem.** Divine Word targets "each creature of your choice in range" with no upper bound. The existing `TargetSelection` only has:
- `{ mode: "one" }` — single target
- `{ mode: "choose_up_to", count: SlotScaling<number> }` — bounded by a scaling count

There is no `any_chosen_in_range` or unlimited-multi-target mode.

**Required widening.** New `TargetSelection` variant:
```typescript
| { readonly mode: "any_chosen_in_range" }
```

---

## 5. `apply_condition` as spell Effect with duration (surface_widening)

**The problem.** The HP-tier effects apply standard conditions with timed durations. The spell `Effect` union is `DamageEffect | NoneEffect`. The `apply_condition` atom exists in v4 and appears in mastery `SaveGateRiderResult`, but:
1. It is absent from the spell `Effect` union entirely.
2. It has no duration field (mastery conditions are tied to rider expiry, not a timed DurationValue).

**Required widening.** Add `apply_condition` variant to `Effect`:
```typescript
| {
    readonly kind: "apply_condition";
    readonly conditions: ReadonlyArray<Condition>;
    readonly duration: DurationValue;
  }
```

---

## 6. Condition type widening (surface_widening)

**The problem.** The `Condition` type is `"prone"` only. Divine Word applies `blinded`, `deafened`, and `stunned` — all standard SRD conditions.

**Required widening.** Extend `Condition`:
```typescript
export type Condition = "blinded" | "deafened" | "prone" | "stunned";
```
(Further conditions — paralyzed, frightened, etc. — will be needed by other units.)

---

## 7. `transport_exile` as spell Effect (surface_widening)

**The problem.** The planar banishment maps cleanly to v4's `transport_exile` atom, but that atom is not a variant of the spell `Effect` union.

**Required widening.** Add `transport_exile` variant to `Effect`:
```typescript
| {
    readonly kind: "transport_exile";
    readonly destination: "plane_of_origin";
    readonly returnBarrierDuration: DurationValue;
    readonly returnBarrierException?: string; // e.g., "wish"
  }
```

---

## Summary of widening graph

```
save_gate [phase 1]
├── onFail →
│   ├── hp_threshold_gate [NEW ATOM]         -- if HP ≤ 50
│   │   ├── tier 0-20  → kill [NEW ATOM]
│   │   ├── tier 21-30 → apply_condition(blinded+deafened+stunned, 1hr) [NEW VARIANT]
│   │   ├── tier 31-40 → apply_condition(blinded+deafened, 10min)
│   │   └── tier 41-50 → apply_condition(deafened, 1min)
│   └── creature_type_gate [NEW ATOM]        -- if Celestial|Elemental|Fey|Fiend
│       └── transport_exile(plane_of_origin, 24hr) [NEW VARIANT in Effect]
└── onSuccess → none
```

The unit requires two new atoms (`hp_threshold_gate`, `kill`), one new predicate atom (`creature_type_predicate`), and four surface widenings. None of these can be approximated with existing shapes without producing a knowingly false trace.
