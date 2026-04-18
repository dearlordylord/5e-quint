## Gap

`Powerful Build` is mostly a clean `species_trait` + `passive` fit, but the current surface cannot express:

> "You also count as one size larger when determining your carrying capacity."

The existing atoms cover the first sentence honestly:

- `modify_roll_advantage` on `ability_check`
- `conditionFilter = [ "grappled" ]`

They do not cover carrying capacity or effective size for capacity calculations.

## Classification

`atom_widening`

The missing mechanic is not just a new variant on an existing payload shape. It needs a new effect-level concept for load/carrying rules, and no corresponding v4 atom exists in the provided taxonomy.

## Proposed widening

- Kind: `new_atom`
- Name: `modify_carrying_capacity`
- Why: the trait changes the bearer's carrying-capacity calculation without changing actual creature size for any other rule.
- Minimal shape:

```ts
{
  kind: "modify_carrying_capacity";
  mode: "effective_size";
  increaseBySizes: 1;
}
```

This keeps the rule narrow and avoids lying with `set_size` or any broader polymorph-style body change.
