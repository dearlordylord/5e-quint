## Bag of Holding

The current surface encodes the bag's primary passive storage mechanic honestly via `magic_item` + `passive` + `container_storage`. That covers:

- extradimensional interior
- 500 lb maximum weight
- 64 cubic feet maximum volume
- fixed outside weight of 5 lb
- shared 10-minute air supply for breathing occupants

The unit is still not `clean` because several deterministic riders are outside the current authored surface.

### Missing surface

- `container_interaction` subgraph
  Evidence: "Retrieving an item from the bag requires a Utilize action."
  Why: `container_storage` is purely descriptive. It has no way to express that taking an item out of the container consumes a specific action quota.

- `ItemDestructionPolicy.overloaded_or_damaged`
  Evidence: "If the bag is overloaded, pierced, or torn, it is destroyed..."
  Why: current destruction policies only model charge depletion (`last_charge_roll`, `permanent_on_empty`) or no destruction. They do not model destruction from container state or item damage.

- `PassiveOperation` / item-trigger support for extradimensional-collision events
  Evidence: "Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane."
  Why: the item has a deterministic triggered clause, but non-spell passive operations only support elapsed-time cadence today.

- `inside_out_container_state` interaction shape
  Evidence: "If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again."
  Why: this introduces a reversible unusable/usable state transition for a passive container, which the current passive item surface cannot express.

### Why this is `surface_widening`, not `atom_widening`

The core passive storage effect already exists as `container_storage`, and the Astral-plane pull clause can be described with existing ideas (`transport_exile`, item destruction, area attachment) once item-side trigger/interaction grammar exists. The gap is the authored surface around passive item interactions and triggers, not the absence of the primary storage atom itself.

### Encoded subset

The authored file intentionally encodes only the passive storage profile. The omitted riders are described above rather than forced into misleading placeholder JSON.
