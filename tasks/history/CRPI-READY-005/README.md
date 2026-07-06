# CRPI-READY-005 History

Task 22 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-005.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the interrupt-stack resume branch obligations
for `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`.
Replay observes the copied `qRoute` projection through public reducer route
events produced from `startBattle`, `resolveBattleSubject`, and
`resolveBattleInterrupt`. The replay-from-root branch records the
`BattleState.interruptStack` replay-continuation frame after public
`resolveBattleInterrupt` decline calls create it, then observes the route
through the public `resolveBattleSubject` surface; no adapter-local route
ledger or adapter-created continuation frame is used.
