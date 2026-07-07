# CRPI-BLOCK-024 History

Task 36 target replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`8c856409a423a320bf05e4b4a927e76b1902af823ba01f2b5a928f867a6a6be6`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-024.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied selected-identity `qRoute`
projection for Bless, Bane, Guidance, Resistance, and Shield of Faith against
public battle-runtime reducer route events. Bless, Bane, and Guidance route
through the roll-modifier active-effect connector; Resistance routes through the
spell damage-reduction connector; Shield of Faith routes through the scalar-buff
active-effect connector.

Runtime scenario projections are derived through public `discoverBattleActs`,
`resolveBattleSubject`, `endTurn`, `battleReducerStartRouteEvent`, and reducer result
`routeEvents` in
`packages/battle-runtime/src/roll-modifier-buff-selected-identity.mbt.test.ts`.
Task 36 also extends
`packages/battle-runtime/src/battle-reducer/reducer-route.ts` so the Resistance
damage-reduction path has production route events for target selection, damage
type choice, active-effect admission, Concentration, damage-adjustment roll
discovery, reduction roll resolution, and active-effect use.

No duplicate durable state was introduced. The replay reuses existing
`BattleCreatureState.activeEffects`, `BattleCreatureState.concentration`, public
hole and fill kinds, and typed spell invocation procedure facts. Production
route projection derives `spellDamageReduction` from typed runtime facts, not
authored spell identity, branch names, witness labels, or connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 36 / `CRPI-BLOCK-024` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent roll-modifier, spell damage-reduction, and scalar-buff route tasks
  remain unchanged.
- Required plan edits: none.
