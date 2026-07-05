# CRP05-SBE-01 History

Task 78 was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP05-SBE-01.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence records the semantic `qState` for sheet-to-battle
init projection, the cumulative init-projection `qRoute`, and the
encounter-composition `qRoute`. Semantic runtime projection is derived through
public character-battle entrypoints: `characterSheetBattleInit`,
`characterSheetBattleInitWithRoute`,
`battleCreatureInitFromCharacterBuildWithRoute`, and
`startBattleFromCharacterSheetAndStatBlock`. Cumulative route replay evidence is
derived through the production `characterBattleInitProjectionRouteAfter` and
`characterBattleEncounterCompositionRoute` projections in
`packages/character-battle-runtime/src/character-battle-route.ts`.

No duplicate durable state was introduced. Character Sheet and Character Build
remain the source of pre-entry facts; battle init produces a battle combatant;
`BattleState` owns participant membership, Encounter Side values, Initiative
order, and the initial current actor after `startBattle`. Encounter-composition
route facts are emitted only by the sheet-plus-stat-block entrypoint after it
checks the expected sheet-derived character combatant, non-sheet stat-block
combatant, and current actor from that state. Route events are typed handoff
projections, not a second sheet/build ledger.

Build-init route rejection keeps the hit-point projection route tied to the
battle-init owner constant for the max-HP-exceeds-build-max failure. Other build
projection failures use the generic init projection rejection route.

Plan Impact:

- Status: `update-required`
- Affected task: Task 78 / `CRP05-SBE-01` is unblocked by accepted semantic and
  route replay evidence.
- Future route tasks should use the production
  `packages/character-battle-runtime/src/character-battle-route.ts` vocabulary
  instead of test-local route event unions.
- Required plan edits: update the Task 78 route inventory/plan record to include
  `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
  as accepted route evidence alongside the existing init-projection connector.
