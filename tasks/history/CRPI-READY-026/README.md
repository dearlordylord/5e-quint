# CRPI-READY-026 History

Task 68 component-first replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-026.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied rule-core ability/skill/Command
`qComponentRoute` projection to the target component route surface for
`RuleCoreAbilitySkillCommandOwner`. The replay records parse input, admit input, component
call, and result projection before downstream battle route tasks consume the
owner. Runtime scenario projections are derived through public battle-runtime
Search, Guidance, Enhance Ability, and Command calls in
`packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts`, then compared to the copied component connector route.

No duplicate durable state was introduced. Search reveal state remains existing
`BattleCreatureState.hidden`, Guidance and Enhance Ability effects remain
existing `BattleCreatureState.activeEffects`, Command pending/effect state
remains existing active effects, condition, movement, turn-resource, and
interrupt-stack state. The component route is derived from typed component owner
facts, not authored spell names, branch names, witness labels, or connector
filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 68 / `CRPI-READY-026` is unblocked by accepted
  copied `qComponentRoute` replay evidence.
- Dependent route tasks `L15-RR06-BATTLE-SPELL-EFFECT-ROUTES` and
  `L15-RR11-LEVEL3-4-SCOPE-PROMOTION` remain unchanged.
- Required plan edits: none.
