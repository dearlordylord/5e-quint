## Shield of Missile Attraction

`Shield of Missile Attraction` is a `magic_item`, but it does not fit honestly inside the current magic-item payload families.

The item combines two different mechanics:

1. A held passive rider:
   "While holding this Shield, you have Resistance to damage from attacks made with Ranged weapons."

2. A curse granted by attunement that persists after the shield is removed:
   "Attuning to it curses you until you are targeted by a Remove Curse spell or similar magic. Removing the Shield fails to end the curse on you. Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."

The first part is close to the current `passive` family but still needs a predicate widening on `grant_resistance`. The second part is the blocker: the current surface has no honest way to model an attunement-bestowed curse that remains on the bearer after the item is no longer held.

## Why This Is Structural

Current `MagicItemMechanics` can express:

- passive grants while the item is worn / held / wielded
- activated abilities with item resources
- triggered reactions tied to the item
- composites over those same in-play mechanics

They cannot express:

- an `on_attunement` state change
- a curse that detaches from the item and persists on the creature
- a curse-ending condition like `Remove Curse or similar magic`

Even if the individual curse effect atom existed, there is no current mechanics family that can own its lifecycle honestly.

## Required Widenings

### 1. `grant_resistance.source_filter_all_damage`

Kind: `new_variant`

Why:
The existing surface requires a `damageType` on `grant_resistance`. This shield does not grant resistance to one damage type; it grants resistance to any damage whose source is an attack made with a ranged weapon.

Evidence:
> While holding this Shield, you have Resistance to damage from attacks made with Ranged weapons.

This should stay a widening of the existing `grant_resistance` atom, not a brand-new atom.

### 2. `redirect_attack_target`

Kind: `new_subgraph`

Why:
The curse does not add disadvantage, reduce damage, or block targeting. It rewrites the defender of an already-declared ranged-weapon attack before the attack resolves.

Evidence:
> Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead.

This is a new interception / retargeting mechanic, not an instance of an existing effect atom.

### 3. `magic_item.attunement_curse`

Kind: `new_variant`

Why:
The curse is bestowed at attunement time and continues after the shield is removed. That is not expressible as a normal passive item condition like `holding_item` or `wearing_item`.

Evidence:
> Attuning to it curses you until you are targeted by a Remove Curse spell or similar magic.
> Removing the Shield fails to end the curse on you.

One plausible direction is a record-level curse payload on magic items that:

- triggers on attunement
- attaches an ongoing effect package to the bearer
- defines its own end condition independently of the item's held/worn state

## Honest Classification

`structural_widening`

Reason:
The item is not blocked only by one missing atom. Its curse requires a new magic-item composition/lifecycle shape in addition to a retargeting mechanic.
