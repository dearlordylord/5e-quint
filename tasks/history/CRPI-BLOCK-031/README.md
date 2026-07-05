# CRPI-BLOCK-031 History

Task 59 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-031.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Stat Block size-gated condition
rider `qRoute` projection to the target reducer route surface for
`StatBlockActionRouteSubject`. The replay records public battle-runtime
`startBattleRight` and `resolveBattleSubject` entrypoint effects over target
choice, hit attack-roll condition-rider resolution, rolled damage dice, and
target Hit Point updates.

No duplicate durable state was introduced. The replay reuses existing
`BattleState` combatants, public hole/fill kinds, typed
`BattleResolutionResult` facts, existing `BattleCreatureState` Size and
condition-immunity source facts, existing condition lifecycle state, and
existing Hit Point fields. Authored Stat Block identity, attack names, and
fixture labels remain catalog/source or test selection facts, not production
reducer dispatch keys.

Plan Impact:

- Status: `none`
- Affected task: Task 59 / `CRPI-BLOCK-031` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Required plan edits: none.
