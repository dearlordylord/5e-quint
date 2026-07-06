# CRPI-READY-014 History

Task 45 route replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-014.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied
`MetamagicSpellDurationProjectionRouteSubject` `qRoute` to public reducer
entrypoints for Extended Spell Enlarge/Reduce creature-size resolution. The
replay executes `stepRouteSpellDurationProjection`, which delegates to the
copied `doRouteSpellDurationProjection` route action, and compares that
`qRoute` to route events derived from `battleReducerStartRouteEvent`,
`discoverBattleActs`, and `resolveBattleSubject`.

No duplicate Metamagic state was introduced. Sorcery Point spend remains in the
character battle point-pool resource, duration and Concentration ownership
remain in `BattleCreatureState.activeEffects` and
`BattleCreatureState.concentration`, selected Metamagic option identity remains
at catalog, selection, admission, and fixture boundaries, and the route is
derived from typed runtime facts on the action spell and the active-effect /
Concentration state delta.

Plan Impact:

- Status: `none`
- Affected task: Task 45 / `CRPI-READY-014` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future metamagic route tasks remain unchanged.
- Required plan edits: none.
