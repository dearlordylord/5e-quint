# Proposal: Eldritch Master (warlock L20) — structural_widening

## Unit

**Eldritch Master** — Warlock L20 class feature (SRD 5.2.1, Classes/Warlock#Level 20: Eldritch Master)

> When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots.

## Why it does not fit

### Gap 1 — No feature-chained trigger family (structural)

The existing `ClassFeatureMechanics` has a single family: `activation`. That family models features the character activates independently on their turn, spending a `use_count` resource, with an optional activation cost (free or bonus_action).

Eldritch Master is not independently activated. Its trigger is another named class feature being used. The graph needs an edge of the form:

```
magical_cunning.activate --opens_window--> feature_use_window
feature_use_window --grants--> refund_all_pact_magic_slots
```

No existing family in `ClassFeatureMechanics` can express "fires when feature X is used." This is a new subgraph shape — a **feature_augmentation** family whose trigger is a named sibling feature's activation window rather than a direct player action.

### Gap 2 — No spell slot refund in ClassFeatureEffect (surface)

Even if the trigger could be expressed, `ClassFeatureEffect` only covers:

- `grant_extra_action` — grants an extra action (with optional action-kind restriction)
- `heal_hp` — restores hit points

There is no variant for "refund N uses of a named spell slot pool." Pact Magic slots are a different pool from standard spell slots, and full-refund-on-trigger is a distinct effect shape from either existing variant.

A new `ClassFeatureEffect` variant is needed — tentatively:

```typescript
export type RefundSpellSlotsEffect = {
  readonly kind: "refund_spell_slots";
  readonly pool: "pact_magic" | "standard";
  readonly amount: "all" | number;
};
```

### Classification

| Gap | Type |
|---|---|
| Feature-chained trigger (no family for "on another feature's use") | `structural_widening` |
| Spell slot refund effect (no ClassFeatureEffect variant) | `surface_widening` |

The structural gap dominates. Overall: **`structural_widening`**.

## Proposed changes

### 1. New ClassFeatureMechanics family: `feature_augmentation`

```typescript
export type FeatureAugmentationMechanics = {
  readonly family: "feature_augmentation";
  // The feature whose activation triggers this augmentation.
  readonly triggeredByFeatureId: string;
  // Effect that fires when the trigger feature is used.
  readonly effect: ClassFeatureEffect; // extended to include refund_spell_slots
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | FeatureAugmentationMechanics;
```

### 2. New ClassFeatureEffect variant: `refund_spell_slots`

```typescript
export type RefundSpellSlotsEffect = {
  readonly kind: "refund_spell_slots";
  readonly pool: "pact_magic" | "standard";
  readonly amount: "all" | number;
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | RefundSpellSlotsEffect;
```

### 3. Tracer: new branch in `traceClassFeatureMechanics`

The tracer's `switch (m.family)` would need a `feature_augmentation` case that:

- emits a `class_feature_root` → `activate` (of the referenced feature) → `on_feature_use_window` → `refund` → `spell_slot` subgraph
- uses the v4 `refund` procedure atom and `spell_slot` resource atom (both exist in the taxonomy)

## v4 atom coverage

The required atoms exist in v4:
- `refund` (procedure atom) ✓
- `spell_slot` (resource atom) ✓
- `post_action_window` or a new `on_feature_use_window` (window atom — closest existing is `post_action_window`)

The window atom may need a new variant `on_feature_use_window` to be precise, or `post_action_window` can be reused with a label.

## Analogous patterns

- **Wizard Arcane Recovery** (regain spell slots on Short Rest) is a rest-triggered refund, not a feature-triggered one. It could model the effect side but not the trigger.
- **Bard Superior Inspiration** (regain Bardic Inspiration on initiative) uses an initiative window trigger, not another feature's activation.

Eldritch Master is the first observed case of feature-chained augmentation in the survey set.
