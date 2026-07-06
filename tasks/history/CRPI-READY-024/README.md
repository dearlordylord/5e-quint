# CRPI-READY-024 History

Task 65 route replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-024.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Weapon Mastery property
`qRoute` to public reducer route events produced by `startBattle`,
`discoverBattleActs`, and `resolveBattleSubject`. Sap routes target selection,
Attack Roll, Hit Point damage, and the next-Attack-Roll active-effect rider.
Topple routes target selection, the Attack Roll save gate, the failed Saving
Throw, and the Prone condition rider. Cleave routes the primary weapon damage,
the optional feature-resource decision, second target, second Attack Roll,
second damage, and once-per-turn feature-resource settlement.

No duplicate durable state was introduced. Hit Points remain
`BattleCreatureState.hp`; Topple condition state remains
`BattleCreatureState.conditions`; Sap active-effect state remains
`BattleCreatureState.activeEffects`; Cleave turn use remains
`BattleState.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn`.
Selected mastery identity remains a catalog/admission reference and is not a
production behavior dispatch key.

Plan Impact:

- Status: `none`
- Affected task: Task 65 / `CRPI-READY-024` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future Weapon Mastery property expansion tasks for Graze, Nick, Push, Slow,
  and Vex remain unchanged.
- Required plan edits: none.
