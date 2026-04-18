## Ioun Stone

`Ioun Stone` does not fit the current surface honestly as a full authored unit, even though many individual variants do.

Encodable variants already have straightforward shapes:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`:
  `modify_ability_score`
- `Mastery`: `modify_proficiency_bonus`
- `Protection`: `modify_ac`
- `Awareness`: `modify_roll_advantage` on `initiative` and skill-filtered
  `ability_check`
- `Regeneration`: passive `elapsed_time` operation with `heal_hp`

The problem is that the collection also includes variants whose core mechanics are missing.

### Primary blocker: Reserve forces a new family/subgraph

`Reserve` is not just a passive or ordinary activation.

It has two distinct phases:

1. external casters feed spells into the stone as they cast them;
2. the wearer later releases one of those stored spells, using the original
   caster's slot level / DC / spell attack bonus / spellcasting ability.

Pressure text:

> This vibrant purple prism stores spells cast into it, holding them until you use them. The stone can store up to 4 levels of spells at a time.
>
> Any creature can cast a spell of level 1 through 4 into the stone by touching it as the spell is cast.
>
> While this stone orbits your head, you can cast any spell stored in it. The spell uses the slot level, spell save DC, spell attack bonus, and spellcasting ability of the original caster but is otherwise treated as if you cast the spell.

Why existing families do not work:

- `passive` cannot ingest and later emit stored payloads.
- `activation` can grant spell access, but it cannot model accepting arbitrary
  external spells into storage first.
- `triggered_reaction` is still the wrong shape; the storage event is not a
  reaction owned by the item's wearer, and the released payload is dynamic.
- `grant_spell_access` only names static spell ids known at author time.

This needs a new spell-storage item subgraph or family, not a local placeholder.

### Secondary surface pressure: Absorption / Greater Absorption

The Absorption variants do fit the general `magic_item` + `triggered_reaction`
shape, but current variants are still insufficient.

Pressure text:

> you can take a Reaction to cancel a spell of level 4 or lower cast by a creature you can see
>
> Once the stone has canceled 20 levels of spells, it burns out

Missing pieces:

- `ReactionTrigger.creature_casts_spell` cannot express:
  - spell level cap (`4 or lower`, `8 or lower`)
  - visibility gate (`a creature you can see`)
- current resources cannot consume an amount derived from the triggering
  spell's level, which is required by "20 levels of spells"

### Secondary atom pressure: Sustenance

Pressure text:

> You don't need to eat or drink while this clear spindle orbits your head.

That is a deterministic ongoing effect, but no current atom models suppression of
basic needs. This looks like a new effect atom, not DM agenda.

### Shared lifecycle note

All variants also share orbiting/stowing behavior:

- Magic action to toss the stone into orbit
- Utilize action to seize and stow it
- benefit only while orbiting

Some of that can be approximated via `wearing_item`, because the text says an
orbiting stone counts as an object you are wearing, but the explicit transition
into and out of orbit is not currently modeled as a reusable item-state
lifecycle surface.

That lifecycle gap is secondary to the `Reserve` structural blocker, so I am not
proposing it as the primary widening for this unit.
