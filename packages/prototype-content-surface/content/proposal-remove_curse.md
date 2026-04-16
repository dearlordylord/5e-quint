# Proposal: Remove Curse

**Outcome:** `surface_widening`  
**Unit:** Remove Curse (Level 3 Abjuration, SRD 5.2.1)

## Summary

Remove Curse fits the `activation` spell family structurally (instantaneous, single Action cast, Touch range, no concentration). The blocking gaps are two missing variants of existing surface types — not a missing family.

## Gap 1: ActivationPhase variant `auto_apply`

**Problem:** All current `ActivationPhase` variants require a resolution roll: either `attack_roll` or `save_gate`. Remove Curse applies its effect automatically — no attack roll (touching a willing creature requires none), no saving throw (the target does not resist).

**Evidence:**  
> "At your touch, all curses affecting one creature or object end."

**Proposed shape:**
```typescript
| {
    readonly kind: "auto_apply";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

This variant fires unconditionally when the spell is cast. It covers a wide class of restorative/utility spells: Lesser Restoration, Greater Restoration, Cure Wounds, Revivify, and others that simply require touching a willing target.

## Gap 2: Effect variant `remove_condition`

**Problem:** The `Effect` union is `DamageEffect | NoneEffect`. The v4 taxonomy already includes `remove_condition` as an effect atom, but it has no TypeScript representation. An `auto_apply` phase (Gap 1) would need to reference this effect.

**Evidence:**  
> "all curses affecting one creature or object end"

**Proposed shape:**
```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly condition: Condition | "curse" | "all_curses";
};
```

Note: If a "curse" value is needed here, `Condition` may also need to expand to include `"curse"` as a condition type (currently only `"prone"` is listed).

## Out-of-scope: Attunement break

The secondary mechanic — "the spell breaks its owner's Attunement to the object" — is character equipment state management, not a deterministic combat-engine transition. Per ARCHITECTURE.md, attunement is caller-owned state. This mechanic is correctly omitted from the core atom graph.

## Impact

Both widenings together (`auto_apply` phase + `remove_condition` effect) would unblock a large class of restorative touch spells that currently cannot be honestly encoded. The attunement-break omission is acceptable per architecture constraints.
