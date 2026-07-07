# CRPI-READY-010

Task 41 route replay was refreshed against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`0d4862acd0e2483409904973d30705bf14c194f530e85e50a6f1e244f333f917`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-010.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

Task 104 / `CRPI-SOURCE-001` refreshed the copied source route connector to
hash `ec1f467e9088fec4d15fc2e4bdd22dc3303e8d76cb098e269409c222b2d06794`.
The connector now preserves post-Concentration-cleanup surface transitions
without appending repeat-save turn-boundary no-op route events after
`sleepPendingRepeatSave` has been removed.

Task 41 now records accepted public reducer `qRoute` replay evidence for all
eight Sleep repeat-save source branch obligations. The replay observes public
`startBattle`, `discoverBattleActs`, and `resolveBattleSubject` route events
from `packages/battle-runtime/src/index.ts`, scoped to the copied Sleep route
connector's `startBattle` marker and `repeatSaveConditionEffect` subject. The
harness does not reconstruct adapter-local route events.

No production module or durable `BattleState` field was introduced in this
attempt. Sleep repeat-save ownership remains in existing
`BattleCreatureState.activeEffects[kind=sleepPendingRepeatSave]`,
`BattleCreatureState.activeEffects[kind=sleepUnconscious]`,
`BattleCreatureState.concentration`, and `BattleCreatureState.conditions`.
