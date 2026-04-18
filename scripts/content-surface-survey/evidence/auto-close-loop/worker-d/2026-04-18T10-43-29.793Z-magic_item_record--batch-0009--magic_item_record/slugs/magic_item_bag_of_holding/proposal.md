## Bag of Holding

Outcome: `structural_widening`

### Why it does not fit cleanly

`Bag of Holding` is a `magic_item`, so the top-level record kind exists. The problem is the mechanics family.

The current magic-item surface can model:

- passive grants on the bearer;
- activated effects that resolve immediately through phases;
- triggered reactions;
- companion summons;
- composites of those families.

`Bag of Holding` is none of those. Its main rule is a persistent extradimensional **container state** with:

- tracked contents;
- fixed weight and volume limits;
- retrieval via a `Utilize` action;
- special failure modes when overloaded, pierced, torn, or turned inside out;
- breathable-air accounting for creatures inside;
- a cross-item interaction with other extradimensional containers.

If I forced this into `passive` or `activation`, the trace would lie about the item's actual mechanic. The bag is not primarily granting a creature-facing effect; it is maintaining and manipulating a storage space owned by the item.

### Missing family: stateful container item

The surface needs a family or subgraph for item-owned storage state.

Required capabilities:

- an item attachment / owned container space;
- tracked contents inside that space;
- capacity constraints by weight and volume;
- a retrieval procedure gated by `Utilize action`;
- operational state such as usable vs inside-out / unusable.

Evidence:

> "The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet."

> "Retrieving an item from the bag requires a Utilize action."

> "If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again."

### Missing family support: container failure and occupancy

The bag also has deterministic failure / occupancy behavior that depends on what is inside it.

Required capabilities:

- destruction triggered by overload or item damage;
- disposition of contents on destruction;
- interior occupancy and air-supply tracking for creatures inside.

Why existing shapes are insufficient:

- `ItemDestructionPolicy` only covers last-charge or empty-pool destruction, not stateful container failure.
- `transport_exile` acts on a subject being moved, not on a container's contents being scattered because the container failed.
- no existing family tracks creatures being inside an item-owned interior space.

Evidence:

> "If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane."

> "The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside."

### Missing family support: extradimensional breach interaction

The bag's other major rule is a deterministic interaction with another extradimensional item.

Required capabilities:

- cross-item trigger: one extradimensional container placed inside another;
- destruction of both items;
- creation of a transient gate at a location;
- area pull / forced transport of nearby creatures.

Why existing shapes are insufficient:

- this is not an activation chosen by the bearer;
- this is not a reaction window;
- this is not just `transport_exile`, because the gate and double-destruction are integral to the event;
- this is not `dm_agenda` overall, even though the final Astral destination is random / caller-owned.

Evidence:

> "Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane."

> "Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane."

### DM-agenda boundary

The phrase "random location on the Astral Plane" is caller-owned. That does not make the whole item `dm_agenda`.

The blocker is structural: before the caller picks a destination, the authored surface still needs a real way to represent:

- a stateful extradimensional container;
- its contents and occupants;
- failure / spill / destruction semantics;
- a cross-item breach event that opens a gate and pulls creatures through.

Because that family does not exist, no honest `content/magic_item_bag_of_holding.dhall` was authored.
