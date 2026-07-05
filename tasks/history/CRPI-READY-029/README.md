# CRPI-READY-029 History

Task 71 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-029.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core Hit Point damage
`qComponentRoute` projection to the target component route surface for
`RuleCoreHitPointDamageOwner`. The replay records parse input, admit input,
component call, and result projection before downstream attack, stat-block, and
spell-effect routes consume the owner.

Runtime scenario projections are derived through public battle-runtime Hit Point
damage application in `packages/battle-runtime/src/battle-reducer/damage-apply.ts`,
then compared to the copied component connector route in
`packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts`.

No duplicate durable state was introduced. The replay reuses existing
`BattleCreatureState` Hit Points, Hit Point Maximum, Temporary Hit Points,
conditions, and zero-HP lifecycle state, plus `hpDamageProjection` for the
execution-facing damage-to-HP facts. The component route is derived from typed
component owner facts, not authored identity, branch names, witness labels, or
connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 71 / `CRPI-READY-029` is unblocked by accepted copied
  `qComponentRoute` replay evidence.
- Dependent route tasks `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES` and
  `L15-RR06-BATTLE-SPELL-EFFECT-ROUTES` remain unchanged.
- Required plan edits: none.
