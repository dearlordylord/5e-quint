# CRP07-DSR-05 History

Task 8 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP07-DSR-05.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Concentration break teardown branch obligations for
`packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`. Replay observes the copied `qRoute` projection through
public reducer state from `startBattle`, public discovery route events from
`AvailableBattleAct.routeEvent`, and public resolution route evidence from
`BattleResolutionResult.routeEvents`. Failed-save and voluntary cleanup route
through the Concentration owner before active Spell Effect removal; replacement
routes public cast discovery before prior cleanup, then prior cleanup before
recording the new active effect and Concentration owner.
