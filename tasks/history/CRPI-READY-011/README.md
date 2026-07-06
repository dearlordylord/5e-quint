# CRPI-READY-011 History

Task 42 route replay is blocked, not accepted. The partial route evidence was
recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

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

The Task 42 acceptance criteria are therefore not met for the full driver. The
plan must be recast to blocked/partial or the copied connector obligation must
be refreshed before this task can be merged as accepted.

Plan Impact:

- Status: `update-required`
- Affected task: Task 42 / `CRPI-READY-011` should be blocked or
  partial-blocked until both copied `qRoute` obligations have passing evidence
  or are reclassified.
- Future metamagic route tasks remain unchanged, but should verify that their
  selected-identity branches match the copied metamagic connector route shape.
- Required plan edits: recast Task 42 from `ready-for-research` to blocked or
  partial-blocked, add the protected-target frontier mismatch and Command route
  mismatch as blockers, and add a follow-up to refresh/reclassify the connector
  obligation or implement honest reducer-owned route facts.

Both branches are recorded as source-QNT-corpus blockers. In the target runtime
the damage branch is Careful Burning Hands: public reducer route events expose
`metamagicSavingThrowProtection`, initial `spellTargetList`, then
`savingThrowOutcome`, `rolledDice`, and damage-adjustment ownership. The copied
route omits that protected-target frontier. In the target runtime the no-effect
branch is Careful Command: public reducer route events expose `commandEffect`,
`commandOptionChoice`, `savingThrowOutcome`, and `battleActiveEffect`, with no
`rolledDice` damage frontier. The copied metamagic route connector exposes
saving-throw protection only as a damage route with
`BattleDamageAdjustmentOwner`, so claiming accepted replay would require
synthetic damage route events or duplicate replay-only state.

No duplicate Metamagic state was introduced. Selected option identity remains at
catalog, selection, admission, and fixture boundaries. Runtime routing is
derived from the typed Metamagic effect kind, spell procedure shape, existing
Sorcery Point pool state, saving-throw fills, damage-adjustment projection, and
public route event boundary fields.
