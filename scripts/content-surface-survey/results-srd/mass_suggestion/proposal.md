# Proposal: Mass Suggestion — Surface Widenings Required

## Outcome: `surface_widening`

Mass Suggestion fits the `activation` spell family structurally: one action cast, a `save_gate` phase against multiple targets, timed (non-concentration) duration. The v4 atom set covers it. However, four surface-type gaps prevent honest encoding.

---

## Gap 1 — `Condition` missing `"charmed"`

**What the rule says:**
> "Each target must succeed on a Wisdom saving throw or have the Charmed condition for the duration."

**Current state:**  
`Condition = "prone"` (single variant, closed enum).

**Proposed widening:**  
```typescript
export type Condition = "prone" | "charmed";
```

This is the most direct blocker. The `SaveGateRiderResult` / `SaveGateRider` pattern (used by Topple mastery) already has the `apply_condition` atom; it just can't name `charmed`.

---

## Gap 2 — `TargetSelection` has no fixed-count `choose_up_to`

**What the rule says:**
> "twelve or fewer creatures you can see within range"

**Current state:**  
`choose_up_to` mode requires `count: SlotScaling<number>`, which models a slot-scaled count. There is no variant for a plain fixed ceiling.

**Proposed widening (Option A — new mode):**
```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> }
  | { readonly mode: "choose_up_to_fixed"; readonly count: number };
```

**Alternative (Option B — union on count):**
```typescript
// count field becomes: SlotScaling<number> | number
```

Option A is structurally cleaner and keeps the type discriminated. The fixed count of 12 for Mass Suggestion (and similar AOE-with-headcount spells) would use Option A.

---

## Gap 3 — `Duration` has no slot-scaled timed variant

**What the rule says:**
> "The duration is longer with a spell slot of level 7 (10 days), 8 (30 days), or 9 (366 days)."

**Current state:**  
`Duration` only supports `instantaneous`, `concentration` (with a fixed `DurationValue`), and `timed` (with a fixed `DurationValue`). No scaling variant exists.

**Proposed widening:**
```typescript
export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue }
  | {
      readonly kind: "timed_slot_threshold";
      readonly axis: LevelAxis;          // "slot"
      readonly base: DurationValue;
      readonly tiers: ReadonlyArray<{
        readonly atLevel: number;
        readonly value: DurationValue;
      }>;
    };
```

This reuses the `ThresholdTiers` shape already present in the type system (for scaling) but applied to `DurationValue`. Tracer would need a case in `traceDuration` to emit a `scale_*` or new atom — likely `scale_numeric_bonus` on a `persist` node, or a new dedicated scaling atom if duration units are considered discrete.

---

## Gap 4 — No damage-breaks-condition expiry hook

**What the rule says:**
> "Charmed condition for the duration or until you or your allies deal damage to the target."

**Current state:**  
`apply_condition` has no expiry model. `RiderExpiry` exists for mastery riders (`target_uses_or_turn_start`, `end_of_next_turn`) but is not wired into spell effects.

**Proposed widening:**  
A new `ConditionExpiry` type on `SaveGateRiderResult`:
```typescript
export type ConditionExpiry =
  | { readonly kind: "duration" }                    // expires with spell
  | { readonly kind: "damage_from_caster_or_allies" }; // ends on any damage
```

And the `apply_condition` result would carry an optional `expiry` field:
```typescript
{ readonly kind: "apply_condition"; readonly condition: Condition; readonly expiry?: ConditionExpiry }
```

This gap is secondary — the core mechanic (save → Charmed for duration) could be encoded without it, treating the damage-break as omitted (noted in proposal). The other three gaps are primary blockers.

---

## Encoding path once widened

With all four widenings, Mass Suggestion encodes as:

```
activation family
  phases:
    save_gate (WIS, caster_spell_save_dc)
      attachment: target (choose_up_to_fixed: 12, range: 60 ft)
      onFail:  apply_condition (charmed, expiry: damage_from_caster_or_allies)
      onSuccess: none
  duration: timed_slot_threshold
    base: 24 hours
    tiers: [L7: 10 days, L8: 30 days, L9: 366 days]
```

Predicted atoms: `spell_root`, `activate`, `action_quota`, `spell_slot`, `target`, `save_gate`, `apply_condition`, `persist`, `expire`, `scale_numeric_bonus` (for duration tiers)  
Predicted relations: `roots`, `consumes`, `attaches_to`, `grants`, `branches_on_save`, `persists_until`, `modifies`
