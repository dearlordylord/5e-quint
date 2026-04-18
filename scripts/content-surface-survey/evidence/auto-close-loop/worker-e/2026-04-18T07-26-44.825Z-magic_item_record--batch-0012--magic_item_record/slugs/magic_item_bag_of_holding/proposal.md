# Proposal: Bag of Holding

## Outcome

`structural_widening`

The current surface can encode passive items, activated abilities, triggered reactions, and composites of those. `Bag of Holding` is not honestly any of those. Its core mechanic is a **persistent extradimensional container object** with storage capacity, retrieval interaction, breathable-air tracking for creatures inside, destruction triggers, and a special cross-item interaction that opens a short-lived Astral gate.

## Why It Does Not Fit

The missing piece is not a single effect atom. The item needs a new mechanics family for a stateful container / extradimensional object.

What the existing families cannot express:

- Persistent storage state on the item itself: interior volume, weight capacity, contents, and the invariant that the bag's outside weight stays 5 pounds regardless of contents.
- A reusable object interaction rule: retrieving an item requires a `Utilize` action, but this is not a one-shot activation with charges or rest resets.
- Environmental rules for creatures inside the container, including a finite shared air supply divided across breathing creatures.
- Destruction and spill behavior tied to object-state changes such as overloading, piercing, tearing, or turning the bag inside out.
- A cross-item interaction with another extradimensional space that destroys both items, opens a temporary gate, and forcibly transports nearby creatures to the Astral Plane.

## Proposed Widenings

### 1. New mechanics family: `container_object`

Kind: `new_subgraph`

Needed because the bag is an enduring object with its own storage semantics, not a buff on a creature or a spend-a-resource activation.

Evidence:

> "This bag has an interior space considerably larger than its outside dimensions—roughly 2 feet square and 4 feet deep on the inside. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents."

### 2. New reusable interaction shape for retrieving / stowing contents

Kind: `new_subgraph`

Needed because the item exposes repeatable object-local interactions during play, keyed to the `Utilize` action, without any activation resource or rest cadence.

Evidence:

> "Retrieving an item from the bag requires a Utilize action."

### 3. New persistent container-environment state

Kind: `new_variant`

Needed because the unit tracks breathable air inside the extradimensional space as a shared finite resource based on the number of breathing creatures within it.

Evidence:

> "The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside."

### 4. New cross-item extradimensional interaction subgraph

Kind: `new_subgraph`

Needed because the bag has a special trigger when nested in another extradimensional space: destroy both items, create a temporary gate, and transport nearby creatures through it. This is neither a passive grant nor a normal activation.

Evidence:

> "Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane."

### 5. New attachment / destination variant for gate-centered area exile

Kind: `new_variant`

Needed because the forced transport is centered on a newly created gate location rather than the wielder, a target creature, or a pre-existing spell attachment. The current surface has `transport_exile`, but no honest family here that can create and center an area suction event on an item-interaction-created gate.

Evidence:

> "Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane."

## Notes

Some isolated pieces overlap existing concepts, such as `transport_exile` to the Astral Plane. That does not make the whole unit encodable today. The blocker is structural: the bag is fundamentally a persistent extradimensional container with stateful object interactions and a special nested-space failure mode, none of which fit the existing magic-item families without inventing a false activation trace.
