## Gem of Seeing

Outcome: `surface_widening`

The item fits the existing `magic_item` top-level kind and broadly fits the `activation` mechanics family:

- charge pool: 3 charges
- activation cost: Magic action
- reset cadence: daily at dawn, regain `1d3`
- timed duration: 10 minutes
- effect payload: `grant_sense` with `sense = "truesight"` and `rangeFeet = 120`

The blocking gap is the activation's ongoing usage gate:

> "For the next 10 minutes, you have Truesight out to 120 feet **when you peer through the gem**."

The current surface can express:

- activation-time equipment predicates such as `holding_item`
- unconditional timed grants applied by an activation
- passive equipment-gated grants such as "while holding this item"

It cannot express a timed effect whose grant only applies while the subject performs a narrower, item-specific posture or usage condition during that duration. Encoding this as a plain timed `grant_sense` would overstate the rule by granting unconditional Truesight for the full 10 minutes.

Suggested widening:

- add a new variant to the ongoing/activated condition grammar for item-scoped active use, e.g. a timed grant predicate such as `peering_through_item`
- alternatively add a grant-side conditional wrapper that can gate an effect atom during a duration window

Why this is `surface_widening`, not `atom_widening`:

- the underlying v4 effect atom already exists: `grant_sense`
- the missing piece is an authored-surface shape for conditional timed application, not a new effect atom
