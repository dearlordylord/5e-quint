## Ring of Spell Turning

Verdict: `structural_widening`

The item does not fit the current magic-item surface honestly.

What fits today:

- `magic_item` kind exists.
- `requiresAttunement = true` fits.
- A composite item can already combine passive and reaction-shaped parts.
- The v4 effect atoms already include `reflect_triggering_spell` and `negate_triggering_spell`.

What does **not** fit:

1. Automatic post-save spell negation has no honest component family.

The ring says:

> "If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you."

That is not:

- a passive always-on grant list item;
- an activated ability;
- a triggered reaction.

It is an automatic triggered rider keyed off a successful saving throw against a spell, with spell-level gating. Current `MagicItemComponentMechanics` has no family for "while worn, when this event happens, automatically resolve this effect".

2. The passive advantage is narrower than current `modify_roll_advantage`.

The ring says:

> "you have Advantage on saving throws against spells"

Current `modify_roll_advantage` can narrow by save ability and attacker creature type, but not by source kind "spell". Encoding this as advantage on all saving throws would be false.

3. The reaction trigger grammar is too weak for the reflection clause.

The ring says:

> "If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster"

Current `ReactionTrigger` can express "creature casts spell" or "targeted by named spell", but not:

- you succeeded on a saving throw against the triggering spell;
- the spell is level 7 or lower;
- the spell targeted only you;
- the spell did not create an area of effect.

## Minimal widenings forced

1. `new_subgraph`: passive triggered rider component for non-spell units

- Why: the ring has an automatic conditional effect while worn, not a player-activated ability.
- Evidence: "If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you."

2. `new_variant`: save/source filter on `modify_roll_advantage`

- Why: the current atom can target `saving_throw`, but cannot narrow that advantage to saves caused by spells only.
- Evidence: "you have Advantage on saving throws against spells."

3. `new_variant`: reaction trigger for "successful save against triggering spell" plus spell-shape predicates

- Why: the reflection reaction opens only after a successful save against a qualifying single-target, non-area spell.
- Evidence: "If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back..."

## Why no placeholder content file was authored

Any authored JSON would have to lie in at least one of these ways:

- grant advantage on all saving throws instead of only spells;
- model the automatic negation as a reaction, even though it is not optional and does not spend a reaction;
- open the reflection reaction on generic spell-cast or generic targeting, losing the successful-save / single-target / non-area / level-7-or-lower gates.

That would produce a misleading trace, so no `content/magic_item_ring_of_spell_turning.dhall` was written.
