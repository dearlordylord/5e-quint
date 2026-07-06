# CRPI-READY-033 History

Task 75 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

The task body names `packages/battle-runtime/rule-core-spells.mbt.qnt`, but the
current cleanroom source inventory has that rule-core spell owner split across
four connector drivers:

- `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-033.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares each copied rule-core Spell procedure
`qComponentRoute` projection to the target component route surface for
`RuleCoreSpellProcedureProfileOwner`. Round 2 includes the three route-in-denominator
Mass Healing Word restoration branches that were missing from the first accepted
evidence set. The replay records parse input, admit input, component
call, and result projection before downstream battle spell/effect routes consume
this owner.

The accepted evidence set now covers 27 route-required split Spell obligations.
Runtime scenario projections are derived through public battle-runtime Spell
procedure entrypoints in `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`: `discoverBattleActs`,
`resolveBattleSubject`, and `resolveBattleInterrupt`.

No duplicate durable state was introduced. The replay reuses existing action and
Bonus Action resources, caster Reaction availability, Hit Points and death-save
lifecycle, spell-slot expenditure, active Spell Effects, readied Spell
responses, Concentration, public hole kinds, and typed
`BattleResolutionResult` facts. The component route is derived from typed
component owner facts, not authored identity, branch names, witness labels, or
connector filenames.

Plan Impact:

- Status: `update-required`
- Affected task: Task 75 / `CRPI-READY-033` is unblocked by accepted copied
  `qComponentRoute` replay evidence for the split rule-core Spell corpus.
- Queue/backlog rows `CRPI-READY-033A`, `CRPI-READY-033B`,
  `CRPI-READY-033C`, and `CRPI-READY-033D` should be revised or folded into
  this accepted owner-level task rather than left as separate ready work.
- Required plan edits: replace the stale aggregate driver path with the four
  split connector paths above, or split Task 75 into those exact subtask IDs.
