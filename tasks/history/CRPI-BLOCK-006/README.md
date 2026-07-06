# CRPI-BLOCK-006 History

Task 10 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`f07a33f783419b9f8f88eed9d679faadace779ec658d2a990ae56bc963d55387`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-006.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers Animal Friendship creature-type target
admission, failed-save Charmed application, caster-or-ally damage breakage,
Protection from Evil and Good target protection, scoped attack roll
disadvantage, scoped charm and possession prevention, and relevant Charmed save
advantage for
`packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`.
Replay observes copied `qRoute` through public reducer route events produced
from `battleReducerStartRouteEvent`, `discoverBattleActs`,
`resolveBattleSubject`,
`protectionConditionAttemptRouteForResolution`, and
`protectionPossessionAttemptRouteForResolution`.
