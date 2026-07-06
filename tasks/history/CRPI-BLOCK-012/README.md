# CRPI-BLOCK-012 History

Task 18 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`e8ededa80ac8cdfd875f4725149078879450eefb855b922cd7e1bba86f4edc43`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-012.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the four selected-identity branches for
`packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`:
selected Find Familiar casting, one-familiar replacement, temporary dismissal
with reappearance, and touch spell delivery through the familiar. Replay
observes the copied `qRoute` through public battle runtime entrypoints:
`castFindFamiliar`, `temporarilyDismissFindFamiliar`,
`reappearTemporarilyDismissedFindFamiliar`, `discoverBattleActs`, and
`resolveBattleSubject`.

Production behavior remains shaped by BattleState companion lifecycle,
action-economy, spell-slot/action-economy, target-selection, Reaction, and Hit
Point owners. Selected spell and familiar form identity remain catalog,
selection, admission, and SRD fixture boundaries rather than production reducer
dispatch keys.
