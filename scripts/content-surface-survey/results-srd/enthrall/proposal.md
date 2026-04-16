# Proposal: Surface widenings required for Enthrall

## Unit

**Enthrall** — SRD 5.2.1, Level 2 Enchantment spell.

## Outcome

`surface_widening` — all needed v4 atoms already exist; three surface type shapes need widening.

## Why the unit cannot be encoded today

Enthrall's mechanics decompose as:

1. Cast (Action) → save gate (Wisdom) against multiple uncapped targets within 60 ft.
2. On fail: apply -10 penalty to Wisdom (Perception) checks and Passive Perception for 1 minute (timed, not concentration).
3. On success: nothing.

Three surface types block honest encoding.

---

### Gap 1 — `TargetSelection` has no uncapped mode

**Current shape:**
```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> };
```

**Problem:** Enthrall says "creatures of your choice that you can see within range" — no count is stated. Using `choose_up_to` would require inventing a `count` value not in the SRD text, which violates the honesty guardrail.

**Proposed addition:**
```typescript
| { readonly mode: "any" }
```

Meaning: any number of valid targets within range, chosen by the caster at cast time. No slot-scaled count. Other unbounded-target spells (e.g. Bless at certain configurations, Entangle) may reuse this.

---

### Gap 2 — `RollKind` has no `"ability_check"` variant

**Current shape:**
```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

**Problem:** The on-fail penalty is to Wisdom (Perception) checks — an ability check. Neither existing variant applies. Without `"ability_check"` the `modify_roll_numeric` atom cannot be correctly typed for skill-check modifiers.

**Proposed addition:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

This opens the door for future spells and features that impose check penalties or bonuses (Bane already partially exercises this for saving throws; Enthrall is the first pressure case for ability checks).

---

### Gap 3 — `Effect` in `ActivationPhase` cannot express a roll-modifier result

**Current shape:**
```typescript
export type Effect = DamageEffect | NoneEffect;
```

**Problem:** The on-fail result of Enthrall is not damage — it is a numeric penalty to a roll kind. The v4 atom `modify_roll_numeric` covers this, and a tracer-side `effect` node of this kind already exists in `OngoingOperation`, but the `Effect` union used by `ActivationPhase.onFail` / `onSuccess` only carries damage or nothing.

**Proposed addition:**
```typescript
export type ModifyRollNumericEffect = {
  readonly kind: "modify_roll_numeric";
  readonly on: ReadonlyArray<RollKind>;
  readonly delta: number;           // signed integer; -10 for Enthrall
};

export type Effect = DamageEffect | NoneEffect | ModifyRollNumericEffect;
```

Using a plain `number` delta (not `DiceDelta`) because Enthrall's penalty is a fixed integer, not a dice expression. `DiceDelta` (dice + dieSize + sign) is appropriate for roll-adding effects like Bless; a signed integer is appropriate for flat numeric modifiers.

---

### Secondary note — save eligibility filter

Enthrall auto-succeeds for creatures in combat with the caster or companions. This is a **targeting predicate** on the save, not a new atom. It does not block encoding (the penalty still applies to the remaining targets), but the surface will need a mechanism to express "auto-success condition" on a save gate if future encoding requires it. Treating it as an authoring note for now; it does not change the outcome classification.

---

## Summary of proposed widenings

| # | Location | Change |
|---|----------|--------|
| 1 | `TargetSelection` | Add `{ mode: "any" }` variant |
| 2 | `RollKind` | Add `"ability_check"` literal |
| 3 | `Effect` | Add `ModifyRollNumericEffect` variant using v4 atom `modify_roll_numeric` |

All three use atoms already in the v4 taxonomy. No new atom is proposed.
