# CRPI-BLOCK-013 History

Task 19 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`e8ededa80ac8cdfd875f4725149078879450eefb855b922cd7e1bba86f4edc43`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-013.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the four selected-identity branches for
`packages/battle-runtime/battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt`:
accepted traversal through a larger creature space, occupied-stop rejection,
missing-profile rejection, and same-size traversal rejection. Replay observes
the copied creature-space movement `qRoute` through public battle runtime
entrypoints with route evidence emitted by `resolveBattleSubject` movement-fill
resolution when the fill carries `creatureSpaceTraversal`. Public
`discoverBattleActs` remains part of the target entrypoint sequence, but generic
move discovery does not emit creature-space permission route evidence.
Round 4 further narrowed route emission so Opportunity Attack interrupt windows
and non-permission movement failures with `creatureSpaceTraversal` also do not
emit creature-space permission owner evidence.

Production behavior remains shaped by BattleState creature-space movement
permission, creature Size, movement-resource, and support-profile owners.
Selected species identity remains a catalog, selection, admission, and SRD
fixture boundary rather than a production reducer dispatch key.
