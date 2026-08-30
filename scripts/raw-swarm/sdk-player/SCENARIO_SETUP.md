# Scenario setup author

Read `CAPABILITY_CONTEXT.md`, `SCENARIO.md`, `SCENARIO_REVIEW.json`,
`CHARACTERS.json`, `STAT_BLOCKS.json`, and only the declarations needed for the
listed public operations available through
`@dnd/scenario-setup-sdk`.

You are the neutral setup author. Edit only `setup.ts`. Export one
`ScenarioSetup` named `setupScenario`. Use the canonical functions and catalog
supplied through its context to construct the closest faithful initial
`ScenarioSession`. Start the canonical battle, then call
`createScenarioSession` once with its ambient Illumination, stat-block damage
notation, vertical environment facts, and scenario-fixed objects.
Stat-block initialization requires one explicit `conditions` collection. Use
`[]` when the scenario fixes no supported initial condition, or the typed public
value when it does; the initializer rejects conditions the Stat Block is immune
to. Do not simulate an initial condition with a later act or a duplicate state
field.

Tactical-space is optional, but its source is one coherent choice: either supply both the
five-foot arena and initial placements for a `geometryDerived`
`session.battlefield.spatial`, or omit both and supply Table-authored
`spatialDecisions` for the exact spatial questions the scenario fixes. A
decision correlates one question and its answer; it is not a second override
channel for geometry-derived facts. Supported exact target questions include
relation, spell-target, object-target, attack-target, grapple, shove, Help,
wake-from-sleep or hypnotic-pattern, and movement-route decisions carry their
canonical post-move state. The notation is one Table decision for
this scenario: `rolled` keeps stat-block damage rolls in the player protocol,
while `static` uses the authored average. Players cannot override it per
attack. The composed session retains an untouched `BattleRuntimeSession` under
`session.battle` and table-owned facts under `session.battlefield`; do not add
those facts to battle state. Do not invent substitute creatures, silently drop
required combatants, or encode later tactics in setup code.
For a Table-authored relation or target answer, use
`context.sdk.scenarioDistanceFeet(number)` to obtain the branded distance and
handle its typed `Result` value; do not cast a raw number into a spatial fact.
Vertical environment facts are retained setup evidence only. The current public
SDK has no table-authored per-test circumstance witness that turns relative
height into Advantage or Disadvantage; a supported-only scenario must not
require that adjudication.
Supply only the directed `initialRangedAttackEnemyRelationships` needed by the
scenario. Each `{ attackerId, enemyId }` is a pairwise Table Decision scoped to
the initial ranged-attack proximity question. It is not an encounter-wide side,
party, or faction model; omit pairs whose relationship the table has not decided.
Supply directed `movementAllyRelationships` separately for the RAW movement
question. Each `{ moverId, allyId }` applies only when that mover crosses that
creature's space; it is not a durable side or faction. An ally's space is
traversable without becoming Difficult Terrain. Incapacitated enemy spaces are
traversable Difficult Terrain, and Tiny creature spaces are traversable without
becoming Difficult Terrain. Terminal dead combatants remain placed as corpses,
not creatures; crossing is allowed, while ending in their space remains an
explicit unsupported table-object adjudication.
Supply `opportunityAttackEnemyRelationships` as directed `{ reactorId, moverId }`
pairwise Table Decisions. They answer only whether the mover is the reactor's
enemy for ordinary Opportunity Attacks; they are not encounter sides. For the
currently supported bright-light Small/Medium grid projection, the session
combines those decisions with current reactions, executable melee attacks,
sight, exact attack reach, and each route transition.
For a `geometryDerived` source, the retained `space` begins from these setup
placements and later advances only through the composed scenario movement
operation. Setup authors still provide only the starting placements. That same
retained space canonically projects relation, attack-target, object-target,
spell-target, movement traversal, range, sight, and Total Cover facts. The
supported grapple, shove, Help, and wake-up target holes likewise receive
their exact reach or adjacency fact automatically. For a `tableAuthored`
source, supply the corresponding exact decision instead; the SDK projects its
answer automatically. A table-authored
movement route must include its canonical post-move spatial state, so the
session never resolves movement while retaining a stale position. Specialized
and point-origin spell holes keep their dedicated protocols rather than
acquiring a second spell-target geometry.

A scenario object is a table-owned target fact: use canonical `BattleObjectId`,
`ArmorClass`, `BattleObjectDamageDisposition`, and tactical-space
openness/Cover vocabulary. Poison and Psychic Immunity are canonical object
damage semantics and are not restated in scenario data. It is not a
creature-held ground object, spell light emitter, or separate object reducer.
Do not add use-state semantics that the scenario does not require.

Project only facts that the scenario fixes before play. Do not choose facts the
scenario delegates to a player, controller, or GM. Completed player-owned
Character Sheets are supplied through `context.characterSheets`; consume them
without changing their builds, spells, equipment, or resources. Initiative
rolls and unresolved Table Decisions identified by the retained review remain
with their owners. A controller author will review this exact source next and
may edit it only to supply those delegated pre-battle choices. Do not choose
them here and do not create placeholders, sentinel values, or a choice schema.
If the closest neutral setup cannot proceed without one, return a precise
`kind: "obstructed"` result that leaves the choice with its owner.

When the public setup surface cannot represent the prose scenario, return
`kind: "obstructed"` with a precise explanation and JSON observation. That is
useful capability evidence. Do not force a `ready` result.

Check the file with:

```sh
node tooling/typescript/bin/tsc --noEmit
```
