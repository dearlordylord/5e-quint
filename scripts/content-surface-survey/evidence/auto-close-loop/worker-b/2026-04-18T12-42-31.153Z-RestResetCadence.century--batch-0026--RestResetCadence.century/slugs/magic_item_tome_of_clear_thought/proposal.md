# Tome of Clear Thought

## Verdict

`surface_widening`

The existing top-level kind fits: this is a `magic_item`.

The core mechanical effect also fits: the book permanently raises Intelligence by 2, to a maximum of 30, which matches the existing `modify_ability_score` atom.

What does **not** fit honestly is the delivery/lifecycle grammar around that effect:

1. The item is not passive.
2. It is not a normal one-action activation.
3. It requires a deterministic study commitment spread across multiple days.
4. After use, it becomes temporarily nonmagical rather than destroyed or permanently empty.
5. It regains magic on a fixed century-long cadence, which the current reset/destruction vocabulary cannot express.

## Why Existing Shapes Fail

If encoded as `passive`, the trace would lie by making the Intelligence increase always on while the item is present.

If encoded as `activation` with a normal `activationCost`, the trace would lie by collapsing:

- `48 hours` of study
- `over a period of 6 days or fewer`

into an instant or turn-bounded activation.

If encoded with `resetCadence = { kind = "never" }` or `destruction = { kind = "permanent_on_empty" }`, the trace would lie by treating the item as permanently spent, when RAW says it regains magic after a century.

## Narrowest Honest Widenings

### 1. Activation cost / prerequisite widening

Add a new activation-cost or activation-prerequisite variant for extended study, e.g. a shape equivalent to:

```ts
{
  kind: "study_over_time";
  totalHours: number;
  withinDays: number;
}
```

Evidence:

> "If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines"

This is not DM agenda. It is a deterministic rule-owned gate.

### 2. Recharge cadence widening

Add a reset/lifecycle variant for fixed long-term recharge, e.g. a century cadence:

```ts
{
  kind: "fixed_time";
  unit: "year";
  amount: 100;
}
```

or a dedicated century variant if the surface wants to stay closed.

Evidence:

> "The manual then loses its magic but regains it in a century."

This is also not destruction. The book persists; only its magic becomes inactive and later returns.

## What Already Fits

The permanent stat increase itself can be represented once the delivery shape exists:

- `kind: "modify_ability_score"`
- `ability: "int"`
- `delta: 2`
- `maximum: 30`

## Non-goals

No new atom is required here. This is not `atom_widening`.

The missing pieces are surface variants on:

- activation gating
- item reset/lifecycle cadence
