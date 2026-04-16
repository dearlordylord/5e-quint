# Proposal: Mind Spike widening

## Outcome: `surface_widening`

Mind Spike's save-gate skeleton fits the existing `activation` family exactly. What it cannot express honestly are the *effects* produced by a failed save, and the fact that three distinct outcomes must compose on the same branch.

---

## Spell mechanics (from SRD text)

| Property | Value |
|---|---|
| Level | 2 |
| School | Divination |
| Casting time | Action |
| Range | Point, 120 ft |
| Components | S |
| Duration | Concentration, up to 1 hour |
| Save | WIS (caster spell save DC) |
| On fail | 3d8 Psychic damage + location sense + detection suppression |
| On success | Half damage only |
| Higher slots | +1d8 per slot above 2 |

---

## What the existing surface CAN encode

- `SpellRecord` with `ActivationMechanics` family — correct shape
- `ActivationPhase.save_gate` with `ability: "wis"` and `dc: { kind: "caster_spell_save_dc" }` — correct
- `onSuccess: { kind: "damage", damageType: "psychic", amount: { kind: "fixed", expr: { dice: 3, dieSize: 8 } } }` — half-damage is modeled by noting the full amount and branching; the success branch carries the same damage expression at half value or a new `DiceAmount.half_on_success` variant
- Slot scaling via `DiceAmount.linear_per_level` on `axis: "slot"` for +1d8 per slot above 2
- Concentration lifecycle (`concentration_lock`, `concentrate`, `expire ≤ 1 hour`) — already in tracer

---

## What is missing

### 1. `Effect.grant_sense` variant

The failed-save branch grants the **caster** a persistent psionic sense of the target's location. This maps to the v4 atom `grant_sense` but no Effect variant exists in `types.ts` for it.

```typescript
// Proposed:
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly senseType: "location_awareness";
  readonly planeConstraint: "same_plane";
};
```

The sense is attached to the **caster** (self) and persists for the concentration duration. The tracer would emit a `grant_sense` effect node from the failed-save branch, with a `persist → expire` lifecycle attached.

### 2. `Effect.block_targeting` variant

The failed-save branch also suppresses two detection mechanisms on the **target**:
- The target cannot become Hidden from the caster
- The Invisible condition grants no benefit to the target against the caster

This maps to the v4 atom `block_targeting`. No Effect variant exists in `types.ts`.

```typescript
// Proposed:
export type BlockTargetingEffect = {
  readonly kind: "block_targeting";
  readonly what: ReadonlyArray<"hidden_condition" | "invisible_condition">;
  readonly against: "caster";
};
```

### 3. Multi-effect composition per save branch

Currently `ActivationPhase.save_gate` is:

```typescript
readonly onFail: Effect;
readonly onSuccess: Effect;
```

Mind Spike's `onFail` must simultaneously deliver:
1. 3d8 Psychic damage
2. `grant_sense` (location awareness to caster)
3. `block_targeting` (suppresses hidden/invisible benefits on target)

This requires either:
- `onFail: ReadonlyArray<Effect>` (array of effects per branch)
- OR a composite `Effect` variant like `{ kind: "composite"; effects: ReadonlyArray<SimpleEffect> }`

The array form is simpler and more honest.

---

## Proposed minimal surface widening

```typescript
// In types.ts — extend Effect union:
export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly senseType: "location_awareness";
  readonly planeConstraint: "same_plane";
};

export type BlockTargetingEffect = {
  readonly kind: "block_targeting";
  readonly what: ReadonlyArray<"hidden_condition" | "invisible_condition">;
  readonly against: "caster";
};

export type Effect = DamageEffect | NoneEffect | GrantSenseEffect | BlockTargetingEffect;

// Change ActivationPhase.save_gate branches to arrays:
// readonly onFail: ReadonlyArray<Effect>;
// readonly onSuccess: ReadonlyArray<Effect>;
```

With this widening, Mind Spike encodes cleanly as an `activation` spell with a single `save_gate` phase.

---

## v4 atom coverage

| Proposed effect | Corresponding v4 atom | In taxonomy? |
|---|---|---|
| `grant_sense` | `grant_sense` | Yes |
| `block_targeting` | `block_targeting` | Yes |

No new v4 atoms are required. This is purely a surface-layer widening to expose atoms that already exist in the taxonomy.

---

## What is NOT a widening

- The half-damage on success: expressible as `damage` with the same `DiceAmount` expression on the `onSuccess` branch — the "half damage" SRD language is resolved at the effect-application layer, not the authored surface
- The slot scaling: already covered by `DiceAmount.linear_per_level` with `axis: "slot"`
- The concentration lifecycle: already covered by `Duration.concentration` + tracer's `concentrate / expire` atoms
