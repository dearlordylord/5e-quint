# Proposal: surface_widening — Preserve Life (cleric L3)

## Unit

**Name:** Preserve Life (cleric L3)  
**Slug:** `cleric_preserve_life_l3`  
**Kind:** class_feature  
**Provenance:** srd-5.2.1 — Classes/Cleric#Level 3: Preserve Life

## Source text

> As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.

## Why honest encoding fails

The unit is a `class_feature` / `activation` family — correct `UnitRecord` kind and payload family exist. The tracer would handle it. However five surface shapes required to encode the mechanics are missing from `types.ts`. Writing the Dhall would force at least one of:
1. A typecheck failure (missing activation cost variant), or
2. A dishonest trace (wrong target model, wrong scaling expression, missing filter, missing cap).

Both outcomes are disallowed by the guardrails.

## Gap 1 — `ClassFeatureActivationCost` missing `action` variant

**Current surface:**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

**What's needed:** `{ readonly kind: "action" }` (or `"magic"` matching the SRD action kind).

Preserve Life explicitly costs the turn's Action ("As a Magic action"). This is not `free` (which means the feature fires without consuming any action quota) and not `bonus_action`. Without this variant the `activationCost` field cannot be encoded honestly and typecheck will reject any valid JSON for this field.

**Pressure evidence:** "As a Magic action, you present your Holy Symbol…"

---

## Gap 2 — `HealHpEffect` only supports single-target, fixed-amount heal

**Current surface:**
```typescript
export type HealHpEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

**What's needed:** A pool-allocation heal variant — the feature generates a total HP budget that the player distributes freely across N chosen targets (subject to Gaps 4 and 5).

The current shape says: "roll/compute an amount, apply it to one creature." Preserve Life's mechanic is: "compute a pool (5 × level), then divide the pool among multiple creatures." These are mechanically distinct:
- The amount is a *budget* shared across targets, not a per-target fixed roll.
- The number of targets is variable and unconstrained (any number of eligible creatures).
- Allocation is player-chosen, making it a non-deterministic split — not expressible as N independent `heal_hp` atoms without a pool-binding parent node.

A new effect variant (e.g., `heal_hp_pool`) would need to carry: `total_pool: DiceAmount`, `target_selection: multi`, `allocation: player_chosen`.

**Pressure evidence:** "…divide those Hit Points among them."

---

## Gap 3 — `DiceAmount` / `DiceExpr` cannot express a purely flat scalar

**Current surface:** `DiceExpr` requires `dice: number` and `dieSize: number` (non-optional). The closest honest encoding would be `{ dice: 0, dieSize: 1, flat: 0 }` as base with `linear_per_level { axis: "class", perLevel: { flat: 5 }, startingAtLevel: 1 }`. But `0d1` is semantically nonsense — it evaluates to zero with no randomness.

**What's needed:** Either:
- A `{ kind: "flat_per_level"; axis: LevelAxis; perLevel: number; startingAtLevel: number }` variant of `DiceAmount`, or
- Allow `DiceExpr` with `dice: 0` as a canonical flat-only expression (currently nothing enforces non-zero, but the intent is clear from every existing use).

**Pressure evidence:** "…restore a number of Hit Points equal to five times your Cleric level." (no dice in the formula)

---

## Gap 4 — No targeting predicate for "Bloodied" (≤ half HP) creatures

The target selection must be restricted to Bloodied creatures (those at or below half their maximum HP). The surface has no `TargetFilter` concept. `TargetSelection` in `types.ts` only controls *count* (one vs. choose_up_to with scaling), not *eligibility*.

**What's needed:** A `TargetFilter` or eligibility predicate shape, at minimum `{ kind: "bloodied" }` (below half HP). This would attach to the multi-target selection to gate which creatures are choosable.

This is a new concept at the surface layer — no existing shape can carry it. At the v4 atom layer, the closest atom might be `condition_progression` or a custom eligibility window, but the taxonomy doesn't name one for HP-threshold filtering on targeting. The missing piece is primarily a surface shape gap.

**Pressure evidence:** "Choose Bloodied creatures within 30 feet of yourself…"

---

## Gap 5 — No per-target heal cap in `HealHpEffect`

The heal to any individual creature is capped at half its HP maximum. No field exists in `HealHpEffect` (or any effect type) to express a cap relative to a creature's stats.

**What's needed:** A `cap` field on `HealHpEffect` (or the pool variant from Gap 2), e.g.:
```typescript
cap?: { kind: "half_max_hp" }
```

**Pressure evidence:** "This feature can restore a creature to no more than half its Hit Point maximum."

---

## Classification and remediation priority

| Gap | Classification | Blocking |
|-----|---------------|---------|
| `action` activation cost variant | surface_widening | typecheck |
| Multi-target pool heal variant | surface_widening | honest trace |
| Flat-scalar `DiceAmount` | surface_widening | honest trace |
| Bloodied target filter | surface_widening | honest trace |
| Per-target heal cap | surface_widening | honest trace |

All five are **surface_widening** — the v4 atoms involved (`heal`, `class_feature_root`, `use_count`, `activate`) all exist. The gaps are in `ClassFeatureActivationCost`, `HealHpEffect`, and `DiceAmount` surface shapes, not in the atom taxonomy.

Suggested resolution order:
1. Add `{ kind: "action" }` to `ClassFeatureActivationCost` — unblocks many other class features that use an Action.
2. Introduce a flat-scalar path in `DiceAmount` — broadly useful (several features use flat math, no dice).
3. Introduce a `HealHpEffect` pool variant with `total_pool`, `target_count: "variable"`, `allocation: "player_chosen"`.
4. Add `TargetFilter` to target selection (Bloodied + potentially other threshold predicates).
5. Add `cap: { kind: "half_max_hp" }` to the heal effect.
