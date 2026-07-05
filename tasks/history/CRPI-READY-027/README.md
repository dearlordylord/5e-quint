# CRPI-READY-027 History

Task 69 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-027.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core attack damage
disposition `qComponentRoute` projection to the target component route surface
for `RuleCoreAttackDamageDispositionOwner`. The replay records parse input, admit input, component call,
and result projection before downstream attack route tasks consume the owner.
Runtime scenario projections are derived through public battle-runtime attack
resolution in `packages/battle-runtime/src/rule-core-attack-damage-disposition.mbt.test.ts`, then compared to the copied component connector route.

No duplicate durable state was introduced. Knock Out acceptance and rejection
reuse existing attack kind, Hit Point, condition, zero-HP lifecycle, and typed
invalid-result facts. The component route is derived from typed component owner
facts, not authored spell names, branch names, witness labels, or connector
filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 69 / `CRPI-READY-027` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Required plan edits: none.
