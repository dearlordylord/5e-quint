# CRPI-READY-032 History

Task 74 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-032.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core Shove outcome
`qComponentRoute` projection to the target component route surface for
`RuleCoreShoveOutcomeOwner`. The replay records parse input, admit input, component call,
and result projection before downstream battle action and feature routes consume
this owner.

Runtime scenario projections are derived through public battle-runtime Shove
subject resolution in `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts`, then compared to the copied
component connector route in `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`.

No duplicate durable state was introduced. The replay reuses existing
`BattleTurnState.actionResources`, `BattleCreatureState.conditions` for
Prone, `BattleResolutionResult`, and `BattleShovePushOutcome` disposition
facts for accepted and rejected Shove outcomes. The component route is derived
from typed component owner facts, not authored identity, branch names, witness
labels, or connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 74 / `CRPI-READY-032` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route tasks `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES` and
  `L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES` remain unchanged.
- Required plan edits: none.
