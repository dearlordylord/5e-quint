## Rod of Absorption

Outcome: `atom_widening`

I did not author `content/magic_item_rod_of_absorption.dhall` because the current surface cannot encode the rod honestly without inventing behavior.

### Why it does not fit cleanly

The item kind itself fits: this is still a `magic_item`, and `MagicItemMechanics.composite` is broad enough to combine passive, activation, and triggered-reaction parts.

The failure is at the mechanics level:

1. The reaction trigger grammar is too weak.
   The rod reacts to "a spell that is targeting only you and doesn't create an area of effect." Existing `ReactionTrigger` variants can match a named spell or any spell cast, but not this target-shape predicate.

2. The absorbed-energy mechanic has no honest atom or resource model.
   The rod does not gain reusable charges on a rest cadence. It stores spell levels from canceled incoming spells, up to a lifetime absorb cap of 50, and separately tracks currently stored energy.

3. Spending stored energy is not `grant_spell_access`.
   The rod does not grant specific spells. Instead, a spellcaster uses the stored energy "in place of your slots" when casting spells they already know or have prepared, with extra constraints:
   - only slots of a level equal to or lower than the wielder's own spell slots
   - maximum slot level 5
   - 1 stored level maps to 1 spell-slot level spent

4. The shutdown condition is not representable by current item destruction policy.
   "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical." That is neither `last_charge_roll` nor `permanent_on_empty`.

### Proposed widenings

#### 1. `ReactionTrigger` variant for self-only, non-area incoming spells

- Kind: `new_variant`
- Name: `spell_targets_only_self_non_area`
- Why:
  The current trigger grammar cannot express the exact window that opens the rod's reaction.
- Evidence:
  "you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect"

#### 2. Absorbed spell-energy reservoir subgraph

- Kind: `new_subgraph`
- Name: `absorb_spell_energy_pool`
- Why:
  This is a distinct resource flow from existing `charge_pool` items. Energy enters the item from canceled incoming spells, is bounded by both current storage and a lifetime absorb ceiling, and is later spent as generic spell-slot value.
- Evidence:
  "The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod."
  "The energy has the same level as the spell when it was cast."
  "The rod can absorb and store up to 50 levels of energy over the course of its existence."

#### 3. Generic spell-slot substitution effect

- Kind: `new_atom`
- Name: `spend_stored_energy_as_spell_slot`
- Why:
  Existing `grant_spell_access` only grants named spells. The rod instead lets the wielder pay for their own prepared/known spell casts using the item's stored pool, subject to slot-level bounds.
- Evidence:
  "you can convert energy stored in it into spell slots to cast spells you have prepared or know"
  "You use the stored levels in place of your slots but otherwise cast the spell as normal."

#### 4. Nonmagical-on-exhaustion lifecycle

- Kind: `new_variant`
- Name: `ItemDestructionPolicy.nonmagical_when_absorption_exhausted_and_empty`
- Why:
  The rod does not get destroyed on last use; it loses its magic only after its lifetime absorption capacity is spent and its current stored energy is empty.
- Evidence:
  "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical."

