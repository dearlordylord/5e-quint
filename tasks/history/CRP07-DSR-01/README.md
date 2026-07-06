# CRP07-DSR-01 History

Task 29 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP07-DSR-01.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Magic Missile allocation and damage
branch obligations for
`packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`. Replay observes
the copied `qRoute` projection through public reducer route events produced
from `startBattle`, `discoverBattleActs`, and `resolveBattleSubject`. The
adapter reads `AvailableBattleAct.routeEvents` and
`BattleResolutionResult.routeEvents`; it does not maintain an expected-route
table, Magic Missile-specific Hit Point ledger, or adapter-owned Spell Slot
spend state.
