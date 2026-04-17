# Bowl of Commanding Water Elementals

## Verdict

`structural_widening`

## Why it does not fit honestly

The item's primary mechanic is not a passive grant and not a plain activated effect list. It creates and controls a companion with a full spawned-creature lifecycle:

- summon via a Magic action;
- placement in an unoccupied space near the bowl;
- understands your languages;
- obeys your commands;
- takes its turn immediately after yours on your Initiative count;
- disappears after 1 hour, on death, or when dismissed as a Bonus Action;
- the bowl then locks until next dawn.

The current surface already knows how to model that shape, but only on the spell side:

- `SpellMechanics` includes `family: "spawned_creature"`.
- `MagicItemMechanics` does not.

Trying to force this into `MagicItemMechanics.activation` would be dishonest:

- `ActivatedAbilityMechanics.phases` only allow `ActivationPhase`.
- `ActivationPhase.direct.effects` only allow `EffectAtom`.
- `EffectAtom` does not include `create_companion` or `command_companion`.

So there is no truthful way to author this as a magic item without widening the family surface.

## Narrowest widening

Add a new `MagicItemMechanics` variant that reuses the existing summon payload shape already supported for spells, or factor out a shared summon-family payload usable by both spells and magic items.

Candidate direction:

- allow `spawned_creature` under `MagicItemMechanics`; or
- extract a shared `SpawnedCreaturePayload` used by both `SpellMechanics` and `MagicItemMechanics`.

This is a structural widening because the missing piece is the family/kind fit, not just a new atom.

## Secondary surface pressure

Even after that family widening, this item still wants an activation precondition for:

- the bowl being filled with water;
- the user being within 5 feet of the bowl.

That looks like a surface-level activation gate, but it is secondary to the main structural blocker above.

## Evidence

> While this bowl is filled with water and you are within 5 feet of it, you can take a Magic action to summon a Water Elemental.

> The elemental appears in an unoccupied space as close to the bowl as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count.

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

> The bowl can't be used this way again until the next dawn.
