# CRPI-READY-019 History

Task 50 route replay was accepted against source commit
`0da15bfe0871d5a45782c7ac355d622be8907d44` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-019.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Quickened Spell attack sequence
`qRoute` to public reducer entrypoints for Eldritch Blast resolution. The replay
executes `stepRouteBonusActionCastingTime`, which delegates to the copied
`doRouteBonusActionCastingTime` route action, and compares that `qRoute` to
route events derived from `battleReducerStartRouteEvent`, `discoverBattleActs`,
and `resolveBattleSubject`.

No duplicate Metamagic state was introduced. Sorcery Point spend remains in the
character battle point-pool resource, target choice, Attack Roll, and damage
roll outcomes remain table-supplied fills, target Hit Point changes remain in
`BattleCreatureState`, selected Metamagic option identity remains at catalog,
selection, admission, and fixture boundaries, and the route is derived from
typed Quickened Metamagic facts on the bonus-action spell subject plus spell
Attack sequence procedure holes and fills.

Plan Impact:

- Status: `none`
- Affected task: Task 50 / `CRPI-READY-019` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future metamagic route tasks remain unchanged.
- Required plan edits: none.
