# CRPI-READY-020 History

Task 51 route replay was accepted against source commit
`0da15bfe0871d5a45782c7ac355d622be8907d44` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-020.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Subtle Spell component
projection `qRoute` to public reducer entrypoints for False Life resolution.
The replay executes `stepRouteSpellComponentProjection`, which delegates to the
copied `doRouteSpellComponentProjection` route action, and compares that
`qRoute` to route events derived from `battleReducerStartRouteEvent`,
`discoverBattleActs`, and `resolveBattleSubject`.

Revision round 2 kept Subtle Spell admission at the existing action-time cast
boundary and made public discovery use that same subject-aware component
projection predicate. The focused regression covers Barkskin as a bonus-action
scalar-buff spell with V/S/M components and confirms no unsupported Subtle act
is discovered. The same round replaced the public metamagic label fallback with
a complete effect-kind label map and verifies False Life is displayed as
`Subtle Spell`, not `Quickened Spell`.

No duplicate Metamagic state was introduced. Sorcery Point spend remains in the
character battle point-pool resource, spell-slot spend and action economy remain
in the spell invocation resolver, Temporary Hit Points remain in
`BattleCreatureState.tempHp`, and selected Metamagic option identity remains at
catalog, selection, admission, and fixture boundaries. The route is derived from
typed `component_suppression` Metamagic facts on scalar-buff spell subjects and
the spell's component projection facts, not from option names.

Plan Impact:

- Status: `none`
- Affected task: Task 51 / `CRPI-READY-020` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future metamagic route tasks remain unchanged.
- Required plan edits: none.
