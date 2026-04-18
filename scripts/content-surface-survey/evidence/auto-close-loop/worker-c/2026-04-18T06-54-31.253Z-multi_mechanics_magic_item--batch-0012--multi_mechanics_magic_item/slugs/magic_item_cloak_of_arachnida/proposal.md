## Cloak of Arachnida

This item now fits the current `magic_item` surface structurally:

- `MagicItemMechanics.composite` handles the passive + activated split.
- `grant_spell_access.dcOverride` handles `Web (save DC 13)`.
- `grant_spell_access.areaOverride` handles the larger item-granted `Web`.

The remaining gap is the `Spider Walk` rider.

### Required widening

1. New atom: `ignore_web_restrictions`

- Why: the cloak grants deterministic interaction rules with webs, not a damage resistance, condition immunity, or speed bonus.
- Pressure text: "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."
- Why existing atoms do not work:
  - `grant_speed` only adds a speed mode; it does not change how webs constrain movement.
  - `grant_condition_immunity` is too narrow; the rider is about all web entanglement / traversal, not just one named condition.
  - No existing terrain / area atom models "ignore this hazard, but still treat it as Difficult Terrain."

Suggested minimal shape:

```ts
{
  readonly kind: "ignore_web_restrictions";
}
```

Semantics:

- the bearer cannot be caught / trapped by webs;
- the bearer can move through webs, but webs still cost movement as Difficult Terrain.

### Encoding note

The authored item encodes the `Web` override as a `40-foot cube` by doubling the spell's authored `20-foot cube` size. If the project later decides "twice its normal area" should be represented as a relative multiplier instead of a concrete override, that would be a separate surface refinement, not the primary blocker for this unit.
