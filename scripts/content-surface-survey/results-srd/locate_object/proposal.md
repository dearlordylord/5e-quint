# Proposal: surface_widening for Locate Object

## Unit

**Locate Object** — Level 2 Divination, Concentration 10 min, Action, Self range.

## Why it doesn't fit

The spell is structurally an `ongoing_effect` (concentration duration, persistent effect on the caster). However, `OngoingOperation` in `types.ts` is:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Locate Object's operation is neither. The spell grants the caster a **continuous directional sense** for the duration: they know the direction toward a named/described object within 1,000 feet, and if the object moves, they know the direction of movement. This is a passive divination/detection operation — no roll modifier, no damage, no save.

## What is needed

A new variant of `OngoingOperation`:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly sense: "locate_object"; // closed enum, widen as needed
  readonly rangeCondition: { readonly feet: number };
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantSenseOperation;
```

The `rangeCondition` captures "within 1,000 feet" — the bound on when the sense is active. The directional information itself (direction + movement direction) is the sense payload; it does not need further structure at this level.

## v4 taxonomy status

`grant_sense` is already in the v4 Effect Atoms (section 9). No new atom is needed. This is purely a surface gap: the atom exists in the taxonomy but has no authored surface variant in `OngoingOperation`.

## Secondary detail (not blocking)

The SRD includes: "This spell can't locate an object if any thickness of lead blocks a direct path between you and the object." This is a **blocking filter** on the sense. Encoding it would require a filter/negation predicate on `GrantSenseOperation` (e.g., `blockedBy: ["lead"]`). This is a secondary concern; the primary gap is the missing operation variant. If `GrantSenseOperation` is accepted, the blocking filter can be added as an optional field in the same widening pass.

## Other spells that would consume this widening

- Detect Magic (senses magical auras in 30 ft)
- Detect Evil and Good (senses creature types)
- Locate Creature (same shape as Locate Object, targeting creatures)
- Locate Animals or Plants (same shape)
- Detect Thoughts (concentration, sense of creature thoughts)
- See Invisibility (see invisible/ethereal for duration)
- Detect Poison and Disease (sense poisoned/diseased creatures/substances)

The `grant_sense` + `ongoing_effect` composition covers a wide class of divination concentration spells. This is a high-value widening with broad applicability.
