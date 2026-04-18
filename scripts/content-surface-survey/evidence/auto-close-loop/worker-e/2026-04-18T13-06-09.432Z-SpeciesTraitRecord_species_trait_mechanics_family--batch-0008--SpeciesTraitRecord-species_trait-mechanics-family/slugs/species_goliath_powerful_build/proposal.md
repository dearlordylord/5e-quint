# Powerful Build (Goliath)

`Powerful Build` does not fit the current surface honestly as a complete authored unit.

What fits now:

- `species_trait` with `mechanics.family = "passive"` fits the first sentence.
- `You have Advantage on any ability check you make to end the Grappled condition.` matches existing `modify_roll_advantage` with:
  - `on: ["ability_check"]`
  - `mode: "advantage"`
  - `conditionFilter: ["grappled"]`

What does not fit:

- `You also count as one size larger when determining your carrying capacity.`

Why this is a real gap:

- This is not a full size change.
- It is not an ability-score change.
- It is not a speed, condition, or roll modifier.
- It changes one derived rules calculation only: carrying capacity.

Why not coerce it:

- Encoding this as `set_ability_score`, a generic size change, or any existing movement/roll atom would produce a false trace.
- The trait would become only partially encoded, which is worse than recording the gap directly for this survey.

Proposed widening:

- New atom: `modify_carrying_capacity`

Suggested semantics:

- Persistent passive effect.
- Multiplies or shifts carrying-capacity determination without changing actual creature size.
- Minimal shape could be one of:

```ts
{ readonly kind: "modify_carrying_capacity"; readonly sizeSteps: 1 }
```

or

```ts
{
  readonly kind: "modify_carrying_capacity";
  readonly mode: "count_as_larger_size";
  readonly steps: 1;
}
```

Evidence:

> You also count as one size larger when determining your carrying capacity.

Classification:

- `atom_widening`

Reason:

- The top-level kind (`species_trait`) and family (`passive`) already exist.
- The missing concept is a new effect atom, not a new record kind or mechanics family.
