# CRPI-BLOCK-007 History

Task 11 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`f07a33f783419b9f8f88eed9d679faadace779ec658d2a990ae56bc963d55387`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-007.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the two selected-identity branches for
`packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`:
Dexterity Saving Throw Advantage and Incapacitated suppression. Replay observes
the copied `qRoute` through public battle runtime entrypoints:
`startBattle` admits the selected Barbarian feature as a support-profile fact,
and `passiveSavingThrowRollModeRouteEvents` projects the passive Saving Throw
roll-mode route from existing `BattleState` character support-profile and
condition state. Production behavior does not dispatch on the Danger Sense
authored identity.
