# Proposal: Chill Touch — atom_widening

## Unit

**Chill Touch** — SRD 5.2.1 cantrip, Necromancy  
`make a melee spell attack ... On a hit, the target takes 1d10 Necrotic damage, and it can't regain Hit Points until the end of your next turn.`

## What fits

The spell encodes cleanly as `activation` / `attack_roll` phase:

- `melee_spell_attack` AttackKind ✓
- `target` attachment, single selection ✓
- `damage` (necrotic) with `threshold_tiers` axis=character (cantrip upgrade 1→2→3→4 d10 at L5/11/17) ✓
- `scale_die_count` scaling atom ✓

Typecheck passes. Tracer emits a well-formed mermaid graph.

## What does not fit

**"can't regain Hit Points until the end of your next turn"**

This is a timed suppression rider applied on every hit. It has these properties:

- Fires deterministically on every attack-roll hit (not conditional on a save or DM choice).
- Expires at a fixed turn boundary (end of caster's next turn).
- Blocks HP recovery from all sources (healing spells, potions, regeneration).

The current surface has no way to encode this:

1. `Effect` is `DamageEffect | NoneEffect` — no suppression variant.
2. v4 atom inventory does not include `block_healing`, `suppress_healing`, or any equivalent.

The closest existing atoms are `negate_named_effect` (spell-specific negation) and `remove_condition` (condition removal) — neither captures "block all HP recovery for N turns."

## Proposed widening

### New atom: `block_healing`

**Category:** effect  
**Shape (proposed):**
```typescript
export type BlockHealingEffect = {
  readonly kind: "block_healing";
  readonly expiry: RiderExpiry;  // e.g., { kind: "end_of_next_turn" }
};
```

**Justification:**

- The mechanic is deterministic and core-rules-owned (SRD 5.2.1 says it directly).
- It's not DM adjudication — no agenda or ruling is involved.
- The pattern appears in other SRD spells (e.g., effects that prevent stabilization or healing), so the atom has reuse potential beyond Chill Touch.
- `RiderExpiry` already models "end of next turn" via `{ kind: "end_of_next_turn" }`.

**Required surface change:**

`Effect` would need a new variant:
```typescript
export type Effect = DamageEffect | NoneEffect | BlockHealingEffect;
```

And the `on_hit_window` path in `ActivationPhase` `attack_roll` would carry both the damage node and a `block_healing` node in sequence (or as a multi-effect onHit, if the surface is widened to support multiple effects per branch).

## Trace completeness

The produced `chill_touch.trace.md` is **honest but partial**:

- Fully traces: activate → attack_roll → on_hit_window → damage (necrotic, scale_die_count)
- Silently absent: the block_healing rider on every hit

The omission is intentional and documented. The trace should not be taken as a complete mechanical description of Chill Touch until the `block_healing` atom is added and the encoding is updated.
