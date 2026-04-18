# Bag of Holding

## Verdict

`structural_widening`

## Why It Does Not Fit

`Bag of Holding` is not primarily:

- a passive grant list;
- an activated ability with use-count/reset cadence;
- a triggered reaction;
- a spawned-creature item;
- or a composite of those existing families.

Its core mechanic is a **stateful extradimensional container** with:

- persistent storage limits by weight and volume;
- fixed external weight regardless of contents;
- a retrieval procedure that costs a `Utilize` action;
- air-supply tracking for creatures inside;
- destruction / spill / scatter behavior when overloaded, pierced, torn, or turned inside out;
- a cross-item interaction rule for nesting extradimensional spaces that destroys items and creates an Astral gate affecting nearby creatures.

Current `MagicItemMechanics` has no family that can own this item state honestly. Encoding it as `passive` with empty or unrelated grants would produce a misleading trace.

## Narrowest Honest Widening

### 1. New mechanics variant: `MagicItemMechanics.container`

This family would own deterministic container state instead of pretending the item is a grant source.

Minimum pressure from this item:

- capacity by weight;
- capacity by volume;
- exterior weight override;
- retrieval procedure with `Utilize` action cost;
- breathable-air budget;
- breach / inside-out lifecycle hooks.

Evidence:

> The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents. Retrieving an item from the bag requires a Utilize action.

> The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside.

### 2. New subgraph for container breach / extradimensional collapse

The current passive-operation grammar only supports elapsed-time cadence. This item needs event-triggered passive behavior tied to object state and item-item interaction.

Minimum pressure from this item:

- on overload / piercing / tearing: destroy item, scatter contents to Astral Plane;
- on turn-inside-out: contents spill, item disabled until restored;
- on nesting in extradimensional space: destroy both items, create a temporary gate, area-affect nearby creatures, exile them to Astral Plane, then close the gate.

Evidence:

> If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane.

> If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again.

> Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.

> Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane. The gate then closes.

## Why This Is Not `dm_agenda`

The bag has caller-owned inventory and table-state concerns, but its core behavior is not purely narrative. The capacities, destruction triggers, and Astral-gate consequences are deterministic enough to model. The problem is missing structure, not DM-only ownership.

## Why This Is Not Just `surface_widening`

Existing atoms and attachments can describe fragments of the Astral-gate clause, but the **top-level family is wrong**. There is no honest place to hang persistent container state plus non-reaction event triggers in the current `MagicItemMechanics` union.
