## Ioun Stone

`Ioun Stone` should not be authored as a placeholder `magic_item` record in the current surface.

The outer collection shape is supported: `MagicItemRecord.variants` can represent the named stone variants, and several variants would fit as ordinary passive records:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`: `modify_ability_score`
- `Protection`: `modify_ac`
- `Awareness`: passive roll modifiers

Two variants force real gaps:

### 1. Reserve forces a new stored-spell subgraph

`Reserve` is not just “grant spell access.” It has persistent item-owned state:

- arbitrary incoming spells are cast **into** the stone;
- they are stored until later use;
- storage capacity is measured in **total spell levels**;
- later casts inherit the **original caster’s** slot level, spell save DC, spell attack bonus, and spellcasting ability;
- casting from the stone removes that stored payload and frees capacity.

That is a distinct lifecycle. Existing `activation`, `triggered_reaction`, and `composite` magic-item mechanics do not model “store foreign spell payload now, release it later with preserved casting metadata.”

Forced widening:

- `new_subgraph`: `stored_spell_reservoir`

Evidence:

> “This vibrant purple prism stores spells cast into it, holding them until you use them. The stone can store up to 4 levels of spells at a time.”

### 2. Mastery forces a proficiency-bonus atom

`Mastery` modifies Proficiency Bonus itself, not just one roll family. Modeling it as a pile of existing roll modifiers would be dishonest because PB feeds many derived mechanics beyond the currently modeled roll atoms.

Forced widening:

- `new_atom`: `modify_proficiency_bonus`

Evidence:

> “Your Proficiency Bonus increases by 1 while this pale green prism orbits your head.”

### 3. Absorption / Greater Absorption need trigger and resource variants

These variants mostly resemble trigger-bound reaction items, but two specific shapes are missing:

- trigger is “a spell cast by a creature you can see,” not the current component-filtered `creature_casts_spell`;
- burn-out is tracked by **spell levels canceled**, not fixed uses or ordinary charges spent by the user.

Forced widenings:

- `new_variant`: `reaction_trigger.creature_casts_spell_visible`
- `new_variant`: `activation_resource.absorbed_spell_levels_pool`

Evidence:

> “you can take a Reaction to cancel a spell of level 4 or lower cast by a creature you can see”

> “Once the stone has canceled 20 levels of spells, it burns out, turns dull gray, and loses its magic.”

## Outcome

`structural_widening`

Reason: the unit’s collection wrapper exists, but the `Reserve` variant requires a new stored-spell lifecycle rather than a simple missing atom on an otherwise valid current family. I therefore did not author `content/magic_item_ioun_stone.dhall`.
