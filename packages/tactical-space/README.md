# `@dnd/tactical-space`

Optional experimental Table adapter for deterministic five-foot square-cell
geometry on a single-level battlefield. The package owns only its geometry
experiment. It has no dependency on the battle runtime, adjudicator, CLI,
authored content, persistence, or networking packages.

This package is not a Battle Runtime, MCP, or Target SDK completeness
requirement. A Table may select it when its supported envelope is useful, or
may provide a coherent typed spatial witness directly when it is not. Missing
geometry support is therefore an experiment boundary, not an automatic product
feature request; pure geometry expansion requires a separate architecture
decision. The product ownership rule is in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md#spatial-modeling-frontier).

## Kernel boundary

`parseArena` is the serializable input boundary. It validates and accumulates
independent cell and static-boundary issues, then returns an opaque `Arena`.
Coordinates and caller-owned token IDs are parsed at their boundaries with
`parseCoordinate` and `parseTokenId`.

`createState` creates an opaque immutable state. `placeToken`, `removeToken`,
`occupantsAt`, `snapshot`, `relationBetween`, and `interveningTokens` derive
public spatial facts.
`restoreState` reconstructs the opaque query state from an arena snapshot and
its matching spatial snapshot, so durable evidence can remain the single
spatial owner.
Every successful state change creates a new revisioned value; retained values
remain valid and unchanged. Tokens are one-cell placements, and overlap is
valid spatial state.

Relations are deliberately pathfinding-free. They report direct Chebyshev
distance, compass direction, geometric sight, and Cover. Static boundaries
independently carry traversal and sight facts. Their Cover is either
`intervening` for every ray crossing the boundary or `protected-occupant` for
an attack whose target occupies one named endpoint. A center ray uses a
supercover corner policy: all local cardinal boundary segments touched at an
exact corner contribute to blocked-if-either sight and maximum applicable
Cover. `interveningTokens` uses exact occupied-cell intersection and therefore
also finds a cell crossed away from its center.
The structured `same-horizontal-position` direction is reserved for zero
displacement/overlap; a target sharing only the source's x or y coordinate is
reported as north, south, east, or west.

`planRoute` is the one explicit route operation. The trusted in-process caller
supplies a pure `StepEvaluator`; a remote agent supplies only ordinary route
intent to its higher-level server API and never sends evaluator code. Each
prospective step contains the entered terrain and stable occupant IDs, while
the returned plan reports physical distance separately from opaque evaluator
weight. Candidate routes are ordered by total evaluator weight, then physical
distance, then lexicographic numeric coordinate sequence, making ties
deterministic. `physicalDistanceEvaluator` is the package-provided shortest
geometric policy.

For example, a server may receive the serializable intent
`{ mover: "mage", destination: { x: 4, y: 2 } }`, authenticate it, parse the
destination, select its trusted evaluator, and then call
`planRoute(state, mover, destination, serverEvaluator)`. The evaluator is
never part of that network request.

`previewStep` evaluates one adjacent transition without mutation. The returned
`StepPreview` is an opaque WeakMap-authenticated capability. `commitPreview`
accepts only that package-created value and verifies exact arena identity,
state fingerprint, mover origin, and step context. Preview capabilities have no
hidden consumption state, so replaying one against the same retained state is
pure. `previewRelation` exposes before/after facts for one explicitly named
counterpart.

The readable fields on a successful preview are advisory facts for an
adjudicator or client to inspect. A future client-copy plan may use them for
local suggestions, but only the authoritative server-selected evaluator and
server commit determine a server decision.

An authored arena may use any finite safe-integer coordinates whose per-axis
span is at most `floor(Number.MAX_SAFE_INTEGER / 5)` cells. This is an exact
numeric-capacity rule, not an arbitrary map-size limit; sparse authored maps do
not make sight or Cover walk through every coordinate between two cells.

All ordinary failures are discriminated result values. Parsed values,
snapshots, plans, relations, and returned facts are deeply frozen. The package
does not expose redaction, deltas, subscriptions, or client/server
reconciliation in this MVP.

## State identity and portability

Arena and spatial-state fingerprints are separate branded protocol values. A
state fingerprint includes the arena fingerprint, revision, and one canonical
sorted placement projection. The digest is SHA-256 rendered as
`sha256:<64 lowercase hex digits>`. SHA-256 is implemented in this package
using widely available `TextEncoder` and `DataView` platform primitives rather
than Node's `crypto` module, keeping the kernel synchronous and suitable for a
future browser/client mirror without a runtime-specific dependency.

Canonical ordering uses numeric coordinate order and an explicitly implemented
Unicode UTF-16 code-unit comparator for token IDs; it does not depend on host
locale settings.

## Example flow

```ts
import {
  createState,
  parseArena,
  parseCoordinate,
  parseTokenId,
  placeToken,
  relationBetween,
  renderRelation,
} from "@dnd/tactical-space";

const arenaResult = parseArena({
  cells: [
    { x: 0, y: 0, terrain: "ordinary" },
    { x: 1, y: 0, terrain: "ordinary" },
  ],
  boundaries: [],
});
if (arenaResult.tag === "error") {
  // Report every arenaResult.issues entry to the map author.
} else {
  const source = parseTokenId("mage");
  const target = parseTokenId("orc");
  const origin = parseCoordinate({ x: 0, y: 0 });
  const targetCell = parseCoordinate({ x: 1, y: 0 });
  if (
    source.tag === "ok" &&
    target.tag === "ok" &&
    origin.tag === "ok" &&
    targetCell.tag === "ok"
  ) {
    const firstPlacement = placeToken(
      createState(arenaResult.value),
      source.value,
      origin.value,
    );
    if (firstPlacement.tag === "ok") {
      const state = placeToken(
        firstPlacement.value,
        target.value,
        targetCell.value,
      );
      if (state.tag === "ok") {
        const relation = relationBetween(
          state.value,
          source.value,
          target.value,
        );
        // relation is structured; renderRelation(relation.value) is optional.
      }
    }
  }
}
```
