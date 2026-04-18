# Proposal: `reduce_damage_taken.count` field

## Unit

**Resistance** (SRD 5.2.1, Abjuration Cantrip)

## Gap

The spell text includes:

> "A creature can benefit from this spell only once per turn."

This per-turn cap on the damage reduction cannot be expressed with the current `reduce_damage_taken` atom:

```typescript
| {
    readonly kind: "reduce_damage_taken";
    readonly amount: DiceAmount;
    readonly damageType?: DamageTypeRef;
  }
```

There is no `count` field.

## Proposed widening

Add an optional `count` field to `reduce_damage_taken`, mirroring the identical field on `modify_roll_numeric`:

```typescript
| {
    readonly kind: "reduce_damage_taken";
    readonly amount: DiceAmount;
    readonly damageType?: DamageTypeRef;
    readonly count?: number;   // NEW — limits application to N qualifying damage instances
  }
```

Resistance would then author as `count: 1` (at most one application per turn). Absent = unlimited (applies every qualifying damage instance for the duration), which is the correct default for all other uses of this atom.

## Classification

`surface_widening` — the `reduce_damage_taken` atom exists in v4; only a new optional field on an existing surface type is missing. No new v4 atom is required.

## Evidence

The exact same pattern is already present on `modify_roll_numeric` (Guidance's sibling atom for roll bonuses). `reduce_damage_taken.count` would make the two atoms symmetric.

```
modify_roll_numeric:  { ..., count?: number }
reduce_damage_taken:  { ..., count?: number }   ← proposed
```

Pressure: 1 SRD unit (Resistance). The field is optional so all existing `reduce_damage_taken` users (e.g., Ring of Warmth) are unaffected.
