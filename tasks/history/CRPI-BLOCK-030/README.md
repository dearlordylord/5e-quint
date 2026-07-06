# CRPI-BLOCK-030 History

Task 58 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-030.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Stat Block multi-damage
`qRoute` projection to the target reducer route surface for
`StatBlockActionRouteSubject`. The replay records public battle-runtime
`startBattleRight`, `discoverBattleActs`, and `resolveBattleSubject` entrypoint effects over target
choice, hit attack-roll resolution, rolled damage dice, static damage notation,
and target Hit Point updates.

No duplicate durable state was introduced. The replay reuses existing
`BattleState` combatants, public hole/fill kinds, typed
`BattleResolutionResult` facts, and `BattleCreatureState` Hit Point fields.
Authored Stat Block identity, attack names, and damage notation remain
catalog/source or test selection facts, not production reducer dispatch keys.

Plan Impact:

- Status: `none`
- Affected task: Task 58 / `CRPI-BLOCK-030` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Related downstream task `CRPI-BLOCK-031` remains ready and can reuse the
  same Stat Block action route subject shape.
- Required plan edits: none.
