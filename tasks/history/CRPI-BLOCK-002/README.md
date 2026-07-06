# CRPI-BLOCK-002 History

Task 3 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-002.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the 17 in-scope branch obligations for
`packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt`. The
copied route connector projection is observed as `qRoute` from public reducer
`routeEvents` emitted by after-hit battle reducer entrypoints in
`packages/battle-runtime/src/after-hit-damage-riders.mbt.test.ts`. Round 3
tightened that evidence so the harness requires exact public event kind,
subject, owner, fill, and holes, and added regressions for generic Entangle/Web
escape and generic turn-boundary lifecycle routes. The nine fixture sequencing
or out-of-denominator rows remain outside this task's route acceptance.
