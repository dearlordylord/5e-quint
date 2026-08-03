# Quantized Tactical Space Prototype

> **THROWAWAY PROTOTYPE — not a production package.**

## Question

Can one externally immutable, five-foot cell arena expose useful route geometry,
terrain facts, visibility, cover, and LLM-readable relative positions without
storing pairwise creature or anchor geometry?

This package implements only the spatial kernel. It has no D&D movement-cost
rules, terminal interaction, scenario, battle state, or dependency on another
workspace package. Callers may supply a step evaluator to weighted route search,
but the kernel treats the returned weight as opaque.

The prototype deliberately implements one policy profile: an eight-neighbour
square grid, Chebyshev quantized distance, diagonals that require both cardinal
routes to be unobstructed, strict centre-ray line of sight, and no inter-level
line of sight. The policy names are part of the parsed arena so none of those
decisions are implicit. This synthetic profile is not a claim about D&D RAW.

The canonical arena contains terrain-bearing cells, local boundaries, dynamic
doors, explicit vertical links, rectangular token footprints, and semantic
anchors. Relations and observations are derived from an immutable arena value
and immutable spatial-state revisions. No pairwise relations are stored.

Visibility and cover remain separate facts. Player observations contain only
visible tokens, while privileged relations can explicitly report blocked
visibility. Route results are bound to the arena and spatial revision from which
they were derived, so a stale route cannot be traversed.

The accepted main architecture currently says that packages do not infer
geometry. This package is intentionally unintegrated evidence for deciding
whether that ownership rule should later change; adopting it as production
table infrastructure would require an explicit architecture decision first.

Companion experiments remain separate packages:

- [`@dnd/tactical-adjudicator-prototype`](../tactical-adjudicator-prototype/README.md)
  interprets terrain facts as D&D movement weights.
- [`@dnd/tactical-space-cli-prototype`](../tactical-space-cli-prototype/README.md)
  composes a synthetic scenario and terminal interface.
