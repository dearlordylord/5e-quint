# CRPI-BLOCK-001 History

Task 2 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-001.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers both in-scope Adrenaline Rush branch
obligations for `packages/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt`.
The copied route connector projection is observed as `qRoute` through public
`startBattle`, `discoverBattleActs`, and `resolveBattleSubject` reducer
entrypoints. Short and Long Rest restoration remains outside this battle replay.
