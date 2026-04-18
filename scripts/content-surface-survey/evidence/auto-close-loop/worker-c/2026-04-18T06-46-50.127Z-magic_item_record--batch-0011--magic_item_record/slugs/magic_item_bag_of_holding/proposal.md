`Bag of Holding` does not fit the current authored surface honestly.

Why it does not fit:

- The existing `magic_item` families are `passive`, `activation`, and `composite` over those two. `Bag of Holding` is primarily a stateful container item, not a passive grant and not an activated ability with a use-count/reset cadence.
- Its core rules require owned item state and trigger-driven behavior:
  - persistent extradimensional storage capacity;
  - retrieving contents via a `Utilize` action;
  - destruction when overloaded / pierced / torn;
  - contents scattering to the Astral Plane on destruction;
  - a cross-item interaction with other extradimensional spaces that destroys both items and opens a one-way gate that pulls nearby creatures to the Astral Plane.
- None of that can be represented as an honest `grants` list or as `phases` on an activation without inventing false triggers, false resources, or false effect timing.

Narrowest honest classification: `structural_widening`.

What would be needed:

1. A new magic-item mechanics family for stateful container items.
   - It needs owned container state such as capacity limits, current contents, and access semantics.
   - Evidence: "The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet." and "Retrieving an item from the bag requires a Utilize action."

2. A trigger/lifecycle surface for item destruction from non-activation events.
   - Current `ItemDestructionPolicy` only covers charge-pool exhaustion. This item is destroyed by overload / piercing / tearing and by a specific cross-item interaction.
   - Evidence: "If the bag is overloaded, pierced, or torn, it is destroyed..." and "Placing a Bag of Holding inside an extradimensional space ... instantly destroys both items..."

3. A cross-item interaction subgraph for extradimensional-space collisions.
   - The current surface has no way to say "if item A is placed inside item B, resolve destruction plus a hazardous area effect at that location."
   - Evidence: "opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other."

4. Area-triggered forced planar transport tied to that gate event.
   - `transport_exile` exists as an effect atom, but the current families do not provide an honest host shape for this item's instantaneous gate-on-collision event.
   - Evidence: "Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane."

Secondary note:

- "The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside." is another stateful environmental rule not representable in the current surface. I am not using that as the primary blocker because the storage/collision mechanics already force structural widening.
