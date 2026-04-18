## Verdict

`Figurine of Wondrous Power` does not fit the current authored surface honestly as a single `magic_item` record. The blocker is not the base summon itself; several variants are close to `spawned_creature`. The problem is that the collection's core mechanics depend on summon-bound side systems that the existing magic-item families do not model.

## What fits today

The shared baseline is representable:

- Magic-item collection with rarity variants
- Magic action activation
- Summoned creature that is friendly, obeys commands, and acts immediately after the user
- Timed existence with early reversion on 0 HP or manual dismissal
- Cooldowns measured in elapsed days

Variants such as Bronze Griffon, Marble Elephant, and Goat of Travail are close to plain `spawned_creature`.

## Why I stopped

Several variants force missing structure, not just omitted minor riders:

- `Golden Lions` can produce one or both lions simultaneously from a paired item. Current magic-item summon support creates one companion payload per activation.
- `Goat of Terror` adds mechanics bound to the active summoned goat:
  - a ride-gated fear aura from the goat's position
  - temporary horns that become two separate magic weapons and automatically revert when the goat reverts
- `Goat of Traveling` spends charges continuously per hour while the goat remains active, rather than paying a fixed activation cost up front.
- `Silver Raven` grants a spell only while the raven form exists, and the granted spell is restricted to that specific summoned creature.
- `Obsidian Steed` introduces a 10% rebellious state on use, then a mount-only mishap branch that transports rider and summon to Hades before forced reversion.

Those are core mechanics for those variants. Encoding the item as a plain summon collection would erase the parts that make those variants distinct.

## Narrowest honest classification

`structural_widening`

Reason: this item needs a summon-centered magic-item subgraph that can host:

- multiple companions from one activation
- companion-bound auxiliary riders while the summon exists
- duration-based resource drain during an active summon
- summon-state misfire/rebellion branches

This is broader than a single missing atom and broader than one extra field on the existing `spawned_creature` payload.
