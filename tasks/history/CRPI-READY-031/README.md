# CRPI-READY-031 History

Task 73 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-031.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core Reaction,
continuation, Readied Movement, and Concentration `qComponentRoute` projection
to the target component route surface for
`RuleCoreReactionContinuationConcentrationOwner`. The replay records parse input, admit input, component
call, and result projection before downstream battle spell-effect and feature
routes consume the owner.

Runtime scenario projections are derived through public battle-runtime
`resolveBattleSubject`, `resolveBattleInterrupt`, and
`resolveBattleConcentrationDamage` entrypoints in
`packages/battle-runtime/src/rule-core-reactions.mbt.test.ts`, then compared to the copied component connector route in
`packages/battle-runtime/rule-core-reactions.mbt.qnt`.

No duplicate durable state was introduced. The replay reuses existing
`BattleCreatureState.reactionAvailable`, `BattleState.pendingInterrupt`,
`BattleState.readiedMovements`, `BattleState.readiedSpells`,
`BattleCombatantMovement.spentFeet`, `BattleCreatureState.concentration`,
and public reducer result/hole protocols. The component route is derived from
typed component owner facts, not authored identity, branch names, witness labels,
or connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 73 / `CRPI-READY-031` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route tasks `L15-RR06-BATTLE-SPELL-EFFECT-ROUTES` and
  `L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES` remain unchanged.
- Required plan edits: none.
