`Rod of Absorption` does not fit the current authored surface honestly.

Why it fails:

- The reaction is not just a normal triggered negation. It cancels an arbitrary qualifying incoming spell, reads that triggering spell's cast level, and converts that level into stored item energy.
- The stored energy is not an ordinary `charge_pool`. It has two distinct pieces of state:
  - current stored energy that can be spent later;
  - lifetime absorbed total capped at 50 "over the course of its existence".
- The later use is not `grant_spell_access` to named spells. The rod lets the wielder spend stored energy as substitute spell slots for any spells they already have prepared or know, subject to the wielder's own slot ceiling and a level-5 cap.
- The rod also has a depletion lifecycle: once it has absorbed 50 total levels and no energy remains stored, it becomes nonmagical.

Forced widenings:

1. New subgraph: absorbed spell-energy reservoir

- Need item-owned mutable state for:
  - `currentStoredLevels`
  - `lifetimeAbsorbedLevels`
  - max lifetime absorption = 50
- Existing `charge_pool` is an activation-local resource with reset cadence. It cannot represent a reservoir increased by reactions, later spent by a different item part, and permanently capped across the item's existence.

Evidence:

> "The rod can absorb and store up to 50 levels of energy over the course of its existence."

2. New atom or subgraph: absorb-and-store triggering spell energy

- Existing `negate_triggering_spell` can cancel the spell, but nothing in the surface stores "energy equal to the triggering spell's cast level" into shared item state.
- The reaction also needs access to the triggering spell's level and to fail cleanly when the rod lacks remaining storage capacity.

Evidence:

> "The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod. The energy has the same level as the spell when it was cast."

3. New atom or surface family support: substitute stored energy for arbitrary spell slots

- `grant_spell_access` only grants casting of a named `spellId`.
- This item instead pays for arbitrary spells from the wielder's own prepared/known list using stored energy in place of a spell slot.
- That is closer to "replace slot payment source" than to "grant a specific spell".

Evidence:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know."

4. New lifecycle hook: item becomes nonmagical when permanently saturated and empty

- Existing `ItemDestructionPolicy` covers destruction-on-empty, not "becomes nonmagical" after a lifetime absorption cap has been reached and current energy is zero.

Evidence:

> "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical."

Secondary surface gap:

- `ReactionTrigger` has `targeted_by_named_spell` and `creature_casts_spell`, but not a generic "targeted by a spell that targets only you and has no area" trigger/predicate shape.

Why I did not author a placeholder:

- Any attempt to coerce this into `charge_pool + grant_spell_access` would lie about both the source of the energy and the set of spells that can be cast.
- Any attempt to encode only the reaction half would omit the rod's main stored-energy mechanic and produce a misleading trace.
