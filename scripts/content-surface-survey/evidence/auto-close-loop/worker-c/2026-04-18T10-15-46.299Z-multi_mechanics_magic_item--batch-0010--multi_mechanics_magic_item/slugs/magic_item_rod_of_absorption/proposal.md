`Rod of Absorption` does not fit the current authored surface honestly, so no `content/magic_item_rod_of_absorption.dhall` was written.

Why it blocks:

- The reaction trigger is not expressible with the current closed `ReactionTrigger` grammar. RAW needs "a spell that is targeting only you and doesn't create an area of effect". Existing variants cover `targeted_by_named_spell`, `creature_casts_spell`, and post-save outcomes, but not a generic incoming-spell trigger with targeting-shape predicates.
- The rod does not use a normal rechargeable charge pool. It has two distinct spell-energy states:
  - current stored levels that can be spent later;
  - a lifetime absorption ceiling: "up to 50 levels of energy over the course of its existence."
  The current `charge_pool` resource models only a single spendable pool with reset cadence. It cannot represent "current stored" plus "lifetime absorbed so far" as separate, behaviorally meaningful values.
- The rod's reaction does more than cancel a triggering spell. It converts the triggering spell's level into stored energy when capacity remains. The current effect surface has `negate_triggering_spell`, but nothing that says "add the triggering spell's level to this item's stored energy reservoir".
- The spend side is also outside the current surface. The rod does not grant access to named spells from the item. Instead, it lets a spellcaster cast spells they already know or have prepared, using stored rod energy in place of spell slots, capped by the user's own slot progression and max slot level 5. `grant_spell_access` cannot model generic slot substitution for arbitrary prepared/known spells.
- The terminal state is also special: "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical." Existing destruction/lifecycle shapes only cover probabilistic destruction or permanent exhaustion, not this dual-condition nonmagical transition.

Recommended classification:

- Outcome: `atom_widening`

Recommended widenings:

1. `ReactionTrigger` new variant for generic incoming spells
   - Shape: a trigger like `targeted_by_spell` with closed predicates such as `spellTargetsOnlySelf` and `spellHasNoAreaOfEffect`.
   - Why: the rod reacts to a broad class of incoming spells, not a named spell and not only after a save.

2. New resource/subgraph for absorbed spell energy
   - Shape: item-bound reservoir that tracks both `currentStoredLevels` and `lifetimeAbsorbedLevels`, with a hard lifetime cap.
   - Why: a plain `charge_pool` cannot encode both the spendable state and the irreversible "over the course of its existence" ceiling.

3. New effect/procedure for absorbing triggering spell energy
   - Shape: on a qualifying reaction, cancel the triggering spell and, if capacity remains, store levels equal to the triggering spell's cast level.
   - Why: `negate_triggering_spell` cancels the spell, but no existing atom captures the transfer of spell level into item state.

4. New effect/procedure for substituting item energy for spell slots
   - Shape: while holding the rod, a spellcaster may spend stored levels as a replacement spell-slot resource for arbitrary prepared/known spells, bounded by the caster's own slot ceiling and max level 5.
   - Why: `grant_spell_access` only grants specific named spells; this rod modifies how other spells are paid for.

5. Optional lifecycle widening for "becomes nonmagical"
   - Shape: item lifecycle state transition on compound condition: lifetime absorption exhausted AND current stored energy empty.
   - Why: existing `ItemDestructionPolicy` variants do not express this state change.

Evidence from unit text:

- "you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect"
- "The absorbed spell's effect is canceled"
- "the spell's energy ... is stored in the rod"
- "The rod can absorb and store up to 50 levels of energy over the course of its existence"
- "you can convert energy stored in it into spell slots to cast spells you have prepared or know"
- "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical"
