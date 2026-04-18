## Surface gap: hit-triggered loss of magic for passive ammunition

The unit fits the existing `magic_item` kind and `passive` mechanics family for its primary payload:

- `modify_roll_numeric` for the attack-roll bonus
- `modify_damage_numeric` for the damage-roll bonus
- variant collection for the `+1` / `+2` / `+3` rarity tiers

The remaining gap is lifecycle, not family shape or atom vocabulary.

### Missing surface shape

The current surface has no honest way to encode:

> "Once it hits a target, the ammunition is no longer magical."

`ItemDestructionPolicy` only supports:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

Those cover charge depletion and deterministic exhaustion, but not a passive item whose magical state ends on a successful hit.

### Proposed widening

- Kind: `new_variant`
- Name: `ItemDestructionPolicy.on_hit_becomes_nonmagical`
- Why: a single piece of magic ammunition remains magical until it hits, then loses its magic even though the item family is otherwise passive

### Why this is surface widening, not atom widening

The core mechanics already fit existing v4 atoms and current surface families:

- source: `magic_item_root`
- procedure: `grant`
- effects: `modify_roll_numeric`, `modify_damage_numeric`

What is missing is a new variant on an existing authored-surface lifecycle/destruction type, not a new v4 atom.
