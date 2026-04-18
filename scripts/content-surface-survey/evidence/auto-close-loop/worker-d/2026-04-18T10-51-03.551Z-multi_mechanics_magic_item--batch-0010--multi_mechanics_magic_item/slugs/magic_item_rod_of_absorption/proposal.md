# Proposal: Rod of Absorption

## Verdict

`Rod of Absorption` is a `magic_item`, but it is not a clean fit to the current authored surface. I classified it as `surface_widening` and did not author `content/magic_item_rod_of_absorption.dhall`.

## What fits already

The absorption reaction is close to existing shapes:

- `kind: "magic_item"`
- reaction-shaped item ability while holding the item
- trigger filters already exist for:
  - spell save outcome / spell cast reactions
  - `spellTargetsOnlySelf`
  - `spellHasNoAreaOfEffect`
- canceling the triggering spell maps to existing spell-negation semantics
- storage pressure partially fits `charge_pool` with `lifetimeAbsorptionCap`

If this item only said “use a reaction to cancel qualifying spells and store their levels,” it would be close to encodable.

## Why it still does not fit honestly

The core spend-side mechanic is not “cast named spells from the rod.” It is:

> "you can convert energy stored in it into spell slots to cast spells you have prepared or know"

That means:

- the item does not grant a closed list of spells;
- the wielder casts their own spells;
- the item substitutes stored energy for the normal spell-slot payment path;
- the created slot level is chosen at use time, bounded by both:
  - the wielder's own maximum spell-slot level;
  - a hard cap of level 5.

The current surface only has `grant_spell_access` for named spell grants. That would be dishonest here.

## Narrowest widening

This is not a new top-level record kind and not a new overall mechanics family. `magic_item` plus composite item mechanics are already the right shell.

The missing piece is a new surface subgraph for item-backed spell-slot substitution, for example:

- spend stored item energy;
- synthesize a temporary spell-slot payment of chosen level;
- consume that synthesized slot when casting one of the wielder's already prepared/known spells.

That is why the right classification is `surface_widening`, not `structural_widening`.

## Secondary lifecycle gap

There is also a smaller lifecycle gap:

> "A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical."

The current surface can represent:

- current stored energy via a `charge_pool`;
- total lifetime absorbed energy via `lifetimeAbsorptionCap`;

but not the derived shutdown rule that applies only when:

1. lifetime absorbed total has reached 50, and
2. current stored energy is 0.

That is a second, narrower surface gap.

## Why no placeholder was authored

Any authored `content/magic_item_rod_of_absorption.dhall` would have had to lie in one of two ways:

- pretend the rod grants a closed spell list, which it does not; or
- omit the rod's main spend-side mechanic and trace only the reaction half, which would under-model the unit materially.

Per the task guardrails, no misleading content file is better than a fake clean trace.
