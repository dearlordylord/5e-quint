## Rod of Absorption

Outcome: `atom_widening`

The existing `magic_item` record kind is available, and `CompositeMagicItemMechanics` is broad enough to combine a reaction-shaped part with another ongoing part. The honest blocker is lower-level: the surface has no atom/resource model for absorbed spell-energy storage, and no effect that lets an item-backed reservoir substitute for spell slots when casting arbitrary prepared/known spells.

### Why the current surface is insufficient

The reaction half is only partially close to existing machinery:

- `TriggeredReactionAbilityMechanics` exists.
- `negate_triggering_spell` exists.

But the rod does more than cancel a triggering spell. On a successful absorb:

- the spell's effect is canceled;
- the spell's energy is stored in the rod at the triggering spell's level;
- the rod has both a current stored-energy quantity and a separate lifetime absorption ceiling of 50 levels;
- once that lifetime ceiling is reached, the rod can no longer absorb;
- later, a spellcaster can spend stored energy as substitute spell slots for any spell they already have prepared or know, subject to level caps.

None of those storage/substitution mechanics fit the current atoms:

- `charge_pool` is a spendable pool with author-defined activation costs, not a reservoir filled by intercepted spell level.
- `grant_spell_access` only grants named spells; it cannot say "cast any spell you already have prepared or know, using stored item energy instead of a spell slot."
- There is no resource atom for absorbed spell energy, no effect atom for storing triggering spell level into that reservoir, and no effect atom for spell-slot substitution from an item reservoir.

### Narrowest proposed widenings

1. `new_atom`: `spell_energy_reservoir`

   Justification: the rod tracks stored spell energy as numeric spell levels, distinct from fixed charges, and also cares about a separate lifetime absorbed total.

   Evidence:
   > "The spell's energy-not the spell itself-is stored in the rod. The energy has the same level as the spell when it was cast."
   >
   > "The rod can absorb and store up to 50 levels of energy over the course of its existence."

2. `new_atom`: `store_triggering_spell_energy`

   Justification: the reaction does not merely negate the triggering spell; it converts the triggering spell's level into stored item energy if capacity remains.

   Evidence:
   > "The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod."

3. `new_atom`: `substitute_spell_slot_from_item_energy`

   Justification: the holder may cast arbitrary prepared/known spells "as normal" while paying from the rod's stored energy instead of consuming their own spell slots. That is not named-spell access and not a standard activation.

   Evidence:
   > "If you are a spellcaster holding the rod, you can convert energy stored in it into spell slots to cast spells you have prepared or know."
   >
   > "You use the stored levels in place of your slots but otherwise cast the spell as normal."

4. `new_variant`: `ReactionTrigger.spell_targets_only_self_no_area`

   Justification: the reaction window is opened by a generic triggering spell constrained by target cardinality and area creation, not by a named spell and not by generic component observation.

   Evidence:
   > "While holding this rod, you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect."

### Notes

- `A newly found rod typically has 1d10 levels of spell energy stored` is initialization metadata and not the primary blocker.
- `A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical` adds a lifecycle rider after the main energy-storage model exists.
