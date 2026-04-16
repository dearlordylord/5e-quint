# Proposal: surface widening for Find the Path

## Unit

- **Slug:** `find_the_path`
- **Kind:** spell (level 6, divination, concentration up to 1 day)
- **Outcome:** `surface_widening`

## Why it doesn't fit today

Find the Path is structurally an `ongoing_effect` spell:
- Casting time: 1 minute (`CastingTime.kind = "minutes"`, `amount = 1`, `ritual = false`)
- Range: Self (`Range.kind = "self"`)
- Duration: concentration, up to 1 day (`Duration.kind = "concentration"`, `upTo = { unit: "day", amount: 1 }`)
- Attachment: `self` (the navigation faculty is granted to the caster)

All header fields type-check. The blocker is `OngoingOperation`:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

The spell grants a **persistent navigation sense** — distance/direction awareness to a named destination, plus oracle knowledge at path-choice points. Neither `roll_modifier` nor `damage_on_hit` models this. There is no variant in `OngoingOperation` that routes to the v4 `grant_sense` atom.

## What is needed

A new `OngoingOperation` variant, tentatively:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly senseKind: string; // e.g. "navigation_awareness"
  readonly description?: string;
};
```

Incorporated into:

```typescript
export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantSenseOperation;
```

The `senseKind` field should be a closed enum widened on demand. For Find the Path, the value would be `"navigation_awareness"` (or similar). Future spells that grant darkvision, tremorsense, blindsight, etc. through concentration would also use this variant.

The tracer's `traceOngoingOperation` switch would need a `grant_sense` arm that emits a `grant_sense` effect node (already in v4).

## Spell characteristics omitted from today's surface (secondary)

The spell has two eligibility conditions that the surface currently has no grammar for:
1. **Caster familiarity requirement** — the caster must be "familiar with the location". This is a pre-cast guard, not a runtime mechanic, and is DM-adjudicated at the table.
2. **Spell failure conditions** — fails for destinations on another plane, moving destinations, or unspecific destinations. These are also cast-time validity checks, not ongoing mechanical effects.

Both are outside-core DM agenda (per ARCHITECTURE.md). They do not need surface encoding and are not proposed widenings.

## Classification rationale

- Family exists: `ongoing_effect` ✓
- v4 atom exists: `grant_sense` ✓
- Gap: `OngoingOperation` has no variant for `grant_sense`
- → `surface_widening` (narrowest honest classification)
