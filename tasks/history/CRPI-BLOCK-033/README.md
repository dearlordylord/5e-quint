# CRPI-BLOCK-033 History

Task 62 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-033.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied weapon Attack ordering
`qRoute` projection to the target reducer route surface for
`WeaponAttackRouteSubject`. Revision round 2 moved the replay off
adapter-local route assembly: the route driver now records public
`AvailableBattleAct.routeEvents` from `discoverBattleActs` and public
`BattleResolutionResult.routeEvents` from `resolveBattleSubject`, including
invalid out-of-order fill route events owned by the hole frontier.
Revision round 3 narrowed those invalid route events to the two established
weapon Attack ordering invalid-fill messages, leaving unrelated invalid
attack-roll or damage-fill failures without Task 62 hole-frontier route events.
The 2026-07-07 Task 62 fresh-context run refreshed the rolling engine-depth
and state-owner manifests back to `CRPI-BLOCK-033` after later task history had
left them describing Sleep repeat-save. The refresh is metadata-only: it
records the existing public route-event projections and BattleState combatant
ownership without changing reducer behavior or target replay evidence.

No duplicate durable state was introduced. The replay reuses existing
`BattleState` combatants, public hole/fill kinds, typed
`BattleResolutionResult` facts, existing weapon Attack action facts, and
existing Hit Point fields. Weapon/source identity remains a typed attack fact
selected at the boundary; production route behavior does not branch on authored
identity, QNT branch action names, witness field names, fixture labels, or
connector filenames.

Plan Impact:

- Status: `none`
- Affected task: Task 62 / `CRPI-BLOCK-033` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES`
  remains unchanged.
- Required plan edits: none.
