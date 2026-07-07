# CRPI-BLOCK-034 History

Task 63 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-034.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied weapon Attack skeleton
`qRoute` projection to the target reducer route surface for
`WeaponAttackRouteSubject`, `BattleActionRouteSubject`, and
`StatBlockActionRouteSubject`. The replay observes the `startBattle` route
marker plus public `AvailableBattleAct.routeEvents` from `discoverBattleActs`
and public `BattleResolutionResult.routeEvents` from `resolveBattleSubject`.
It includes weapon target selection, Attack Roll, Hit Point damage,
stale-subject rejection, turn advancement, stat-block Multiattack dispatch, and
stat-block attack dispatch.

No duplicate durable state was introduced. The replay reuses existing
`BattleState` combatants, turn action resources, stat-block Multiattack
resources, public hole/fill kinds, typed `BattleResolutionResult` facts,
existing weapon Attack and stat-block action subjects, and existing Hit Point
fields. Stat-block control reuse remains documented by `CRPI-READY-034`; this
task records the downstream battle route evidence separately. Production route
behavior does not branch on authored identity, QNT branch action names, witness
field names, fixture labels, or connector filenames. Production `battleAction`
and `statBlockAction` route subjects are derived from typed runtime subjects and
the actor's existing BattleState origin.

Plan Impact:

- Status: `none`
- Affected task: Task 63 / `CRPI-BLOCK-034` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Required plan edits: none.
