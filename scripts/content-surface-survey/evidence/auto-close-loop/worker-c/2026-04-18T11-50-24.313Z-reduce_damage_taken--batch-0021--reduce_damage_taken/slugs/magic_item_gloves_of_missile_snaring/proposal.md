## Gloves of Missile Snaring

`Gloves of Missile Snaring` fits the existing `magic_item` top-level kind and the `triggered_reaction` mechanics family in broad shape:

- trigger: hit by an attack roll
- narrowing: only attacks made with a Ranged or Thrown weapon
- cost: Reaction
- effect: reduce incoming damage

I did not author `content/magic_item_gloves_of_missile_snaring.dhall` because the current surface cannot encode the primary mechanic honestly.

## Required surface widenings

1. Add an ability-modifier additive term to `DiceAmount` / `DiceExpr` use sites such as `reduce_damage_taken`.

The item says:

> reduce the damage by 1d10 plus your Dexterity modifier

`reduce_damage_taken.amount` currently uses `DiceAmount`, but the available amount primitives can express:

- fixed dice
- scaling by level or resource spend
- linked damage
- spellcasting modifier only

They cannot express `1d10 + Dex mod`.

2. Add a predicate for `free_hand`.

The reaction is gated by:

> if you have a free hand

Current passive / activation predicates cover `wearing_item`, `holding_item`, `wielding_weapon`, armor state, and combinations of those, but nothing for an actually open hand.

## Secondary atom gap

If the two surface gaps above were fixed, the item would still have a smaller remaining omission:

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.

That is not just narration. It changes object state from incoming projectile / thrown weapon to held item. The current effect vocabulary has no item-capture / seize / catch atom, so this would need a new atom such as `catch_incoming_missile`.

## Classification

I classified the unit as `surface_widening` because the primary blocker is the missing surface expression for the reaction's actual damage-reduction formula and hand-state gate. The catch rider is real, but secondary to those blockers.
