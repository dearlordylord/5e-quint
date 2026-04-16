# Proposal: surface_widening for Shocking Grasp

## Unit

Shocking Grasp — SRD 5.2.1 cantrip, Evocation.

## What fits

The spell encodes cleanly as `activation` family with a single `attack_roll` phase:

- Casting time: Action → `action_quota`
- Range: Touch → `{ kind: "touch" }`
- Melee spell attack → `attackKind: "melee_spell_attack"`
- On-hit: 1d8 Lightning damage, cantrip scaling → `threshold_tiers` with `axis: "character"`, die-count tiers at L5/L11/L17 → `scale_die_count`

Typecheck passes. Tracer emits a complete mermaid graph for the damage branch.

## What does not fit: the deny_opportunity_attack on-hit rider

SRD text: _"On a hit, the target takes 1d8 Lightning damage, **and it can't make Opportunity Attacks until the start of its next turn**."_

This is a deterministic mechanical effect that fires simultaneously with the damage on a hit. It maps directly to the v4 atom `deny_opportunity_attack`. Two surface gaps prevent encoding it:

### Gap 1 — `deny_opportunity_attack` missing from `Effect` union

`types.ts` defines:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The v4 taxonomy includes `deny_opportunity_attack` as an effect atom, but there is no corresponding variant in `Effect`. A new variant is needed:

```typescript
export type DenyOpportunityAttackEffect = {
  readonly kind: "deny_opportunity_attack";
  readonly duration: { readonly kind: "until_start_of_target_next_turn" };
};
```

The expiry shape `until_start_of_target_next_turn` is also absent from `Duration` / `RiderExpiry` — it would need a new entry or reuse of an existing expiry shape anchored to the _target's_ next turn start (distinct from the _attacker's_ turn start used in mastery riders).

### Gap 2 — `onHit` does not support multiple simultaneous effects

`ActivationPhase.attack_roll` currently has:

```typescript
onHit: Effect
```

Shocking Grasp has two simultaneous on-hit effects: **damage** and **deny_opportunity_attack**. With a single `Effect` slot, only one can be expressed. A composite form is needed, e.g.:

```typescript
onHit: ReadonlyArray<Effect>
```

or a dedicated compound type:

```typescript
export type CompositeEffect = {
  readonly kind: "composite";
  readonly effects: ReadonlyArray<DamageEffect | DenyOpportunityAttackEffect | ...>;
};
```

## Comparison with prior widening cases

This gap matches the established pattern from other cantrips:

| Spell | Omitted rider | Atom needed |
|---|---|---|
| Ray of Frost | reduce speed by 10 ft | `modify_speed` |
| Chill Touch | can't regain HP | `block_healing` (not in v4) |
| Shocking Grasp | can't make Opportunity Attacks | `deny_opportunity_attack` |

All three share the same surface gaps: missing `Effect` variant + single-slot `onHit`. The fix is the same for all three: widen `Effect` and change `onHit` to support multiple effects.

## Proposed widenings

1. **New `Effect` variant**: `DenyOpportunityAttackEffect { kind: "deny_opportunity_attack" }` — maps to v4 atom `deny_opportunity_attack`.
2. **`onHit` multiplicity**: Change `ActivationPhase.attack_roll.onHit` from `Effect` to `ReadonlyArray<Effect>` (or a composite wrapper).
3. **Expiry shape**: Add `until_start_of_target_next_turn` to an expiry type usable by `DenyOpportunityAttackEffect`. The existing `RiderExpiry` covers attacker-relative expiry; a target-relative variant is needed.

## Files produced

- `content/shocking_grasp.dhall` — authored source (damage only; rider commented out)
- `content/shocking_grasp.json` — compiled, typechecks
- `content/shocking_grasp.trace.md` — tracer output (damage branch only)
- `result-shocking_grasp.json` — outcome: `surface_widening`
