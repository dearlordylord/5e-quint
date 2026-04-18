## Rod of Absorption

Verdict: `structural_widening`

I did not author `content/magic_item_rod_of_absorption.dhall` because the item cannot be represented honestly with the current magic-item surface.

### Why it does not fit cleanly

The rod has two deterministic mechanics:

1. A reaction that cancels a qualifying spell targeting only the wielder and stores spell-energy equal to that spell's level.
2. A later spellcasting-side substitution mechanic that lets the wielder spend stored energy as spell slots for any spell they have prepared or know, limited by their own slot ceiling and by level 5.

The first half is close to the existing `triggered_reaction` family:

- `negate_triggering_spell` already exists.
- `charge_pool` already has `lifetimeAbsorptionCap`.

But it still needs two surface widenings:

- a generic reaction trigger for "targeted by a spell" with qualifiers like "targets only you" and "has no area of effect";
- a way for the reaction to add a number of charges equal to the triggering spell's level.

The second half is the blocking issue. Existing magic-item spellcasting support is `grant_spell_access` with a specific `spellId` and a `charge_cast` mode. That models items like wands and staffs that let you cast from a closed spell list. `Rod of Absorption` does something different: it substitutes its stored energy for the caster's spell slots while the caster casts their own prepared/known spells. That is not a closed spell grant, not a passive numeric modifier, and not a one-shot activation over a bounded effect list.

### Required widenings

#### 1. Generic spell-slot substitution subgraph

Needed for:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know"

Why existing shapes fail:

- `grant_spell_access` requires naming the spell in the item record.
- `charge_cast` spends charges to cast the granted spell from the item.
- The rod instead modifies how the wielder pays for their own spell cast.

This needs a new spellcasting-resource subgraph, not just a new atom label.

#### 2. Generic targeted-spell reaction trigger

Needed for:

> "absorb a spell that is targeting only you and doesn't create an area of effect"

Why existing shapes fail:

- `targeted_by_named_spell` is too narrow.
- `creature_casts_spell` is too broad and does not encode "this spell is targeting only you" or "has no area of effect".
- `spell_save_outcome` fires too late.

This is a `ReactionTrigger` surface widening.

#### 3. Trigger-derived pool gain

Needed for:

> "The energy has the same level as the spell when it was cast."

Why existing shapes fail:

- `charge_pool` can cap, initialize, and track lifetime absorption.
- No existing effect or resource variant can add an amount derived from triggering-spell metadata into the pool.

This is a resource/effect surface widening.

### Non-blocking notes

- `A newly found rod typically has 1d10 levels of spell energy stored in it.` does fit the existing `charge_pool.initialCount`.
- `The rod can absorb and store up to 50 levels of energy over the course of its existence.` does fit `lifetimeAbsorptionCap = 50`.
- `A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical.` introduces a depletion lifecycle that could likely be modeled later, but it is not the primary blocker here.
