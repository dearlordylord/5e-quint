# CRPI-BLOCK-026 History

Task 54 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`4d27347eda58a4569b7e0ddfef50c67069814fb07d4bd62c9bf55b3bc636b2da`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-026.json`
- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the four selected-identity branches for
`packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`:
Dragonborn passive damage resistance, Dwarven passive Poison damage and
Poisoned Saving Throw substrate, Halfling Brave condition-scoped Saving Throw
substrate, and Goliath Powerful Build ending-Grappled Ability Check substrate.
Replay observes the copied `qRoute` from
`packages/battle-runtime/battle-runtime-species-passive-trait-substrates.route.mbt.qnt`
through public `discoverBattleActs` and `resolveBattleSubject` route events:
creature stat projection, passive damage adjustment, passive Saving Throw roll
mode, passive Ability Check roll mode, accepted creature-space traversal, and
the occupied-stop, missing-permission, and same-size rejection branches.

Production behavior remains shaped by existing BattleState creature size,
speed, selected support-profile, damage adjustment, Saving Throw roll-mode,
Ability Check roll-mode, movement-resource, and creature-space movement
permission owners. Selected species identity remains a catalog, selection,
admission, and SRD fixture boundary rather than a production reducer dispatch
key.
