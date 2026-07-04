# CRP07-DSR-02 History

Task 38 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP07-DSR-02.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the save-gated spell ordering branch
obligations for
`packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`.
Replay observes the copied `qRoute` projection through public reducer route
events produced from `startBattle`, `discoverBattleActs`, and
`resolveBattleSubject`. Discovery route evidence comes from
`AvailableBattleAct.routeEvents`; Saving Throw, target-list, condition-choice,
ordering-rejection, damage dice, condition effect, and target Hit Point route
evidence comes from `BattleResolutionResult.routeEvents`.

No parallel save-gated ordering state was added. Magic Action availability
remains `BattleState.currentTurnResources`, Spell Slot expenditure remains
character spellcasting resource state, target Hit Points remain
`BattleCreatureState.hp`, condition effects remain `BattleCreatureState.conditions`,
and ordering labels remain reducer result facts projected by the harness.
