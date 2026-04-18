# Proposal: Ring of Warmth — `atom_widening`

## Unit

**Ring of Warmth** — SRD 5.2.1 magic item, uncommon, requires attunement.

## Encoded mechanic (clean)

**Cold damage reduction**: "the ring reduces the damage you take by 2d8" encodes cleanly as a `passive` grant of `reduce_damage_taken` with `damageType: "cold"` and `amount: { kind: "fixed", expr: { dice: 2, dieSize: 8 } }`. Typecheck and tracer pass.

## Omitted mechanic (widening required)

**Environmental temperature immunity**: "you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower."

This is not:
- `grant_damage_immunity` — that atom covers a damage type in combat; it does not model environmental survival hazards.
- `grant_resistance` — halves combat damage, not environmental harm.
- `grant_condition_immunity` — protects against SRD conditions, not temperature-based hazards.

The SRD defines Extreme Cold as an environmental hazard (forced Con save for unprotected creatures, gaining Exhaustion on failure). The ring suppresses that hazard family entirely for the wearer and their gear. No v4 atom models environment-scoped hazard suppression.

## Proposed new atom

```
ignore_environmental_hazard
  category: effect
  fields:
    hazard: "extreme_cold" | "extreme_heat" | "high_altitude" | ...  (closed enum, widen per unit)
    scope: "self" | "self_and_carried_gear"  (Ring of Warmth uses "self_and_carried_gear")
```

This atom gates the SRD environmental hazard resolution from applying to the bearer (and optionally their gear), analogous to how `grant_condition_immunity` gates condition application. The `scope` field is needed because this ring explicitly extends protection to "everything you wear and carry" — a broader scope than just the wearer.

## Classification

- **Outcome**: `atom_widening`
- **Confidence**: high
- **Encoded fraction**: 1 of 2 mechanics (50%)
