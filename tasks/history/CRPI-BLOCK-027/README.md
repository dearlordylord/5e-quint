# CRPI-BLOCK-027 History

Task 55 accepts spell Attack ordering `qRoute` replay through public battle
reducer route events against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-027.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers all 12 branch obligations for
`packages/battle-runtime/battle-runtime-spell-attack-ordering.mbt.qnt`.
Replay observes the copied `qRoute` projection through public route events
produced directly from `battleReducerStartRouteEvent`,
`AvailableBattleAct.routeEvents` on `discoverBattleActs`, and
`BattleResolutionResult.routeEvents` on `resolveBattleSubject`. Single-target
discovery, typed damage-type discovery, object-target-boundary discovery,
target-choice fills, damage-type fills, Attack Roll fills, earlier-frontier
requests, and hit-gated damage dice are all routed through the existing
spellAttackProcedure route subject.

No parallel spell Attack ordering state was added. Magic Action availability
remains `BattleState.currentTurnResources`, target and damage-type choices
remain submitted `BattleFill` facts, Attack Rolls remain reducer Attack Roll
fills, target Hit Points remain `BattleCreatureState.hp`, and route labels are
derived from public reducer result route events.
