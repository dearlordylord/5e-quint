# Quantized Tactical Space Prototype

> **THROWAWAY PROTOTYPE — not a production package.**

## Question

Can one externally immutable, five-foot cell arena produce deterministic
movement and concise LLM-readable spatial observations without storing
pairwise creature or anchor geometry?

This prototype deliberately implements one policy profile: an eight-neighbour
square grid, Chebyshev quantized distance, diagonals that require both cardinal
routes to be unobstructed, strict centre-ray line of sight, and no inter-level
line of sight. The policy names are part of the parsed arena so none of those
decisions are implicit. This synthetic profile is not a claim about D&D RAW.

The observation language keeps visibility and cover separate. It renders the
absence of cover as `no cover` and uses RAW's `half`, `three-quarters`, and
`total` degrees otherwise. Adjudicator-only relations say `visibility blocked`
explicitly and are labeled as including unseen creatures.

The canonical arena contains cells, local boundaries, a dynamic door, explicit
vertical links, rectangular creature footprints, and semantic anchors. The
`south`, `90 ft`, visibility, cover, and path-cost facts shown to the viewer are
all derived from the same immutable snapshot. No pairwise relations are stored.
Privileged queries can inspect blocked relationships; the player observation
contains only visible entities, preventing the projection from leaking hidden
placements. Occupancy-aware reachability is deliberately a separate privileged
query: relaying its complete result could reveal an invisible creature through
the shape of an action mask. The higher-level adjudicator must decide which
movement choices the viewer is entitled to receive.

The portable logic is in `src/spatial.ts`. The terminal shell exists only to
drive the model and displays the relevant canonical and projected state after
each command. Nothing is persisted, and the package knows nothing about battle
rules or the rest of the workspace.

The accepted main architecture currently says that packages do not infer
geometry. This prototype is intentionally unintegrated evidence for deciding
whether that ownership rule should later change; adopting it as production
table infrastructure would require an explicit architecture decision first.

Run it from the repository root:

```sh
pnpm prototype:tactical-space
```

Start by comparing the fighter's observation of the orc before and after:

```text
door closed
door open
```

The orc remains exactly eighteen cells south—90 feet by the named range
policy—but its visibility and route change because the local gate boundary
changed. Try moving the fighter, focusing the two-cell ogre, or adding a new
footprint to find cases where the model feels wrong.
