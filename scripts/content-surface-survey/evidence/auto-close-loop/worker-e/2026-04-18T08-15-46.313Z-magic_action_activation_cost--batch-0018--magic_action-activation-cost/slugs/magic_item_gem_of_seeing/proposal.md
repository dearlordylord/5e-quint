# Gem of Seeing

## Verdict

`surface_widening`

## Why it does not fit cleanly

The item's overall shape already exists:

- `magic_item`
- `activation` family
- `charge_pool` resource
- `dawn` recharge
- timed duration
- `grant_sense` with `sense = "truesight"`

The gap is narrower than a new family or new atom. The current surface can only say:

- "you have truesight for 10 minutes"

But the SRD text says:

> "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."

That is not full always-on truesight during the duration. It is truesight gated by a deterministic usage condition tied to the item: the bearer must be peering through the gem.

Encoding this as an unconditional timed `grant_sense` would produce a misleading trace and overstate the item's benefit.

## Proposed widening

Add a narrow qualifier on `grant_sense` for item-mediated viewing, e.g.:

- `grant_sense.only_while_peering_through_item`

Equivalent shapes would also work if they preserve the same semantics, for example:

- a `grant_sense` view-mode field scoped to the activation
- a reusable perception/view predicate that can gate ongoing grants

The important requirement is that the surface can distinguish:

- full truesight while the effect lasts

from

- truesight only while looking through a specific item during the effect's duration

## Why this is surface, not atom, widening

`grant_sense` already exists in both the authored surface and the tracer. The missing piece is a more precise variant/qualifier on that existing effect, not a new v4 atom and not a new top-level mechanics family.
