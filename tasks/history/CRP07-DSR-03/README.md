# CRP07-DSR-03 History

Task 21 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP07-DSR-03.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Hit Point restoration ordering branch
obligations for
`packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`.
Replay observes the copied `qRoute` projection through public reducer route
events produced from the `startBattle`, `discoverBattleActs`, and
`resolveBattleSubject` path. Discovery route evidence comes from
`AvailableBattleAct.routeEvents`; spell healing target/list fills, healing
rolls, feature healing distribution, restored Hit Points, and zero-HP lifecycle
cleanup route evidence comes from `BattleResolutionResult.routeEvents`.
Restored HP remains `BattleCreatureState.hp`, and zero-HP cleanup remains the
existing `BattleCreatureState.zeroHpLifecycle` and condition lifecycle rather
than a healing-frontier ledger.
