# CRPI-READY-012 History

Task 43 route replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-012.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied
`MetamagicSpellRangeProjectionRouteSubject` `qRoute` to public reducer
entrypoints for Distant Spell object-light resolution. The replay executes
`stepRouteSpellRangeProjection`, which delegates to the copied
`doRouteSpellRangeProjection` route action, and compares that `qRoute` to route
events derived from `battleReducerStartRouteEvent`, `discoverBattleActs`, and
`resolveBattleSubject`.

No duplicate Metamagic state was introduced. Sorcery Point spend remains in the
character battle point-pool resource, Light output remains in
`BattleState.lightEmitters`, and selected Metamagic option identity remains at
catalog, selection, admission, and fixture boundaries. Runtime routing is
derived from the typed `spell_range_increase` effect kind, action-spell cast
mode, object-light procedure shape, object-target hole/fill state, and public
route event boundary fields.

Plan Impact:

- Status: `none`
- Affected task: Task 43 / `CRPI-READY-012` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future metamagic route tasks remain unchanged.
- Required plan edits: none.
