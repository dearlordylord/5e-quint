# CRPI-READY-002 History

Task 5 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-002.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the chained spell-attack sequence branch
obligations for
`packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`.
Replay observes the copied `qRoute` projection through public reducer route
events produced from the `startBattle`, `discoverBattleActs`, and
`resolveBattleSubject` path. Discovery route evidence comes from
`AvailableBattleAct.routeEvent`; resolved fill route evidence comes from
`BattleResolutionResult.routeEvents`.
