# Proposal: magic_item_rod_of_absorption — structural_widening

## Unit

**Rod of Absorption** (Magic Item, Very Rare, Requires Attunement)

> While holding this rod, you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect.
>
> The absorbed spell's effect is canceled, and the spell's energy-not the spell itself-is stored in the rod.
>
> The rod can absorb and store up to 50 levels of energy over the course of its existence.
>
> If you are a spellcaster holding the rod, you can convert energy stored in it into spell slots to cast spells you have prepared or know.
>
> A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical.

## Why this unit cannot be encoded honestly

### Gap 1 — `MagicItemMechanics` cannot represent this item's mixed shape

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`.

`Rod of Absorption` is not just one passive or one activated ability:

- a reactive absorb/cancel/store mechanic;
- a separate cast-time resource-substitution mechanic that spends stored energy instead of spell slots;
- a passive informational rider on attunement ("you know how many levels ...").

No single existing `MagicItemMechanics` family can carry those together honestly. Forcing the rod into one branch would drop real mechanics.

This is the primary blocker, so the unit is **structural_widening**.

### Gap 2 — reaction-shaped item mechanics are missing

The absorb mechanic is a triggered reaction:

- it consumes a Reaction;
- it fires only when a spell targets only you;
- it fails if the triggering spell creates an area of effect;
- on success it cancels the triggering spell and stores its level as energy.

The surface has `triggered_reaction`, but only for `SpellRecord`, not for `MagicItemRecord`. `ActivatedAbilityMechanics` can say `activationCost = { kind = "reaction" }`, but it cannot encode a trigger condition at all. Using plain activation would lie about when the reaction is legal.

Required widening: a reaction-capable mechanics family for non-spell units, or a generalized triggered-reaction family shared across spells and items.

### Gap 3 — no honest model for absorbed spell-energy storage

The rod tracks at least two distinct quantities:

- current stored spell-energy levels, which can go up when spells are absorbed and down when spent;
- lifetime absorbed spell-energy total, capped at 50 "over the course of its existence".

Existing `charge_pool` does not fit:

- it models a spendable pool with a fixed cap and reset cadence;
- it does not model gains caused by external hostile spells;
- it does not model a second monotonic lifetime counter separate from current stored energy.

This is not just "charges with no reset." It is a bidirectional reservoir plus a permanent exhaustion threshold.

### Gap 4 — spending stored energy as arbitrary spell slots is not `grant_spell_access`

The rod does not grant a named spell. Instead:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know"

Existing `grant_spell_access` only grants casting access to a specific `spellId`. That works for wands and rings that cast named spells; it does not work for "replace the spell-slot cost of any spell you already know/prepared with item-stored energy."

This needs a different resource-substitution shape, not a named-spell access grant.

## Proposed widenings

### 1. `multi_mechanics_magic_item` (`new_subgraph`)

Allow a magic item to carry multiple independently-shaped mechanics bundles, rather than exactly one `PassiveMechanics | ActivatedAbilityMechanics`.

Why forced here:

- absorb reaction;
- slot-substitution casting;
- attunement-side informational state.

### 2. `triggered_reaction` for non-spell units (`new_subgraph`)

Generalize the triggered-reaction family so magic items can encode reaction windows and trigger predicates.

Why forced here:

- the rod's absorb function is legal only on a specific trigger, not as a free-standing reaction activation.

### 3. `item_spell_energy_reservoir` (`new_variant`)

A stateful item-owned resource with:

- current stored levels;
- lifetime absorbed total;
- permanent capacity ceiling.

Why forced here:

- `charge_pool` cannot model both "currently stored" and "over the course of its existence".

### 4. `spell_slot_cost_substitution` (`new_subgraph`)

A casting subgraph or access mode that allows an item resource to stand in for spell slots when casting arbitrary prepared/known spells.

Why forced here:

- the rod does not cast a named spell from itself;
- it changes how the wielder pays for their own spellcasting.

## Classification

| Gap | Category |
|-----|----------|
| `MagicItemMechanics` cannot express all mechanics together | `structural_widening` |
| reaction-shaped item mechanic missing | `structural_widening` |
| absorbed spell-energy reservoir missing | `surface_widening` |
| arbitrary spell-slot substitution missing | `structural_widening` |

Overall: **`structural_widening`**.

## Notes

- `negate_triggering_spell` already exists, so the cancel-the-spell piece alone is not the problem.
- The blocker is the full shape: reactive trigger + item-owned absorbed-energy state + arbitrary slot substitution.
- I did not author `content/magic_item_rod_of_absorption.dhall` because any valid current encoding would omit or falsify core mechanics.
