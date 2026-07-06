# CRPI-READY-034 History

Task 77 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-034.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core Stat Block control
`qComponentRoute` projection to the target component route surface for
`RuleCoreStatBlockControlOwner`. The replay records parse input, admit input,
component call, and result projection before downstream battle action, attack,
and Stat Block routes consume this owner.

Runtime scenario projections are derived through public battle-runtime Stat
Block Multiattack, movement, attack dispatch, action rejection, and End Turn
entrypoints in `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts`,
then compared to the copied component connector route in
`packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`.

No duplicate durable state was introduced. The replay reuses existing turn
action resources, bonus-action availability, movement spent/remaining, public
hole kinds for movement, target choice, and attack roll, plus typed
`BattleResolutionResult` facts. The component route is derived from typed
component owner facts, not authored identity, branch names, witness labels, or
connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 77 / `CRPI-READY-034` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Required plan edits: none.
