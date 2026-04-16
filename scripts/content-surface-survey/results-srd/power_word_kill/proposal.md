# Proposal: Power Word Kill — atom_widening

## Unit

- **Name:** Power Word Kill
- **Level:** 9 (Enchantment)
- **Source text:** "You compel one creature you can see within range to die. If the target has 100 Hit Points or fewer, it dies. Otherwise, it takes 12d12 Psychic damage."

## Why it doesn't fit

Power Word Kill has two structural gaps versus the current surface:

### 1. Missing resolution variant: `hp_threshold_gate`

The spell's branching is entirely determined by the target's current HP relative to a fixed threshold (100). This is not an attack roll and not a saving throw — the target has no agency, no roll, no check. The current `ActivationPhase` union only offers:

- `attack_roll` — no roll here
- `save_gate` — no save here

A new variant is needed:

```typescript
// Proposed addition to ActivationPhase:
| {
    readonly kind: "hp_threshold_gate";
    readonly attachment: Attachment;
    readonly threshold: number;          // 100 for Power Word Kill
    readonly onAtOrBelow: Effect;        // fires when target HP ≤ threshold
    readonly onAbove: Effect;            // fires when target HP > threshold
  }
```

This pattern recurs in the Power Word family (Power Word Stun has the same ≤150 HP gate) and is worth promoting now.

### 2. Missing effect atom: `instant_kill`

The `onAtOrBelow` branch says "it dies" — not "it takes enough damage to reduce HP to 0." Instant death:

- Bypasses resistances and immunities to damage types
- Does not interact with temporary HP
- Is categorically distinct from any amount of damage (e.g., a creature immune to all damage types still dies)

Using `DamageEffect` here would be a false encoding. A new effect atom is needed:

```typescript
export type InstantKillEffect = {
  readonly kind: "instant_kill";
};
```

In v4 taxonomy terms this would be a new entry under **§9 Effect Atoms** alongside `damage` and `heal`.

## What does fit

The fallback branch (`onAbove`) is standard fixed damage:

```
12d12 Psychic
→ DamageEffect { kind: "damage", damageType: "psychic", amount: { kind: "fixed", expr: { dice: 12, dieSize: 12 } } }
```

This fits the current surface perfectly. Only the gate type and the kill effect are missing.

## Classification

- **Primary:** `atom_widening` — `instant_kill` is absent from the v4 taxonomy
- **Secondary:** `surface_widening` — `hp_threshold_gate` is a missing variant of the existing `ActivationPhase` type

## Precedent pressure

Power Word Stun (≤150 HP → stunned condition; >150 HP → no effect) uses the same HP threshold gate pattern. Promoting `hp_threshold_gate` now covers both spells.
