# CRPI-READY-023 History

Task 61 route replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-023.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied turn-boundary effect lifecycle
`qRoute` to public reducer route events produced by `endTurn`. The replay
starts from `battleReducerStartRouteEvent`, then observes end-turn boundary
discovery, rolled-dice Hit Point resolution, saving-throw active-effect
resolution, target end-turn damage, active-effect expiry, and turn-boundary
advancement through `BattleResolutionResult.routeEvents`.

Revision round 2 added the mixed public `endTurn` frontier where the next actor
needs a Death Saving Throw at the same boundary as turn-start damage/save. That
frontier is now routed as two owned discovery events: `deathSavingThrow` remains
with `battleHitPointAndZeroHpLifecycle`, while `turnBoundaryEffectLifecycle`
receives only the turn-boundary rolled-dice and saving-throw holes.

Revision round 3 added the post-damage Concentration Saving Throw frontier and
invalid rolled-dice fill checks. Turn-boundary damage now splits the remaining
`concentrationSavingThrow` hole to `concentrationTeardown` /
`battleConcentration`, and invalid duplicate or mismatched turn-boundary damage
roll fills do not emit a `battleHitPoint` ownership event.

Revision round 4 added a mixed public `endTurn` frontier with both a normal
spell condition end-turn save and a turn-start damage/save lifecycle. Resolving
the non-turn-boundary save first now reports the generic command route owner and
does not emit a `turnBoundaryEffectLifecycle` / `battleActiveEffect` save-fill
route event.

Revision round 5 added the mixed public `endTurn` frontier where a
`sleepPendingRepeatSave` and turn-start damage/save are present together.
Discovery now reports both `repeatSaveConditionEffect` and
`turnBoundaryEffectLifecycle` owner events instead of letting the repeat-save
route hide the boundary lifecycle route.

Revision round 6 moved the turn-start save hole-id projection to the
turn-boundary hole producer in `turn-end-movement.ts`. The route classifier now
reuses that helper instead of carrying a second copy of the key format.

No duplicate turn-boundary state was introduced. Initiative order and round
advancement remain `BattleState.initiative`; Hit Points remain
`BattleCreatureState.hp`; active Spell Effects remain
`BattleCreatureState.activeEffects`; ongoing-feature occurrences remain
`BattleCreatureState.activeOngoingFeatureOccurrences`. Same-timing order remains
at the public turn-boundary hole/fill frontier.

Plan Impact:

- Status: `none`
- Affected task: Task 61 / `CRPI-READY-023` is unblocked by accepted copied
  `qRoute` replay evidence.
- Future turn-boundary and active-effect lifecycle route tasks remain unchanged.
- Required plan edits: none.
