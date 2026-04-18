# Bag of Holding — widening notes

`Bag of Holding` fits the existing `magic_item` + passive family honestly for its primary mechanic:

- extradimensional storage space
- fixed carrying capacity
- fixed external weight
- shared finite air supply

That portion now authors cleanly as `container_storage`.

## Why this is not `clean`

Three SRD mechanics remain outside the current authored surface:

1. Retrieval action cost

The current `ContainerStorageProfile` has no field for interacting with stored contents. Capacity and air are modeled, but not the rule that accessing contents consumes a specific SRD action.

Evidence:

> Retrieving an item from the bag requires a Utilize action.

Recommended widening:

- Add a `retrievalAction` field on `ContainerStorageProfile` using the existing closed `StandardActionKind` vocabulary.

2. Non-charge destruction trigger

`ItemDestructionPolicy` only models charge exhaustion (`last_charge_roll`, `permanent_on_empty`). `Bag of Holding` needs destruction tied to overload or item damage, plus content fallout.

Evidence:

> If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane.

Recommended widening:

- Add an `ItemDestructionPolicy` variant for overload / damage destruction.
- If the repo wants to keep content fallout explicit, that variant should carry the contents destination (`astral_plane`).

3. Extradimensional collision subgraph

The item has a triggered interaction with other extradimensional containers that destroys both items, opens a temporary gate, and exiles nearby creatures in an area. The individual pieces are close to existing vocabulary (`transport_exile`, area geometry, destruction), but the passive magic-item surface has no triggerable item-item interaction subgraph to compose them honestly.

Evidence:

> Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.

> Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane.

Recommended widening:

- Add a passive triggered interaction subgraph for item-item collision conditions, or a bounded magic-item passive hazard family that can open an area effect when a named environmental/item predicate is met.

## Omitted but noted

This line is also not represented today:

> If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again.

That looks like a temporary disabled / inverted-container state on top of `container_storage`. I did not classify the unit from this rider alone because the primary widening pressure is already established by the retrieval and destruction gaps above.
