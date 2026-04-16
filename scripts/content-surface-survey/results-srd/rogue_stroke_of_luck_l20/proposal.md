# Proposal: surface_widening — Stroke of Luck (Rogue L20)

## Unit

- **Slug:** `rogue_stroke_of_luck_l20`
- **Kind:** `class_feature` / Rogue L20
- **Provenance:** SRD 5.2.1, Classes/Rogue — Level 20: Stroke of Luck

## Source Text

> If you fail a D20 Test, you can turn the roll into a 20.
> Once you use this feature, you can't use it again until you finish a Short or Long Rest.

## Why It Does Not Fit

The `activation` family for class features is structurally correct for this unit:
resource (1 use), reset cadence (short or long rest), and activation model all have
the right skeleton. Two specific surface variants are missing.

### Gap 1 — `ClassFeatureActivationCost` lacks a reactive-trigger variant

The existing variants are `free` and `bonus_action`. Both describe how the feature
is activated on the rogue's *own turn*. Stroke of Luck fires *reactively after the
outcome of a D20 Test is known to be a failure* — on any creature's turn, in response
to a failure event. This is not a bonus action (no Bonus Action resource is consumed)
and not simply "free" (it is conditioned on the failure outcome).

**Proposed addition:**

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "post_d20_test_failure" };  // NEW
```

The new variant signals: this feature is invoked reactively after observing a D20
Test failure, without consuming a standard action economy resource.

### Gap 2 — `ClassFeatureEffect` lacks a roll-substitution variant

The existing variants are `GrantExtraActionEffect` and `HealHpEffect`. Stroke of Luck
replaces a failed D20 roll's result with a fixed value (20). The v4 atom
`modify_roll_substitute` covers this concept but is not surfaced in `ClassFeatureEffect`.

**Proposed addition:**

```typescript
export type SubstituteD20ResultEffect = {
  readonly kind: "substitute_d20_result";
  readonly value: 20;   // SRD is fixed at 20; widen to number if other values emerge
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | SubstituteD20ResultEffect;  // NEW
```

No new tracer atom is required — `modify_roll_substitute` already exists in the v4
inventory. The tracer's `traceClassFeatureEffect` switch would need a new arm that
emits a `modify_roll_substitute` node.

## What Would Not Change

- Family: `activation` — unchanged.
- `UseCountResource` with `cap: { kind: "fixed", uses: 1 }` — fits as-is.
- `RestResetCadence: { kind: "short_or_long_rest" }` — fits as-is.

## Classification

`surface_widening` — the atom exists in v4; only the class-feature effect surface
and activation-cost surface need new variants.
