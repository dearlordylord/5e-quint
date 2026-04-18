# Proposal: surface_widening — Cloak of Displacement

## Unit

**Name**: Cloak of Displacement  
**Kind**: magic_item  
**Rarity**: Rare (requires attunement)  
**Provenance**: srd-5.2.1

## RAW Text

> While you wear this cloak, it magically projects an illusion that makes you appear to be standing in a place near your actual location, causing any creature to have Disadvantage on attack rolls against you. If you take damage, the property ceases to function until the start of your next turn. This property is suppressed while your Speed is 0.

## What Fits

The primary mechanic encodes cleanly with existing atoms:

```
passive family
  condition: wearing_item
  grants:
    - modify_roll_advantage
        mode: "disadvantage"
        on: ["attack_roll"]
```

`modify_roll_advantage` correctly models "any creature has Disadvantage on attack rolls against you" — the bearer is the target of the roll, so attacker-side disadvantage applies unconditionally to all attack rolls made against the bearer.

## What Does Not Fit

### Gap 1 — Damage-triggered suppression until caster turn start

**RAW**: "If you take damage, the property ceases to function until the start of your next turn."

**Problem**: `PassiveSuppressor` currently has one variant:

```typescript
export type PassiveSuppressor = {
  readonly kind: "condition_active";
  readonly conditions: ReadonlyNonEmptyArray<Condition>;
};
```

The Cloak's suppression fires on a **damage event** (not on a condition becoming active) and expires at a **future time boundary** (start of wearer's next turn). This is structurally different from a condition gate — it is a stateful one-shot toggle with bounded expiry.

**Proposed variant**:

```typescript
| {
    readonly kind: "on_damage_taken_until_caster_turn_start";
  }
```

No parameters needed: the trigger (any damage taken) and the expiry (caster turn start) are both fixed in RAW for this unit. Future units with similar shapes (e.g., a feature that disables on hit until short rest) would likely need a richer grammar, but a closed variant is sufficient for this pressure case.

### Gap 2 — Speed-is-zero suppression

**RAW**: "This property is suppressed while your Speed is 0."

**Problem**: Speed = 0 is a runtime numeric state, not a named SRD condition. It can arise from multiple sources:
- Restrained condition ("Speed is 0")
- Grappled condition ("Speed is 0, unless the speed is 0")
- `set_speed` effect atom (e.g., Hypnotic Pattern)
- Other mechanics

Mapping this to `condition_active: [restrained, grappled]` would be incorrect — it would miss `set_speed`-induced zero speed and any other future source. A dedicated speed-state variant is required.

**Proposed variant**:

```typescript
| {
    readonly kind: "speed_is_zero";
  }
```

## Why the Unit Cannot Be Honestly Encoded Without These Variants

Encoding only the `modify_roll_advantage` passive without the suppressors would describe a significantly stronger item than RAW: permanent, unconditional disadvantage on every attack roll against the bearer with no interruption on damage and no speed gate. That misrepresentation is worse than a gap — it would produce a false trace.

## Downstream Impact

Both new `PassiveSuppressor` variants are additive changes to the discriminated union. No existing encoded units use `suppressedBy` with these shapes (none exist yet in the corpus), so there is no migration burden. The tracer's `tracePassiveSuppressor` function would need two new `case` branches.

`speed_is_zero` may also be useful for future units that grant benefits "while your Speed is greater than 0" or suppress effects "while Restrained or otherwise immobilized." It is worth introducing as a first-class surface concept rather than redirecting to condition lists.
