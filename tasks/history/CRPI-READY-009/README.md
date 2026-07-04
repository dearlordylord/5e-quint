# CRPI-READY-009

Task 40 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-009.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Longstrider target-fill and stale-subject
branch obligations for
`packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`. Replay observes
the copied `qRoute` projection through public reducer state from `startBattle`,
public discovery route events from `AvailableBattleAct.routeEvents`, and public
resolution route evidence from `BattleResolutionResult.routeEvents`.

The public route exposes scalar-buff discovery, active Spell Effect ownership,
movement-resource ownership for the derived Speed projection, and stale
hole-frontier ownership without adding a parallel scalar-buff speed or effect
ledger.
