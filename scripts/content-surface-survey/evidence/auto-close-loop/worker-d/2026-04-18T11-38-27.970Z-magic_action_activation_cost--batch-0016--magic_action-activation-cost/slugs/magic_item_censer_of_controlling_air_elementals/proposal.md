## Censer of Controlling Air Elementals

Outcome: `surface_widening`

The unit fits the existing `magic_item` + `spawned_creature` family and
typechecks/traces successfully. The remaining issues are secondary
surface gaps, not missing v4 atoms.

### Missing surface shapes

1. Spawn placement rooted on the item

- Current encoding had to use `range = { kind = "self" }`, which loses
  the rule that the elemental appears "in an unoccupied space as close
  to the censer as possible."
- This is a placement/attachment-shape gap, not a new atom.

Evidence:

> "The elemental appears in an unoccupied space as close to the censer as possible"

2. Catalog-ref language-comprehension rider

- `SpawnedCreatureStatBlock.kind = "catalog_ref"` can name the summoned
  monster, but it cannot add the item-specific rider that the summoned
  creature "understands your languages."
- This is a payload-override gap on an existing spawned-creature shape.

Evidence:

> "understands your languages"

3. Command profile over-specification

- The source says the elemental obeys your commands and acts
  immediately after you, but it does not define a command range or an
  explicit fallback behavior when uncommanded.
- `CreatureControl` currently requires both `commandRangeFeet` and
  `defaultBehavior`, so the authored unit had to use placeholders
  (`commandRangeFeet = 0`, `defaultBehavior = "dodge_and_avoid"`).
- This should be relaxed or widened so item text that omits those facts
  does not force invented values.

Evidence:

> "obeys your commands, and takes its turn immediately after you on your Initiative count"

### Notes

- I also modeled "while gently swinging this censer" with the existing
  `holding_item` predicate. That is a reasonable lower-bound gate, but
  the motion-specific qualifier is not represented directly.
