# Proposal: Fighter Survivor L18 — Surface Gaps

**Outcome**: `atom_widening` (contains a `surface_widening` component as well)

## Summary

Survivor is a composite class feature with two named sub-features: **Defy Death** and **Heroic Rally**. The unit does not fit the current surface for three distinct reasons, one of which requires a new v4 atom and two of which require new variants of existing surface types.

---

## Sub-feature 1: Defy Death

### Gap A — Advantage on Death Saving Throws (CLEAN)

> "You have Advantage on Death Saving Throws."

This encodes cleanly as:

```json
{
  "kind": "modify_roll_advantage",
  "mode": "advantage",
  "on": ["death_saving_throw"]
}
```

`death_saving_throw` is already a `RollKind` in the surface. No widening needed here.

### Gap B — 18-20 on a Death Saving Throw counts as 20 (ATOM WIDENING)

> "when you roll 18–20 on a Death Saving Throw, you gain the benefit of rolling a 20 on it"

**Why no existing atom covers this:**

- `modify_crit_range` lowers the critical-hit threshold on attack rolls (`threshold: 19` = crits on 19–20). This is structurally similar, but attack crits and death save natural-20 results are entirely distinct SRD concepts:
  - An attack crit doubles damage dice.
  - A death save natural 20 causes the character to immediately regain 1 HP (SRD Rules Glossary: "Regaining Consciousness").
- Using `modify_crit_range` here would be a false trace: the atom name, its semantics, and its tracer label all describe attack roll behavior.

**Proposed new atom**: `modify_death_save_threshold`

```typescript
{
  readonly kind: "modify_death_save_threshold";
  // Rolls at or above this value on a death saving throw are treated
  // as a natural 20 (i.e., the character regains 1 HP immediately).
  readonly superSuccessThreshold: number;
}
```

Alternatively, this could be modeled as a new variant on `modify_crit_range` with an explicit `rollKind` field, but that conflates attack-crit semantics with death-save semantics in the atom name and existing tracer path.

---

## Sub-feature 2: Heroic Rally

### Gap C — Turn-start trigger in a passive class feature (SURFACE WIDENING)

> "At the start of each of your turns, you regain Hit Points…"

**Why it doesn't fit:**

`PassiveOperation` is the mechanism for "always-on passive class features that repeat on a cadence." Its trigger is:

```typescript
export type PassiveOperation = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  // ...
};
```

Only `elapsed_time` is supported, and only at `hour` or `day` granularity. The SRD's "at the start of your turn" cadence (used by Heroism temp-HP, Aura of Life conditional heal, Spirit Guardians save) is expressible in `OngoingOperation.trigger` (via `on_attached_turn_start`) for **spells**, but that type is not available in `PassiveOperation`.

**Proposed widening**: Add `on_attached_turn_start` (and possibly `on_caster_turn_start`) as valid `PassiveOperation.trigger` variants:

```typescript
export type PassiveOperation = {
  readonly trigger:
    | { readonly kind: "elapsed_time"; readonly unit: "hour" | "day"; readonly amount: number }
    | { readonly kind: "on_attached_turn_start" }
    | { readonly kind: "on_caster_turn_start" };
  readonly predicate?: OngoingPredicate;
  readonly effect: EffectAtom;
};
```

This mirrors the existing `OngoingTrigger` vocabulary already used by spell ongoing operations and avoids duplicating semantics.

### Gap D — Bloodied (relative HP threshold) predicate (SURFACE WIDENING)

> "if you are Bloodied and have at least 1 Hit Point"

**Why it doesn't fit:**

`OngoingPredicate` supports a fixed-integer HP comparison:

```typescript
export type OngoingPredicate = {
  readonly kind: "at_hp_threshold";
  readonly threshold: number;
  readonly comparison: "lte" | "eq" | "gte";
};
```

"Bloodied" is defined in SRD 5.2.1 Rules Glossary as "a creature is Bloodied when it has half its Hit Point maximum or fewer Hit Points remaining." This is a **relative** threshold (50% of max HP), not a fixed integer. `at_hp_threshold: { threshold: 0, comparison: "gte" }` would not correctly express this.

**Proposed widening**: Add a `bloodied` predicate variant:

```typescript
export type OngoingPredicate =
  | {
      readonly kind: "at_hp_threshold";
      readonly threshold: number;
      readonly comparison: "lte" | "eq" | "gte";
    }
  | {
      // SRD Rules Glossary: HP <= half of HP maximum.
      readonly kind: "bloodied";
    };
```

`at_hp_threshold` with a ratio variant (e.g. `threshold: 0.5, unit: "fraction_of_max"`) is an alternative, but `bloodied` is a first-class SRD concept with its own glossary entry and should be named directly.

---

## Heal Amount

For completeness: the heal amount "5 plus your Constitution modifier" is expressible with the existing `DiceExpr` shape:

```json
{ "dice": 0, "dieSize": 1, "flat": 5, "abilityModifier": "con" }
```

No widening needed here.

---

## Proposed Encoding (pending widenings)

Once gaps B, C, and D are addressed, the unit would encode as a `composite` class feature:

```json
{
  "kind": "class_feature",
  "id": "fighter_survivor_l18",
  "name": "Survivor",
  "className": "fighter",
  "acquiredAtLevel": 18,
  "mechanics": {
    "family": "composite",
    "parts": [
      {
        "family": "passive",
        "grants": [
          {
            "kind": "modify_roll_advantage",
            "mode": "advantage",
            "on": ["death_saving_throw"]
          },
          {
            "kind": "modify_death_save_threshold",
            "superSuccessThreshold": 18
          }
        ]
      },
      {
        "family": "passive",
        "operations": [
          {
            "trigger": { "kind": "on_caster_turn_start" },
            "predicate": { "kind": "bloodied" },
            "effect": {
              "kind": "heal_hp",
              "amount": {
                "kind": "fixed",
                "expr": { "dice": 0, "dieSize": 1, "flat": 5, "abilityModifier": "con" }
              },
              "target": "self"
            }
          }
        ],
        "grants": []
      }
    ]
  }
}
```

Note: the "at least 1 Hit Point" gate is the SRD's standard death-prevention clause and may be implicitly enforced by the Bloodied predicate (a dead creature at 0 HP is not Bloodied in the active sense). This may not need an additional predicate.
