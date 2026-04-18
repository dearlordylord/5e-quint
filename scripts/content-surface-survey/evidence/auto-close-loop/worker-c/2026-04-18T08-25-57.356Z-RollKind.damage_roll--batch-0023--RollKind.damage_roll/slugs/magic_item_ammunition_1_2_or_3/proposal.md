## Gap

The current `magic_item` passive surface can encode the attack-roll and damage-roll bonus, but it cannot encode the ammunition's loss of magic after a successful hit.

### Why this is a surface widening

The top-level kind and mechanics family already fit:

- `magic_item`
- `passive`
- `modify_roll_numeric`
- `modify_damage_numeric`

What is missing is a lifecycle hook on a passive magic item keyed to a hit event, not a new source kind or a new top-level family.

### Evidence

> "Once it hits a target, the ammunition is no longer magical."

### Proposed widening

- Add a passive-item lifecycle/end condition that can expire or strip a passive grant after a named event such as `on_hit`.
- Narrowly, this could be a new `ItemDestructionPolicy` or passive-lifecycle variant for "after this item hits a target, its magical properties end."

### Omitted from the authored subset

- The authored Dhall/JSON includes only the deterministic bonus to attack rolls and damage rolls made with the specific piece of ammunition.
- The "typically found or sold in quantities of ten or twenty pieces" packaging/value note is catalog metadata, not core mechanics.
