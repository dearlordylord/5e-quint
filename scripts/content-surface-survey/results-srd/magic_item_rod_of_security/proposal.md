## Rod of Security

`Rod of Security` fits the existing top-level `magic_item` record kind and the `activation` mechanics family in broad shape, but it does not fit the current authored surface honestly.

### Why no authored content file

The item's core deterministic rule is not "gain a passive bonus" or "cast a named spell." It is:

- activate the rod with a Magic action;
- transport the wielder and up to 199 willing visible creatures to a demiplane;
- sustain a temporary exile state there;
- apply an hourly restorative rider while they remain there;
- return everyone to the origin point or nearest unoccupied space when the effect ends;
- lock the property for 10 days after use.

The current surface can encode the activation cost and long recharge cadence, but it cannot encode the demiplane transport loop itself without lying.

### Required widenings

1. `transport_exile` effect atom in the surface

The prototype has `teleport`, but that is limited to local relocation to an unoccupied visible space. `Rod of Security` moves creatures into a distinct demiplane, which is a different mechanic.

Evidence:

> "The rod then instantly transports you and up to 199 other willing creatures you can see to a demiplane."

2. `return_on_end` lifecycle/effect support

The exile is temporary and must unwind automatically on timeout or manual termination, returning occupants to their recorded origin location or nearest unoccupied space. The current surface has no way to model that return.

Evidence:

> "When the time runs out or you take a Magic action to end the effect, all visitors reappear in the location they occupied when you activated the rod or an unoccupied space nearest that location."

3. Hourly Hit-Die-style healing variant

The restorative rider is not a fixed heal and not a rest reset. It is a recurring per-hour heal calculated "as if" the creature spent one of its own Hit Dice. Current `heal_hp` authoring can express fixed dice, scaling, linked damage, or resource spent from the activation resource, but not "use the target creature's Hit Die formula once per hour."

Evidence:

> "For each hour spent in the demiplane, a visitor regains Hit Points as if it had spent 1 Hit Point Die."

4. Dynamic duration derived from creature count

The maximum stay is a formula over group size, not a fixed timed duration.

Evidence:

> "Visitors can remain there for up to 200 days divided by the number of creatures present (round down)."

### Out-of-core / omitted narrative riders

These are real text, but they are not the reason the encode fails:

- choosing the demiplane's form;
- enough food and water to sustain visitors;
- the demiplane environment cannot harm occupants;
- objects from the demiplane cease to exist outside it;
- creatures do not age while there.

Those read as caller/world-state concerns for this prototype. The encode is blocked before those matter because the transport/return/healing loop itself is missing.

### Classification

`surface_widening`

Reason: the record kind and family already exist (`magic_item` + `activation`), but the current surface lacks the necessary effect/lifecycle/value variants to encode the item honestly.
