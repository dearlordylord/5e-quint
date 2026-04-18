# Bag of Holding

## Verdict

`structural_widening`

I did not author `content/magic_item_bag_of_holding.dhall` because the item does not fit any existing `MagicItemMechanics` family honestly.

## Why It Doesn't Fit

The current magic-item surface supports:

- `passive` grants
- `activation` abilities with resource/reset cadence
- `triggered_reaction`
- `spawned_creature`
- `composite` over those families

`Bag of Holding` is not primarily any of those.

Its core mechanics are:

- persistent container capacity and interior-space rules
- item retrieval gated by a `Utilize` action
- destruction or unusable-state transitions driven by physical state (`overloaded`, `pierced`, `torn`, `turned inside out`)
- bounded breathable-air tracking for creatures inside
- a cross-item collision rule with other extradimensional spaces that destroys both items and creates a temporary Astral gate

Those are container/inventory/state-machine mechanics, not grants or activations.

## Specific Gaps

### 1. Missing container-storage family

The surface has no way to represent:

- a held collection of stored contents
- capacity limits by weight and volume
- retrieval from contents as a `Utilize` action
- an inside/out usable-vs-unusable state
- finite air supply for creatures inside the container

Trying to encode this as a passive item would be false, because the item does not grant a character buff. Trying to encode it as an activation would also be false, because the bag's primary behavior is not a discrete user-triggered effect with a bounded resolution sequence.

### 2. Missing cross-item extradimensional interaction subgraph

The rule:

> Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.

is a triggered interaction between two items plus their stored-state categories. The current surface has no family for:

- "if item A enters item B's extradimensional interior"
- destroy both items
- create a short-lived gate at the interaction point
- affect nearby creatures in an area
- exile those creatures to a random Astral location

Some downstream atoms already exist conceptually (`area`, `item_destruction`, `transport_exile`-like behavior), but there is no honest top-level family or trigger grammar that lets this interaction be authored.

## Why This Is Not `dm_agenda`

The item is not purely narrative. Several parts are deterministic:

- capacity limits
- `Utilize` action retrieval
- destruction on overload / piercing / tearing
- contents spilling when turned inside out
- the extradimensional collision creating a 10-foot-radius gate and pulling creatures through

The problem is not that the item is outside core mechanics. The problem is that the current authored surface only models buffs, activations, reactions, summons, and close relatives, while `Bag of Holding` is mostly persistent object-state and cross-object interaction.

## Narrowest Honest Classification

`structural_widening` is narrower and more accurate than `atom_widening` here. The issue is not just one missing atom. The surface lacks a suitable top-level family / subgraph for persistent container items and for extradimensional item-collision triggers.
