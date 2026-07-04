# CRPI-READY-010

Task 41 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-READY-010.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay adds public reducer route events for the executable Sleep
repeat-save lifecycle: initial Sleep save discovery/resolution, Condition
lifecycle mutation, active Spell Effect admission/cleanup, Concentration
ownership, and turn-boundary repeat-save discovery while the pending Sleep
effect exists.

Revision round 3 removed the rejected caller-authored input and identified that
post-cleanup end-turn surface transitions have no Sleep repeat-save frontier in
reducer-owned state. No Sleep replay history or condition ledger is stored in
`BattleState`.

Revision round 4 narrowed the turn-boundary route predicate to the pending
repeat-save frontier, `BattleCreatureState.activeEffects[kind=sleepPendingRepeatSave]`.
The later `sleepUnconscious` effect is a condition effect, not a live
repeat-save frontier, so later end turns no longer emit repeat-save
turn-boundary route events.

Revision round 5 restored the copied route connector projection to source hash
`c124d6c23ba30449dcceb346d88f57a321ccf9c953db6af627285b60861d95d2`.
The remaining mismatch is recorded as a source-QNT-corpus blocker: the copied
connector expects post-Concentration-cleanup turn-boundary no-op route events
after no reducer-owned Sleep repeat-save frontier remains.

Revision round 6 removed the overclaimed accepted coverage from
`tasks/VALIDATION_REPORT.md`. The checked-in artifacts now consistently record
Task 41 as blocked, with no accepted copied-connector `qRoute` replay evidence.

Revision round 8 recorded the concrete required plan edits in
`tasks/VALIDATION_REPORT.md`. The Ralph plan file itself is outside this task
worktree's permitted edit root, so the decider must reclassify
`CRPI-READY-010` from ready to blocked and add the source-QNT-corpus follow-up.
