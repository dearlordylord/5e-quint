## Rod of Absorption

`Rod of Absorption` fits the existing `magic_item` record kind, and in principle its shape would be a composite item:

- a trigger-bound reaction that can cancel an incoming spell and absorb its energy
- a separate activation or resource-consumption path that spends stored energy as spell-slot value

I did not author `content/magic_item_rod_of_absorption.dhall` because the current surface cannot express those mechanics honestly.

### Why the current surface is insufficient

1. The reaction trigger is too specific for the existing grammar.

The current shared `ReactionTrigger` surface can express:

- `creature_casts_spell`
- `targeted_by_named_spell`
- `hit_by_attack_roll`

It cannot express the Rod's actual trigger gate:

- the spell must be targeting only the wielder
- the spell must not create an area of effect

That is narrower than `creature_casts_spell`, and encoding it as that broader trigger would lie about when the rod can respond.

### Proposed widening

- `ReactionTrigger.spell_targets_only_self_no_area`

Evidence:

> "you can take a Reaction to absorb a spell that is targeting only you and doesn't create an area of effect"

2. The rod stores spell energy, not charges.

Existing item resources are `use_count` and `charge_pool`, with resets like dawn or rest. The rod instead has a more specific state machine:

- cancel a triggering spell
- read the spell's cast level
- add that level to current stored energy
- refuse to absorb if the rod cannot store the incoming spell
- track a lifetime absorption cap of 50 levels "over the course of its existence"
- become unable to absorb further once that lifetime cap is reached

This is not just "charges with an unusual reset." The resource is filled by a reactive spell-negation event, and the fill amount is derived from the triggering spell's level. The lifetime cap is also distinct from current stored energy.

### Proposed widening

- New subgraph for an absorbed-spell-energy reservoir, including:
  - negating the triggering spell
  - deriving energy from triggering spell level
  - storing into an item reservoir
  - gating on remaining capacity
  - separately tracking lifetime absorbed total and current stored energy

Evidence:

> "The absorbed spell's effect is canceled, and the spell's energy—not the spell itself—is stored in the rod. The energy has the same level as the spell when it was cast."

> "The rod can absorb and store up to 50 levels of energy over the course of its existence. Once the rod absorbs 50 levels of energy, it can't absorb more."

> "If you are targeted by a spell that the rod can't store, the rod has no effect on that spell."

3. Spending stored energy is not `grant_spell_access`.

The current authored surface can represent items that cast named spells from charges via `grant_spell_access`. Rod of Absorption does something else:

- it does not grant named spells
- it substitutes stored item energy for the wielder's spell slots
- it applies to arbitrary spells the wielder already has prepared or knows
- the created slot level must be:
  - no higher than the wielder's own slot access
  - no higher than level 5

That is a generic spell-slot substitution mechanic, not spell access.

### Proposed widening

- New subgraph for spending item energy as a generic spell-slot source for eligible spells already available to the wielder

Evidence:

> "If you are a spellcaster holding the rod, you can convert energy stored in it into spell slots to cast spells you have prepared or know."

> "You can create spell slots only of a level equal to or lower than your own spell slots, up to a maximum of level 5."

### Outcome

`atom_widening`

The missing pieces are not just extra variants on the current surface. The item needs mechanics that are not present in the current v4-exposed atom set:

- absorbed spell-energy reservoir behavior
- generic spell-slot substitution from item energy

Authoring a placeholder with `charge_pool` or `grant_spell_access` would misrepresent the item's actual rules.
