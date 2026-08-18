# SDK battle player

Read `SCENARIO.md` and `PUBLIC_SDK.md`. You are an external SDK consumer. The
only code you author is the body of the typed continuation in `attempt.ts`.

Use the `context.sdk` operations exactly as typed. They are the canonical
`@dnd/battle-runtime` operations with call/result recording around them. Do not
invent a second command vocabulary, inspect repository implementation or tests,
or import unrecorded runtime operations.

The declaration graph under `declarations/` is the source of the supplied
public SDK types. Do not search that graph. Run
`node public-sdk-type-help.mjs <fill-kind>` for the bounded declaration of one
`BattleFill` branch and the required public types reachable from it. For
example, `node public-sdk-type-help.mjs savingThrowOutcome` prints the exact
Saving Throw outcome authoring shape. The generated type-help artifact is
derived from those declarations; it is not a second command vocabulary. Query
only a fill kind requested by the active hole, and do not repeat a successful
query.

When `context.session.battle.state.subjectResolutionPhase.kind` is
`subjectSelection`, call `context.sdk.discoverBattleActs` inside the
continuation. Select and attempt a surfaced act before returning; if none is
surfaced, report that exact state rather than inventing an action. When the
phase is `subjectContinuation`, continue its retained subject and fill prefix;
do not call fresh act discovery.

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
`session.battlefield` projection retains the authored five-foot arena, current
placements, ambient Illumination, vertical environment facts, and scenario objects.
Those vertical facts do not currently produce a table-authored per-test
circumstance witness or an attack-roll mode. Do not infer Advantage or
Disadvantage from relative height.
Use `context.sdk.scenarioRelation` to derive current distance, sight,
Cover, and traversal between retained tokens; do not restate those facts by
reading coordinates yourself. A creature attack remains table-owned: when its
`targetChoice` hole has `requiresTableSpatialFact: true`, translate that
canonical relation into the spatial witness requested by the hole. In
particular, a ranged attack requires an `attackTargetInRangedRange` witness;
an empty `spatialFacts` array is invalid. Derive its range band from the
relation's `distanceFeet` and the hole's `attack.targetConstraint`, then retain
the hole's procedure selection:

```ts
const relation = context.sdk.scenarioRelation({
  session: context.session,
  sourceId: targetHole.attack.actorId,
  targetId,
});
```

After observing and narrowing a `relation` result and a `rangedRange`
constraint, build the witness only when the target is within long range:

```ts
const { normalFeet, longFeet } = targetHole.attack.targetConstraint;
const { distanceFeet } = relation.relation;
const rangeBand =
  distanceFeet <= normalFeet
    ? "normal"
    : distanceFeet <= longFeet
      ? "long"
      : undefined;
if (rangeBand === undefined) {
  return {
    kind: "continue",
    session: context.session,
    tacticalNote: `Target ${targetId} is ${distanceFeet} feet away and outside the surfaced range constraint.`,
  };
}
const targetFill = {
  kind: "targetChoice" as const,
  holeId: targetHole.holeId,
  value: targetId,
  spatialFacts: [
    {
      kind: "attackTargetInRangedRange" as const,
      actorId: targetHole.attack.actorId,
      targetId,
      rangeBand,
      ...targetHole.attack.selection,
    },
  ],
};
```

The reducer validates the supplied witness against the selected procedure and
supported target constraint. `scenarioRelation` does not itself fill a
creature-attack hole. Its Cover vocabulary is the battle reducer's
`none | half | threeQuarters | total` vocabulary. For an ordinary Move, call
`resolveScenarioMovement` with `kind: "route"`, the canonical Move subject, the nonempty sequence
of grid coordinates entered after the actor's current square, a supported Speed
kind, and any downstream fills. The scenario session derives traversal,
Movement cost, and ordinary Opportunity Attack threats from the canonical
route; callers do not author those threats. Battle owns Movement resources and
the resulting decline-or-resolve interrupt. The operation currently supports
two-dimensional Walk routes only and reports other movement modes honestly.
The retained setup's directed movement-ally facts, current creature conditions,
sizes, terminal zero-HP lifecycle, and placements determine occupied-space
traversal and Difficult Terrain; callers do not restate those facts in a Move.
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

The scenario SDK projects range, sight, Cover, AC, the object's current damage
disposition, and any visible non-incapacitated enemy within 5 feet from the
canonical session. SDK
operations accept the whole scenario session and preserve those table-owned
facts while the nested battle advances.
For a creature-targeting spell hole that surfaces an ordinary spatial-fact
request, choose targets or damage allocations through that hole. The scenario
SDK overwrites caller-supplied spell-target facts with the requested range,
sight, and Total Cover eligibility derived from the retained tactical space.
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
Resolve the selected subject's downstream holes inside the same authored
tactical continuation whenever its returned facts determine the next answer.
Do not end a continuation merely to report `needsHoles`. Keep every accepted
fill in canonical order. On the next call, use the result's subject and submit
the complete accumulated prefix plus the newly requested fill(s), not only the
latest fill(s):

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
