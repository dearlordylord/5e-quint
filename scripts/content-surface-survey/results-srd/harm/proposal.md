# Harm — Surface Widening Proposal

## Unit

**Harm** — 6th level Necromancy spell (SRD 5.2.1, `srd52: true`)

## What Fits

The primary spell shell maps cleanly to `activation` family with a single `save_gate` phase:

- Casting time: Action → `action_quota`
- Range: 60 ft point
- Components: V, S (no material)
- Duration: Instantaneous
- `save_gate` — CON save, `caster_spell_save_dc`
  - `onFail`: `damage { kind: "fixed", expr: { dice: 14, dieSize: 6 } }`, type `necrotic`
  - `onSuccess`: `damage { kind: "fixed", expr: { dice: 7, dieSize: 6 } }`, type `necrotic` (half)

## The Blocker

> "its Hit Point maximum is reduced by an amount equal to the Necrotic damage it took"

This fires only on the **failed save** branch, alongside the 14d6 necrotic damage. Two surface gaps prevent honest encoding:

### Gap 1: `modify_max_hp` missing from `Effect`

`Effect` in `types.ts` is `DamageEffect | NoneEffect`. There is no `modify_max_hp` effect variant.

The v4 taxonomy lists `modify_max_hp` in §9 Effect Atoms. The atom exists conceptually but is absent from the authored surface type.

**Proposed addition:**

```typescript
export type ModifyMaxHpEffect = {
  readonly kind: "modify_max_hp";
  readonly delta: DiceAmount | ModifyMaxHpLinkedAmount;
  readonly floor?: number;  // "can't reduce below 1"
};
```

The `floor` field handles the SRD clause "This spell can't reduce a target's Hit Point maximum below 1."

### Gap 2: Damage-linked amount coupling

The HP max reduction is not a static value — it equals the necrotic damage actually rolled and applied on this resolution. None of the three `DiceAmount` variants (`fixed`, `threshold_tiers`, `linear_per_level`) can express "equal to damage dealt by a sibling effect in this resolution."

**Proposed addition:**

```typescript
export type ModifyMaxHpLinkedAmount = {
  readonly kind: "equal_to_damage_taken";
};
```

This would be used exclusively in the `ModifyMaxHpEffect.delta` field and would instruct the interpreter that the modification amount is resolved at runtime from the damage dealt in the same phase.

The tracer would need a new atom emission path: when `delta.kind === "equal_to_damage_taken"`, emit a `modify_max_hp` node with a `linked_to_damage` label, and a `branches_on_save` edge from the save_gate.

## Why No Partial Trace

The HP max reduction is the defining mechanic of Harm — it is what distinguishes this spell from a generic high-damage necromancy attack. The damage portion alone would represent Harm as essentially a weaker alternative to other 6th-level damage spells, which misrepresents the spell's design intent. A partial trace without the HP max effect would be dishonest.

## Classification

`surface_widening` — both gaps are surface-level. The v4 atom (`modify_max_hp`) already exists in the taxonomy; what's missing is (1) the `Effect` variant that exposes it, and (2) the damage-linked amount coupling variant in `ModifyMaxHpEffect.delta`.
