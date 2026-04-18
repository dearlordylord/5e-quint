## Verdict

`Bag of Holding` does not fit the current authored surface honestly. The narrowest correct classification is `structural_widening`.

## Why It Doesn't Fit

The current `MagicItemMechanics` surface only admits:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` over those families

`Bag of Holding` is not any of those.

Its core mechanic is a persistent item-owned container with runtime state:

- an interior capacity distinct from its outside form;
- weight and volume limits on stored contents;
- a required `Utilize` action to retrieve an item;
- a usable / unusable state when turned inside out;
- breathable-air duration shared across creatures inside;
- destructive failure states when overloaded, pierced, or torn.

That is not a static grant, not a one-shot activation, and not a bounded composition of existing item families.

## Missing Structure

### 1. Persistent container item family

The item needs a family that can represent an item with durable storage semantics and internal state.

Needed behavior:

- storage capacity by weight and volume;
- persistent contents;
- retrieval cost;
- inside-out disabled state until restored;
- occupants / creatures-inside tracking;
- shared air-supply countdown.

Evidence:

> This bag has an interior space considerably larger than its outside dimensions... The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.

> Retrieving an item from the bag requires a Utilize action.

> If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again.

> The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside.

### 2. Extradimensional collision / rupture hazard subgraph

The item also needs a way to represent deterministic destruction and item-to-item interaction hazards.

Needed behavior:

- destruction on overload / piercing / tearing;
- contents scattered to the Astral Plane on rupture;
- interaction with another extradimensional item creating a temporary gate;
- area pull around that gate;
- forced exile to the Astral Plane for affected creatures.

Evidence:

> If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane.

> Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.

> Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane.

## Why Existing Families Are Insufficient

### Not `passive`

The item does not primarily grant a static modifier or always-on effect to a bearer.

### Not `activation`

An activation can model a discrete use with phases. It cannot honestly model persistent stored contents, capacity tracking, inside-out state, or air supply.

### Not `triggered_reaction`

There is no reaction-window mechanic here.

### Not current spell-side families

`anchored_trigger` is also wrong. The bag does not plant a trigger and later release a stored effect as its primary behavior. The extradimensional hazard is subordinate to the main container-state mechanic.

## DM-Agenda Boundary

Two details are caller-owned:

- what counts as a "similar item";
- the random exact location on the Astral Plane.

Those do not make the whole unit `dm_agenda`. The destruction, gate opening, radius-based suction, and forced planar relocation are deterministic mechanics that the surface should be able to express once the missing family exists.
