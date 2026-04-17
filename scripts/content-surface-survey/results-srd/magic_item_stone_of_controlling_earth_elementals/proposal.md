## Stone of Controlling Earth Elementals

Outcome: `structural_widening`

### Why it does not fit honestly

`magic_item` is an existing top-level record kind, but its mechanics are restricted to:

- `passive`
- `activation`

This item is not a passive grant, and its activated effect is not a one-shot `ActivationPhase`. Its core payload is a temporary summoned companion with all of these authored properties:

- summon placement: unoccupied space within 30 feet
- inline or referenced creature identity: `Earth Elemental`
- control model: obeys your commands
- initiative/turn order: immediately after you on your Initiative count
- dismissal lifecycle: disappears after 1 hour, on death, or on Bonus Action dismissal
- recharge cadence: cannot be used again until next dawn

The surface already has a spell-only `spawned_creature` family that traces to `create_companion` and `command_companion`, which is exactly the mechanical shape this item wants. But `MagicItemMechanics` does not admit that family, and `ActivatedAbilityMechanics` cannot honestly encode companion creation/control as a plain direct phase.

### Narrowest widening

Add a magic-item mechanics variant that can carry spawned-creature payloads, for example:

- allow `MagicItemMechanics` to include `spawned_creature`

or more generally:

- lift spawned-companion payload families so they are reusable across spell and magic-item units

### Evidence

> While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental. The elemental appears in an unoccupied space you choose within 30 feet of yourself, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The stone can't be used this way again until the next dawn.

### Classification note

This is `structural_widening`, not `surface_widening` or `atom_widening`.

- Not `atom_widening`: the needed companion atoms already exist in the tracer/taxonomy (`create_companion`, `command_companion`, `companion`).
- Not merely `surface_widening`: the blocker is not a missing leaf variant on an existing magic-item activation phase; the unit's real payload family is absent from `MagicItemMechanics`.
