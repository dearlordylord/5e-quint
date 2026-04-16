# Proposal: Cunning Action (Rogue L2) — structural_widening

## Unit

- **Slug:** `rogue_cunning_action_l2`
- **Kind:** `class_feature` (rogue, L2)
- **Source:** SRD 5.2.1 › Classes/Rogue › Level 2: Cunning Action
- **Text:** "On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide."

## Why encoding is blocked

### Blocker 1 — `ClassFeatureMechanicsHeader` mandates a use-count resource

Every `ClassFeatureActivationMechanics` requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Cunning Action has **no use-count pool** and **no rest reset**. It is available every turn, constrained only by whether the rogue has a Bonus Action left. The existing `UseCountCap` variants are:

- `{ kind: "fixed"; uses: number }` — implies an exhaustible pool
- `ThresholdTiers<number>` — implies a tiered pool

Neither represents "unlimited." Setting `uses: 1` would falsely claim the feature is once-per-rest.

### Blocker 2 — `grant_extra_action` is the wrong atom

`GrantExtraActionEffect` models the Action Surge pattern: a free activation that grants **one additional action on top of the normal action**. The `restriction` field limits which action kinds that extra action may be (e.g., exclude `magic`).

Cunning Action is structurally different:
- The **Bonus Action is the cost**, not a free activation
- No extra action is granted; instead, three specific standard actions are **re-licensed** to be taken as a Bonus Action
- This is action-substitution (Bonus Action → Dash/Disengage/Hide), not action-addition

Using `grant_extra_action` here would produce a trace claiming the rogue gets a costless additional action, which is false. The SRD says "you can take one of the following actions **as a Bonus Action**" — the Bonus Action is spent.

## What would be required to encode this honestly

### Required widening 1 — `UseCountCap.unlimited`

A new cap variant for features with no per-rest limit:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | { readonly kind: "unlimited" };  // new
```

Alternative: a new `ClassFeatureMechanicsHeader` variant that omits `resource` and `resetCadence` entirely for passive unlocks.

### Required widening 2 — `grant_bonus_action_option` effect atom

A new effect atom for features that allow specific standard actions to be taken as a Bonus Action:

```typescript
export type GrantBonusActionOptionEffect = {
  readonly kind: "grant_bonus_action_option";
  readonly actions: ReadonlyArray<StandardActionKind>;
};
```

This would allow the tracer to emit:
```
activate --grants--> grant_bonus_action_option [dash, disengage, hide]
```

instead of the misleading `grant_extra_action` atom.

### Optional refinement — rename `activationCost` for the Bonus-Action-spend pattern

The `activationCost: { kind: "bonus_action" }` variant currently means "this feature is triggered by spending a Bonus Action." For Cunning Action, the Bonus Action is correctly the cost. The issue is that the rest of the header (`resource`, `resetCadence`) still assumes a secondary pool is being tracked. A clean separation would be:

- Features with a use-count pool: keep current header
- Features where the action cost *is* the full limit: new header variant (no `resource`, no `resetCadence`)

## Atom inventory gap summary

| Gap | Kind | Proposed name | v4 status |
|-----|------|---------------|-----------|
| No unlimited use-count cap | `new_variant` | `UseCountCap.unlimited` | Missing |
| No action-substitution effect | `new_atom` | `grant_bonus_action_option` | Not in v4 |
| No resource-free feature header | `new_subgraph` | `bonus_action_unlock` family | Missing |

## Affected units (likely same pattern)

Other class features that follow the same "spend Bonus Action, no pool" pattern and would need the same widening:

- Rogue Steady Aim (L3) — "you can take a Bonus Action to aim" (no pool)
- Monk Bonus Action unarmed strike via Martial Arts (L1) — Bonus Action attack, no pool
- Any future "X as a Bonus Action, unlimited" feature
