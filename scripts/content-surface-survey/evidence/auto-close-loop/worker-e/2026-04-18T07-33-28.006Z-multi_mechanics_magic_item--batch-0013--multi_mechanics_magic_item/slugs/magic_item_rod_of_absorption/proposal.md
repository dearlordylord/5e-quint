`Rod of Absorption` does not fit the current surface honestly, so no `content/magic_item_rod_of_absorption.dhall` was authored.

Why it does not fit:

- The reaction trigger is broader than the current `ReactionTrigger` grammar. The rod reacts to "a spell that is targeting only you and doesn't create an area of effect", but the surface only supports `hit_by_attack_roll`, `targeted_by_named_spell`, `creature_casts_spell`, and `any_of`.
- The reaction does more than cancel the triggering spell. It converts the triggering spell's level into stored energy if the rod still has capacity. The current magic-item resource model only supports predeclared `use_count` / `charge_pool` resources with rest- or time-based reset cadences; it cannot gain variable charges from hostile spell resolution.
- The stored energy is not normal item spell access. The rod lets a spellcaster spend stored levels "in place of your slots" to cast spells they already know or have prepared, with slot creation bounded by the wielder's own slot progression and capped at level 5. `grant_spell_access` only grants named spells from the item; it cannot model generic spell-slot substitution for arbitrary known/prepared spells.
- The rod tracks two distinct persistent quantities: current stored energy and lifetime absorbed energy ("up to 50 levels of energy over the course of its existence"). The existing `charge_pool` can represent only a current pool cap, not a lifetime absorption ceiling that permanently disables future absorption and eventually turns the item nonmagical once empty.

Narrowest honest classification: `surface_widening`.

Suggested widenings:

1. New `ReactionTrigger` variant for generic spell-target filters.
   - Example shape: spell targets self only, excludes area-of-effect spells, optionally exposes triggering spell level to downstream effects.
2. New magic-item resource subgraph for absorbed spell-energy reservoirs.
   - Needs current stored energy, lifetime absorbed total, capacity checks, and a way for a reaction effect to add the triggering spell's cast level to the pool.
3. New magic-item / effect shape for spell-slot substitution.
   - The rod does not grant specific spells. It lets the wielder spend stored energy as slot levels to cast their own prepared/known spells, subject to wielder slot limits and a max created slot level of 5.
4. Lifecycle / disable-state hook for "can no longer absorb spell energy" and "becomes nonmagical" after the reservoir is exhausted post-cap.

Evidence from unit text:

- "take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect"
- "The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod."
- "The rod can absorb and store up to 50 levels of energy over the course of its existence."
- "If you are a spellcaster holding the rod, you can convert energy stored in it into spell slots to cast spells you have prepared or know."
- "You can create spell slots only of a level equal to or lower than your own spell slots, up to a maximum of level 5."
- "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical."
