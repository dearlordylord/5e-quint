`Rod of Absorption` does not fit the current surface honestly, so no `content/magic_item_rod_of_absorption.dhall` was authored.

The outer record shape is not the problem. This item would naturally be a composite `magic_item` with:

- a `triggered_reaction` part for absorbing a qualifying incoming spell while holding the rod
- an `activation` part for spending stored energy while holding the rod

The failure is inside those parts.

## Missing reaction trigger

The current `ReactionTrigger` grammar can express:

- `targeted_by_named_spell`
- `creature_casts_spell`
- `spell_save_outcome`

It cannot express the generic trigger this item needs:

> "a spell that is targeting only you and doesn't create an area of effect"

This is a surface widening on the existing trigger grammar, not a new top-level family.

Suggested widening:

- `ReactionTrigger.targeted_by_spell`
  - predicates:
    - `spellTargetsOnlySelf?: true`
    - `spellHasNoAreaOfEffect?: true`

Those two predicates already exist on `spell_save_outcome`, so this is a natural reuse rather than a new taxonomy branch.

## Missing absorb/store subgraph

Even with the right trigger, the surface still cannot model the rod's core reaction payload:

> "The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod. The energy has the same level as the spell when it was cast."

What exists today:

- `negate_triggering_spell`
- `charge_pool`
- `charge_pool.initialCount`
- `charge_pool.lifetimeAbsorptionCap`

What is missing:

- a way for the reaction to add `triggering_spell_level` into the item's current stored-energy pool
- a way to block the reaction when the rod cannot store that incoming level

This is more than a new scalar field. It needs a new resource-flow subgraph or effect that:

1. reads the triggering spell's level
2. negates the spell
3. refunds nothing to the caster
4. increments the rod's current stored energy by that level
5. refuses the absorb if current storage and/or lifetime absorption constraints would be exceeded

Suggested widening:

- new subgraph/effect: `absorb_triggering_spell_energy_into_charge_pool`

This is an atom-level gap because the current vocabulary has no reusable effect for "capture triggering spell level as item energy."

## Missing generic spell-slot substitution

The activation-side mechanic is also not representable with `grant_spell_access`:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know"

Current `grant_spell_access` requires a named `spellId`. That works for wands/staves that grant fixed spells, but not for this item, which lets the bearer cast their own spell list using stored item energy instead of spending their own slot.

The missing mechanic is not "grant access to a spell." It is:

- spend N stored levels from the rod
- treat that spend as a spell slot of level N
- only for spells the bearer already has prepared/known access to
- only up to the lesser of:
  - the bearer's own spell-slot progression
  - level 5

Suggested widening:

- new atom: `grant_spell_slot_substitution`

Possible payload:

- source resource: item charge/stored-energy pool
- maxSlotLevel: number
- bearerMustAlreadyKnowOrPrepareSpell: true
- bearerSlotLevelCap: "own_spell_slots"

## Classification

Recommended outcome: `atom_widening`

Reason:

- there is a small surface gap on `ReactionTrigger`
- but the decisive blockers are atom/subgraph gaps:
  - storing triggering spell level as item energy
  - spending stored energy as a generic substitute spell slot

Those are core mechanics of the item, not secondary riders that can be safely omitted.
