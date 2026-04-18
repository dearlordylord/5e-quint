# Proposal: ranger_tireless_l10

## Outcome: `atom_widening`

The **Temporary Hit Points** half of Tireless encodes cleanly as an `ActivatedAbilityMechanics` (`activation` family). The **Decrease Exhaustion** half cannot be encoded and drives this proposal.

---

## Encoded half (Temporary Hit Points)

- Family: `activation`
- Cost: `standard_action / magic`
- Resource: `use_count`, cap = `ability_modifier (wis)`
- Reset: `long_rest`
- Effect: `grant_temp_hp` → `{ kind: "fixed", expr: { dice: 1, dieSize: 8, abilityModifier: "wis" } }`

Typecheck passes; tracer produces a clean graph.

Minor unrepresentable detail: the "minimum of 1" floor on both the amount (1d8+Wis mod) and the use count (Wis mod, min once) has no surface encoding. `DiceExpr` has no floor field and `ability_modifier` cap has no minimum field. This is a secondary gap not worth a separate widening proposal at this time.

---

## Omitted half (Decrease Exhaustion)

> "Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1."

Two distinct widenings are required.

### Widening 1: `decrease_exhaustion_level` atom (atom_widening)

**Problem:** SRD 5.2.1 Exhaustion is a leveled condition (levels 1–6). Existing atoms cannot express a partial level reduction:
- `remove_condition: "exhaustion"` removes the condition entirely (reduces from any level to 0).
- No atom currently models "reduce exhaustion level by N".

**Proposed atom:**
```typescript
| {
    readonly kind: "decrease_exhaustion_level";
    readonly by: number;  // always 1 in RAW so far; field kept explicit
  }
```

This is a v4 taxonomy addition. The closest v4 atom is `remove_condition`, but that is semantically all-or-nothing; "decrease by 1 level" is a distinct operation that leaves exhaustion active if the creature had level ≥ 2.

### Widening 2: `PassiveOperation` trigger `on_short_rest` (surface_widening)

**Problem:** `PassiveOperation.trigger` currently only supports:
```typescript
{ readonly kind: "elapsed_time"; readonly unit: "hour" | "day"; readonly amount: number }
```
Short-rest completion is a rest event, not an elapsed-time event. The existing `RestResetCadence` covers resource refills on rest; `PassiveOperation` needs a parallel rest-event trigger for effects that fire on rest (not just refill a pool).

**Proposed extension:**
```typescript
PassiveOperation.trigger |= { readonly kind: "on_short_rest" }
                          | { readonly kind: "on_long_rest" }
```

(Long rest variant added symmetrically in anticipation of similar patterns.)

---

## Full encoding (when widenings land)

The full Tireless feature would encode as `CompositeClassFeatureMechanics`:

```
composite:
  parts:
    - activation (Temporary Hit Points — as authored)
    - passive (Decrease Exhaustion):
        operations:
          - trigger: { kind: "on_short_rest" }
            effect: { kind: "decrease_exhaustion_level", by: 1 }
```
