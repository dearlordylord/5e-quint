# Cleaned SQLite Execution row 2 player example

## Scenario and retained evidence

The full scenario prose is
[`sand-band-four-skeleton-skirmish.md`](../sdk-player/scenarios/sand-band-four-skeleton-skirmish.md),
with its adjacent
[`scenario review`](../sdk-player/scenarios/sand-band-four-skeleton-skirmish.md.scenario-review.json).
SQLite Execution row `2` records that scenario at tested Git revision
`12d1fd560549405a751996f6a7a873136ad73458`. The exact player-authored source is
gitignored historical execution evidence at
`scripts/raw-swarm/out/sand-band-four-skeleton-skirmish-sdk-player-run-2/evidence/program.ts`;
that retained path is a historical artifact name, not a current domain identity.
The call stream, observations, final result, setup, and character source sit
beside it.

The workflow first retained the reviewed prose, then separately authored and
committed character and setup TypeScript, and finally let the external player
write the append-only program against public declarations and documentation.
The generation campaign intentionally discarded its candidate alternatives,
random selection indices, candidate-selection decisions, and agent reasoning, so those
are not recoverable from this historical Execution. The retained prose, review, executable
source, concrete SDK calls, observations, and whole-trace review are the
debuggable evidence.

## Cleaned player decision

The adjacent TypeScript file is a drop-in player `attempt.ts` and retains one
coherent Magic Missile decision from SQLite Execution row 2. It exports the harness's
required `continueBattle`, discovers the surfaced act, reuses the target and
hole values exposed by that act, submits the target allocation, and then
resubmits that accepted prefix with the required three-die damage group.

The cleanup removes exploratory continuations, the failed damage replay,
literal procedure references, literal hole ids, fixed combatant ids, and
forensic JSON snapshots. The current scratch runtime supplies `@dnd/shared/types`
as declarations only, so the example uses one narrow type-only `DieRollResult`
brand cast instead of the original repeated `as any` casts. This is executable
through the harness and also exposes the missing public roll-result constructor
as an SDK ergonomics finding.

This is a representative continuation, not a standalone application. The
harness still owns `context.session`, the SDK implementation, turn scheduling,
recording, and the next continuation call. The example returns a `continue`
outcome after the SDK call; the Table and independent reviewer remain
responsible for deciding when the concrete encounter state justifies stopping.
