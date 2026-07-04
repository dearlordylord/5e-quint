# CRPI-READY-006 History

Task 31 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-006.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers all eleven in-scope Quickened Spell governor
branch obligations through public reducer route events: restoration,
save-gated condition, save-gated condition immunity, direct condition,
roll modifier, after-Magic-action-spent restoration, unaffordable, unknown
option, unsupported second option, one Metamagic option per spell, and prior
level-1-plus spell on the same turn. Successful replay observes the copied
`qRoute` projection through `battleReducerStartRouteEvent`,
`AvailableBattleAct.routeEvents`, and `BattleResolutionResult.routeEvents`;
rejection replay observes `battleReducerStartRouteEvent` and invalid
`resolveBattleSubject` route events.

Resource, option, and stacking failures route through
`metamagicSpellGovernor` / `battleFeatureResource`; the same-turn level-1-plus
lock routes through `metamagicBonusActionCastingTime` /
`battleTurnBoundary`. Successful restoration routes through Bonus Action and
Spell Slot economy, target selection, Hit Point / zero-HP lifecycle, and turn
boundary. Successful save-gated and target-list branches route through
metamagic timing, target or saving-throw ownership, and active-effect
ownership. The public Quickened Ray of Frost route assertion remains diagnostic
only because it is not a source branch in the Quickened governor QNT driver.
No adapter-local route ledger or duplicate Quickened state is used.
