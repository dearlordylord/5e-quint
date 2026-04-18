# Proposal: Periapt of Wound Closure — atom_widening

## Unit

**Periapt of Wound Closure** — Wondrous Item, Uncommon (Requires Attunement)

SRD 5.2.1 section: `MagicItems#Periapt of Wound Closure`

## Encoding status

**Cannot encode.** The passive family and `magic_item` kind fit. Both mechanics are blocked by missing atoms.

---

## Mechanic 1 — Life Preservation (blocked)

> "Whenever you make a Death Saving Throw, you can change a roll of 9 or lower to a 10, turning a failed save into a successful one."

### What is missing

A **conditional roll-floor** atom. The rule guarantees a minimum result of 10 on death saving throws — it does not add a flat bonus; it replaces any sub-threshold result with the floor value.

**Why existing atoms don't cover it:**

- `modify_roll_numeric` — unconditionally adds a signed delta to the roll. A floor of 10 is not equivalent to any flat +N (a character who rolls 1 needs +9; a character who rolls 9 needs +1; a character who rolls 10+ needs nothing). The delta is conditional and variable by construction.
- `modify_roll_advantage` — changes the roll mechanism (roll twice, take higher/lower), not the result value.
- No "minimum result" or "treat as at least N" concept exists in the current surface.

### Proposed widening

```typescript
// New EffectAtom variant:
{
  readonly kind: "modify_roll_floor";
  readonly on: ReadonlyNonEmptyArray<RollKind>;
  // Roll results strictly below this value are treated as this value.
  readonly minimum: number;
}
```

**Tracer atom:** `modify_roll_floor` (new, not in v4).

**Encoding sketch:**
```json
{
  "kind": "modify_roll_floor",
  "on": ["death_saving_throw"],
  "minimum": 10
}
```

---

## Mechanic 2 — Natural Healing Boost (blocked)

> "Whenever you roll a Hit Point Die to regain Hit Points, double the number of Hit Points it restores."

### What is missing

Two missing pieces: a **Hit Die roll trigger** in the passive operation grammar, and a **multiplicative Hit Die recovery effect**.

**Why existing atoms don't cover it:**

- `maximize_healing_received` (Beacon of Hope shape) — maximizes *all* received healing from any source. This mechanic is scoped exclusively to Hit Dice rolled by the bearer during rest recovery. The two concepts are distinct: a Cure Wounds cast on the bearer would not double under the periapt, but would maximize under Beacon of Hope.
- `PassiveOperation.trigger` — only supports `{ kind: "elapsed_time" }`. There is no "on_hit_die_rolled" trigger to attach a per-HD-roll effect.
- `modify_roll_numeric` on a hypothetical "hit_die_roll" roll kind — not a RollKind in the surface, and even if it were, this is a ×2 multiplier, not a flat +N.

### Proposed widening

**New `PassiveOperation` trigger variant:**
```typescript
// Extend OngoingTrigger / PassiveOperation trigger union:
{ readonly kind: "on_hit_die_rolled" }
```

**New EffectAtom variant:**
```typescript
{
  readonly kind: "multiply_hit_die_recovery";
  readonly multiplier: number;  // 2 for "double"
}
```

Alternatively, a single atom that folds both trigger and effect into a passive grant:
```typescript
{
  readonly kind: "modify_hit_die_recovery";
  readonly multiplier: number;
}
```

**Encoding sketch (if trigger + effect separate):**
```json
{
  "operations": [{
    "trigger": { "kind": "on_hit_die_rolled" },
    "effect": { "kind": "multiply_hit_die_recovery", "multiplier": 2 }
  }]
}
```

---

## Honest encoding skeleton (blocked pending widenings)

```json
{
  "kind": "magic_item",
  "id": "magic_item_periapt_of_wound_closure",
  "name": "Periapt of Wound Closure",
  "rarity": "uncommon",
  "requiresAttunement": true,
  "provenance": { "kind": "srd-5.2.1", "section": "MagicItems#Periapt of Wound Closure" },
  "description": "...",
  "mechanics": {
    "family": "passive",
    "condition": { "kind": "wearing_item" },
    "grants": [
      /* BLOCKED */ { "kind": "modify_roll_floor", "on": ["death_saving_throw"], "minimum": 10 }
    ],
    "operations": [
      /* BLOCKED */ {
        "trigger": { "kind": "on_hit_die_rolled" },
        "effect": { "kind": "multiply_hit_die_recovery", "multiplier": 2 }
      }
    ]
  },
  "destruction": { "kind": "none" }
}
```

---

## Summary

| Mechanic | Atom needed | Classification |
|---|---|---|
| Life Preservation | `modify_roll_floor` | `atom_widening` |
| Natural Healing Boost | `on_hit_die_rolled` trigger + `multiply_hit_die_recovery` effect | `atom_widening` |

Both widenings are clearly scoped to new concepts not in the v4 taxonomy. Neither existing atom comes close enough to substitute without producing a dishonest trace.
