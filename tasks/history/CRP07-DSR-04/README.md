# CRP07-DSR-04 History

Task 12 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP07-DSR-04.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Death Saving Throw lifecycle branch
obligations for
`packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`. Replay
observes the copied `qRoute` projection through public reducer route events
from the battle start route marker and `BattleResolutionResult.routeEvents` on
the End Turn path. Death Saving Throw discovery, fill, and wrong-actor
rejection route through the Hit Point and zero-HP lifecycle owner, while HP,
Unconscious, Stable, Dead, death-save counters, current actor, and turn
advancement remain BattleState-owned runtime facts.
