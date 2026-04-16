# Proposal: Widenings Required for Hypnotic Pattern

## Unit

**Hypnotic Pattern** — Level 3 Enchantment, SRD 5.2.1

## Outcome: `surface_widening`

The unit fits the `activation` / `save_gate` family structurally (area attachment, single-phase WIS save) but cannot be encoded honestly because the `Effect` union does not include condition application.

---

## Gap 1 — `apply_condition` in the spell `Effect` union (BLOCKING)

**Current state:** `Effect = DamageEffect | NoneEffect`

**Missing:** A variant that applies one or more SRD conditions to the target.

**Minimal proposed shape:**
```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly conditions: ReadonlyArray<Condition>;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

**Why the activation family otherwise fits:** The spell is a one-shot area cast (not ongoing in the `ongoing_effect` sense — the save happens at cast time, not repeatedly). The concentration duration keeps the condition alive but does not re-apply the save. This maps cleanly to `activation` → single `save_gate` phase → area attachment → `onFail: ApplyConditionEffect`.

---

## Gap 2 — `Condition` expansion

**Current state:** `export type Condition = "prone";`

**Missing:** `"charmed"` and `"incapacitated"` (and likely `"stunned"`, `"frightened"`, `"paralyzed"`, `"restrained"` as near-term pressure from other enchantment/control spells).

**Minimal extension:**
```typescript
export type Condition =
  | "prone"
  | "charmed"
  | "incapacitated"
  | "stunned"
  | "frightened"
  | "paralyzed"
  | "restrained";
```

---

## Gap 3 — Compound effect: Speed 0 alongside conditions

**Rule text:** "While Charmed, the creature has the Incapacitated condition and a Speed of 0."

The Speed 0 is an additional mechanical effect beyond the conditions. Options:

- Model it as an implicit rider of the charmed application (non-modeled narrative note).
- Add a `modify_speed` effect to the compound apply result. The v4 `modify_speed` atom exists.

Minimal path: include it as a note on `ApplyConditionEffect` or add a companion `modify_speed` effect to the same save branch. The latter is cleaner but requires the `Effect` union to also support `ModifySpeedEffect`:
```typescript
export type ModifySpeedEffect = {
  readonly kind: "modify_speed";
  readonly to: number; // 0 = immobilized
};
```

---

## Gap 4 — Per-target damage break (`self_break` on damage event)

**Rule text:** "The spell ends for an affected creature if it takes any damage..."

This is a per-target `self_break` triggered by a `damage_taken` event on the creature. It is not a concentration break (that would end the spell for everyone) — it is a targeted lifecycle termination.

The v4 `self_break` lifecycle atom exists but the surface has no way to specify the trigger event. Proposed addition to a `SelfBreakCondition` type:

```typescript
export type SelfBreakTrigger =
  | { readonly kind: "damage_taken" }
  | { readonly kind: "action_spent_by_other" };

// Applied to a per-target persist node or concentration lifecycle
export type SelfBreak = {
  readonly kind: "self_break";
  readonly trigger: SelfBreakTrigger;
};
```

This would attach to the concentration lifecycle chain, scoped per-target rather than per-caster.

---

## Gap 5 — Third-party action break

**Rule text:** "...or if someone else uses an action to shake the creature out of its stupor."

A creature other than the caster can spend their Action to end the spell for a specific target. This requires:
- The `action_spent_by_other` trigger above (Gap 4 shape covers it).
- Possibly: the acting creature must be able to touch/reach the affected creature (not currently modeled as a filter predicate).

---

## Recommended widening order

1. **Immediate (blocks Hypnotic Pattern):** Add `ApplyConditionEffect` to `Effect` union + expand `Condition` type.
2. **Near-term (needed for Charm Person, Hold Person, Fear, etc.):** All enchantment/control spells will hit Gap 1–2.
3. **Medium-term:** Per-target `self_break` on damage/action (Gaps 4–5). Multiple enchantment and concentration spells share this pattern (Hold Person, Hypnotic Pattern, Levitate).
4. **Deferred:** `ModifySpeedEffect` (Gap 3) unless a spell's Speed-0 effect is architecturally distinct from condition-implied immobilization.

---

## No false encoding produced

`content/hypnotic_pattern.dhall` and `content/hypnotic_pattern.json` are intentionally absent. Encoding the spell's `onFail` as `{ kind: "none" }` would produce a trace claiming the save has no consequence, which is materially wrong.
