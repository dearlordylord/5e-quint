# CRPI-READY-016 History

Task 47 route replay was accepted against source commit
`0da15bfe0871d5a45782c7ac355d622be8907d44` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-016.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied
`MetamagicMissedSpellAttackRerollRouteSubject` `qRoute` to public reducer
entrypoints for Seeking Spell Ray of Frost missed spell Attack reroll
resolution. The replay executes `stepRouteMissedSpellAttackReroll`, which
delegates to the copied `doRouteMissedSpellAttackReroll` route action, and
compares that `qRoute` to route events derived from
`battleReducerStartRouteEvent`, `discoverBattleActs`, and
`resolveBattleSubject`.

No duplicate Metamagic state was introduced. Sorcery Point spend remains in the
character battle point-pool resource, target Hit Point and active effect changes
remain in `BattleCreatureState`, selected Metamagic option identity remains at
catalog, selection, admission, and fixture boundaries, and the route is derived
from typed runtime facts on the spell attack-roll hole and attack-roll fill.

Plan Impact:

- Status: `none`
- Affected task: Task 47 / `CRPI-READY-016` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future metamagic route tasks remain unchanged.
- Required plan edits: none.
