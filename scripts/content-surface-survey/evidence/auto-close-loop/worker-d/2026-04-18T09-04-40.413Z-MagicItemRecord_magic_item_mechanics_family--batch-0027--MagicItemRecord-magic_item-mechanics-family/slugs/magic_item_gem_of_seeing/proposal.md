## Gem of Seeing

Outcome: `surface_widening`

The unit fits the existing `magic_item` + `activation` family for its main mechanics:

- attunement-gated magic item
- fixed 3-charge `charge_pool`
- `standard_action` with `action = "magic"`
- timed self-applied `grant_sense` (`truesight`, 120 ft)
- `dawn` recharge with `1d3`

The remaining gap is the usage qualifier on the granted sense:

> "For the next 10 minutes, you have Truesight out to 120 feet **when you peer through the gem**."

The current surface can represent the timed grant of Truesight, but not that the sense is only active while the user is actively peering through the item during that duration window. Existing activation `condition` support is about equipment state at activation time, not a runtime usage predicate on an already-active sense.

## Proposed widening

- `new_variant`: add a conditional-use qualifier to `grant_sense` (or an equivalent effect-level runtime predicate) so authored content can express "this sense applies only while using the item in a specific way", e.g. peering through a gem, lens, or spyglass.

Why this is `surface_widening`, not `atom_widening`:

- the core effect atom already exists: `grant_sense`
- the family already exists: `magic_item` + `activation`
- what is missing is a more precise shape for an existing surface concept

## Trace discrepancy

The authored JSON includes a timed duration of 10 minutes, but the tracer output did not emit any lifecycle node for that duration. That looks like a tracer omission rather than a unit-shape problem.

## Verification note

`pnpm typecheck` currently fails in existing repo code at `src/interpreter/tracer.ts:3274` (`string[]` pushed where `string` is expected). I did not modify tracer code for this task.
