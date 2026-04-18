**Why It Doesn't Fit**
`Bag of Holding` does not honestly fit the current authored surface.

The existing `magic_item` mechanics families are:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` of those

Those families cover buffs, spell access, activated effects, and reaction procedures. `Bag of Holding` is primarily a persistent container with its own storage state:

- extradimensional interior
- capacity limits by weight and volume
- item retrieval gated by the `Utilize` action
- destruction / unusable states based on overload, piercing, tearing, or turning inside out
- breathable-air tracking for creatures inside

That is not a passive grant and not a one-shot activation. Treating it as either would produce a false trace.

**Required Widening**
Add a container/storage mechanics family or equivalent subgraph for magic items with durable inventory state. At minimum it needs to represent:

- persistent storage space tied to an item
- capacity constraints:
  - 500 pounds
  - 64 cubic feet
- retrieval interaction:
  - requires `Utilize` action
- failure / lifecycle transitions:
  - overloaded
  - pierced
  - torn
  - turned inside out

**Secondary Pressure**
The extradimensional-collision clause is a second structural gap:

> Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.

That rule needs a multi-step item-interaction procedure:

- detect nesting inside another extradimensional container
- destroy both items
- create a temporary gate at the interaction point
- affect creatures in a 10-foot-radius Sphere
- transport them to a random Astral Plane location
- close the gate

The current surface has `transport_exile`, but not the surrounding trigger/procedure/container model needed to reach it honestly from this item text.

**Classification**
`structural_widening`

The missing piece is not just one effect atom. The unit's primary rule shape requires a new mechanics family or equivalent structural subgraph for persistent container-state items.
