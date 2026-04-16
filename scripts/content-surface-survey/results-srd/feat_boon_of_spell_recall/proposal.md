# Proposal: Boon of Spell Recall — Widening Required

**Outcome:** `structural_widening`
**Slug:** `feat_boon_of_spell_recall`

---

## Why the unit cannot be encoded

### Gap 1 — No `FeatRecord` in `UnitRecord` (structural)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `feat` kind. The v4 taxonomy lists `feat_root` as a source atom, but the surface has never been extended to include a `FeatRecord` type. This is the primary blocker: the unit cannot be represented in the authored surface at all.

---

### Gap 2 — No passive spell-cast trigger family

Even with a `FeatRecord`, the **Free Casting** mechanic fires passively on every eligible spell cast. The caster does not activate it; it fires automatically whenever a level 1–4 spell slot is expended.

The existing `ClassFeatureActivationMechanics` family requires explicit activation with a cost (`free` or `bonus_action`). The mastery `OnHitTriggerMechanics` family is a closer pattern — it fires passively on a weapon hit — but it is mastery-specific and keyed to `attack_roll` resolution.

What is needed: a **passive spell-cast trigger family** for feats (and potentially class features), analogous to `on_hit_trigger` but keyed to `spell_cast_window`. Suggested name: `on_spell_cast_trigger`.

---

### Gap 3 — No probabilistic roll-against-parameter check (surface widening)

The check is:

> Roll 1d4. If the number you roll is **the same as the slot's level**, the slot isn't expended.

This is a new resolution shape: roll a die, compare the result to a **runtime integer parameter** (the slot level used). It is not:
- `save_gate` (ability check, fixed or weapon-attack DC, target is a creature)
- `attack_roll` (vs AC)
- Any existing `ActivationPhase` variant

Proposed new resolution shape: `probabilistic_match_check` — a resolution that rolls a specified die and compares the result to a specified runtime parameter. Variants would need to express:
- Die expression to roll (`1d4` here)
- The parameter to match against (`slot_level` here, bounded `1–4`)
- On-match effect vs on-no-match effect (null in this case — the check is one-sided)

This is `surface_widening` within the resolution family.

---

### Gap 4 — No conditional slot refund effect (surface widening)

On a successful probabilistic check, the slot is not expended. The v4 taxonomy lists `refund` as a procedure atom, but `types.ts` has no surface type for it in any effect union. The existing effect atoms (`damage`, `heal`, `grant_extra_action`, etc.) do not cover resource refund.

Proposed: a `refund_spell_slot` effect variant (or a generic `refund` effect with a resource discriminant), emitted when the probabilistic check succeeds.

---

## Ability Score Increase sub-feature

The feat also grants +1 to Int, Wis, or Cha (max 30). This is character-progression metadata — `modify_ability_score` is explicitly deferred in TAXONOMY §12 ("out-of-scope for the core mechanics graph"). It is not a widening pressure from this unit specifically.

---

## Proposed widening summary

| Priority | Kind | Name | Justification |
|---|---|---|---|
| 1 (blocker) | `new_subgraph` | `FeatRecord` + feat payload families | No `feat` kind in `UnitRecord` |
| 2 | `new_subgraph` | `on_spell_cast_trigger` payload family | Passive per-cast trigger with no activation cost |
| 3 | `new_variant` | `probabilistic_match_check` resolution | Roll vs runtime parameter, no existing shape |
| 4 | `new_variant` | `refund_spell_slot` effect | Conditional resource refund, no existing surface atom |

---

## Graph sketch (if widened)

```
feat_root
  └─ roots ──▶ on_spell_cast_trigger
                 ├─ consumes ──▶ spell_slot (level 1–4)
                 └─ opens_window ──▶ spell_cast_window
                                       └─ grants ──▶ probabilistic_match_check
                                                       ├─ roll: 1d4
                                                       ├─ match_against: slot_level
                                                       └─ on_match ──▶ refund_spell_slot
                                                                          └─ attaches_to: spell_slot
```

The Ability Score Increase does not appear in the graph (deferred as character-progression metadata per TAXONOMY §12).
