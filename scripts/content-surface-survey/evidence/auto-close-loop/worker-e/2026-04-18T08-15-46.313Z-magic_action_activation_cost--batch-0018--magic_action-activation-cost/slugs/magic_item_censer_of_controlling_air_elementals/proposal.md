# Censer of Controlling Air Elementals

Outcome: `structural_widening`

## Why it does not fit cleanly

The unit is a `magic_item`, but its core mechanic is a summon-and-command companion flow:

- take a `Magic action`
- create an `Air Elemental`
- the elemental obeys commands
- it acts immediately after you on your initiative
- it disappears after 1 hour, on death, or when dismissed as a Bonus Action
- the item then enters a next-dawn cooldown

Those semantics already exist in the surface only for spell families like `spawned_creature`. `MagicItemMechanics` currently allows:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` over those same parts

None of those can honestly express companion creation plus companion control/dismissal.

## Narrowest honest widening

1. Add a magic-item summoned-creature family.

Suggested shape:

- `MagicItemComponentMechanics = PassiveMechanics | ActivatedAbilityMechanics | TriggeredReactionAbilityMechanics | MagicItemSpawnedCreatureMechanics`
- or reuse the existing summoned-creature structure directly under `MagicItemMechanics`

Why:

- the missing piece is family-level, not a single effect atom
- v4 already has the relevant atoms: `create_companion` and `command_companion`

Evidence:

> "While gently swinging this censer, you can take a Magic action to summon an Air Elemental."

> "The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count."

> "The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action."

## Secondary surface pressure

Even with a magic-item summon family, the current summoned-creature surface still expects an inline `CreatureStatBlock`. This item references a named catalog monster:

> "summon an Air Elemental"

That pressures a catalog-ref summoned-creature variant for non-reanimation summons, rather than forcing placeholder inline stats.

## Why no placeholder content file was written

Any authored `content/magic_item_censer_of_controlling_air_elementals.dhall` would be misleading:

- a plain item `activation` would omit the created companion entirely
- an invented inline stat block would claim mechanics not present in the provided source text

So the honest output for this unit is proposal + structured result only.
