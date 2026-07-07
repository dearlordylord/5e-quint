# CRPI-BLOCK-025 History

Task 37 target replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`8c856409a423a320bf05e4b4a927e76b1902af823ba01f2b5a928f867a6a6be6`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-025.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied selected-identity `qRoute`
projection for Sanctuary ward creation, direct attack and spell interdiction,
replacement target legality, area-effect exclusion, and early ward end against
public battle-runtime reducer route events.

Runtime scenario projections are derived through public `discoverBattleActs`,
`resolveBattleSubject`, `battleReducerStartRouteEvent`, and reducer result
`routeEvents` in
`packages/battle-runtime/src/sanctuary-selected-identity.mbt.test.ts`.
The damage-dealt early-end branch observes public `resolveBattleSubject`
`routeEvents` by setting up SRD Flaming Sphere before Sanctuary, then resolving
the warded source creature's later `movableZoneRam` damage; the normal public
weapon attack path ends Sanctuary at the attack-roll boundary before damage is
rolled.

Task 37 extends `packages/battle-runtime/src/battle-reducer/reducer-route.ts`
with the generic `wardedTargetInterdiction` route subject and
`sanctuaryInterdictionOutcome` route hole/fill kind. The route projection is
derived from typed `sanctuaryTargetingInterdiction` invocation procedure facts,
existing `sanctuaryWard` active effects, public holes/fills, save-gated area
facts, and reducer result deltas. No duplicate durable state was introduced.
For save-gated area discovery, the route uses affected target ids when the
public hole exposes `areaChoices`; otherwise it records the unresolved
area-shape boundary and relies on the later public `savingThrowOutcome` fill for
the affected-target facts.

Plan Impact:

- Status: `none`
- Affected task: Task 37 / `CRPI-BLOCK-025` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent Sanctuary and warded-target route tasks remain unchanged.
- Required plan edits: none.
