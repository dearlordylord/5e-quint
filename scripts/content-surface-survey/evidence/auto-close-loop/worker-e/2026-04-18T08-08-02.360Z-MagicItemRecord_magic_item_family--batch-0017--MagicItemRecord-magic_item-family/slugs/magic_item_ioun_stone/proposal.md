# Ioun Stone

Outcome: `structural_widening`

`Ioun Stone` is a collection record, and the collection boundary matters here. A partial encoding of only the easy variants would be misleading, because the SRD unit explicitly defines one shared item family with multiple named stone types.

## What already fits

If `orbiting your head` is projected through the existing `wearing_item` predicate, these variants fit the current passive magic-item surface:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`
  using `modify_ability_score` with `maximum = 20`
- `Awareness`
  using passive `modify_roll_advantage` on `initiative` and `ability_check` with `skillFilter = perception`
- `Protection`
  using passive `modify_ac +1`
- `Regeneration`
  using passive `operations = [{ trigger = elapsed_time(hour, 1), predicate = HP >= 1, effect = heal_hp 15 to self }]`

`Sustenance` is not a core blocker here; `you don't need to eat or drink` is outside the current deterministic combat-facing surface and can stay caller-owned.

## What blocks an honest encoding

### 1. `Reserve` forces a new mechanics subgraph

This variant cannot be expressed as passive, activation, triggered reaction, or a simple composite of those families.

It needs all of the following:

- accept arbitrary spells cast by any creature into the item
- consume the original cast with no effect except storage
- track spell-level capacity up to 4 total levels
- preserve original-caster cast metadata:
  - slot level
  - spell save DC
  - spell attack bonus
  - spellcasting ability
- later let the orbiting wearer cast the stored spell and remove it from storage

Relevant text:

> Any creature can cast a spell of level 1 through 4 into the stone by touching it as the spell is cast.

> While this stone orbits your head, you can cast any spell stored in it. The spell uses the slot level, spell save DC, spell attack bonus, and spellcasting ability of the original caster

This is a missing subgraph, not just a missing atom.

### 2. `Absorption` and `Greater Absorption` need reaction widening

The current reaction surface has `negate_triggering_spell`, but not the two gating rules these stones need:

- only cancel if the triggering spell is at or below a fixed level
- spend depletion equal to the triggering spell's level, with burnout at cumulative 20 levels canceled

Relevant text:

> you can take a Reaction to cancel a spell of level 4 or lower

> Once the stone has canceled 20 levels of spells, it burns out

This is more than a simple `use_count`; it is trigger-level-dependent charge spending on a reaction.

### 3. `Mastery` needs a new effect atom

The current surface can add bonuses to particular roll kinds, AC, save DC, ability scores, and damage rolls, but it cannot modify Proficiency Bonus itself.

Relevant text:

> Your Proficiency Bonus increases by 1 while this pale green prism orbits your head.

That should be modeled as a direct character-state modifier, not faked as a bag of roll bonuses.

## Classification rationale

This is `structural_widening`, not merely `surface_widening`, because the `Reserve` variant does not fit any existing magic-item mechanics family honestly. The item collection as shipped therefore cannot be authored truthfully in the current surface.
