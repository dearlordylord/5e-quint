# CRPI-READY-025 History

Task 66 route replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-025.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied zero-Hit-Point
mid-resolution `qRoute` to public reducer route events produced by
`startBattle`, `discoverBattleActs`, and `resolveBattleSubject`. The route
covers the Eldritch Blast target-selection sequence, first Attack Roll and
damage, the Concentration Saving Throw frontier, zero-Hit-Point Unconscious
condition transition, Concentration teardown, dependent Spell Effect cleanup,
and second-beam continuation against post-teardown state.

No duplicate durable state was introduced. Hit Points remain
`BattleCreatureState.hp`; zero-Hit-Point condition state remains
`BattleCreatureState.conditions`; Concentration remains
`BattleCreatureState.concentration`; dependent Spell Effect cleanup remains
`BattleCreatureState.activeEffects`. Route events are public reducer boundary
projections derived from subject shape, fill kind, route hole family, and
existing before/after BattleState facts.

Plan Impact:

- Status: `none`
- Affected task: Task 66 / `CRPI-READY-025` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future reducer-route tasks remain unchanged.
- Required plan edits: none.
