# Ring of Spell Turning

## Verdict

`structural_widening`

## Why it does not fit honestly

The current `MagicItemMechanics` surface is:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

`Ring of Spell Turning` requires both at once:

- a passive, always-on rider: advantage on saving throws against spells;
- a conditional reaction rider: after a successful qualifying spell save, the spell can be negated for the wearer and optionally reflected back at the caster.

That is not a secondary embellishment. It is the item's core mechanical identity. Encoding only the passive half would be materially incomplete, and encoding only the reaction half would be false to the text.

## Concrete gaps

### 1. Mixed passive + reaction mechanics on one magic item

The item needs a mechanics shape that can host continuous grants and a reaction subgraph simultaneously.

Evidence:

> "While wearing this ring, you have Advantage on saving throws against spells."

> "If you succeed on the save ... you can take a Reaction to deflect the spell back"

Suggested direction:

- add a mixed mechanics variant for magic items, or
- allow `PassiveMechanics` to carry optional triggered sub-abilities.

### 2. Reaction trigger keyed to a successful spell save

Existing reaction triggers cover:

- `hit_by_attack_roll`
- `targeted_by_named_spell`
- `creature_casts_spell`
- `any_of`

This item instead keys off the outcome of a prior resolution:

- you succeeded on a saving throw;
- the triggering spell was level 7 or lower;
- it targeted only you;
- it did not create an area of effect.

That is not representable as a current `ReactionTrigger`.

Suggested direction:

- add a trigger variant like `successful_spell_save_against_self` with predicates for spell level, single-target-only, and non-area.

### 3. Reflection / replay of the triggering spell

The current surface can express:

- `modify_roll_advantage`
- `negate_triggering_spell`
- `negate_named_effect`

It cannot express:

- negate the triggering spell on the original target;
- retarget that same triggering spell to the original caster;
- force the caster to resolve the spell against their own save DC.

That is more than a trigger gap; it needs a new effect/subgraph for reflecting a triggering spell.

Suggested direction:

- add an effect atom or subgraph such as `reflect_triggering_spell`.

## Why this is not just `surface_widening`

Even if a new reaction trigger were added, the item would still not fit the current top-level mechanics split because the record must carry both passive and reaction behavior simultaneously. That makes the narrowest honest classification `structural_widening`.
