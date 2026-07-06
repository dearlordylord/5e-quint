# CRP05-SBE-02 History

Task 80 was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP05-SBE-02.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence records semantic `qState` for sheet-derived weapon
and resource-backed spell battle acts, prerequisite rejection, stale/early spell
fill rejection, accepted spell-slot expenditure, exhausted-slot rediscovery
rejection, and source-exact Character Sheet spell-slot settlement. Route replay
evidence records connector-action `qRoute` for session battle entry and
source-exact spell-slot settlement only; semantic rejection branches no longer
claim settlement or `sourceExactSpellSlotDelta` route events.

No duplicate durable state was introduced. Character Sheet and Character Build
remain the source for pre-entry equipment, prepared spell, and spell-slot facts;
BattleState owns discovered battle acts, spell invocation, target Hit Points,
action-resource spend, and battle-owned spell-slot expenditure; settlement
projects the source-exact slot delta back to the Character Sheet through the
existing settlement entrypoint. Route events are typed handoff projections, not
a second spell-slot ledger.

Plan Impact:

- Status: `update-required`
- Affected task: Task 80 / `CRP05-SBE-02` is unblocked by accepted semantic and
  route replay evidence after revision-round-3 seeded semantic branch replay
  correction and revision-round-4 cleanup of unused/duplicated helper state.
- Future settlement tasks should keep source-exact slot deltas on the existing
  battle-to-sheet settlement path rather than adding parallel resource state.
- Required plan edits: mark Task 80 / `CRP05-SBE-02` accepted and record
  `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
  as accepted route evidence.
