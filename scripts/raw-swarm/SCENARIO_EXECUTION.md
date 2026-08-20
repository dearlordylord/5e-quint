# Scenario execution protocol

This is the executable hand-off after a Scenario Campaign admits a Scenario.
It covers the player/DM agent, neutral setup author, delegated setup
controller, and the operator supervising the public SDK. Authoring and review
remain in [Scenario authoring](SCENARIO_AUTHORING.md) and [Evidence review](EVIDENCE_REVIEW.md).

## Inputs and ownership

The operator starts from one adjacent admitted Scenario bundle:

- `<scenario-id>.md` and `<scenario-id>.scenario-review.json`;
- `<scenario-id>.scenario.json`, stage facts, and the retained stage plan; and
- the current public SDK capability projection and the canonical SRD catalog.

The runner derives Scenario identity from the admitted record. An Execution
gets its own explicit Execution and Evidence Set identities and always points
back to exactly one Scenario. Repeating an Execution never creates another
catalogue entry.

The neutral setup author owns only facts fixed by the Scenario prose and uses
the canonical character, stat-block, and setup operations. A controller owns
delegated pre-battle choices such as Initiative and starting placements. The
player/DM agent owns later tactical choices. Keep these horizons separate: do
not put mutable HP, reactions, tactics, objective satisfaction, or an expected
outcome in the authored Scenario or initial setup.

## Public-SDK execution

1. Read `CAPABILITY_CONTEXT.md`, `SCENARIO.md`, the retained review, and only
   the declaration files named for the available role. The role-specific
   details live in [`sdk-player/SCENARIO_CHARACTERS.md`](sdk-player/SCENARIO_CHARACTERS.md),
   [`sdk-player/SCENARIO_SETUP.md`](sdk-player/SCENARIO_SETUP.md),
   [`sdk-player/SCENARIO_SETUP_CONTROLLER.md`](sdk-player/SCENARIO_SETUP_CONTROLLER.md),
   and [`sdk-player/PLAYER.md`](sdk-player/PLAYER.md).
2. Use ordinary typed public operations supplied through the role's context.
   Do not invent a command vocabulary, scenario interpreter, mechanic recipe,
   or player-side spatial override. If the public SDK cannot represent a fixed
   fact, return a precise obstruction and retain it as capability evidence.
3. Maintain one current SDK session lineage. Pass the latest returned session
   to the next operation and submit canonical fills in the order of surfaced
   holes. The player does not restate facts already projected by the setup
   Table or geometry source.
4. Pursue every represented combatant's objective seriously and report
   concrete combatant, procedure, resource, and object facts. A player
   conclusion is an assertion for the independent reviewer, not proof of a
   RAW terminal condition or an encounter-wide winner.

The direct-SDK runner, replay supervisor, and evidence paths are documented in
the [operations reference](OPERATIONS.md). Generated transcripts and model
events remain under the supplied Evidence Set directory and are not source
inputs for later Scenario authoring.

## Execution boundary

Use the public command from a clean revision and supply identities explicitly:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts \
  <scenario-id> \
  --execution-id <execution-id> \
  --evidence-set-id <evidence-set-id> \
  --instructional-isolation
```

Replay the recorded canonical SDK call stream before review:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/replay-sdk-player.ts \
  scripts/raw-swarm/out/<evidence-set-id>
```

A compiler or runtime failure before the first SDK call remains an editable
authoring attempt. Once an SDK call returns, the authored continuation prefix
and its call/result evidence are frozen. Recovery appends a new continuation
or starts a separately identified branch; it does not rewrite prior evidence.

An obstructed character or setup stage is a successful diagnostic Execution,
not a fabricated battle and not a reason to widen the scenario protocol. Send
the obstruction and its exact source/review identities to the evidence
reviewer.
