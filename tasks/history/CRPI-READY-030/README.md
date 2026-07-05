# CRPI-READY-030 History

Task 72 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-030.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core Movement/Grapple
`qComponentRoute` projection to the target component route surface for
`RuleCoreMovementGrappleOwner`. The replay records parse input, admit input, component
call, and result projection before downstream battle action, stat-block, spell
effect, and feature routes consume the owner.

Runtime scenario projections are derived through public battle-runtime Movement,
Dash, Disengage, Grapple, escape, release, and Opportunity Attack interrupt
entrypoints in `packages/battle-runtime/src/rule-core-movement.mbt.test.ts`,
then compared to the copied component connector route in
`packages/battle-runtime/rule-core-movement.mbt.qnt`.

No duplicate durable state was introduced. The replay reuses existing
`BattleCombatantMovement` spent/remaining movement, turn Dash/Disengage/action
resources, `BattleCreatureState.conditions` for Prone, `BattleState.grapples`,
and `BattleState.pendingInterrupt` for Opportunity Attack decisions. The
component route is derived from typed component owner facts, not authored
identity, branch names, witness labels, or connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 72 / `CRPI-READY-030` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route tasks `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`,
  `L15-RR06-BATTLE-SPELL-EFFECT-ROUTES`, and
  `L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES` remain unchanged.
- Required plan edits: none.
