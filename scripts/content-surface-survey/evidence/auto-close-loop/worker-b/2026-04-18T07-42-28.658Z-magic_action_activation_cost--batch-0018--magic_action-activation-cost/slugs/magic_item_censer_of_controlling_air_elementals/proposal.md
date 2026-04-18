## Verdict

`Censer of Controlling Air Elementals` does not fit the current magic-item surface honestly. The correct classification is `structural_widening`.

## Why It Does Not Fit

The item's primary mechanic is not a passive grant or a simple one-shot activation effect. It creates and controls a companion-like creature with deterministic behavior:

- summon an `Air Elemental`
- place it in an unoccupied space near the item
- it understands the wielder's languages
- it obeys commands
- it acts immediately after the wielder on the same Initiative count
- it disappears after 1 hour, on death, or when dismissed as a Bonus Action
- the item then goes on a next-dawn cooldown

The current surface can express creature creation only in spell-only payload families:

- `spawned_creature`
- `reanimated_creature`
- `templated_multi_spawn`

Magic items cannot use those families. `MagicItemMechanics` only allows:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` over those component families

None of those families carries:

- `create_companion`
- `command_companion`
- companion initiative/control metadata
- dismissal/on-death disappearance lifecycle

## Narrowest Honest Widening

Add a magic-item variant that can host the same summon/control payload shape already used by spell-side companion mechanics, or widen `MagicItemComponentMechanics` so a magic item can own a spawned-creature-style component directly.

This is a structural gap, not an atom gap:

- the needed atoms already exist in v4/tracer output (`create_companion`, `command_companion`, companion attachment/lifecycle)
- the surface problem is that magic items have no honest path to use them

## Evidence

> While gently swinging this censer, you can take a Magic action to summon an Air Elemental. The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The censer can't be used this way again until the next dawn.
