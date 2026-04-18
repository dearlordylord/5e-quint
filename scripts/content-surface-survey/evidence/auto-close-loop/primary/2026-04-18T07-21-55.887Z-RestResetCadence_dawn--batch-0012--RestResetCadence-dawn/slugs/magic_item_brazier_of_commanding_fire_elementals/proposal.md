# Brazier of Commanding Fire Elementals

## Verdict

`structural_widening`

## Why It Does Not Fit Honestly

The item's primary mechanic is not a passive grant and not a charge-cast spell grant. It is an activated magic item that directly creates and controls a companion:

- summons a specific creature (`Fire Elemental`)
- places it in an unoccupied space near the brazier
- gives it language / obedience / initiative behavior
- dismisses it on a timed window, on death, or on a bonus-action dismissal
- locks the item until next dawn

The current surface can represent this shape only for spells:

- `SpellMechanics.spawned_creature`
- `SpellMechanics.reanimated_creature`
- `SpellMechanics.templated_multi_spawn`

But `MagicItemMechanics` is limited to:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` over those same parts

So the missing piece is not a new atom. The relevant companion atoms already exist in the tracer/taxonomy (`companion`, `create_companion`, `command_companion`). The missing piece is a magic-item mechanics family that can own the existing companion-creation subgraph.

## Narrowest Honest Widening

Add a new magic-item component variant that reuses the existing spawned-creature payload shape, for example:

`MagicItemComponentMechanics = PassiveMechanics | ActivatedAbilityMechanics | TriggeredReactionAbilityMechanics | SpawnedCreatureItemMechanics`

Where `SpawnedCreatureItemMechanics` would mirror the spell-side `spawned_creature` family but use magic-item activation/reset headers instead of spell headers.

## Why Existing Families Are Dishonest

### Not `grant_spell_access`

The text does not say the brazier lets you cast a spell. It says it summons a Fire Elemental directly, with custom appearance, control, initiative, duration, dismissal, and dawn-lockout rules.

### Not plain `activation`

`ActivatedAbilityMechanics` can run activation phases, but its effect vocabulary does not include companion creation/control. Forcing this into a direct phase would require inventing fake effects or silently dropping the core summon behavior.

## Evidence

> While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental.

> The elemental appears in an unoccupied space as close to the brazier as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count.

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

> The brazier can't be used this way again until the next dawn.
