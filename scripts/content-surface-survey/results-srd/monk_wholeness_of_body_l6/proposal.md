# Proposal: surface_widening — Wholeness of Body (monk L6)

## Unit

- **Slug**: `monk_wholeness_of_body_l6`
- **Kind**: `class_feature`
- **Source text**: SRD 5.2.1, Classes/Monk — Level 6: Wholeness of Body

> As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum of 1 Hit Point regained).
>
> You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.

## What fits cleanly

| Component | Surface type | Status |
|---|---|---|
| Kind | `class_feature` | OK |
| Family | `activation` | OK |
| Activation cost | `ClassFeatureActivationCost { kind: "bonus_action" }` | OK |
| Effect kind | `HealHpEffect { kind: "heal_hp", target: "self" }` | OK |
| Reset cadence | `RestResetCadence { kind: "long_rest" }` | OK |
| Die progression (Martial Arts) | `DiceAmount threshold_tiers, axis: "class"` (d6→d8→d10→d12 at L1/5/11/17) | OK structurally |

## Blockers

### Blocker 1 — Ability-score modifier as heal flat addend

**Text**: "plus your Wisdom modifier"

**Current type**: `DiceExpr.flat?: number` — a fixed integer only.

**Gap**: The Wisdom modifier is a runtime ability-score value, not a static integer. The type system has no way to say "flat = ability modifier of a given ability."

**Proposed widening**: Extend `DiceExpr` (and `DiceExprDelta`) to allow the flat component to reference an ability score modifier:

```typescript
export type DiceExprFlat =
  | number
  | { readonly kind: "ability_modifier"; readonly ability: Ability; readonly minimum?: number };

export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: DiceExprFlat;   // was: flat?: number
};
```

This is a surface-type variant addition (no new v4 atom needed; the `heal` atom already covers healing). The tracer would need to emit the modifier reference in the label rather than a numeric delta.

### Blocker 2 — Ability-score modifier as use-count cap

**Text**: "a number of times equal to your Wisdom modifier (minimum of once)"

**Current type**: `UseCountCap = { kind: "fixed"; uses: number } | ThresholdTiers<number>`

**Gap**: Both existing variants are static: a fixed integer or a level-based tier schedule. There is no variant that reads an ability modifier at runtime.

**Proposed widening**: Add a new `UseCountCap` variant:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | { readonly kind: "ability_modifier"; readonly ability: Ability; readonly minimum: number };
```

The tracer's `describeUseCountCap` and `traceUseCount` would need a new branch.

## Classification

`surface_widening` — both gaps are new variants of existing surface types (`DiceExpr.flat` and `UseCountCap`). No new v4 atom is required; all mechanics resolve through the existing `heal`, `use_count`, `rest_window`, `activate`, and `bonus_action_quota` atoms. The widening is purely in the authoring vocabulary for ability-score references.

## Pattern observation

This is the first unit that requires ability-score modifier references in two different positions simultaneously. Second Wind (fighter) avoided this because its flat addend is a class-level-linear value (encoded as `linear_per_level` on axis `class`). Wholeness of Body cannot use that workaround — Wisdom modifier is orthogonal to monk level.

If Paladin's Lay on Hands or similar ability-score-driven features appear in the queue, expect the same two widenings to be needed there as well. The pair is likely a recurring pattern worth solving at the surface level.
