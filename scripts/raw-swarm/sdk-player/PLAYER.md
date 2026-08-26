# SDK battle player

Read `SCENARIO.md` and `OBSERVATION.json`. You are an
external SDK consumer. The only code you author is the body of the typed
continuation in `attempt.ts`.

Use the `context.sdk` operations exactly as typed. They are the canonical
`@dnd/battle-runtime` operations with call/result recording around them. Do not
invent a second command vocabulary, inspect repository implementation or tests,
or import unrecorded runtime operations.

When `context.session.battle.state.subjectResolutionPhase.kind` is
`subjectSelection`, call `context.sdk.discoverBattleActs` inside the
continuation. Select and attempt a surfaced act before returning; if none is
surfaced, report that exact state rather than inventing an action. When the
phase is `subjectContinuation`, continue its retained subject and fill prefix;
do not call fresh act discovery. The session retains the subject but not the
accepted fill prefix, so carry the complete prefix forward from the previous
attempt source.

A **D20 Test** is exactly an Ability Check, Saving Throw, or attack roll. Each
rolled pending test is surfaced with an effective `rollMode`: `normal`,
`advantage`, or `disadvantage`. The accompanying
`d20TestCircumstanceRequests` identify the exact resolution occurrence and,
for a multi-target save, the individual target. The ScenarioSession has
already combined any Table-authored circumstance with mechanical sources;
success or failure remains a separate outcome fact. A `withoutRoll` outcome is
not a D20 Test occurrence and has no circumstance decision to consume.

For a repeated-damage allocation, the later `rolledDice` fill has one group for
each entry in the earlier `spellTargetAllocation.value.allocations` array, in
that same order. Group `i` must contain exactly
`allocations[i].count` die results, and those results belong only to allocation
`i`. This is one group per allocation entry, not one flat group for the whole
cast and not one group per individual die. For example, three one-effect
allocation entries require three one-result groups:

```ts
allocations: [
  { targetId: targetA, count: 1 },
  { targetId: targetB, count: 1 },
  { targetId: targetC, count: 1 },
];
rolledDice.value: [
  { results: [dieA] },
  { results: [dieB] },
  { results: [dieC] },
];
```

A single allocation with `count: 3` instead uses one group containing three
die results.

The supervisor owns one linear SDK-session lineage. Start with `context.session`,
pass that exact current value to each operation, and replace your local session
with every resolution result's `session`. Stale or foreign sessions are rejected.
The session's canonical battle reducer state is `session.battle`; its immutable
`session.battlefield` projection retains the authored spatial boundary,
ambient Illumination, vertical environment facts, and scenario objects. A
`geometryDerived` boundary contains the five-foot arena and current placements;
a `tableAuthored` boundary contains exact, lineage-bound Table decisions and
does not pretend to contain a tactical map.
Those vertical facts do not currently produce a table-authored per-test
circumstance witness or an attack-roll mode. Do not infer Advantage or
Disadvantage from relative height.
Use `context.sdk.scenarioRelation` to inspect a current exact relation when
needed; do not restate spatial facts by reading coordinates yourself. Ordinary
creature attack, object attack, and creature-spell target holes are projected
from the session's geometry-derived or Table-authored spatial source by the
supervisor. Continue to choose the ordinary target or object through its
surfaced hole, but leave `spatialFacts` empty; there is no player spatial-fact
override API. The projected witness retains the hole's exact procedure and
target constraint:

```ts
const relation = context.sdk.scenarioRelation({
  session: context.session,
  sourceId: targetHole.attack.actorId,
  targetId,
});
```

If you call `scenarioRelation` for tactical explanation, the result is not a
replacement for the automatic target projection. Target eligibility remains
the canonical session decision. The ordinary fill contains no spatial witness:

```ts
const targetFill = {
  kind: "targetChoice" as const,
  holeId: targetHole.holeId,
  value: targetId,
  spatialFacts: [],
};
```

The Help attack enemy fill follows the same ownership boundary. Choose the
surfaced enemy and submit only that choice; the ScenarioSession supplies the
five-foot adjacency witness from its geometry-derived or Table-authored source:

```ts
const helpEnemyFill = {
  kind: "helpAttackEnemyDecision" as const,
  holeId: helpEnemyHole.holeId,
  targetEnemyId,
};
```

The reducer validates the supervisor-projected witness against the selected
procedure and supported target constraint. Its Cover vocabulary is the battle
reducer's `none | half | threeQuarters | total` vocabulary. For an ordinary Move,
call `resolveScenarioMovement` with `kind: "route"`, the canonical Move subject,
the nonempty sequence of grid coordinates entered after the actor's current
square, a supported Speed kind, and any downstream fills. With a
`geometryDerived` boundary, route entries use the tactical cell coordinates
stored in `context.session.battlefield.spatial.space.placements` and
`context.session.battlefield.spatial.arena.cells`; they are not physical-distance
coordinates copied from scenario prose. `arena.cellSizeFeet` determines the
distance of a cell step but does not change a cell coordinate. A `tableAuthored`
boundary has no map to inspect: submit the ordinary route selected by the
surfaced Table decision. In either case, the session derives traversal,
Movement cost, and Opportunity Attack threats; callers do
not author those facts. The projection's `changes` are deltas, not coordinate
authority; always read route coordinates from the current session when a map
exists. After narrowing a surfaced Move act,
bind its subject to `moveSubject`; the example assumes that proven Move subject:

```ts
const spatial = context.session.battlefield.spatial;
if (spatial.kind !== "geometryDerived") {
  return {
    kind: "continue",
    session: context.session,
    tacticalNote: "The Table-authored route has no tactical map to inspect.",
  };
}
const moverCoordinate = spatial.space.placements.find(
  ({ token }) => String(token) === moveSubject.actorId,
)?.coordinate;
if (moverCoordinate === undefined) {
  return {
    kind: "continue",
    session: context.session,
    tacticalNote: `No tactical placement exists for ${moveSubject.actorId}.`,
  };
}
const enteredCell = {
  x: moverCoordinate.x + 1,
  y: moverCoordinate.y,
};
const enteredCellExists = spatial.arena.cells.some(
  ({ coordinate }) =>
    coordinate.x === enteredCell.x && coordinate.y === enteredCell.y,
);
```

Choose a different adjacent cell when `enteredCellExists` is false or when the
route required by the tactical decision goes another direction. The scenario
session derives traversal, Movement cost, and ordinary Opportunity Attack
threats from the canonical route; callers do not author those threats. Battle
owns Movement resources and
the resulting decline-or-resolve interrupt. The operation currently supports
two-dimensional Walk routes only and reports other movement modes honestly.
The retained setup's directed movement-ally facts, current creature conditions,
sizes, terminal zero-HP lifecycle, and (when present) placements determine
occupied-space traversal and Difficult Terrain; callers do not restate those
facts in a Move.
If that operation returns downstream holes, call the same operation with
`kind: "continue"` and only their fills. The session retains the original Move
subject, derived Movement fill, and planned placement across downstream holes
and Opportunity Attack decisions; do not restate the route.
Canonical object-damage outcomes advance each scenario object's current Hit
Points. For an ordinary object attack, choose only the object id and pass an
empty `spatialFacts` array. A `targetChoice` hole whose `attack` has
`acceptsObjectTarget: true` accepts the distinct object fill branch—do not put
an object id in the creature `targetChoice` branch:

```ts
const objectTarget = {
  kind: "objectTargetChoice" as const,
  holeId: targetHole.holeId,
  value: objectId,
  spatialFacts: [],
};
```

The scenario SDK projects range and sight for ordinary creature attacks, and
range, sight, Cover, AC, the object's current damage disposition, and any
visible non-incapacitated enemy within 5 feet for object attacks, from the
canonical session's spatial source. The public creature-attack fill vocabulary
has no Cover fact, so a Table-authored creature attack uses `cover: "none"`
and cannot smuggle a Cover override through `spatialFacts`. SDK
operations accept the whole scenario session and preserve those table-owned
facts while the nested battle advances.
For a creature-targeting spell hole that surfaces an ordinary spatial-fact
request, choose targets or damage allocations through that hole. The scenario
SDK overwrites caller-supplied spell-target facts with the requested range,
sight, and Total Cover eligibility derived from the retained spatial source.
Specialized and point-origin spell holes retain their dedicated protocols.
One continuation may make as many ordinary TypeScript decisions and SDK calls
as one coherent tactical choice requires. Return `kind: "continue"` when a new
observation should inform the next choice. Return `kind: "playerConcluded"`
when you believe play has reached a conclusion. This is an assertion for the
independent RAW reviewer, not proof that a RAW combat-ending condition occurred.
Pursue each combatant's objective seriously. Do not spend a strictly greater
expendable resource when a lower-cost surfaced option guarantees the same
immediate concrete result and no observed fact gives the greater expenditure
another benefit.
Describe the concrete combatant, object, procedure, and resource facts that
support the assertion. Do not report a winner, victory, or winning side, and do
not infer an encounter-wide partition. Scenario-objective satisfaction and the
decision to end combat remain table interpretations over those concrete facts,
not Battle Runtime state.
Both outcomes must return the latest session produced by the calls.

A `needsHoles` result means the selected subject is still in progress. A fresh
act discovery may then be empty by design; that is not an obstruction. Always
carry `result.session` forward, but do not treat it as saved fill history: a
`needsHoles` session does not persist the answer prefix for the next replay.
When the current source already has the facts needed for a downstream answer,
it may resolve that answer in the same authored continuation. Otherwise return
`kind: "continue"` with the latest session. The supervisor then records the
continuation and rewrites `OBSERVATION.json`; reread it before authoring the
next continuation.
Keep every accepted fill in canonical order. On the next resolution call, use
the result's subject and submit the complete accumulated prefix plus the newly
requested fill(s), not only the latest fill(s):

```ts
const acceptedFills = [targetFill];
const first = context.sdk.resolveBattleRuntimeSubject({
  session: context.session,
  subject,
  fills: acceptedFills,
});
if (first.tag === "needsHoles") {
  const nextFill = fillForHole(first.holes[0]);
  const next = context.sdk.resolveBattleRuntimeSubject({
    session: first.session,
    subject: first.subject,
    fills: [...acceptedFills, nextFill],
  });
}
```

Continue until it resolves or returns another hole.

Run `node player-client.mjs attempt.ts` after editing. A compilation or
runtime failure before the first SDK call remains editable. Once any SDK call
returns—even an invalid or unsupported result—the exact continuation is frozen
as evidence. Correct or recover by replacing `attempt.ts` with a new
continuation; never edit prior evidence.
