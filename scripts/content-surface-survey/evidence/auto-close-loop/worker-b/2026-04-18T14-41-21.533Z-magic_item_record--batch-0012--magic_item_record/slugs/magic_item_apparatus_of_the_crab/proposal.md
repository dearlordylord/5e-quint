## Apparatus of the Crab

Outcome: `structural_widening`

The existing `MagicItemRecord` families are not an honest fit.

Why it does not fit:

- This item is primarily a **stateful vehicle / object**, not a passive grant, a single activated ability, a triggered reaction, an on-hit rider, or a spawned companion.
- Its rules depend on **persistent internal configuration state** driven by ten separate levers:
  - legs extended vs. retracted
  - shutters open vs. closed
  - claws extended vs. retracted
  - hatch open vs. sealed
  - lights on vs. off
- Several lever effects are not one-shot effects; they are **mode switches on the apparatus itself** that later change what other controls can do.
- The apparatus has its own **object stat block** and environment-facing rules:
  - AC 20, HP 200
  - Speed 30 ft., Swim 30 ft., or 0 ft. when legs are retracted
  - immunity to poison and psychic damage
  - airtight / watertight compartment with shared air
  - pressure damage below 900 feet
- Lever 5 exposes an **attack option owned by the vehicle/object**, including a grapple rider with an escape DC, which is not representable as a normal magic-item activation by the wearer without lying about who is acting.
- Lever use is a repeated **vehicle-control procedure**: a creature inside can take the Utilize action to move up to two levers, then each lever returns to neutral.

What widening seems required:

- A new top-level mechanics family for a **controllable vehicle / object platform**.
- That family likely needs:
  - an object/vehicle stat block
  - occupancy / pilot requirements
  - persistent mode state
  - a table of control inputs whose effects mutate that mode state or invoke vehicle-owned actions
  - environment rules like shared air and pressure damage

Why this is structural rather than atom-only:

- The missing concept is not just one effect atom. The current families have no place to honestly anchor a multi-control, stateful vehicle with its own statistics and action surface.

Evidence from the unit text:

> "To be used as a vehicle, the apparatus requires one pilot."

> "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down."

> "The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage."

> "Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure."
