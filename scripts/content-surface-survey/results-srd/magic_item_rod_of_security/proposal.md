## Rod of Security

`Rod of Security` fits the existing `magic_item` top-level kind and is closest to the `activation` mechanics family, but it does not fit the current surface honestly enough to author a `content/magic_item_rod_of_security.dhall`.

### Why I stopped

The current surface can represent the initial activation cost and the outward `transport_exile` move to a `demiplane`, but three core mechanics are missing:

1. Dynamic duration formula
The effect duration is not fixed. It is `200 days / number of creatures present (round down)`. Existing `DurationValue` only supports literal amounts plus slot-based upcast tiers.

2. Mandatory return loop
The rod does not merely exile visitors. It guarantees that when the time expires, or when the wielder takes a Magic action to end the effect, all visitors return to the activation site (or nearest unoccupied space). The current surface comments explicitly call out `return_on_end` as a lifecycle concern for `transport_exile`, but `types.ts` has no authored shape for it.

3. Hourly healing by each visitor's own Hit Point Die
The demiplane grants recurring healing every hour, but the amount is not a fixed `DiceAmount`. It is derived from the healed creature's own Hit Point Die expression, which the current surface cannot reference.

### Narrowest honest classification

`surface_widening`

The unit does not force a new top-level kind or a new payload family. It still looks like a magic-item activation. The gaps are specific missing variants in existing authored shapes:

- a dynamic duration variant for occupant-count-based exile limits;
- a return-on-end / early-end lifecycle branch for `transport_exile`;
- a heal amount variant derived from the attached creature's Hit Point Die.

### Evidence from the unit text

- "The rod then instantly transports you and up to 199 other willing creatures you can see to a demiplane."
- "For each hour spent in the demiplane, a visitor regains Hit Points as if it had spent 1 Hit Point Die."
- "Visitors can remain there for up to 200 days divided by the number of creatures present (round down)."
- "When the time runs out or you take a Magic action to end the effect, all visitors reappear in the location they occupied when you activated the rod or an unoccupied space nearest that location."

### Why I did not author a placeholder

Authoring only the outbound exile would be false. The return behavior and the time-limit are part of the rod's main mechanic, not optional flavor. Omitting them would make the generated trace claim a one-way demiplane transport, which is materially wrong.
