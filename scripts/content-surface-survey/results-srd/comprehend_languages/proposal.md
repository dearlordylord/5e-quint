# Proposal: surface_widening for Comprehend Languages

## Unit

- Slug: `comprehend_languages`
- Kind: spell
- Family: `ongoing_effect` (correct family, cannot be encoded)

## Gap

`OngoingOperation` is currently:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Comprehend Languages is a timed self-buff that grants the caster passive language comprehension for 1 hour. It has no roll modification, no on-hit damage, and no save gate. Its sole mechanical content is "caster gains the ability to understand any language while the spell persists."

The v4 atom for this is `grant_sense` (Section 9, Effect Atoms — unchanged from v3). No path from `ongoing_effect.operation` reaches `grant_sense` in the current surface.

## Proposed widening

Add a new `OngoingOperation` variant:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly sense: string;          // closed enum candidate; "language_comprehension" for this unit
};
```

Or, more narrowly for the specific pressure case:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly description: string;    // prose description of the granted sense, treated as opaque by the engine
};
```

The tracer would emit a `grant_sense` node with a `grants` edge from the procedure node and an `attaches_to` edge to the self-attachment.

## Why ongoing_effect is correct

All spell-card axes map cleanly:

| Field | Value |
|---|---|
| `family` | `ongoing_effect` |
| `level` | `1` |
| `school` | `divination` |
| `castingTime` | `{ kind: "action" }` (or `{ kind: "minutes", amount: 1, ritual: true }` for ritual casting) |
| `range` | `{ kind: "self" }` |
| `components` | `{ v: true, s: true, m: "a pinch of soot and salt" }` |
| `duration` | `{ kind: "timed", value: { unit: "hour", amount: 1 } }` |
| `attachment` | `{ kind: "self" }` |
| `operation` | **MISSING VARIANT** |

The ritual flag is a secondary note: the existing `CastingTime` `minutes` variant already has `ritual: boolean`. The primary action-cost cast also works with `{ kind: "action" }` treating the ritual as an optional alternate casting mode (which the surface may want to model separately later). Neither variant blocks encoding once `GrantSenseOperation` exists.

## Scope

Narrowest honest classification: `surface_widening`. The `ongoing_effect` family, `grant_sense` v4 atom, and `self` attachment all exist. Only the `OngoingOperation` union needs a new member.

No new v4 atoms are required.
