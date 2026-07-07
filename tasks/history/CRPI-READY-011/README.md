# CRPI-READY-011 History

Task 42 route replay was blocked, not accepted, when this partial route
evidence was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Task 105 / `CRPI-SOURCE-002` refreshes the copied source connector after this
historical evidence. The source connector now splits Careful saving-throw
protection into the public Careful Burning Hands route
(`metamagicSavingThrowProtection`, `spellTargetList`,
`savingThrowOutcome`, damage adjustment) and the Careful Command/no-effect
route (`commandEffect`, `commandOptionChoice`, `savingThrowOutcome`) with no
rolled-dice damage frontier. `CRPI-READY-011` is therefore unblocked for a fresh
target replay against the refreshed copied `qRoute`; this file's failed
evidence remains historical until Task 42 reruns.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-011.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence accepts no copied `qRoute` replay for this task. The
selected-identity diagnostics keep the semantic distinction between save-gated
damage and no-effect save procedures, and observe both public reducer routes
through `battleReducerStartRouteEvent`, `discoverBattleActs`, and
`resolveBattleSubject`. The Careful Burning Hands public route starts at the
protected-target `spellTargetList` frontier before the copied connector's
`savingThrowOutcome` frontier exists. The Careful Command/no-effect branch is a
`commandEffect` route with no damage-adjustment frontier.

The Task 42 acceptance criteria were therefore not met for the full driver
until the copied connector obligation was refreshed. Task 105 supplies that
source-side refresh; Task 42 still needs fresh target replay evidence before it
can be accepted.

Plan Impact:

- Status: `update-required`
- Affected task: Task 42 / `CRPI-READY-011` should be unblocked for fresh target
  replay against the refreshed copied `qRoute`.
- Future metamagic route tasks remain unchanged, but should verify that their
  selected-identity branches match the copied metamagic connector route shape.
- Required plan edits: change Task 42 from blocked to ready-for-research and
  remove its `CRPI-SOURCE-002` dependency blocker.

The historical Task 42 evidence recorded both branches as source-QNT-corpus
blockers. In the target runtime the damage branch is Careful Burning Hands:
public reducer route events expose
`metamagicSavingThrowProtection`, initial `spellTargetList`, then
`savingThrowOutcome`, `rolledDice`, and damage-adjustment ownership. Before Task
105, the copied route omitted that protected-target frontier. In the target
runtime the no-effect branch is Careful Command: public reducer route events
expose `commandEffect`, `commandOptionChoice`, `savingThrowOutcome`, and
`battleActiveEffect`, with no `rolledDice` damage frontier. Before Task 105, the
copied metamagic route connector exposed saving-throw protection only as a
damage route with `BattleDamageAdjustmentOwner`, so claiming accepted replay
would have required synthetic damage route events or duplicate replay-only
state.

No duplicate Metamagic state was introduced. Selected option identity remains at
catalog, selection, admission, and fixture boundaries. Runtime routing is
derived from the typed Metamagic effect kind, spell procedure shape, existing
Sorcery Point pool state, saving-throw fills, damage-adjustment projection, and
public route event boundary fields.
