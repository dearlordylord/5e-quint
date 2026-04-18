# Bag of Holding

`Bag of Holding` does not fit the current authored surface honestly.

## Why it does not fit

The current `magic_item` surface only admits:

- `passive`
- `activation`
- `composite` over passive/activation parts

`Bag of Holding` is neither a passive grant nor a charge/use activation. Its core mechanic is a **stateful extradimensional container** with:

- storage capacity by weight and volume;
- an access procedure ("Retrieving an item from the bag requires a Utilize action");
- conditional destruction on overload / piercing / tearing;
- temporary disablement when turned inside out;
- finite breathable air for creatures inside;
- a triggered cross-item interaction with other extradimensional spaces that destroys both items, opens a gate, and exiles nearby creatures.

That requires a dedicated item-state / trigger subgraph rather than another effect atom on an existing passive or activation family.

## Forced widenings

### 1. New subgraph: stateful container item

The surface needs a magic-item family or reusable subgraph for an item that owns stored contents and exposes container rules.

Minimum pressure from this item:

- interior capacity state:
  - max weight: 500 lb
  - max volume: 64 cubic feet
- access rule:
  - retrieving contents costs a `Utilize` action
- conditional usability:
  - "must be put right before it can be used again"
- environment inside the container:
  - breathable air duration shared across creatures inside

Evidence:

> "The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet."

> "Retrieving an item from the bag requires a Utilize action."

> "If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again."

> "The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside."

### 2. New subgraph: triggered extradimensional collision

The surface needs a way to model a trigger caused by placing one item inside another extradimensional space, with multiple deterministic consequences.

Minimum pressure from this item:

- trigger: item placed inside another extradimensional container;
- destroy both items immediately;
- create a one-way temporary gate at the placement point;
- affect creatures in a 10-foot-radius Sphere around the gate;
- transport affected creatures to a random location on the Astral Plane;
- gate closes immediately and cannot be reopened.

Evidence:

> "Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane."

> "Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane."

> "The gate then closes. The gate is one-way and can't be reopened."

### 3. New variant or broader lifecycle for non-charge item destruction

`ItemDestructionPolicy` only covers:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

This item needs destruction from physical/item-state triggers instead:

- overloaded
- pierced
- torn
- extradimensional-collision event

Evidence:

> "If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane."

## Why this is structural, not just atom widening

Even if individual effects like `transport_exile` already exist, the current top-level mechanics families cannot express:

- a persistent container-owned state model;
- non-activation retrieval rules;
- trigger-driven item-to-item interaction;
- destruction keyed to physical/container state rather than charge exhaustion.

Any JSON produced today would have to lie about the item by pretending it is just a passive grant or a one-shot activation.
