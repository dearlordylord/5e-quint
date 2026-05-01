# Active Plan

Date: 2026-04-29

This is the single active planning queue.

Active batch: Post-BA architecture watcher/corrector.

Completed Correction Application Migration goal: replace the old
Core/projected-executable vertical with a Surface/Unit-driven character-creation
runtime, battle runtime, and promoted MCP path. The first runnable vertical is
the Orc Soldier Fighter 1 from
[phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
versus the Goblin Warrior Stat Block, through real creation holes, battle
Attack with damage, and End Turn. The first post-CAM width slice adds Fighter
2, Wizard 1, and Skeleton pressure.

Completed Battle Authority Reconciliation goal: the temporary split between
root `battle.qnt`/Core battle MBT and
`@dnd/battle-runtime`/`battle-runtime.qnt` is closed. The promoted
Unit/StatBlock-backed battle runtime is the active battle authority for new
work. Old Core battle behavior and its wider MBT remain valuable restore/proof
source material, but missing old-only features are widening work, not a reason
to keep two active authorities.

Post-BA planning intent: the Battle Authority Reconciliation batch must not end
with only a Restore Ledger. Its final planner step must append the next ordered
work queue to this file, after the BA tasks, and synchronize that queue into the
Ralph Task Index and DAG table so the Ralph loop picks up the next ready task
immediately. The next queue should be organized in this order:

1. Archive maximum promoted Quint parity and composition proof first. This means
   making the promoted QNT/MBT proof story and MCP composition boundary explicit
   enough that new agents can see how multiple runtime machines/packages compose
   without reviving the old Core authority.
2. Then schedule old Core feature-parity restoration as atomic promoted-runtime
   tasks, using old Core/root QNT only as source/proof material.
3. Then schedule broader widening work. Do not start broad Surface/catalog
   widening from this queue until the maximum parity/composition archive is
   complete and the feature-parity restoration queue is explicit.

Primary planning documents:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)
- [CORRECTION_APPLICATION_VOCABULARY.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_VOCABULARY.md)
- [promoted-quint-parity-composition-archive.md](/workspace/typescript/dnd/plans/promoted-quint-parity-composition-archive.md)

Previous active queue status: the Executable Projection Tracer Bullet and Content-Surface Taxonomy Convergence queue is deferred by owner direction on 2026-04-29. Its in-progress/ready/blocked work was superseded by the Correction Application Migration. Preserve old domain knowledge through the Restore Ledger in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md), not by continuing projected-executable tasks.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or explicit owner decision must land first.
- `deferred`: Only use when the owner explicitly says to park the task for now. Do not use for queue ordering.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "CAM16A",
      "status": "done",
      "title": "Prepare Character Creation Runtime For Catalog Widening"
    },
    {
      "number": 1,
      "id": "POST0",
      "status": "done",
      "title": "Reconsider Post-CAM Width Plan After CAM16A"
    },
    {
      "number": 2,
      "id": "POST1",
      "status": "done",
      "title": "Research First Width Slice RAW And Corpus"
    },
    {
      "number": 3,
      "id": "CAM17",
      "status": "done",
      "title": "Add MCP Character Creation Tools"
    },
    {
      "number": 4,
      "id": "CAM18A",
      "status": "done",
      "title": "Add MCP Battle Session Shell"
    },
    {
      "number": 5,
      "id": "CAM18B",
      "status": "done",
      "title": "Add MCP Fighter Battle Flow"
    },
    {
      "number": 6,
      "id": "CAM18C",
      "status": "done",
      "title": "Add Goblin Warrior Attack Support"
    },
    {
      "number": 7,
      "id": "CAM18D",
      "status": "done",
      "title": "Add Full Green Vertical Fixture"
    },
    {
      "number": 8,
      "id": "CAM18E",
      "status": "done",
      "title": "Add Post-Battle Character State Handoff"
    },
    {
      "number": 9,
      "id": "CAM19A",
      "status": "done",
      "title": "Refresh Core And Projected Deletion Inventory"
    },
    {
      "number": 10,
      "id": "CAM19B",
      "status": "done",
      "title": "Isolate Legacy Core MCP Path"
    },
    {
      "number": 11,
      "id": "CAM19C",
      "status": "done",
      "title": "Delete Projected Vocabulary From Promoted Path"
    },
    {
      "number": 12,
      "id": "CAM19D",
      "status": "done",
      "title": "Reconcile Post-Deletion Docs And Tests"
    },
    {
      "number": 13,
      "id": "CAM20",
      "status": "done",
      "title": "Green Reconciliation And MCP Promotion"
    },
    {
      "number": 14,
      "id": "CAM21",
      "status": "done",
      "title": "End-User Vertical Acceptance"
    },
    {
      "number": 15,
      "id": "POST2",
      "status": "done",
      "title": "Add First Width Slice Surface Records And Readers"
    },
    {
      "number": 16,
      "id": "POST3",
      "status": "done",
      "title": "Widen Character Creation Runtime Support Profile"
    },
    {
      "number": 17,
      "id": "POST4",
      "status": "done",
      "title": "Widen Battle Runtime For First Width Slice"
    },
    {
      "number": 18,
      "id": "POST5",
      "status": "done",
      "title": "Add Widened MCP User Workflow Coverage"
    },
    {
      "number": 19,
      "id": "BA0",
      "status": "done",
      "title": "Define Battle Authority Policy"
    },
    {
      "number": 20,
      "id": "BA1",
      "status": "done",
      "title": "Inventory Old Battle Authority Surface"
    },
    {
      "number": 21,
      "id": "BA2",
      "status": "done",
      "title": "Inventory Promoted Runtime Proof Coverage"
    },
    {
      "number": 22,
      "id": "BA3",
      "status": "done",
      "title": "Replan Authority Slices From Inventories"
    },
    {
      "number": 23,
      "id": "BA4",
      "status": "done",
      "title": "Reconcile Attack Damage HP Overlap"
    },
    {
      "number": 24,
      "id": "BA5",
      "status": "done",
      "title": "Reconcile Initiative Turn Action Economy Overlap"
    },
    {
      "number": 25,
      "id": "BA6",
      "status": "done",
      "title": "Reconcile Promoted Width Overlap"
    },
    {
      "number": 26,
      "id": "BA7",
      "status": "done",
      "title": "Reconcile Zero HP Lifecycle Boundary"
    },
    {
      "number": 27,
      "id": "BA8",
      "status": "done",
      "title": "Choose Canonical Battle QNT Layout"
    },
    {
      "number": 28,
      "id": "BA9",
      "status": "done",
      "title": "Quarantine Legacy Core Battle MBT"
    },
    {
      "number": 29,
      "id": "BA10",
      "status": "done",
      "title": "Define Promoted Runtime MBT Strategy"
    },
    {
      "number": 30,
      "id": "BA11",
      "status": "done",
      "title": "Add First Promoted Integrated Battle QNT MBT"
    },
    {
      "number": 31,
      "id": "BA12",
      "status": "done",
      "title": "Convert Old-Only Battle Behavior To Width Backlog"
    },
    {
      "number": 32,
      "id": "BA13",
      "status": "done",
      "title": "Close Battle Authority Reconciliation"
    },
    {
      "number": 33,
      "id": "PBA0",
      "status": "done",
      "title": "Archive Promoted Quint Parity And Composition Boundary"
    },
    {
      "number": 34,
      "id": "PBA1",
      "status": "done",
      "title": "Document Battle Reducer Extensibility Discipline"
    },
    {
      "number": 35,
      "id": "PBA2",
      "status": "done",
      "title": "Audit Reducer For Named-Ability Drift"
    },
    {
      "number": 36,
      "id": "PBA3",
      "status": "done",
      "title": "Correct First Reducer Extensibility Drift"
    },
    {
      "number": 37,
      "id": "PBA4",
      "status": "ready-for-research",
      "title": "Align Protocol Docs And Start Feature-Parity Queue"
    },
    {
      "number": 38,
      "id": "PBA5",
      "status": "blocked",
      "title": "Restore Death Save Turn Lifecycle"
    },
    {
      "number": 39,
      "id": "PBA6",
      "status": "blocked",
      "title": "Restore Second Wind And Bonus-Action Subjects"
    },
    {
      "number": 40,
      "id": "PBA7",
      "status": "blocked",
      "title": "Restore Save-Gate Damage Spell Procedure"
    },
    {
      "number": 41,
      "id": "PBA8",
      "status": "blocked",
      "title": "Restore Persistent Spell Effects And Concentration"
    },
    {
      "number": 42,
      "id": "PBA9",
      "status": "blocked",
      "title": "Restore Reaction Windows And Interrupt Stack"
    },
    {
      "number": 43,
      "id": "PBA10",
      "status": "blocked",
      "title": "Restore Movement Positioning And Opportunity Attacks"
    },
    {
      "number": 44,
      "id": "PBA11",
      "status": "blocked",
      "title": "Restore Monster Resource Controls"
    },
    {
      "number": 45,
      "id": "PBA12",
      "status": "blocked",
      "title": "Restore Hand Weapon And Grapple State"
    },
    {
      "number": 46,
      "id": "PBA13",
      "status": "blocked",
      "title": "Restore Hide Search And Class Rider Width"
    },
    {
      "number": 47,
      "id": "PBA14",
      "status": "blocked",
      "title": "Restore Turn Roster And Generic Combat Actions"
    },
    {
      "number": 48,
      "id": "PBA15",
      "status": "blocked",
      "title": "Plan Broader Battle Widening Queue"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Treat this file as a dynamic queue, not a finite checklist. Planning/research
  tasks may spawn follow-up implementation, verification, parity, or widening
  tasks when that is the honest output of the work. Append spawned tasks to the
  end of the Ralph Task Index, DAG table, and task-detail sections in the same
  plan edit that records the discovery.
- A batch-ending task must either append the next ordered batch or record an
  explicit owner decision that no further active work is currently desired. Do
  not let the Ralph loop fall off the end of the plan merely because evidence
  was written to a ledger or archival document.
- Newly spawned tasks should make dependency order executable: prefer a blocked
  task with concrete dependencies over prose that says "later"; ensure at least
  one new task is ready when the next batch is supposed to start immediately.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Only add durable planning facts to this file. Run-local failures and attempt-specific reminders belong in run-local artifacts, not here.
- Update the task status before ending the loop: `done`, `ready-for-implementation-after-light-research`, `blocked`, or `deferred`.
- When a task is marked `done`, inspect every task in its `Blocks` column and promote those whose dependencies are now satisfied.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing rules logic.
- For any task that changes reducer behavior, shared algebras, action resources, hole/fill semantics, Surface record boundaries, or runtime package architecture, update the relevant owning docs in the same task. For battle-runtime changes, keep [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md) and [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md) aligned. For character-creation changes, keep [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md) and [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md) aligned. For shared algebra changes, update [packages/shared-algebras/README.md](/workspace/typescript/dnd/packages/shared-algebras/README.md) or the relevant package-local MBT docs. Treat `packages/surface-runtime-correction/*` docs as legacy source material unless the task intentionally edits that package.
- For any implementation task, include `/simplify` convergence in the closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. Treat battle MBT as scarce; use deterministic unit and projection tests first.
- Ralph task runs must not use fuzz/overnight scripts or MBT tiers above Tier 1/Tier 1b unless a task explicitly requires it.

## DAG / Queue Order

| Order | Task                                                             | Status             | Depends on           | Blocks                              | Next action                                                                                                                                                                                                      | Handoff readiness                                                                         |
| ----- | ---------------------------------------------------------------- | ------------------ | -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0     | CAM16A - Prepare Character Creation Runtime For Catalog Widening | done               | completed baseline   | CAM17, POST0                        | Localized Phase 1 support gates, derived build projection from accepted selections, and indexed hole/option validation before MCP exposes the creation runtime.                                                  | Completed.                                                                                |
| 1     | POST0 - Reconsider Post-CAM Width Plan After CAM16A              | done               | CAM16A               | POST1                               | Rewrote the mandatory post-CAM width queue around CAM16A's support-profile boundary.                                                                                                                             | Completed.                                                                                |
| 2     | POST1 - Research First Width Slice RAW And Corpus                | done               | POST0                | POST2                               | Confirmed Fighter 2 + Wizard 1 and selected Skeleton as the second SRD Stat Block pressure case, with deterministic scenario and POST2-POST5 scope recorded below.                                               | Completed; POST2 is unblocked by CAM21.                                                   |
| 3     | CAM17 - Add MCP Character Creation Tools                         | done               | CAM16A               | CAM18A                              | Added green MCP tools for create draft, discover holes, fill holes, and finalize a supported character.                                                                                                          | Completed.                                                                                |
| 4     | CAM18A - Add MCP Battle Session Shell                            | done               | CAM17                | CAM18B                              | Added green MCP tools for selecting a Stat Block, starting battle with explicit Initiative, storing battle session state, and returning battle state/snapshot.                                                   | Completed.                                                                                |
| 5     | CAM18B - Add MCP Fighter Battle Flow                             | done               | CAM18A               | CAM18C                              | Added MCP Fighter battle act discovery, Attack fill accumulation/resolution, BattleState storage, fill clearing, and End Turn initiative advancement.                                                            | Completed.                                                                                |
| 6     | CAM18C - Add Goblin Warrior Attack Support                       | done               | CAM18B               | CAM18D                              | Added Goblin Warrior Scimitar and Shortbow Attack discovery/resolution from authored StatBlockRecord, through the shared battle-runtime and MCP Attack replay.                                                   | Completed.                                                                                |
| 7     | CAM18D - Add Full Green Vertical Fixture                         | done               | CAM18C               | CAM18E                              | Added the full MCP-only green fixture: create/finalize Fighter, select Goblin Warrior, start battle, Fighter attacks, End Turn, and Goblin attacks using normal-range Goblin target legality.                    | Completed.                                                                                |
| 8     | CAM18E - Add Post-Battle Character State Handoff                 | done               | CAM18D               | CAM19A                              | Added explicit green MCP battle closeout, post-battle character HP handoff, and character-list read model for reduced current HP.                                                                                | Completed.                                                                                |
| 9     | CAM19A - Refresh Core And Projected Deletion Inventory           | done               | CAM18E               | CAM19B                              | Refreshed current Core/projected/MCP legacy call-site inventory and updated Restore Ledger/checklist coverage before deletion.                                                                                   | Completed.                                                                                |
| 10    | CAM19B - Isolate Legacy Core MCP Path                            | done               | CAM19A               | CAM19C                              | Move old Core-backed MCP routes/tests into a deletion-marked legacy package/path and keep them out of the promotable MCP entrypoint.                                                                             | Completed; legacy Core-backed MCP path is isolated under `packages/mcp/src/legacy-core/`. |
| 11    | CAM19C - Delete Projected Vocabulary From Promoted Path          | done               | CAM19B               | CAM19D                              | Delete projected executable vocabulary from the promoted MCP/runtime path after legacy isolation, preserving omitted semantics only through Restore Ledger rows.                                                 | Completed.                                                                                |
| 12    | CAM19D - Reconcile Post-Deletion Docs And Tests                  | done               | CAM19C               | CAM20                               | Reconciled normal MCP test ownership, post-deletion docs, Restore Ledger status, and archival projected-executable docs.                                                                                         | Completed; CAM20 has a concrete promotion handoff.                                        |
| 13    | CAM20 - Green Reconciliation And MCP Promotion                   | done               | CAM19D               | CAM21                               | Promoted the runtime tools into the normal MCP server path, deleted `src/green` and `src/legacy-core`, and replaced green fixture coverage with normal MCP server tests.                                         | Completed; CAM21 is unblocked.                                                            |
| 14    | CAM21 - End-User Vertical Acceptance                             | done               | CAM20                | POST2                               | Accepted the promoted user workflow end to end: create character, start battle, add Goblin Warrior, run battle, end battle, and see the character list with reduced positive HP.                                 | Completed; deferred zero-HP/death-save/rest handoff facts are ledgered.                   |
| 15    | POST2 - Add First Width Slice Surface Records And Readers        | done               | POST1, CAM21         | POST3                               | Added the researched Surface width slice: Fighter 2 advancement facts, Wizard 1 spellcasting creation facts, and Skeleton SRD Stat Block vulnerability/immunity shape.                                           | Completed; POST3 is unblocked.                                                            |
| 16    | POST3 - Widen Character Creation Runtime Support Profile         | done               | POST2                | POST4                               | Extended CAM16A's support profile, projections, QNT slice, and docs so the researched class/species/background/spellcasting choices finalize without scattered Phase 1 branches.                                 | Completed; POST4 is unblocked.                                                            |
| 17    | POST4 - Widen Battle Runtime For First Width Slice               | done               | POST3                | POST5                               | Add battle-runtime support for the researched Fighter 2/Wizard/monster pressure through Unit, spell, and monster facts, preserving runtime parity discipline.                                                    | Completed; POST5 is unblocked.                                                            |
| 18    | POST5 - Add Widened MCP User Workflow Coverage                   | done               | POST4                | none                                | Added promoted MCP workflow coverage for the Fighter 2 + Wizard 1 versus Skeleton width slice and updated Restore Ledger status for restored rows.                                                               | Completed.                                                                                |
| 19    | BA0 - Define Battle Authority Policy                             | done               | POST5                | BA1, BA2                            | Documented the one-authority direction: promoted Unit/StatBlock-backed battle runtime is the active semantic authority for new work; old Core battle is legacy/broad restore/proof source material.              | Completed; BA1 and BA2 are unblocked.                                                     |
| 20    | BA1 - Inventory Old Battle Authority Surface                     | done               | BA0                  | BA3                                 | Classified root `battle.qnt`, Core battle MBT, and old battle-machine feature areas into overlap, old-only widening, obsolete Core/projected artifact, and proof-source material.                                | Completed; BA3 remains blocked until BA2 also completes.                                  |
| 21    | BA2 - Inventory Promoted Runtime Proof Coverage                  | done               | BA0                  | BA3                                 | Recorded the promoted runtime proof-coverage map in `plans/battle-runtime-proof-coverage.md`, separating deterministic/runtime/QNT-slice/shared-algebra MBT/MCP coverage from integrated MBT gaps.               | Completed; BA3 is unblocked.                                                              |
| 22    | BA3 - Replan Authority Slices From Inventories                   | done               | BA1, BA2             | BA4, BA5, BA6, BA7, BA8, BA10, BA12 | Consumed BA1/BA2/Restore Ledger facts and kept the BA queue split: four bounded overlap slices, one proof-strategy slice, later QNT layout/quarantine, and old-only backlog conversion.                          | Completed; BA4-BA7 and BA10 are unblocked.                                                |
| 23    | BA4 - Reconcile Attack Damage HP Overlap                         | done               | BA3                  | BA8                                 | Reconciled already-promoted Attack target/roll/damage, criticals, Temporary HP, HP clamp, and supported damage modifiers; stopped at the zero-HP lifecycle handoff owned by BA7.                                 | Completed; BA8 remains blocked until BA5-BA7 complete.                                    |
| 24    | BA5 - Reconcile Initiative Turn Action Economy Overlap           | done               | BA3                  | BA8                                 | Reconciled already-promoted Initiative ordering, current actor, End Turn command modeling, action-resource spend/reset, wrong-actor rejection, and current actor/action gating.                                  | Completed; BA8 remains blocked until BA6 and BA7 complete.                                |
| 25    | BA6 - Reconcile Promoted Width Overlap                           | done               | BA3                  | BA8                                 | Reconciled already-promoted Action Surge, Wizard `magic_missile`/`ray_of_frost`, armor-training spell gate, and Skeleton Stat Block damage modifiers without restoring projected executable vocabulary.          | Completed; BA8 is unblocked because BA4-BA7 are complete.                                 |
| 26    | BA7 - Reconcile Zero HP Lifecycle Boundary                       | done               | BA3                  | BA8, BA12                           | Documented the promoted zero-HP lifecycle boundary and fed BA12 explicit old-only lifecycle width rows without widening durable character state.                                                                 | Completed; BA8 remains blocked until BA6 also completes, and BA12 is unblocked.           |
| 27    | BA8 - Choose Canonical Battle QNT Layout                         | done               | BA4, BA5, BA6, BA7   | BA9, BA11, BA13                     | Promoted `packages/battle-runtime/battle-runtime.qnt` as the canonical package-local QNT spec and documented root `battle.qnt` as legacy/Core proof and restore material.                                        | Completed; BA9 and BA11 are unblocked.                                                    |
| 28    | BA9 - Quarantine Legacy Core Battle MBT                          | done               | BA8                  | BA13                                | Old Core battle MBT is opt-in legacy/Core proof-source material and no longer a promoted runtime verification gate.                                                                                              | Completed; BA13 is done.                                                                  |
| 29    | BA10 - Define Promoted Runtime MBT Strategy                      | done               | BA3                  | BA11                                | Selected the promoted MBT strategy in `plans/promoted-battle-runtime-mbt-strategy.md`: shared algebra MBT stays modular, catalog width defaults to table-driven contract tests, and integrated MBT is selective. | Completed; BA11 is unblocked because BA8 and BA10 are complete.                           |
| 30    | BA11 - Add First Promoted Integrated Battle QNT MBT              | done               | BA8, BA10            | BA13                                | Added the selected narrow trace-driven promoted battle-runtime MBT for Fighter weapon Attack against a Skeleton Stat Block target without widening battle behavior.                                              | Completed; BA13 is done.                                                                  |
| 31    | BA12 - Convert Old-Only Battle Behavior To Width Backlog         | done               | BA3, BA7             | BA13                                | Converted old-only features into the ordered post-BA queue: PBA0-PBA4 archive/protocol batch, PBA5-PBA14 feature-parity restoration, then PBA15 broader widening planning.                                       | Completed; BA13 is done.                                                                  |
| 32    | BA13 - Close Battle Authority Reconciliation                     | done               | BA8, BA9, BA11, BA12 | PBA0                                | Final docs/checks proving the repo has one active promoted battle authority and the ordered post-BA backlog is synchronized.                                                                                     | Completed; PBA0 is unblocked.                                                             |
| 33    | PBA0 - Archive Promoted Quint Parity And Composition Boundary    | done               | BA13                 | PBA1                                | Archived the promoted QNT/MBT proof story and MCP composition boundary before any feature-parity restoration or broad widening starts.                                                                           | Completed; PBA1 is unblocked.                                                             |
| 34    | PBA1 - Document Battle Reducer Extensibility Discipline          | done               | PBA0                 | PBA2                                | Documented that battle reducers interpret reusable SRD procedure families, not one branch per Unit, spell, feature, monster action, or slug.                                                                     | Completed; PBA2 is unblocked.                                                             |
| 35    | PBA2 - Audit Reducer For Named-Ability Drift                     | done               | PBA1                 | PBA3                                | Audited battle-runtime and MCP composition for named-ability reducer drift; found Action Surge support-gate drift and recorded the evidence in `plans/pba2-named-ability-drift-audit.md`.                        | Completed; PBA3 is unblocked to centralize Action Surge support-gate parsing.             |
| 36    | PBA3 - Correct First Reducer Extensibility Drift                 | done               | PBA2                 | PBA4                                | Centralized Action Surge support-gate parsing so discovery and resolution share one executable admitted Unit feature shape.                                                                                      | Completed; PBA4 is unblocked.                                                            |
| 37    | PBA4 - Align Protocol Docs And Start Feature-Parity Queue        | ready-for-research | PBA3                 | PBA5                                | Align docs after the watcher/corrector pass, then promote the first BA12 feature-parity backlog candidate to ready work.                                                                                         | Ready; PBA3 completed the Action Surge support-gate correction.                           |
| 38    | PBA5 - Restore Death Save Turn Lifecycle                         | blocked            | PBA4                 | PBA6                                | Restore start-turn Death Saving Throw rolls, Stable handoff, and zero-HP closeout through battle/runtime and character-session state.                                                                            | Blocked behind PBA0-PBA4.                                                                 |
| 39    | PBA6 - Restore Second Wind And Bonus-Action Subjects             | blocked            | PBA5                 | PBA7                                | Restore UnitRecord-backed Second Wind and the reusable Bonus Action subject/resource protocol without projected executable reducers.                                                                             | Blocked behind zero-HP feature-parity work.                                               |
| 40    | PBA7 - Restore Save-Gate Damage Spell Procedure                  | blocked            | PBA6                 | PBA8                                | Restore Acid Splash-style save-gate damage spell acts as UnitRecord-backed spell holes and shared save/damage procedures.                                                                                        | Blocked behind bonus-action feature subject work.                                         |
| 41    | PBA8 - Restore Persistent Spell Effects And Concentration        | blocked            | PBA7                 | PBA9                                | Restore Mage Armor/persistent AC override, concentration, and readied spell lifecycle through runtime state and spell-effect procedures.                                                                         | Blocked behind save-gate spell procedure work.                                            |
| 42    | PBA9 - Restore Reaction Windows And Interrupt Stack              | blocked            | PBA8                 | PBA10                               | Restore reusable reaction windows and interrupt stack behavior for attacks, spells, saves, and after-damage effects.                                                                                             | Blocked behind persistent effect/concentration work.                                      |
| 43    | PBA10 - Restore Movement Positioning And Opportunity Attacks     | blocked            | PBA9                 | PBA11                               | Restore movement/position mutation, traversal, and Opportunity Attack boundaries with explicit spatial ownership.                                                                                                | Blocked behind reaction-window work.                                                      |
| 44    | PBA11 - Restore Monster Resource Controls                        | blocked            | PBA10                | PBA12                               | Restore StatBlockRecord-backed monster recharge, daily, legendary, and generic monster save/traversal controls.                                                                                                  | Blocked behind movement/OA work.                                                          |
| 45    | PBA12 - Restore Hand Weapon And Grapple State                    | blocked            | PBA11                | PBA13                               | Restore hand occupancy, weapon modes, off-hand attacks, Grapple, Escape Grapple, release, and grapple movement-cost state.                                                                                       | Blocked behind monster control work.                                                      |
| 46    | PBA13 - Restore Hide Search And Class Rider Width                | blocked            | PBA12                | PBA14                               | Restore Hide/Search/hidden discovery plus remaining old class-feature riders as promoted runtime subjects.                                                                                                       | Blocked behind hand/weapon/grapple work.                                                  |
| 47    | PBA14 - Restore Turn Roster And Generic Combat Actions           | blocked            | PBA13                | PBA15                               | Restore mid-battle add/remove, Dash, Dodge, Disengage, Ready, Help, Stand from Prone, and generic combat-action subjects as promoted-runtime behavior.                                                           | Blocked behind hidden-state/class-rider work.                                             |
| 48    | PBA15 - Plan Broader Battle Widening Queue                       | blocked            | PBA14                | future tasks                        | Replan broader Surface/catalog and UI battle widening after parity/composition archive and explicit feature-parity restoration queue.                                                                            | Blocked until feature-parity queue reaches its first closeout point.                      |

## Task Details

### Completed Baseline

CAM0-CAM16 are complete and removed from the active queue to keep this file small. The current baseline includes the Phase 0 audit pack, active `@dnd/surface` package, first SRD Unit/Stat Block content, character-creation runtime through QNT parity, battle runtime through End Turn and package-local QNT slice, and the MCP green composition root. Historical detail lives in git history and the primary planning documents listed above.

### Task 0 - CAM16A - Prepare Character Creation Runtime For Catalog Widening

Status: `done`

Depends on: completed baseline
Blocks: CAM17, POST0

Next action: run the character-creation runtime architecture check, then localize Phase 1 support gates and validation/projection boundaries before MCP exposes the runtime.

Preflight:

- CAM16A should not widen the supported SRD vertical. It prepares the runtime so widening later is mostly Surface reader/support-profile work, not scattered edits.
- Read `.references/srd-5.2.1/Character-Creation.md`, the relevant Fighter/Soldier/Orc/equipment passages, and `UBIQUITOUS_LANGUAGE.md` before changing rules logic.
- Preserve the distinction between authored provenance, structured creation input, and runtime projection.

Input:

- `@dnd/character-creation-runtime`
- `@dnd/surface` Unit catalog/readers
- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)

Output:

- Package-private character-creation support profile that owns currently supported draft choices, Unit choice families, option predicates, and manifest-only finalization facts.
- Fill validation path with indexed hole/option lookup built once per batch.
- Build projection that derives supported manifest features/equipment/loadout from accepted selections instead of Phase 1 constants.
- Discovery/finalization helpers structured so class/background/species widening flows through readers and support-profile entries, not scattered Fighter/Soldier/Orc branches.

Acceptance:

- Phase 1 remains the only supported finalizable character vertical.
- Legal-but-unsupported Surface choices are rejected through one support boundary with precise issues, not ad hoc arrays spread across validation/finalization/projection.
- Adding an unrelated Unit to the catalog cannot change Phase 1 finalization or build output.
- If a supported selected option changes, final `CharacterBuild` reflects the selected draft facts rather than hard-coded manifest constants.
- Hole and option membership checks use indexed lookup or equivalent single-boundary parsing, avoiding repeated nested scans for large option sets.
- Character creation README/VOCABULARY docs explain the support-profile boundary and the remaining Phase 1 finalization gate.

Verification:

- Focused runtime tests using a widened test catalog with many unrelated Units.
- Tests proving unsupported legal options are discoverable when appropriate but rejected consistently at fill/finalization.
- Tests proving finalized build Unit refs, HP/Hit Die derivation, proficiencies, resources, and loadout identity still match the Phase 1 manifest.
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- RAW traceability check for any modeled rule touched by the refactor.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock CAM17 and POST0.

### Task 1 - POST0 - Reconsider Post-CAM Width Plan After CAM16A

Status: `done`

Depends on: CAM16A
Blocks: POST1

Input:

- CAM16A support-profile/projection/validation shape.
- Current post-CAM candidate: Fighter 2, Wizard 1, and a second non-Goblin-shaped monster.
- Restore Ledger rows for full character creation width, spellcasting/Wizard creation, Fighter 2/Action Surge, and monster breadth.

Output:

- Revised POST task outline that reflects the actual CAM16A architecture and requires proactive width implementation after the CAM green path.
- Explicit decision on the first mandatory width implementation slice: default Fighter 2 + Wizard 1 + second monster, or a recorded replacement before implementation.
- Concrete, non-optional dependencies between post-CAM research, Surface content/reader widening, runtime widening, battle widening, and MCP/user workflow tests.

Acceptance:

- POST tasks are rewritten only as planning tasks unless CAM21 is already done;
  implementation tasks remain blocked behind CAM21, but the plan must make
  widening the next required body of work after CAM acceptance.
- The rewritten POST queue contains concrete implementation tasks, not a vague
  research backlog or optional exploration bucket.
- Widening must flow through CAM16A's package-private support profile in
  `packages/character-creation-runtime/src/support-gates.ts`, build projection
  in `finalization.ts`, and their QNT/docs owners. Do not add scattered
  Fighter/Soldier/Orc/Wizard branches in discovery, MCP, or battle code when a
  support-profile entry, Surface reader, or runtime projection is the real
  boundary.
- RAW/local-corpus uncertainty is pushed into POST1 with specific files/topics
  to inspect.
- Default width decision: retain Fighter 2 + Wizard 1 + one second
  non-Goblin-shaped SRD monster. POST0 found no CAM16A architecture reason to
  replace it; POST1 may revise only after local RAW/corpus review records a
  concrete better pressure case.

Verification:

- `git diff --check -- plans/ACTIVE_PLAN.md`
- Ralph task index JSON parse check.

Plan Impact:

- Status: applied.
- POST1: unblocked for RAW/corpus research.
- POST2-POST5: added as concrete mandatory widening implementation tasks,
  blocked behind CAM21 and the researched POST1 slice.
- CAM21: now explicitly blocks POST2 so widening is the next required body of
  work after end-user acceptance.

### Task 2 - POST1 - Research First Width Slice RAW And Corpus

Status: `done`

Depends on: POST0
Blocks: POST2

Default hypothesis:

- Fighter 2 for advancement/level-up replay and level-2 class feature pressure.
- Wizard 1 for spell slots, prepared-spell legality, spell access, and spellcasting creation holes.
- One second SRD monster with mechanics materially different from Goblin Warrior.

Research decision:

- Retain Fighter 2 as the advancement pressure case. Local RAW separates level-1
  creation from higher-level starts and advancement: characters typically start
  at level 1 and advance by XP
  (`.references/srd-5.2.1/Character-Creation.md:38-44`), higher-level
  characters use the normal creation steps plus advancement rules
  (`.references/srd-5.2.1/Character-Creation.md:372-379`), and gaining a class
  level grants that level's class features
  (`.references/srd-5.2.1/Character-Creation.md:421-425`). Fighter level 2
  gives Action Surge (one use) and Tactical Mind
  (`.references/srd-5.2.1/Classes/Fighter.md:29-32`). The first executable
  pressure is Action Surge: one additional non-Magic action on the Fighter's
  turn, one use per Short or Long Rest, scaling only at level 17
  (`.references/srd-5.2.1/Classes/Fighter.md:76-80`). Tactical Mind is retained
  as a sheet/resource fact from the same level, but it is not the first battle
  action pressure because it modifies failed ability checks, not the planned
  Attack/Spell combat scenario
  (`.references/srd-5.2.1/Classes/Fighter.md:82-84`).
- Retain Wizard 1 as the spellcasting creation pressure case. RAW gives Wizard
  level 1 Spellcasting, Ritual Adept, and Arcane Recovery with 3 cantrips, 4
  prepared spells, and two level-1 Spell Slots
  (`.references/srd-5.2.1/Classes/Wizard.md:31-35`). Wizard Spellcasting grants
  three Wizard cantrips, a spellbook containing six level-1 Wizard spells, two
  level-1 Spell Slots restored on Long Rest, and four prepared level-1+ spells
  chosen from the spellbook and limited to levels for which the Wizard has slots
  (`.references/srd-5.2.1/Classes/Wizard.md:56-82`). General spellcasting RAW
  distinguishes spell access/preparation from casting, spell slots from
  cantrips, and slot expenditure/restoration
  (`.references/srd-5.2.1/Spells/Gaining-and-Casting.md:3-28`,
  `:40-65`). Use the project terms Spell Definition, Spell Access, Spell
  Invocation, and Spell Effect from `UBIQUITOUS_LANGUAGE.md:203-217`; do not
  collapse spellbook ownership, prepared-spell legality, and runtime slot
  expenditure into one field.
- Select Skeleton as the second SRD monster. Goblin Warrior already pressures
  conditional bonus damage keyed to attack-roll Advantage and Bonus Action
  options (`.references/srd-5.2.1/Monsters/Monsters-E-G.md:721-746`).
  Skeleton keeps attack execution simple but forces a new authored Stat Block
  shape: Bludgeoning vulnerability plus Poison damage immunity and Exhaustion /
  Poisoned condition immunities
  (`.references/srd-5.2.1/Monsters/Monsters-P-S.md:1152-1175`). The monster
  overview explicitly treats Resistances and Immunities as optional stat-block
  details and describes stat-block attack/damage notation
  (`.references/srd-5.2.1/Monsters/Overview.md:3-21`,
  `:209-227`). Current Surface stat-block schema already carries
  `resistances` and `immunities`, but not vulnerabilities
  (`packages/surface/src/surface/schema-spell.ts:2394-2408`,
  `:2505-2528`), so Skeleton forces a real Surface/runtime shape beyond
  Goblin without pulling in broad monster spellcasting, recharge, or legendary
  controls.
- Wizard spell pressure should use existing/nearby SRD Spell Definitions rather
  than a broad spell survey. The deterministic slice should include three
  Wizard cantrips from the Wizard list and six level-1 spellbook choices, with
  four prepared from that spellbook
  (`.references/srd-5.2.1/Classes/Wizard.md:134-190`). Recommended concrete
  pressure spells: `magic_missile` for a level-1 prepared Magic-action spell act and
  slot spend (`.references/srd-5.2.1/Spells/Descriptions-M-P.md:85-96`),
  `ray_of_frost` for cantrip/no-slot spell attack plus speed rider
  (`.references/srd-5.2.1/Spells/Descriptions-Q-R.md:41-52`), and
  `mage_armor` as an authored Spell Definition/access fact that remains
  out-of-scenario for battle unless the runtime already supports persistent AC
  effects (`.references/srd-5.2.1/Spells/Descriptions-M-P.md:5-14`).
- Do not add Acolyte as part of this first width slice. RAW lets a player
  choose any detailed background; the Ability Scores and Backgrounds table is
  guidance for beneficial pairings when a player has trouble choosing
  (`.references/srd-5.2.1/Character-Creation.md:54-71`). Reusing the existing
  Soldier background keeps the deterministic Wizard pressure on spellcasting
  holes and avoids hiding a second background authoring/runtime dependency in
  POST2-POST5. Acolyte is a later background-width case, not part of POST1's
  selected implementation slice.

Deterministic scenario outline:

- Through promoted MCP tools, create and finalize two sheets from authored
  Surface facts: an Orc Soldier Fighter 2 and an Orc Soldier Wizard 1. The
  Wizard intentionally reuses the already-scoped Orc species and Soldier
  background; Wizard-specific pressure comes from class Spell Access,
  spellbook/preparation legality, and Spell Slot projection, not from adding a
  second background. The Fighter uses a support-profile path that advances from
  the existing Fighter 1 manifest to Fighter 2, includes Action Surge and
  Tactical Mind sheet facts, and selects/buys a bludgeoning weapon such as
  Light Hammer if the scenario is going to prove Skeleton vulnerability through
  damage resolution. The Wizard chooses 3 Wizard cantrips, creates a six-spell
  spellbook, prepares exactly 4 level-1 spells from that spellbook, and starts
  with two unexpended level-1 Spell Slots.
- Start one battle with explicit Initiative scores: Fighter first, Wizard
  second, Skeleton third. The Fighter attacks Skeleton with bludgeoning damage
  to prove vulnerability application, uses Action Surge, and attacks again to
  prove the extra non-Magic action resource. The Wizard casts `magic_missile`
  using a level-1 slot at Skeleton to prove prepared-spell access and slot
  expenditure; a second discovery pass may show `ray_of_frost` as a cantrip
  Magic-action spell act that does not spend a slot. Skeleton then uses one authored
  Shortsword or Shortbow attack from its Stat Block. Keep the scenario narrow:
  no monster spellcasting, no broad spell catalog survey, and no old projected
  executable vocabulary.

Input:

- POST0 revised task outline.
- Local RAW corpus in `.references/srd-5.2.1/`.
- Existing Surface content/readers and Restore Ledger rows.
- `UBIQUITOUS_LANGUAGE.md`.

Output:

- Researched first-width-slice decision with exact SRD citations.
- Selected second monster, or a justified replacement if local RAW/corpus shows a better pressure case.
- Revisions to POST2-POST5 if the researched slice changes their concrete
  implementation scope.
- A deterministic scenario outline that will later exercise the widened class
  and monster facts through promoted MCP/user workflows.

Acceptance:

- Re-read local RAW rather than relying on the default hypothesis. Minimum
  topics/files:
  - `.references/srd-5.2.1/Character-Creation.md` for level-1 creation versus
    advancement/higher-level start boundaries.
  - `.references/srd-5.2.1/Classes/Fighter.md` for Fighter 2 and Action Surge.
  - `.references/srd-5.2.1/Classes/Wizard.md` and relevant
    `.references/srd-5.2.1/Spells/*` files for Wizard 1 spellcasting,
    spellbook/preparation, slots, and any selected spell pressure.
  - `.references/srd-5.2.1/Monsters.md` and any stat-block corpus file holding
    the candidate second monster.
  - `UBIQUITOUS_LANGUAGE.md` for project terminology before naming runtime
    concepts.
- Confirm or revise Fighter 2 as the advancement pressure case, including the
  exact level-2 feature(s) to model.
- Confirm or revise Wizard 1 as the spellcasting pressure case, including spell
  slot, spellbook, prepared-spell legality, and spell access facts.
- Select a second monster whose authored facts force at least one new runtime
  shape beyond Goblin Warrior's current support.
- Identify one deterministic scenario that exercises the widened class and
  monster facts without becoming a broad content survey.
- Revise POST2-POST5 into implementation-ready tasks for the selected slice;
  do not close POST1 with only notes, recommendations, or a deferred decision.
- Keep POST2-POST5 blocked until CAM21 unless the owner explicitly changes queue
  policy.

Verification:

- RAW citations from `.references/srd-5.2.1/` are recorded in the task output.
- No external rules source is used unless the local corpus is missing needed text and the owner directs a source of truth.
- Plan-only change; run `git diff --check -- plans/ACTIVE_PLAN.md`.

Plan Impact:

- Status: applied.
- POST2: revised to implement Fighter 2, Wizard 1, and Skeleton Surface
  records/readers while reusing existing Orc/Soldier origin Surface records for
  the Wizard scenario; unblocked by CAM21 closeout.
- POST3: revised to widen character creation for Fighter 2 advancement and
  Wizard 1 spellbook/prepared-spell legality without adding Acolyte background
  runtime support; remains blocked by POST2.
- POST4: revised to cover Action Surge, Wizard Magic-action spell act pressure, and
  Skeleton vulnerability/immunity battle pressure; remains blocked by POST3.
- POST5: revised to use the deterministic Fighter 2 + Wizard 1 versus Skeleton
  MCP workflow with the existing Orc/Soldier origin support; remains blocked by
  POST4.

### Task 3 - CAM17 - Add MCP Character Creation Tools

Status: `done`

Depends on: CAM16A
Blocks: CAM18A

Next action: run the MCP green character-tool architecture check, then add green character creation tools.

Preflight:

- CAM17 should not widen battle support. Keep the Core-free green-path boundary
  intact: `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and
  `packages/mcp/src/green/` must not import `@dnd/core`.
- Use final user-facing tool names inside the temporary MCP
  registration boundary. Do not prefix tool names with `green_`; isolation comes
  from the module/package boundary until CAM20 promotion, not from user-visible
  vocabulary.

Input:

- Character creation runtime.
- MCP green composition root.

Output:

- MCP tools for create character draft, discover creation holes, fill creation holes, and finalize supported characters.

Acceptance:

- Tools operate through real creation holes and batch fills.
- Rejected fill leaves stored draft unchanged.
- Finalized sheet is stored only when finalization is ready, keyed by the source
  draft id; the finalized draft is removed from the active draft store.
- No presets and no Core character imports.
- MCP and creation runtime docs are updated for tool names and interaction protocol.

Verification:

- MCP tests for complete Fighter creation and at least one rejected fill.
- MCP test that successful finalization removes the draft from `drafts` and
  stores the sheet in `sheets`.
- `pnpm --filter @dnd/mcp test`
- Source-only Core import check for the MCP subtree and runtime
  packages.

Plan Impact:

- Status: applied.
- CAM18A: unblocked for MCP battle session shell implementation.

### Task 4 - CAM18A - Add MCP Battle Session Shell

Status: `done`

Depends on: CAM17
Blocks: CAM18B

Preflight:

- Resolve or explicitly scope these carry-forward items before exposing the full
  MCP battle fixture:
  - Add minimal Goblin Warrior Attack support from the authored Stat Block. The
    fixture is not Fighter-attacks-only.
  - Audit battle durable state for stat-block and attack projection facts before
    widening battle support. Prefer identities plus runtime facts that cannot
    drift from Surface catalogs; avoid a second executable stat-block or attack
    IR.
  - Replace deterministic Initiative derivation with caller-supplied Initiative
    scores on `start_battle`. Initiative is required start-battle input, not a
    battle act hole and not `10 + modifier`.
  - Keep target legality scoped. Current discovery is all other combatants,
    acceptable only for the first 1v1 vertical before defeat until range, reach,
    line of effect, defeated-target filtering, and target legality are modeled.
  - Track character-creation QNT parity depth. The current QNT slice checks
    hole/status protocol more deeply than finalized sheet values; before
    widening character creation beyond the first manifest, add parity for
    selected Unit refs, HP/Hit Die derivation, proficiencies, resources, and
    loadout identity.

Input:

- MCP character tools.
- Battle runtime through battle initialization and snapshots.
- MCP green composition root.
- SRD Stat Block catalog with Goblin Warrior.

Output:

- MCP tools for selecting a Stat Block and starting battle with
  caller-supplied Initiative scores.
- Green MCP battle session state that stores the returned `BattleState`.
- Battle state/snapshot read tool for the stored battle.

Acceptance:

- MCP can select Goblin Warrior from the SRD Stat Block catalog without using
  the old Core monster catalog.
- MCP can start battle from a finalized Fighter sheet plus selected Goblin
  Warrior Stat Block.
- `start_battle` requires caller-supplied Initiative scores; no `10 + modifier`
  Initiative derivation remains in this path.
- MCP stores the returned `BattleState` and can return a battle state/snapshot.
- Character-to-battle initialization is composition-layer work; battle runtime
  does not import character creation runtime.
- No attack discovery or resolution is accepted in CAM18A.
- MCP green path imports no `@dnd/core`.
- MCP, battle runtime, and migration docs identify this as a partial battle
  session shell, not the full green fixture.

Verification:

- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/battle-runtime test`
- Source-only Core import check for the MCP subtree and runtime
  packages.

Plan Impact:

- Status: applied.
- CAM18B: unblocked for MCP Fighter battle flow implementation.

### Task 5 - CAM18B - Add MCP Fighter Battle Flow

Status: `done`

Depends on: CAM18A
Blocks: CAM18C

Input:

- MCP battle session shell.
- Battle runtime Attack and End Turn support.
- Orc Soldier Fighter battle participant from finalized Character Sheet.

Output:

- MCP tools for discovering Fighter battle acts.
- MCP tools for filling/resolving Fighter Attack target, attack-roll, and
  damage-result holes.
- MCP End Turn support that advances initiative from the Fighter to the Goblin.
- Transient battle fill accumulation in MCP session state, not battle reducer
  state.

Acceptance:

- MCP can use an existing CAM18A battle session.
- Fighter is current actor under pinned Initiative scores.
- MCP discovers Fighter `Attack` and `End Turn`.
- MCP resolves Fighter Longsword Attack through target, attack-roll, and
  damage-result fills.
- On resolution, MCP stores the new `BattleState` and clears accumulated fills.
- MCP End Turn advances to the Goblin actor.
- Goblin Warrior attack support is explicitly out of scope for CAM18B.
- MCP green path imports no `@dnd/core`.

Verification:

- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/battle-runtime test`
- Source-only Core import check for the MCP subtree and runtime
  packages.

Plan Impact:

- Status: applied.
- CAM18C: unblocked for Goblin Warrior Attack support.

### Task 6 - CAM18C - Add Goblin Warrior Attack Support

Status: `done`

Depends on: CAM18B
Blocks: CAM18D

Input:

- MCP battle session shell and Fighter battle flow.
- Authored Goblin Warrior Stat Block.
- Battle runtime attack protocol.

Output:

- Battle runtime support for Goblin Warrior authored Attack options from
  `StatBlockRecord`.
- MCP support for resolving Goblin Warrior Attack through the same attack flow.
- No second executable Stat Block IR or attack IR.

Acceptance:

- Goblin Warrior current actor discovers `Attack` only when a supported authored
  Stat Block Attack action option exists.
- Scimitar and Shortbow cannot be confused; selected attack identity is carried
  by subject or an explicit replay choice.
- Attack bonus, damage expression/type, target legality, and supported attack
  identity are derived from authored `StatBlockRecord`, not duplicated in MCP.
- Unsupported Goblin riders are absent from discovery or rejected by a named
  support gate.
- MCP can resolve Goblin Warrior Attack with target, attack roll, damage fill,
  HP mutation, action spend, and zero-HP policy.
- MCP green path imports no `@dnd/core`.

Verification:

- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/battle-runtime test`
- Source-only Core import check for the MCP subtree and runtime
  packages.

Plan Impact:

- CAM18D unblocked.
- Ranged Stat Block attacks in the current battle-runtime slice support normal
  range only; long-range Disadvantage remains outside the green vertical.

### Task 7 - CAM18D - Add Full Green Vertical Fixture

Status: `done`

Depends on: CAM18C
Blocks: CAM18E

Input:

- MCP character creation tools.
- MCP battle session shell.
- Fighter battle flow.
- Goblin Warrior attack support.

Output:

- One full MCP-only green fixture for Orc Soldier Fighter vs Goblin Warrior.
- Docs recording the verified green vertical and remaining first-vertical
  support gates.

Acceptance:

- Full vertical runs with MCP only: create character draft, discover/fill
  creation holes, finalize Orc Soldier Fighter, select Goblin Warrior, start
  battle with explicit Initiative scores, Fighter Attack with damage, End Turn,
  Goblin Warrior Attack with damage.
- Fixture uses real authored Surface records, not presets or duplicated
  executable stat-block data.
- In-progress battle fills are MCP session state, not battle reducer state.
- Optional `resolutionLog` is display-only and non-authoritative.
- MCP green path imports no `@dnd/core`.
- CAM18D remains green-path proof before Core deletion; promoted normal-path
  user acceptance stays in CAM21.

Verification:

- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/battle-runtime test`
- Source-only Core import check for the MCP subtree and runtime
  packages.

Plan Impact:

- CAM18E unblocked.

### Task 8 - CAM18E - Add Post-Battle Character State Handoff

Status: `done`

Depends on: CAM18D
Blocks: CAM19A

Input:

- Full green battle fixture.
- Battle session state with updated HP in `BattleState`.
- MCP character/session state.

Output:

- Explicit end-battle or finalize-battle operation for the first vertical.
- Durable post-battle character/session state carrying changed character-owned
  facts from battle.
- Character-list/read-model behavior showing post-battle facts.

Acceptance:

- MCP green path can end/finalize a battle for the first vertical.
- Ending battle projects changed character-owned facts from battle state into
  one durable character/session representation.
- Character list reads from that durable state or one documented projection from
  it.
- Reduced current HP is visible after battle for the Orc Soldier Fighter.
- No duplicated HP authority: battle owns in-battle HP; after battle closeout,
  character/session state owns post-battle HP.
- Monster combatants do not appear in the character list.
- First-vertical scope is explicit: reduced positive HP is accepted; broader
  death-save and zero-HP post-battle facts may be deferred if ledgered.

Verification:

- MCP green test covers create character, start battle, take damage, end battle,
  and list character with reduced HP.
- `pnpm --filter @dnd/mcp test`
- Runtime package tests relevant to any state handoff changed for post-battle
  character facts.

Plan Impact:

- CAM19A unblocked.

### Task 9 - CAM19A - Refresh Core And Projected Deletion Inventory

Status: `done`

Depends on: CAM18E
Blocks: CAM19B

Input:

- Passing full green path through post-battle character state.
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)
- Restore Ledger in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)

Output:

- Current-HEAD inventory of `@dnd/core`, projected vocabulary, and legacy MCP
  call sites.
- Restore Ledger updates for every intentionally omitted or broken lane.
- Deletion/isolation checklist for CAM19B-CAM19D with exact files, tests, docs,
  and promoted-path import checks.

Acceptance:

- Inventory reflects current `HEAD`, not only baseline `39f9ab71`.
- Inventory is compared against `phase0-core-deletion-restore-audit.md` and
  marks stale, missing, newly safe-to-delete, and still-legacy items.
- Restore Ledger covers every intentionally omitted or broken lane before code
  deletion begins.
- No production deletion is performed in CAM19A except plan/doc updates.

Verification:

- Source inventory commands recorded in the task closeout.
- `rg '@dnd/core|CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime`

Plan Impact:

- CAM19B unblocked.

### Task 10 - CAM19B - Isolate Legacy Core MCP Path

Status: `done`

Depends on: CAM19A
Blocks: CAM19C

Input:

- Current-HEAD deletion/isolation checklist.
- Passing green MCP path.
- Restore Ledger coverage for omitted lanes.

Output:

- Old Core-backed MCP source/tests moved under a deletion-marked legacy boundary
  such as `packages/mcp-core-legacy` or `packages/mcp/src/legacy-core/`.
- Promotable MCP path has no `@dnd/core` imports.
- Legacy boundary is not re-exported by the promoted MCP server entrypoint.

Acceptance:

- All old Core-backed MCP routes/tests are outside the promotable MCP path.
- Green/runtime MCP tools still pass.
- Legacy package/path is documented as deletion-marked, not
  compatibility-supported.
- `rg '@dnd/core' packages/mcp/src packages/character-creation-runtime packages/battle-runtime` has no promoted-path matches, with any legacy-only matches clearly outside that path.

Verification:

- `pnpm --filter @dnd/mcp test`
- Runtime package tests.
- Source-only Core import check for promoted MCP/runtime paths.

Plan Impact:

- Unblock CAM19C.

### Task 11 - CAM19C - Delete Projected Vocabulary From Promoted Path

Status: `done`

Depends on: CAM19B
Blocks: CAM19D

Input:

- Legacy Core MCP path isolated.
- Restore Ledger rows for omitted projected lanes.
- Passing green MCP path.

Output:

- Projected executable vocabulary deleted from the promoted MCP/runtime path.
- Any remaining projected files are deleted or reachable only from
  deletion-marked legacy code with Restore Ledger coverage.

Acceptance:

- `@dnd/character-creation-runtime` and `@dnd/battle-runtime` remain free of
  projected vocabulary.
- No green/promoted MCP module imports Core-backed helpers that import projected
  vocabulary.
- `PEADirectHealHp` is deleted as projected action vocabulary while Second Wind
  remains preserved as a level-1 Fighter sheet/resource fact.
- Mage Armor, Acid Splash, Action Surge, and other omitted projected lanes are
  ledgered, not smuggled forward as renamed IR.
- Green MCP fixture and runtime package tests pass.

Verification:

- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime` returns no promoted-path matches.
- `pnpm --filter @dnd/mcp test`
- Runtime package tests.

Plan Impact:

- Unblock CAM19D.

### Task 12 - CAM19D - Reconcile Post-Deletion Docs And Tests

Status: `done`

Depends on: CAM19C
Blocks: CAM20

Input:

- CAM19A-C deletion/isolation results.
- Restore Ledger.
- Migration and projected-executable docs.

Output:

- Docs, tests, Restore Ledger status, and expected failures reconciled after
  deletion.
- Concrete CAM20 handoff describing what legacy package/files remain, what was
  deleted, and what Restore Ledger rows still govern omitted behavior.

Acceptance:

- Every currently failing, skipped, deleted, or moved test lane is either
  green-path required and fixed, or explicitly ledgered as expected breakage.
- Restore Ledger rows are updated from planned to actual post-deletion status,
  with `39f9ab71` references preserved.
- Docs no longer describe projected executable/Core-backed MCP as the active
  path unless marked archival or linked as preserved history.
- Green/promoted MCP tests and runtime package tests pass.

Verification:

- `pnpm --filter @dnd/mcp test`
- Runtime package tests.
- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime` has no projected-vocabulary hits; any `PHASE1_WEAPON_SPEAR_UNIT_ID` match is the documented `PEA` substring false positive.
- RAW/SRD check: no new rules behavior modeled; this task reconciles docs,
  test ownership, and ledger status only.
- `/simplify` convergence: two decider review rounds completed; round 1 fixed
  closeout evidence/style issues, round 2 found no further important fixes.

Plan Impact:

- CAM20 unblocked.
- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md) updated with actual deletion status and remaining Restore Ledger rows.

### Task 13 - CAM20 - Green Reconciliation And MCP Promotion

Status: `done`

Depends on: CAM19D
Blocks: CAM21

Preflight: completed. The promotion/import blast-radius check found the
MCP runtime modules and legacy Core-backed MCP path were isolated as
expected before promotion.

Input:

- Passing MCP green vertical through post-battle character state.
- CAM19A-CAM19D deletion/isolation results.
- MCP runtime modules and the deletion-marked legacy MCP package.
- Phase 5 criteria in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md).

Output:

- Runtime tools promoted into the normal MCP server/router entrypoint.
- `packages/mcp/src/green/` deleted or reduced to internal composition helpers with no user-facing green namespace.
- Deletion-marked legacy MCP package removed, or kept only with explicit Restore
  Ledger coverage outside the promoted MCP route.
- Normal MCP server tests replace green-specific fixture-only coverage.

Acceptance:

- The runnable Fighter/Goblin vertical works through the normal MCP server path.
- `packages/mcp/src/server.ts` or its replacement no longer routes the vertical through Core/projected vocabulary.
- No user-facing MCP tool requires importing from `packages/mcp/src/green`.
- `src/green/` is deleted, or remaining files are internal helpers without "green" API naming.
- MCP docs describe the promoted runtime path, not a green path as the active user workflow.
- Restore Ledger still covers omitted behavior that has not been rebuilt.
- Temporary catalog/support-gate language is reconciled: `UnitLibrary` aliases
  and package-private `unsupported*` issue vocabulary are either removed or kept
  only where they remain real domain/runtime concepts.

Verification:

- Normal MCP server tests cover create/finalize character, select Goblin Warrior, start battle, Attack with damage, End Turn, end battle, and post-battle character list.
- `rg '@dnd/core' packages/mcp/src packages/character-creation-runtime packages/battle-runtime` returns no matches for promoted paths, with any legacy-only matches either deleted or ledgered.
- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime` returns no promoted-path matches.
- MCP/runtime typecheck and focused runtime tests pass.

Plan Impact:

- Completed. CAM21 is unblocked, and the migration plan plus MCP docs now
  describe the promoted MCP runtime path instead of an active green
  path.

### Task 14 - CAM21 - End-User Vertical Acceptance

Status: `done`

Depends on: CAM20
Blocks: POST2

Input:

- Promoted normal MCP server path from CAM20.
- Character creation tools, battle tools, and persistence/session state from
  CAM17 through CAM20, including CAM18*/CAM19* split tasks.
- The first vertical: Orc Soldier Fighter 1 and Goblin Warrior.

Output:

- One end-user acceptance fixture or test that exercises the promoted workflow
  through user-facing tools only.
- Character-list/read-model behavior after battle completion, including updated
  durable character facts that changed because of battle.
- MCP/user docs updated with the accepted end-to-end workflow and the supported
  post-battle character state semantics.

Acceptance:

- As a user, I can simulate character creation through the normal MCP path:
  create a draft, discover creation holes, fill them, and finalize the Orc
  Soldier Fighter character.
- As a user, I can start a battle from that finalized character.
- As a user, I can add a Goblin Warrior to the battle from the authored SRD Stat
  Block catalog.
- As a user, I can run the supported battle flow through user-facing commands,
  including discovering battle actions, resolving attacks/damage, ending turns,
  and ending the battle.
- As a user, after the battle ends, I can view my character list and see the
  character with updated post-battle facts, including facts changed by battle
  such as reduced current HP.
- Post-battle facts are not duplicated projections that can drift from the
  authoritative runtime/session state. The character list either reads the
  updated durable state directly or uses a single documented projection from it.
- The accepted workflow does not require importing from `packages/mcp/src/green`
  or any legacy Core/projected execution path.

Verification:

- Normal MCP server acceptance test covers create character, finalize, add Goblin
  Warrior, start battle, run battle actions through battle end, and read the
  post-battle character list with updated HP.
- `pnpm --filter @dnd/mcp test`
- Runtime package tests relevant to any state handoff changed for post-battle
  character facts.
- Source-only checks confirm the promoted path has no legacy Core/projected
  execution dependency and no user-facing `green` namespace dependency.

Plan Impact:

- Status: applied. The Correction Application Migration is accepted for the
  first end-user vertical.
- POST2 is unblocked.
- Deferred post-battle facts are recorded in the Restore Ledger: zero-HP
  character closeout, Death Saving Throw counters, Stable/dead status, rest
  recovery, and broader adventuring-state handoff remain outside the accepted
  first vertical.

### Task 15 - POST2 - Add First Width Slice Surface Records And Readers

Status: `done`

Depends on: POST1, CAM21
Blocks: POST3

Input:

- POST1 researched first-width-slice decision.
- Local RAW citations recorded by POST1.
- Current `@dnd/surface` Unit and Stat Block catalogs/readers.
- Restore Ledger rows for full character creation width, Wizard creation,
  Fighter 2/Action Surge, and monster breadth.

Output:

- Surface-authored records and reader support for the selected first width
  slice: Fighter 2 advancement facts, Wizard 1 spellcasting creation facts, and
  the Skeleton SRD Stat Block.
- Fighter Surface records/readers connect `class_fighter` level-2 grants to the
  canonical Action Surge authored feature and a Tactical Mind sheet feature
  fact before widening readers.
- Wizard Surface records/readers add a `class_wizard` creation record and the
  level-1 spellcasting ownership facts needed for 3 cantrips, a six-spell
  spellbook, 4 prepared spells selected from that spellbook, two level-1 Spell
  Slots, Ritual Adept, Arcane Recovery, Intelligence spellcasting ability, and
  Arcane Focus/spellbook focus. Model spellbook Spell Access, prepared Spell
  Access, and runtime Spell Slot projection as distinct concepts.
- No Acolyte Surface record is part of this slice; the deterministic Wizard
  uses existing Orc/Soldier origin records so POST2 remains about Wizard class
  spellcasting facts, Fighter 2 advancement, and Skeleton's Stat Block shape.
- Skeleton Surface record adds a focused Stat Block vulnerability shape named
  for the SRD stat-block detail, plus Poison damage immunity and Exhaustion /
  Poisoned condition immunities. Keep the SRD-only `srdStatBlockCollection`
  boundary so mixed-provenance monster catalogs remain unrepresentable.
- Reader tests proving the new records are discoverable through existing
  catalog boundaries without treating 5e-tools or other structured inputs as
  provenance.
- Documentation updates for any widened Surface record boundary.

Acceptance:

- Mixed-provenance or mixed-license monster collections remain unrepresentable
  at the collection boundary.
- New Surface facts are canonical authored facts or reader projections from
  authored records, not duplicated runtime state.
- Surface widening is driven by the POST1 pressure cases and local RAW
  citations, not by a broad content survey.
- The new Stat Block vulnerability shape is named after the SRD domain fact it
  models and has focused reader/regression tests for Skeleton's Bludgeoning
  vulnerability and Poison/Exhaustion/Poisoned immunities.
- Wizard spellbook/prepared-spell facts cannot represent prepared spells that
  are absent from the spellbook or above the Wizard's available Spell Slot
  levels.

Verification:

- `pnpm --filter @dnd/surface test`
- `pnpm --filter @dnd/surface typecheck`
- RAW traceability check for every newly modeled rule.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Completed; POST3 is unblocked.

### Task 16 - POST3 - Widen Character Creation Runtime Support Profile

Status: `done`

Depends on: POST2
Blocks: POST4

Input:

- POST2 Surface records/readers.
- CAM16A support-profile architecture in
  `packages/character-creation-runtime/src/support-gates.ts`.
- Character build projection and package-local QNT/MBT slices.

Output:

- Character creation runtime support-profile entries for the selected width
  slice, including Fighter 2 advancement, Wizard 1 creation choices,
  spellbook/prepared-spell/cantrip choice families, option ids, purchasable
  equipment/loadout facts needed by the Skeleton scenario, and finalization
  facts.
- Finalization/build projection widened from accepted selections and Surface
  Unit refs, not hard-coded parallel constants.
- QNT slice/MBT bridge and docs updated for the widened character creation
  behavior.

Acceptance:

- Legal-but-unsupported options still fail through one support-profile boundary
  with precise issues.
- Fighter 2 advancement is accepted only through selected Surface class-feature
  grants and produces Action Surge/Tactical Mind sheet facts without adding
  scattered Fighter branches outside support-profile/projection boundaries.
- Wizard 1 creation is accepted only when selected cantrips, spellbook spells,
  prepared spells, spell slots, and spellcasting ability/focus facts are
  supported and internally legal. Prepared spells must be selected from the
  spellbook and must be of levels for which the Wizard has Spell Slots.
- The deterministic Wizard path reuses the already-supported Orc/Soldier origin
  choices; POST3 does not add Acolyte holes or background support unless a later
  task explicitly widens background content.
- The remaining Phase 1-specific branches are removed or narrowed to named
  manifest-only facts; no scattered Wizard/Fighter special cases are added
  outside the support-profile/projection boundary.
- CharacterBuild carries only build facts needed by later boundaries and does
  not gain in-play state such as current HP, expended slots, or temporary HP.
  It may carry starting Spell Slot capacity/access facts; expended slot counts
  belong to battle/runtime state.

Verification:

- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- Tier 1b creature/creation MBT only if reducer/QNT behavior changes require
  randomized parity; follow MBT runner and zombie-evaluator protocol.
- RAW traceability check for every newly modeled rule.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Status: applied.
- POST4: unblocked for battle-runtime width implementation.

### Task 17 - POST4 - Widen Battle Runtime For First Width Slice

Status: `done`

Depends on: POST3
Blocks: POST5

Input:

- POST3 widened CharacterBuild facts.
- POST2 widened Stat Block and Unit records.
- Current `@dnd/battle-runtime` act discovery/resolution and package-local QNT
  slice.
- Restore Ledger rows for spellcasting, Action Surge, Second Wind if pulled into
  the scenario, and monster breadth.

Output:

- Battle runtime support for the selected first width slice's battle pressure.
  This means Fighter 2 Action Surge pressure, Wizard 1 prepared-spell/cantrip
  Magic-action spell act pressure for the deterministic spells selected by POST1, and
  Skeleton's authored combat shape including vulnerability/immunity facts.
- Unit/resource/spell/monster facts derived from records and
  runtime state, not a restored projected-executable IR.
- Battle runtime docs and QNT/parity artifacts updated for the widened behavior.

Acceptance:

- Runtime behavior remains aligned with the battle authority policy current at
  CAM21.
- Action/resources/spell/monster identities are carried by typed selections or
  authored record refs so selected options cannot drift from executable facts.
- Action Surge grants one additional non-Magic action on the Fighter's turn,
  spends one Short/Long Rest resource use, and cannot be used twice in one turn
  at Fighter 2.
- Wizard Magic-action spell acts distinguish prepared level-1 spells that spend
  Spell Slots from cantrips that do not. Runtime state owns expended slots;
  Character Build owns only starting capacity/access facts.
- Skeleton vulnerability/immunity facts affect damage/condition application
  where the runtime supports those damage or condition paths; unsupported
  Skeleton facts are rejected or absent through a named support gate with
  runtime consequences.
- Any support gate for omitted spell, feature, or monster behavior has runtime
  consequences and a test; no inert status enum or metadata label is added.
- No old `CPU*`, `PEA*`, `PPR*`, projected compiler, or projected action bridge
  vocabulary is restored.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- Tier 1 battle MBT only if battle/QNT behavior changes require parity; follow
  MBT runner and zombie-evaluator protocol.
- RAW traceability check for every newly modeled rule.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock POST5.

### Task 18 - POST5 - Add Widened MCP User Workflow Coverage

Status: `done`

Depends on: POST4
Blocks: none

Input:

- Promoted MCP server path accepted by CAM21.
- POST2-POST4 widened Surface, character creation runtime, and battle runtime.
- POST1 deterministic scenario outline: Orc Soldier Fighter 2 plus Orc Soldier
  Wizard 1 versus Skeleton, with explicit Initiative scores, Fighter Action
  Surge, Wizard `magic_missile`/`ray_of_frost` pressure, and Skeleton authored
  attack/vulnerability/immunity facts.
- Restore Ledger rows for the restored width.

Output:

- Promoted MCP/user workflow tests for the selected widened slice.
- User-facing docs updated with the supported widened workflow and any explicit
  support boundaries that remain.
- Restore Ledger status updated for rows restored by the first POST width slice.

Acceptance:

- The scenario exercises character creation, battle setup, widened battle
  behavior, and post-battle read models through user-facing MCP tools.
- The MCP workflow creates/finalizes both selected sheets through real creation
  holes, starts battle from identities plus authoritative runtime state, applies
  Fighter Action Surge, casts a prepared Wizard level-1 spell with slot spend,
  exposes a cantrip with no slot spend, and includes Skeleton's authored Stat
  Block pressure without a broad monster catalog survey.
- MCP does not duplicate Surface or runtime facts in session state; it stores
  identities plus authoritative runtime state and projects read models from
  those boundaries.
- The workflow proves the first proactive width slice after CAM acceptance; it
  is not a one-off hidden fixture.
- Remaining omitted width is explicitly left in the Restore Ledger or new POST
  follow-up tasks.

Verification:

- `pnpm --filter @dnd/mcp test`
- Relevant runtime package tests for any state handoff touched by the MCP
  workflow.
- Source-only check confirms the promoted MCP path has no Core/projected
  execution dependency.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- First post-CAM width slice restored in the Restore Ledger. No new durable
  width task was discovered during implementation.

### Task 19 - BA0 - Define Battle Authority Policy

Status: `done`

Depends on: POST5
Blocks: BA1, BA2

Next action: read the current authority language in this file,
[CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md),
[packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md),
[packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md), and
[packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md](/workspace/typescript/dnd/packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md), then make the policy wording consistent.

Input:

- Current promoted `@dnd/battle-runtime` architecture docs.
- Root `battle.qnt` authority wording and Core MBT references.
- Restore Ledger rows in
  [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md).

Output:

- Docs state one intended direction: promoted `@dnd/battle-runtime` is the
  active battle authority for new Unit/StatBlock-backed work.
- Old `battle.qnt` and Core battle MBT are described as legacy/broad
  reference and proof source material until reconciled, not as the place to add
  new promoted behavior.
- Missing old-only behavior is explicitly named as future width/restoration,
  not evidence that old Core remains canonical.

Acceptance:

- No reducer, QNT behavior, or test behavior changes.
- No old Core feature is silently declared obsolete; old-only behavior remains
  either ledgered or slated for BA1 classification.
- The policy distinguishes semantic authority, feature breadth, proof depth,
  and content encoding.
- BA1 and BA2 are unblocked.

Verification:

- Source-only check for authority wording in battle runtime docs and migration
  plan.
- `/simplify` convergence may be a single review round if the diff is docs-only
  and under roughly 20 lines; otherwise minimum 2 rounds.
- `/simplify` convergence recorded in task closeout: round 1 fixed the stale
  `battle-runtime.qnt` authority comment; round 2 found no further
  authority-policy inconsistencies in the touched docs.

Plan Impact:

- Status: applied.
- BA1: unblocked for old authority inventory.
- BA2: unblocked for promoted runtime proof coverage.
- BA3-BA13: unchanged.
- Observations: old-only behavior remains ledgered or BA1 classification scope;
  old Core MBT is proof/reference material, not a competing promoted behavior
  owner.
- Required further plan edits: none.

### Task 20 - BA1 - Inventory Old Battle Authority Surface

Status: `done`

Depends on: BA0
Blocks: BA3

Next action: BA3 consumes the old authority inventory after BA2 also completes.

Input:

- [battle.qnt](/workspace/typescript/dnd/battle.qnt)
- [packages/core/src/battle-machine.mbt.test.ts](/workspace/typescript/dnd/packages/core/src/battle-machine.mbt.test.ts)
- [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd/packages/core/src/battle-projection.mbt.test.ts)
- Core battle-machine source files and Restore Ledger baseline references.
- Local SRD corpus and `UBIQUITOUS_LANGUAGE.md` for naming categories only;
  this task does not model new rules.

Output:

- Durable inventory table in
  [battle-authority-inventory.md](/workspace/typescript/dnd/plans/battle-authority-inventory.md), with columns:
  old behavior area, old files/spec functions, RAW/ASSUMPTIONS anchor when
  obvious, promoted runtime status, classification, and proposed next owner.
- Classification values:
  `overlap-must-match`, `partial-overlap`, `old-only-width`,
  `obsolete-core-artifact`, `proof-source-only`, `needs-owner-decision`.
- Minimum coverage:
  Attack/damage/HP, Initiative/turn flow, action economy, zero-HP/death saves,
  spells, reactions, movement/positioning, monster controls,
  class-feature battle actions, persistent effects/concentration, hand/weapon
  state, hidden/Search/Hide, grappling, bonus actions, and old projected
  execution vocabulary.

Acceptance:

- No implementation changes.
- Inventory is specific enough that BA3 can split or revise downstream tasks
  without re-reading the entire old battle stack.
- Old-only features are not mixed into overlap tasks unless promoted runtime
  already implements their behavior.
- Any `needs-owner-decision` row includes the exact question and candidate
  options.

Verification:

- `rg`/source-only evidence recorded in
  [battle-authority-inventory.md](/workspace/typescript/dnd/plans/battle-authority-inventory.md).
- No battle MBT runs.
- `/simplify` convergence: two source-only review rounds recorded in
  [battle-authority-inventory.md](/workspace/typescript/dnd/plans/battle-authority-inventory.md).

Plan Impact:

- Status: applied.
- BA3: remains blocked until BA2 is complete; must consume this inventory and
  may revise BA4-BA13.
- BA4: left unchanged, but inventory recommends keeping Attack/HP overlap
  narrow and not mixing in old reaction-window breadth.
- BA5: left unchanged, but inventory recommends keeping action-economy overlap
  narrow and converting old Dash/Dodge/Disengage/Ready catalog breadth through
  BA12 unless BA3 revises the split.
- BA12: left unchanged, but inventory feeds old-only rows for reactions,
  movement/OA/traversal, monster controls, non-promoted class features,
  concentration/persistent effects, hand/off-hand state, Hide/Search, Grapple,
  bonus-action subjects, and projected-vocabulary semantics.
- Required plan edits: none beyond this BA1 closeout.

### Task 21 - BA2 - Inventory Promoted Runtime Proof Coverage

Status: `done`

Depends on: BA0
Blocks: BA3

Next action: completed in
[battle-runtime-proof-coverage.md](/workspace/typescript/dnd/plans/battle-runtime-proof-coverage.md).

Input:

- [packages/battle-runtime/src/index.ts](/workspace/typescript/dnd/packages/battle-runtime/src/index.ts)
- [packages/battle-runtime/src/index.test.ts](/workspace/typescript/dnd/packages/battle-runtime/src/index.test.ts)
- [packages/battle-runtime/battle-runtime.qnt](/workspace/typescript/dnd/packages/battle-runtime/battle-runtime.qnt)
- Shared-algebra MBT docs/tests under `packages/shared-algebras` and
  `packages/surface-runtime-correction`.
- Promoted MCP workflow tests that exercise battle runtime behavior.

Output:

- A proof-coverage map, either in this task section or a linked
  `plans/battle-runtime-proof-coverage.md`, with columns:
  promoted behavior, runtime owner, QNT coverage, deterministic test coverage,
  shared-algebra MBT coverage, MCP/user workflow coverage, and proof gap.
- Explicitly mark whether a gap applies to already-implemented behavior or to
  future width.

Acceptance:

- No behavior widening.
- The map distinguishes modular algebra MBT from integrated battle-runtime MBT.
- BA10 can use the output to choose the first integrated MBT candidate without
  rediscovering current coverage.

Verification:

- `pnpm --filter @dnd/battle-runtime test` only if the task edits test docs in
  a way that could affect test commands; otherwise source-only.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 review rounds unless the output is only a
  generated inventory document with no plan changes beyond linking it.

Plan Impact:

- Status: applied.
- BA3: unblocked for replan research now that both BA1 and BA2 inventories are
  recorded.
- BA4-BA13: left blocked; BA3 must consume the coverage map and may revise
  their scopes.

### Task 22 - BA3 - Replan Authority Slices From Inventories

Status: `done`

Depends on: BA1, BA2
Blocks: BA4, BA5, BA6, BA7, BA8, BA10, BA12

Next action: completed. Downstream agents should use the bounded scopes below
instead of re-reading all of root `battle.qnt`.

Input:

- BA1 old authority inventory.
- BA2 promoted runtime proof-coverage map.
- Current Restore Ledger rows.

Output:

- Revised BA task list from the inventory facts:
  - keep BA4-BA7 as separate overlap slices, with old-only breadth excluded;
  - keep BA8 after BA4-BA7 because canonical QNT layout should follow settled
    current behavior;
  - keep BA9 after BA8 because legacy MBT quarantine depends on the layout
    decision;
  - unblock BA10 now because BA2 already identifies integrated proof gaps and
    candidate frontiers;
  - keep BA11 after BA8 and BA10 because it needs both canonical layout and
    proof strategy;
  - keep BA12 after BA7 because zero-HP lifecycle rows need BA7's boundary
    output before becoming atomic backlog work;
  - add no new BA tasks because all large old-only areas fit BA12 backlog
    conversion rather than overlap implementation.
- Explicit task changes:
  - BA4: unblock; keep scope to promoted Attack/damage/HP overlap only.
  - BA5: unblock; keep scope to promoted Initiative/turn/action-resource
    overlap only.
  - BA6: unblock; keep scope to promoted first-width overlap only.
  - BA7: unblock; own all current zero-HP lifecycle interpretation and backlog
    handoff.
  - BA8: leave blocked by BA4-BA7; no implementation before overlap settles.
  - BA9: leave blocked by BA8.
  - BA10: unblock for source-only MBT strategy planning.
  - BA11: leave blocked by BA8 and BA10.
  - BA12: leave blocked by BA7, with BA3 dependency now satisfied.
  - BA13: leave blocked.
- Confirmed overlap task scopes for BA4-BA7 are recorded in their task
  sections.
- Confirmed proof/canonical-layout tasks for BA8-BA11 are recorded in their task
  sections.
- Confirmed old-only width backlog conversion scope for BA12 is recorded in its
  task section.

Acceptance:

- The plan does not require an implementation agent to inspect all of
  `battle.qnt` before starting BA4.
- Every downstream BA task has a bounded scope and clear non-goals.
- Any newly discovered large area becomes its own task rather than expanding an
  existing one past one-agent size.

Verification:

- Source-only planning check.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds because this task changes the plan
  shape:
  - Round 1 checked BA1 old-authority rows against BA4-BA7 and moved old-only
    reactions, movement/OA, broad actions, broad spells, monster controls,
    hand/weapon state, Hide/Search, Grapple, persistent effects, and projected
    vocabulary to BA12 instead of overlap tasks.
  - Round 2 checked BA2 proof gaps against BA8-BA11 and kept proof strategy
    separate from canonical QNT layout and first integrated MBT implementation.

Plan Impact:

- Status: applied.
- BA4: unblocked for implementation after light RAW/source research.
- BA5: unblocked for implementation after light RAW/source research.
- BA6: unblocked for implementation after light RAW/source research.
- BA7: unblocked for implementation after light RAW/source research.
- BA8: left blocked until BA4, BA5, BA6, and BA7 complete.
- BA9: left blocked until BA8 completes.
- BA10: unblocked for source-only proof-strategy research.
- BA11: left blocked until BA8 and BA10 complete.
- BA12: revised only by dependency state; BA3 is satisfied, but BA12 remains
  blocked until BA7 supplies the zero-HP lifecycle boundary rows.
- BA13: left blocked.
- Observations: no new owner-decision task is needed. Reaction windows, old
  action catalog breadth, movement/OA/traversal, broad spells, monster
  controls, non-promoted class features, concentration/persistent effects,
  hand/off-hand/component state, Hide/Search, Grapple, bonus-action subjects,
  and projected-vocabulary semantics are old-only width/backlog material, not
  overlap reconciliation.
- Required plan edits: none beyond this applied BA3 replan.

### Task 23 - BA4 - Reconcile Attack Damage HP Overlap

Status: `done`

Depends on: BA3
Blocks: BA8

Next action: reconcile only already-promoted Attack/damage/HP semantics that
BA3 classifies as overlap.

BA3 confirmed scope:

- Include supported target legality only for current reach/normal-range
  distance facts, Attack Roll hit/miss, natural 1/natural 20, Critical Hit
  dice, weapon and Stat Block damage currently exposed, Temporary HP, HP clamp,
  and supported damage resistance/immunity/vulnerability. BA4 may verify that
  HP mutation reaches or remains at 0 HP, but it does not adjudicate any
  zero-HP lifecycle consequence after that handoff.
- Exclude old reaction windows, after-damage reactions, movement/OA/traversal,
  nonlethal knockout, qualified physical bypass unless already represented by
  promoted Stat Block facts, broad spell damage, hand/off-hand/component state,
  unsupported conditional riders, and all zero-HP lifecycle semantics owned by
  BA7. These flow to BA12 if restored.

Preflight:

- Read relevant SRD 5.2.1 passages in `.references/srd-5.2.1/` for Attack,
  Attack Rolls, Damage Rolls, Hit Points, Temporary Hit Points, Critical Hits,
  and Damage Resistance/Immunity/Vulnerability. BA7 owns Dropping to 0 Hit
  Points and all zero-HP lifecycle interpretation.
- Check `UBIQUITOUS_LANGUAGE.md`.
- Do not add new attacks, new action families, or old-only riders in this task.

Output:

- Existing promoted runtime/QNT/tests either match old overlap semantics or
  document intentional divergence with SRD/ASSUMPTIONS support.
- Focused deterministic tests or QNT assertions for any promoted behavior that
  was implemented but under-specified.
- Docs updated if the authority wording or support gate changed.

Acceptance:

- Covers target legality only to the extent already supported by the promoted
  runtime's current reach/normal-range distance facts.
- Covers attack roll hit/miss/natural 1/natural 20, Critical Hit dice, weapon
  and Stat Block damage currently supported, Temporary HP, HP clamp, and
  supported damage modifiers.
- Does not port movement, opportunity attacks, reactions, nonlethal knockout,
  broad spell damage, unsupported conditional riders, or zero-HP lifecycle
  semantics owned by BA7.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- Tier 1 battle MBT only if this task changes root `battle.qnt` or a bridge
  that requires parity validation; otherwise do not run battle MBT.
- RAW traceability check for touched modeled rules.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA8 remains blocked until BA5-BA7 also complete or BA3 revises the gate.

### Task 24 - BA5 - Reconcile Initiative Turn Action Economy Overlap

Status: `done`

Depends on: BA3
Blocks: BA8

Next action: reconcile only already-promoted Initiative, turn, and action
resource semantics that BA3 classifies as overlap.

BA3 confirmed scope:

- Include caller-supplied Initiative ordering, current actor, End Turn, round
  wrap, turn-resource reset, wrong-actor rejection, action spend/reset, and
  current actor/action gating for promoted subjects.
- Exclude old Dash, Dodge, Disengage, Ready, Help, Stand from Prone, old
  bonus-action subjects, mid-battle add/remove, and old generic action catalog
  breadth. These flow to BA12 if restored.

Preflight:

- Read SRD 5.2.1 Initiative, rounds/turns, Actions, Bonus Actions, and any
  ASSUMPTIONS entry for End Turn.
- Check `UBIQUITOUS_LANGUAGE.md`.

Output:

- Promoted runtime/QNT/tests state the canonical semantics for Initiative
  order, current actor, End Turn, resource reset, wrong-actor rejection, and
  action spend/reset.
- Any divergence from old `battle.qnt` is categorized as bug, assumption, or
  legacy-only behavior.

Acceptance:

- End Turn remains a runtime command, not a rules Action.
- Action-resource state remains typed/structured; no duplicate scalar action
  quota is introduced.
- Bonus-action storage may remain present without exposing new bonus-action
  subjects.
- No new feature action is added here except test/docs coverage for already
  implemented resources.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- RAW traceability check for touched modeled rules.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA8 remains blocked until BA6 and BA7 also complete or BA3 revises the gate.

### Task 25 - BA6 - Reconcile Promoted Width Overlap

Status: `done`

Depends on: BA3
Blocks: BA8

Next action: completed; promoted first-width behavior that overlaps old Core
concepts is reconciled without broadening beyond the BA3 scope.

BA3 confirmed scope:

- Include already-promoted Action Surge, Wizard action-time spell discovery,
  armor-training spell gate, Magic action spend, `magic_missile`,
  `ray_of_frost`, Skeleton Stat Block attacks, and Skeleton damage
  vulnerability/immunity.
- Exclude broad Wizard spell catalog, upcasting, rituals, concentration,
  readied spells, persistent AC/effects such as Mage Armor, reactions, generic
  save/AoE spells, split-target Magic Missile, monster recharge/daily/legendary
  controls, and projected executable vocabulary. These flow to BA12 if
  restored.

Preflight:

- Read local SRD passages for Fighter Action Surge, Wizard Spellcasting, Spell
  Slots, Cantrips, Magic Missile, Ray of Frost, Armor Training, and Skeleton
  Stat Block damage modifiers.
- Check `UBIQUITOUS_LANGUAGE.md`.

Output:

- Existing Action Surge, Wizard spell-act, armor-training spell gate, and
  Skeleton damage-modifier behavior either matches old overlap semantics or has
  documented intentional divergence.
- Support gates remain executable and typed; no inert status markers.

Acceptance:

- Does not broaden Wizard spell catalog, add upcasting, rituals,
  concentration, reactions, broad persistent effects, or monster controls.
- Does not restore projected executable vocabulary.
- Keeps spell access/runtime slot state distinction: Character Build owns
  starting access/capacity, battle owns expended slots/effects.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/mcp test` if MCP workflow projections change.
- RAW traceability check for touched modeled rules.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA8 is unblocked because BA4, BA5, BA6, and BA7 are complete.

### Task 26 - BA7 - Reconcile Zero HP Lifecycle Boundary

Status: `done`

Depends on: BA3
Blocks: BA8, BA12

Next action: completed. Promoted zero-HP lifecycle authority is documented, and
old-only death-save, rest, and adventuring-state behavior is fed to BA12.

BA3 confirmed scope:

- Include the already-promoted typed lifecycle policy for Stat Blocks and
  Characters: `diesAtZeroHp`, `usesDeathSavingThrows`, drop to 0 HP, damage at
  0 HP, critical damage at 0 HP, massive damage, and action gating for 0-HP
  combatants. BA7 is the sole owner for interpreting the zero-HP consequences
  of HP mutation; BA4 owns only the preceding attack/damage/HP mutation facts.
- Exclude start-turn Death Saving Throw rolls, Stable/dead durable handoff,
  rest recovery, broader adventuring-state storage, and zero-HP post-battle
  character handoff. BA7 should feed these rows to BA12 rather than implement
  them.

Preflight:

- Read SRD 5.2.1 Dropping to 0 Hit Points, Death Saving Throws, Damage at 0 HP,
  Instant Death, Stabilizing a Creature, and relevant rest/recovery passages if
  touched.
- Check `UBIQUITOUS_LANGUAGE.md` and ASSUMPTIONS.md A12.

Output:

- Promoted runtime docs/QNT/tests clearly state current authority for:
  Stat Block `diesAtZeroHp`, Character Build `usesDeathSavingThrows`, drop to
  zero, damage at zero, critical damage at zero, and massive damage.
- Old-only lifecycle features are converted to BA12 backlog rows rather than
  smuggled into this task.

Acceptance:

- No post-battle durable character-state widening unless BA3 explicitly splits
  and promotes that work into this task.
- Start-turn death-save rolls, Stable/dead durable handoff, rest recovery, and
  broader adventuring-state storage remain old-only width unless explicitly
  implemented by a separate task.
- The boundary is represented by typed lifecycle policy, not provenance labels.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- RAW traceability check for touched modeled rules.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA12 is unblocked for source-only backlog conversion with BA7 lifecycle width
  rows in `plans/battle-authority-inventory.md`.
- BA8 remains blocked until BA6 also completes.

### Task 27 - BA8 - Choose Canonical Battle QNT Layout

Status: `done`

Depends on: BA4, BA5, BA6, BA7
Blocks: BA9, BA11, BA13

Completed: promoted `packages/battle-runtime/battle-runtime.qnt` as the
canonical package-local spec for implemented `@dnd/battle-runtime` behavior.
Root `battle.qnt` is retained as legacy/Core broad proof and restore source
material, not as the active authority for promoted Unit/StatBlock-backed battle
behavior.

Decision options:

- Promote package-local `battle-runtime.qnt` as the canonical spec for
  `@dnd/battle-runtime`, keeping it package-local but updating docs/tests to
  stop calling root `battle.qnt` the promoted authority.
- Move/rename the package-local spec into a canonical path and update imports,
  docs, and test commands.
- Retire/quarantine root `battle.qnt` as legacy Core reference with explicit
  restore/proof status.

Acceptance:

- A new agent can answer "which QNT spec governs promoted battle runtime
  behavior?" from docs and test names without reading historical plans.
- Root `battle.qnt`, if retained, is not described as the active authority for
  promoted Unit/StatBlock-backed runtime behavior.
- No modeled behavior changes unless they are mechanical consequences of file
  moves/import updates.
- Verification commands use `pnpm`, and any MBT command follows the project MBT
  protocol.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- Promoted-path source check for accidental `@dnd/core` dependency.
- Battle MBT only if old/root MBT files are edited in a way that requires
  validation; otherwise do not run it.
- `/simplify` convergence, minimum 2 rounds.

Completed verification:

- `pnpm --filter @dnd/battle-runtime test` and
  `pnpm --filter @dnd/battle-runtime typecheck` pass.
- Promoted-path source check found no accidental `@dnd/core` dependency.
- Battle MBT was not run because old/root MBT files were not substantively
  edited.
- `/simplify` convergence recorded: round 1 fixed the tracked QNT rename and
  BA8/BA9 plan-status handoff; round 2 found no further canonical-layout or
  task-graph inconsistencies.

Plan Impact:

- BA9 is unblocked for legacy Core battle MBT quarantine.
- BA11 remains blocked until BA10 completes the promoted runtime MBT strategy;
  BA8 no longer blocks it.
- BA13 remains blocked until BA9, BA11, and BA12 complete.

### Task 28 - BA9 - Quarantine Legacy Core Battle MBT

Status: `done`

Depends on: BA8
Blocks: BA13

Next action: align old Core battle MBT status with the canonical QNT layout.

Input:

- BA8 canonical layout decision.
- Old Core MBT tests and fixture docs.
- Restore Ledger rows for old-only behavior.

Output:

- Test names, docs, or package scripts no longer imply old Core battle MBT is
  the promoted runtime's required verification gate.
- Old Core MBT remains available as reference/proof corpus unless BA8 explicitly
  chose deletion.
- Any disabled or legacy-only checks have Restore Ledger coverage.

Acceptance:

- Promoted runtime verification is not blocked by old Core hard-coded width.
- Old MBT seed/replay documentation remains accurate if retained.
- No loss of old behavior references without Restore Ledger coverage.

Verification:

- Source-only check unless package scripts/tests are changed.
- If old MBT commands are changed, follow MBT zombie-evaluator protocol and use
  the cheapest relevant run.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA13 remains blocked until BA11 and BA12 also complete.

### Task 29 - BA10 - Define Promoted Runtime MBT Strategy

Status: `done`

Depends on: BA3
Blocks: BA11

Next action: completed. The promoted battle-runtime MBT strategy is recorded in
`plans/promoted-battle-runtime-mbt-strategy.md`.

Input:

- BA2 proof-coverage map.
- BA3 revised task split.
- `packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md`.
- Battle runtime reducer and QNT docs.

Output:

- Updated proof strategy in
  `plans/promoted-battle-runtime-mbt-strategy.md` stating:
  small/shared algebra MBT remains modular;
  package-local `.qnt` self-tests are useful but not sufficient as the long-term
  proof shape for composed battle-runtime behavior;
  broad Surface/Unit/StatBlock catalog coverage defaults to table-driven
  contract tests;
  integrated battle-runtime QNT/MBT is reserved for selected high-risk
  verticals where trace generation adds value;
  Surface projection MBT is a separate decision, not implicit in battle MBT.
- First integrated QNT/MBT candidate selected for BA11 from
  already-implemented behavior: Fighter weapon Attack against a Skeleton Stat
  Block target through public `discoverBattleActs`, `resolveBattleSubject`, and
  `snapshotBattle`.

Acceptance:

- Does not rebuild old giant Core MBT by default.
- Does not require per-authored-Unit MBT for ordinary catalog entries.
- Explicitly graduates at least one promoted reducer path from `.qnt`
  assertion/self-test style toward trace-driven parity.
- Selects a candidate with meaningful reducer interaction, not a pure algebra
  already covered elsewhere.

Verification:

- Source-only docs/planning check: cross-checked the strategy against BA2's
  proof-coverage map, the Surface Runtime Correction MBT graph, and the
  battle-runtime README/architecture docs.
- No battle MBT runs.
- `/simplify` convergence recorded: round 1 fixed the missing verification
  record noted during review; round 2 found no further task-scope
  simplification, duplication, or plan-handoff changes.

Plan Impact:

- Status: applied.
- BA11: unblocked because BA8 and BA10 are complete; implement the selected
  Fighter weapon Attack vs Skeleton integrated MBT candidate.

### Task 30 - BA11 - Add First Promoted Integrated Battle QNT MBT

Status: `done`

Depends on: BA8, BA10
Blocks: BA13

Next action: add one narrow trace-driven QNT/MBT for Fighter weapon Attack
against a Skeleton Stat Block target, following
`plans/promoted-battle-runtime-mbt-strategy.md`.

Scope constraints:

- No new battle feature width.
- QNT/MBT should exercise public promoted runtime behavior, not a private
  helper already proven by a shared-algebra MBT.
- Keep the state space intentionally small; prefer one or two combatants and a
  bounded trace shape.

Acceptance:

- The MBT driver and QNT spec use the canonical layout chosen by BA8.
- The QNT spec has an `init`/`step` shape suitable for trace generation against
  the promoted TypeScript reducer; it is not only a collection of `run`
  assertions.
- The selected behavior is also covered by deterministic tests; MBT adds trace
  confidence rather than replacing ordinary tests.
- The run command is documented and fits Tier 1-style development feedback.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- If the new MBT uses battle-like Quint evaluation, follow the MBT run
  observation protocol and run only the new narrow test.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- BA13 remains blocked until BA12 completes.

### Task 31 - BA12 - Convert Old-Only Battle Behavior To Width Backlog

Status: `done`

Depends on: BA3, BA7
Blocks: BA13

Next action: completed. Old-only behavior is now represented by ordered
post-BA backlog tasks rather than vague Restore Ledger debt.

Input:

- BA1 inventory rows classified as `old-only-width`,
  `partial-overlap` leftovers, or `needs-owner-decision`.
- BA7 zero-HP lifecycle boundary rows.
- Restore Ledger.

Output:

- ACTIVE_PLAN's ordered post-BA follow-up queue after BA13 is maintained and,
  if needed, expanded in both the Ralph Task Index and DAG table. The Restore
  Ledger is supporting provenance/status only; it is not a substitute for
  actionable ACTIVE_PLAN tasks.
- The appended queue is split into explicit batches:
  1. maximum promoted Quint parity + MCP composition archive, seeded by
     PBA0-PBA4;
  2. old Core feature-parity restoration as promoted-runtime tasks;
  3. broader widening work that waits on the parity/composition archive and the
     explicit feature-parity queue.
- Each retained old-only behavior group becomes either a backlog candidate for
  PBA4, a blocked post-PBA4 follow-up task, or an explicitly deferred item with
  the owner decision recorded. Each candidate/task includes old source
  references, local RAW topics to read, new-runtime owner, acceptance summary,
  non-goals, and restore condition.
- Candidate groups should include, if still supported by BA1:
  movement/positioning and opportunity-attack boundary;
  reaction windows and interrupt stack;
  start-turn Death Saving Throw rolls and stable/dead handoff;
  Second Wind and bonus-action feature actions;
  Acid Splash/save-gate damage spells;
  Mage Armor/persistent AC override;
  concentration and readied spell lifecycle;
  monster recharge/daily/legendary controls;
  grappling/hand-use and weapon-state breadth;
  Hide/Search/hidden discovery and class feature riders.

Acceptance:

- Old-only behavior is not left as vague "later parity".
- After BA13 completes, the Ralph loop has a next actionable task from the
  appended post-BA queue without requiring a Restore Ledger inspection.
- The appended post-BA queue contains at least one `ready-for-research` or
  `ready-for-implementation-after-light-research` task, unless the owner
  explicitly decides to pause active work.
- The first post-BA batch archives maximum promoted Quint parity and composition
  proof before feature-parity restoration or broad widening starts.
- BA12 does not make old Core feature-parity or broad-widening tasks ready ahead
  of PBA0-PBA4. PBA4 owns turning BA12's backlog candidates into the first ready
  feature-parity restoration queue after the architecture watcher/corrector pass.
- Feature-parity restoration tasks come before broader widening tasks unless an
  owner decision explicitly defers a feature-parity row.
- Each future task is small enough for one agent or explicitly marked as a
  research/replan precursor.
- No projected executable IR is restored as a future task target; restore
  semantics through UnitRecords, StatBlockRecords, shared algebras, or battle
  runtime state.

Verification:

- Source-only planning check.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds because this changes future queue
  shape.

Plan Impact:

- Status: applied.
- BA13: unblocked for final authority closeout because BA8, BA9, BA11, and
  BA12 are complete.
- PBA4: revised to block PBA5 and promote the first BA12 backlog candidate only
  after PBA0-PBA3 archive/protocol/corrector work completes.
- PBA5-PBA14: added as blocked old Core feature-parity restoration tasks in
  promoted-runtime terms, ordered before broader widening.
- PBA15: added as the broader widening replan task, blocked behind the explicit
  feature-parity queue.
- Observations: no candidate restores projected executable IR. Restore semantics
  flow through UnitRecords, StatBlockRecords, shared algebras, battle runtime
  state, or character-session handoff state.
- Required plan edits: none beyond this BA12 closeout.

BA12 source-only planning check:

- Batch 1 is PBA0-PBA4: archive maximum promoted Quint parity and MCP/runtime
  composition, document reducer extensibility discipline, audit/correct drift,
  and then promote the first feature-parity candidate.
- Batch 2 is PBA5-PBA14: old Core feature-parity restoration through promoted
  runtime tasks. These are all blocked behind PBA4 so none become ready before
  the architecture watcher/corrector pass.
- Batch 3 is PBA15: broader battle widening planning after the explicit
  feature-parity queue reaches its first closeout point.
- `/simplify` round 1 checked BA1 inventory and BA7 lifecycle rows against the
  appended task list. Movement/OA, reactions, death saves, Second Wind, Acid
  Splash, Mage Armor, concentration/readied spells, monster controls,
  hand/weapon/grapple, Hide/Search, class riders, mid-battle add/remove, and
  generic combat actions all have explicit owners.
- `/simplify` round 2 checked ordering and invalid restoration targets. The
  queue keeps feature parity before broad widening, leaves no feature task ready
  before PBA0-PBA4, and rejects `CPU*`/`PEA*`/`PPR*` projected IR as task
  targets.

### Task 32 - BA13 - Close Battle Authority Reconciliation

Status: `done`

Depends on: BA8, BA9, BA11, BA12
Blocks: PBA0

Next action: completed. The final authority closeout verified the post-BA queue
is synchronized and made PBA0 the next ready Ralph task.

Planner role:

- BA13 is the final Battle Authority Reconciliation task and must act as the
  handoff planner for the next Ralph loop. Before marking BA13 `done`, verify
  that the post-BA queue after BA13 is present in the Ralph Task Index and DAG
  table. PBA0-PBA4 are the required first batch; if BA12 or intervening edits
  removed or weakened them, BA13 must restore them before closing.
- Do not leave the next work only in the Restore Ledger. The Restore Ledger may
  preserve evidence and status, but Ralph needs actionable ACTIVE_PLAN tasks.

Output:

- This file and
  [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
  state that the single promoted battle authority has been restored.
- Battle runtime README/architecture docs, QNT location, and package test
  commands agree.
- Restore Ledger captures old-only behavior not yet widened.
- ACTIVE_PLAN contains the ordered post-BA queue after BA13, including PBA0-PBA4
  as the first architecture watcher/corrector/docs-updater batch, synchronized
  across the Ralph Task Index, DAG table, and task-detail sections.
- Promoted-path dependency check confirms runtime/MCP do not import `@dnd/core`.

Acceptance:

- There is no active documentation path claiming both root `battle.qnt` and
  `battle-runtime.qnt` are simultaneous authorities for promoted battle
  behavior.
- A new battle feature task can start from one canonical runtime/spec boundary.
- Old Core MBT is either quarantined reference material or explicitly deleted
  with ledger coverage.
- The first ready post-BA task is visible to the Coding Loop Handoff Rules
  without reading historical plans or Restore Ledger rows.
- The post-BA queue has enough initial tasks for Ralph to continue without a
  new owner prompt; later planning tasks may continue spawning additional tasks
  as the queue develops.

Verification:

- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/mcp test`
- Promoted-path source check for `@dnd/core`, `CPU*`, `PEA*`, `PPR*`, and
  projected executable vocabulary.
- Run only the canonical promoted battle MBT/checks selected by BA10/BA11.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Status: applied.
- PBA0: unblocked as the next Ralph loop entrypoint for the post-BA
  architecture watcher/corrector batch.
- PBA1-PBA4: left blocked in order behind PBA0-PBA3 so archive/protocol/audit
  work stays ahead of feature-parity restoration.
- PBA5-PBA15: left blocked behind the explicit PBA4/PBA14 gates.
- Observations: Battle Authority Reconciliation is complete. The active
  promoted battle authority is `@dnd/battle-runtime` plus
  `packages/battle-runtime/battle-runtime.qnt`; old root `battle.qnt` and Core
  battle MBT remain legacy/Core proof and restore source material. The
  post-BA queue is present in the Ralph Task Index, DAG table, and task-detail
  sections, with PBA0-PBA4 as the first batch.
- Required plan edits: none.

BA13 source-only closeout check:

- `packages/battle-runtime/README.md`,
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md`, and
  `packages/battle-runtime/battle-runtime.qnt` agree that package-local
  `battle-runtime.qnt` is the canonical promoted battle spec.
- Old Core battle MBT is documented as quarantined legacy/Core proof-source
  material, not a promoted runtime gate.
- The Restore Ledger in `plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md`
  retains old-only behavior not yet widened, including death-save lifecycle,
  reactions, movement/OA, monster controls, hand/weapon/grapple state,
  projected spell/persistent lanes, and other Core-only feature breadth.
- Promoted-path source checks found no `@dnd/core` imports in
  `packages/mcp/src`, `packages/character-creation-runtime`, or
  `packages/battle-runtime`, and no `CPU*`, `PEA*`, `PPR*`, or projected
  executable vocabulary in promoted runtime source.
- `/simplify` round 1 checked authority wording across battle-runtime README,
  architecture docs, QNT comments, MCP README, and the migration plan. No active
  doc path claims root `battle.qnt` and `battle-runtime.qnt` are simultaneous
  promoted authorities.
- `/simplify` round 2 checked queue synchronization. PBA0-PBA4 are present in
  the Ralph Task Index, DAG table, and task details, and only PBA0 is ready
  after BA13.

### Task 33 - PBA0 - Archive Promoted Quint Parity And Composition Boundary

Status: `done`

Depends on: BA13
Blocks: PBA1

Next action: completed. The promoted proof/composition boundary is archived in
[promoted-quint-parity-composition-archive.md](/workspace/typescript/dnd/plans/promoted-quint-parity-composition-archive.md)
before feature parity restoration or broad widening starts.

Output:

- A durable planning/archive document defines maximum promoted Quint parity for
  the current architecture: package-local QNT, integrated promoted-runtime MBT,
  shared-algebra MBT, deterministic reducer tests, MCP composition tests, and
  multiple runtime/package composition.
- The archive states how `@dnd/character-creation-runtime`,
  `@dnd/battle-runtime`, `@dnd/shared-algebras`, `@dnd/surface`, and
  `@dnd/mcp` compose without reviving old Core as the active authority.
- Any remaining proof gaps become explicit follow-up tasks rather than vague
  parity debt.

Acceptance:

- A new agent can tell which proof layer owns each runtime/package boundary.
- The archive does not require MBT per authored Unit or Stat Block.
- Broad widening remains blocked behind this archive and the feature-parity
  queue.

Verification:

- Source-only docs/planning check.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Status: applied.
- PBA1: unblocked as the next architecture watcher/corrector task.
- PBA2-PBA4: left blocked in order behind PBA1-PBA3.
- PBA5-PBA15: left blocked behind the explicit feature-parity and broader
  widening gates.
- Observations: maximum promoted parity is now layered by package boundary:
  Surface catalog/reader contracts, shared-algebra MBT, character-creation
  package-local QNT/MBT, battle-runtime package-local QNT plus selective
  integrated MBT, MCP deterministic composition tests, and multiple-runtime
  contract tests. Ordinary authored Unit/Spell/Stat Block width does not require
  MBT per record.
- Required follow-up plan edits: none.

PBA0 source-only closeout check:

- The new archive states how `@dnd/character-creation-runtime`,
  `@dnd/battle-runtime`, `@dnd/shared-algebras`, `@dnd/surface`, and
  `@dnd/mcp` compose without reviving old Core as active authority.
- Remaining proof gaps are assigned to PBA1-PBA15 or to the existing
  `battle-runtime-proof-coverage.md` owner table instead of being left as vague
  parity debt.
- RAW/ubiquitous-language check: no new D&D rule behavior was modeled. The
  archive was checked against `UBIQUITOUS_LANGUAGE.md` for Initiative, action
  lifecycle, resource, HP/death, damage, Surface/Unit, and spell ownership
  terminology.
- No battle MBT was run.
- `/simplify` round 1 checked duplicated authority claims and collapsed the
  archive around package ownership, proof layers, and follow-up owners.
- `/simplify` round 2 checked for accidental per-authored-record MBT
  requirements and old Core authority wording. The archive keeps old Core as
  reference material and leaves ordinary catalog width to deterministic
  contract tests.

### Task 34 - PBA1 - Document Battle Reducer Extensibility Discipline

Status: `done`

Depends on: PBA0
Blocks: PBA2

Next action: make the reducer extensibility rule explicit in the owning docs.

Output:

- `packages/battle-runtime/README.md` states that the battle reducer interprets
  reusable SRD procedure families, not one branch per Unit, spell, feature,
  monster action, or slug.
- `ARCHITECTURE.md` and `packages/battle-runtime/ARCHITECTURE_GRAPH.md` are
  updated if needed so Surface records/readers, support boundaries, reducer
  procedure families, and MCP composition agree.
- The docs define when a new authored ability is data-only, when it requires a
  support-profile/reader change, and when it justifies a reusable procedure
  family or runtime state widening.

Acceptance:

- Unsupported authored shapes fail at one support boundary instead of leaking
  partial behavior into reducer logic.
- QNT/MBT guidance targets procedure-family behavior and composition; catalog
  breadth defaults to deterministic table/contract tests.
- No projected executable vocabulary is reintroduced.

Verification:

- Source-only docs check.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Status: applied.
- PBA2: unblocked as the next reducer watcher/corrector research task.

Closeout:

- Documented the reducer procedure-family rule in
  `packages/battle-runtime/README.md`, `ARCHITECTURE.md`, and
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md`.
- Verification used source-only docs checks and two `/simplify` review rounds;
  no MBT was required for this docs-only task.

### Task 35 - PBA2 - Audit Reducer For Named-Ability Drift

Status: `done`

Depends on: PBA1
Blocks: PBA3

Next action: inspect current promoted battle runtime and MCP composition for
ability-shaped reducer drift.

Input:

- `packages/battle-runtime/src/index.ts`
- `packages/battle-runtime/README.md`
- `packages/battle-runtime/ARCHITECTURE_GRAPH.md`
- `packages/mcp/src/*battle*`
- Current Surface Unit/StatBlock readers used by battle.

Output:

- An audit section or task-specific note classifies named spell, feature,
  monster action, Unit slug, Stat Block action, or support-gate references as:
  acceptable localized support gate; should be extracted into reader/procedure
  data; or future reusable procedure-family widening.
- PBA3 scope is narrowed to the smallest correction needed, or explicitly
  marked no-op if no harmful drift exists.

Acceptance:

- The audit distinguishes data identity from reducer dispatch identity.
- It does not demand removing all names; names may remain as support gates or
  authored identity when they are localized and not acting as procedure logic.
- Any strong connascence found is either localized or assigned to PBA3/future
  tasks.

Verification:

- Source-only code/docs audit.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- Status: applied.
- PBA3: unblocked as `ready-for-research` with concrete correction scope. PBA2
  found Action Surge support-gate drift: discovery admits by Unit id alone, while
  resolution later parses a partial activation-mechanics shape and depends on
  first phase/effect positions.
- PBA4-PBA15: left unchanged.

PBA2 source-only closeout check:

- Added `plans/pba2-named-ability-drift-audit.md`.
- The audit distinguishes reducer dispatch identity from authored data identity:
  `BattleSubject` tags dispatch procedure families, while attack names, spell
  ids, Unit ids, and Stat Block ids remain retained Surface identity or
  localized support gates.
- No battle MBT was run.
- `/simplify` round 1 rechecked reducer named references and separated support
  gates from dispatch identity. Action Surge discovery/resolution support drift
  is assigned to PBA3.
- `/simplify` round 2 rechecked MCP composition and Surface reader boundaries for
  duplicated named procedure logic. No MCP-side correction is required.

### Task 36 - PBA3 - Correct First Reducer Extensibility Drift

Status: `done`

Depends on: PBA2
Blocks: PBA4

Next action: completed; Action Surge support-gate parsing is centralized so
discovery and resolution share one executable admitted Unit feature shape.

Scope constraints:

- Do not broaden battle behavior.
- Do not begin old Core feature-parity restoration here.
- Prefer moving named ability logic toward Surface readers, support profiles,
  shared procedure helpers, or typed runtime state over adding adapters.
- Limit the required correction to the existing promoted Action Surge feature:
  parse the currently supported mechanics shape once, enforce the
  single-phase/single-effect assumption there, and thread the narrowed result
  into both available-act discovery and resolution.

Acceptance:

- Any changed reducer path still behaves the same for existing supported
  Fighter/Goblin/Wizard/Skeleton flows.
- The correction weakens or localizes named-ability/string-literal connascence.
- Docs changed by PBA1 remain accurate after the correction.
- Action Surge cannot be advertised unless the same centralized support parser
  proves resolution can accept the selected Unit feature shape.

Verification:

- `pnpm --filter @dnd/battle-runtime test` if runtime code changes.
- `pnpm --filter @dnd/battle-runtime typecheck` if runtime code changes.
- `pnpm --filter @dnd/mcp test` if MCP composition changes.
- Source-only verification is not enough for the required PBA3 runtime
  correction; only use it if the decider explicitly defers the Action Surge fix.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- PBA4 is unblocked.

### Task 37 - PBA4 - Align Protocol Docs And Start Feature-Parity Queue

Status: `ready-for-research`

Depends on: PBA3
Blocks: PBA5

Next action: align the docs after PBA0-PBA3 and promote PBA5, or revise the
feature-parity queue with an explicit owner decision if PBA0-PBA3 changes the
architecture constraints.

Output:

- `ACTIVE_PLAN.md` retains the BA12-appended old Core feature-parity backlog
  after PBA4, synchronized across the Ralph Task Index, DAG table, and
  task-detail sections.
- The feature-parity queue is ordered before broader Surface/catalog widening.
- Any broad widening tasks discovered during PBA0-PBA3 are blocked behind the
  feature-parity queue or explicitly deferred by owner decision.
- Owning docs still agree about reducer protocols, QNT/MBT proof layers, and MCP
  composition.

Acceptance:

- Ralph has a next ready feature-parity task after PBA4 without requiring a new
  owner prompt.
- The next tasks preserve the procedure-family reducer discipline from PBA1.
- Broad widening does not start until maximum parity/composition and first
  feature-parity restoration tasks are archived in this plan.

Verification:

- Source-only planning/docs check.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, the next appended feature-parity task becomes the Ralph loop
  entrypoint.

### Task 38 - PBA5 - Restore Death Save Turn Lifecycle

Status: `blocked`

Depends on: PBA4
Blocks: PBA6

Batch: old Core feature-parity restoration.

Next action: research and restore the first zero-HP lifecycle width slice.

Backlog candidate:

- Old sources: `plans/battle-authority-inventory.md` "Zero-HP lifecycle,
  death saves, healing from 0, monster death" and "BA7 Zero-HP Boundary Rows";
  root `battle.qnt` `bStartTurn`, `applyDamage`, `bHeal`, and old Core
  zero-HP tests.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` Dropping to 0 Hit
  Points, Death Saving Throws, Stabilizing a Character, Character Demise; Short
  Rest and Long Rest glossary topics; `UBIQUITOUS_LANGUAGE.md` Death Saving
  Throw, Stable, Hit Points; `ASSUMPTIONS.md` A12.
- New-runtime owner: `@dnd/battle-runtime` for combat turn-start resolution and
  HP-mutation lifecycle state; character-session/MCP closeout for durable
  post-battle zero-HP, Stable/dead, and rest handoff.
- Acceptance summary: turn-start can ask for or consume Death Saving Throw
  rolls; Stable/dead handoff is typed; post-battle closeout persists character
  lifecycle facts without duplicating battle runtime HP authority.
- Non-goals: broad rest/adventuring runtime, revival magic, monster-death
  variants beyond the current lifecycle policy.
- Restore condition: battle/runtime and character-session state support
  zero-HP/death-save/rest facts without conflating them with attack damage or
  provenance labels.

Verification:

- RAW traceability check before rules edits.
- Focused battle-runtime and MCP tests for restored lifecycle handoff.
- No battle MBT unless the task adds a promoted QNT/MBT slice.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA6.

### Task 39 - PBA6 - Restore Second Wind And Bonus-Action Subjects

Status: `blocked`

Depends on: PBA5
Blocks: PBA7

Batch: old Core feature-parity restoration.

Next action: restore UnitRecord-backed Second Wind and the reusable Bonus Action
subject/resource protocol.

Backlog candidate:

- Old sources: Restore Ledger "Second Wind battle action lane";
  `git show 39f9ab71:packages/core/src/projected-creature-action-reducer.ts`;
  `git show 39f9ab71:packages/core/src/projected-action-context.ts`; BA1
  "Class-feature battle actions/resources" and "Bonus actions" rows.
- RAW topics: `.references/srd-5.2.1/Classes/Fighter.md` Second Wind;
  `.references/srd-5.2.1/Rules-Glossary.md` Bonus Action;
  `.references/srd-5.2.1/Playing-the-Game.md` action economy;
  `UBIQUITOUS_LANGUAGE.md` Resource and Hit Points.
- New-runtime owner: `@dnd/battle-runtime` Unit feature subject discovery,
  action-resource spend/reset, healing procedure, and MCP act resolution.
- Acceptance summary: Second Wind appears as a supported no-projected-IR
  UnitRecord feature act, spends Bonus Action and its feature resource, heals
  through the runtime HP boundary, and is rejected when the actor cannot act.
- Non-goals: broad class feature catalog, old projected action reducers,
  non-Fighter riders.
- Restore condition: runtime supports UnitRecord-backed class feature action
  holes and Bonus Action subjects structurally.

Verification:

- RAW traceability check before rules edits.
- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/mcp test` if MCP tools change.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA7.

### Task 40 - PBA7 - Restore Save-Gate Damage Spell Procedure

Status: `blocked`

Depends on: PBA6
Blocks: PBA8

Batch: old Core feature-parity restoration.

Next action: restore Acid Splash-style save-gate damage spells as promoted
runtime spell procedures.

Backlog candidate:

- Old sources: Restore Ledger "Projected prepared spell / Acid Splash lane";
  `plans/phase0-core-deletion-restore-audit.md` Acid Splash rows;
  BA1 "Spell access, spell slots, Magic action spells" row.
- RAW topics: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Acid Splash;
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` casting, spell slots,
  saving throws, and casting time; `UBIQUITOUS_LANGUAGE.md` Spell Definition,
  Spell Access, Spell Invocation, Spell Effect, Saving Throw, Damage.
- New-runtime owner: `@dnd/battle-runtime` spell act holes, save procedure,
  damage procedure, slot/cantrip resource handling, and MCP fill/replay.
- Acceptance summary: save-gate damage is expressed as reusable spell procedure
  data and holes; selected targets roll/accept saves; damage applies only on
  failed saves as RAW requires for the selected spell.
- Non-goals: projected prepared spell bridge, broad AoE geometry, upcasting,
  reaction spells, full spell catalog.
- Restore condition: UnitRecord-backed spell act holes exist for save-gate
  damage without `PEA*` projected action vocabulary.

Verification:

- RAW traceability check before rules edits.
- Focused battle-runtime spell tests and MCP replay tests if exposed.
- No battle MBT unless a promoted QNT slice is intentionally widened.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA8.

### Task 41 - PBA8 - Restore Persistent Spell Effects And Concentration

Status: `blocked`

Depends on: PBA7
Blocks: PBA9

Batch: old Core feature-parity restoration.

Next action: restore persistent spell-effect lifecycle with Mage Armor and
concentration as the first pressure cases.

Backlog candidate:

- Old sources: Restore Ledger "Mage Armor projected persistent lane"; BA1
  "Persistent effects and concentration lifecycle" row; root `battle.qnt`
  `ActiveEffect`, `breakConcentrationAndPropagate`,
  `advanceStartEffectsForOwner`, `resolveConcentration`,
  `bConcentrationCheck`, and readied spell functions.
- RAW topics: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Mage Armor;
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` Duration,
  Concentration, and Ready Spell timing; `UBIQUITOUS_LANGUAGE.md` Spell Effect.
- New-runtime owner: `@dnd/battle-runtime` active effect state, AC projection
  boundary, concentration checks/breakage, readied spell lifecycle, and MCP
  snapshots.
- Acceptance summary: Mage Armor can set a base AC override with a typed early
  end; concentration is tracked and broken by the modeled RAW triggers; readied
  spell concentration uses the same lifecycle instead of a parallel state.
- Non-goals: all persistent spells, all AC formula variants, projected
  persistent records, app UI visualization.
- Restore condition: runtime supports UnitRecord-backed persistent
  effects/lifecycle and concentration without `PPR*` records.

Verification:

- RAW traceability check before rules edits.
- Battle-runtime tests for active effects, AC projection, and concentration.
- QNT/MBT widening only if the task changes promoted spec behavior.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA9.

### Task 42 - PBA9 - Restore Reaction Windows And Interrupt Stack

Status: `blocked`

Depends on: PBA8
Blocks: PBA10

Batch: old Core feature-parity restoration.

Next action: restore reusable reaction windows and interrupt-stack semantics.

Backlog candidate:

- Old sources: BA1 "Reactions and interrupt windows" row; root `battle.qnt`
  `ReactionDecision`, `PendingInterrupt`, `BPAwaitingReaction`, hit/damage,
  spell/save, and after-damage reaction actions; Core event surface in
  `battle-machine-events.ts`.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` Reaction and
  Opportunity Attack timing; `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
  reaction casting-time anchor; `UBIQUITOUS_LANGUAGE.md` Reaction.
- New-runtime owner: `@dnd/battle-runtime` interrupt stack, reaction-resource
  spend/reset, reaction decision holes, and MCP pending-state replay.
- Acceptance summary: attack, spell, save, and after-damage procedures can open
  typed reaction windows; declining or resolving a reaction resumes the
  interrupted procedure without caller sequencing conventions.
- Non-goals: every reaction feature/spell, Opportunity Attack movement
  geometry, old Core event names.
- Restore condition: runtime has reusable interrupt-window machinery that
  feature/spell tasks can reuse.

Verification:

- RAW traceability check before rules edits.
- Focused runtime tests for open/decline/resolve/resume reaction windows.
- Integrated MBT only if selected by the promoted MBT strategy.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA10.

### Task 43 - PBA10 - Restore Movement Positioning And Opportunity Attacks

Status: `blocked`

Depends on: PBA9
Blocks: PBA11

Batch: old Core feature-parity restoration.

Next action: restore movement/positioning and Opportunity Attack boundaries.

Backlog candidate:

- Old sources: BA1 "Movement, positioning, Opportunity Attacks, traversal" row;
  root `battle.qnt` `MovementCtx`, `TraversalMovementCtx`, `bMove`,
  `bMovementOADecline`, `bMovementOAAttack`, `bResolveTraversalStep`; Core
  `battle-machine-actions-movement.ts`.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` movement/position,
  Speed, Difficult Terrain, and Opportunity Attacks; `ASSUMPTIONS.md` spatial
  and grapple movement-cost notes; `UBIQUITOUS_LANGUAGE.md` Speed and Reach.
- New-runtime owner: `@dnd/battle-runtime` spatial input/state boundary,
  movement budget, traversal procedure, OA trigger integration, and MCP
  movement holes.
- Acceptance summary: runtime can mutate position through a typed movement
  subject, derive legal movement budget, open OA windows through PBA9 machinery,
  and preserve existing attack range legality.
- Non-goals: tactical grid UI, full terrain catalog, broad movement modes,
  Grapple movement costs beyond the later PBA12 handoff.
- Restore condition: battle runtime has a spatial input/state boundary and a
  movement QNT/runtime slice.

Verification:

- RAW traceability check before rules edits.
- Focused movement/OA runtime tests; promoted QNT slice if movement becomes
  canonical behavior.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA11.

### Task 44 - PBA11 - Restore Monster Resource Controls

Status: `blocked`

Depends on: PBA10
Blocks: PBA12

Batch: old Core feature-parity restoration.

Next action: restore StatBlockRecord-backed monster recharge, daily, legendary,
and generic monster-control procedures.

Backlog candidate:

- Old sources: BA1 "Monster controls" row; root `battle.qnt`
  `MonsterResourceState`, `mkMonster`, `bUseLegendaryAction`,
  `bLegendaryAttack`, traversal/resource helpers; Core `monster-types.ts`.
- RAW topics: `.references/srd-5.2.1/Monsters/Overview.md` stat-block actions
  and special traits; relevant monster stat-block files for selected pressure
  cases; `ASSUMPTIONS.md` Multiattack/Legendary notes; `UBIQUITOUS_LANGUAGE.md`
  Stat Block.
- New-runtime owner: `@dnd/battle-runtime` StatBlockRecord readers, monster
  resource state, recharge/daily/legendary support gates, and MCP monster acts.
- Acceptance summary: supported StatBlockRecord controls expose typed acts and
  resource/recharge state; ordinary Goblin/Skeleton attacks keep working; no
  monster control is inferred from UnitRecord facts.
- Non-goals: broad monster catalog import, monster spellcasting, old monster
  type adapters.
- Restore condition: monster Stat Block projection uses distinct authored
  StatBlockRecord boundaries for control resources.

Verification:

- RAW traceability check before rules edits.
- Battle-runtime tests for selected monster control pressure cases.
- MCP tests if exposed through tools.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA12.

### Task 45 - PBA12 - Restore Hand Weapon And Grapple State

Status: `blocked`

Depends on: PBA11
Blocks: PBA13

Batch: old Core feature-parity restoration.

Next action: restore hand occupancy, weapon-mode state, off-hand attacks, and
Grapple/Escape Grapple/release lifecycle.

Backlog candidate:

- Old sources: BA1 "Hand/weapon state" and "Grappling" rows; root `battle.qnt`
  `HandUse`, hand helpers, `bOffHandAttack`, component hand prep,
  `grappledBy`, `grapplingTarget`, `linkBattleGrapple`,
  `normalizeBattleGrapples`, `bGrapple`, `bReleaseGrapple`,
  `bEscapeGrapple`.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` Attack action,
  Grapple, moving a grappled creature, and equipment interaction; relevant
  equipment weapon properties; `UBIQUITOUS_LANGUAGE.md` Free Hand, Holding,
  Wielding, Two-Weapon Fighting, Grapple; `ASSUMPTIONS.md` Two-Weapon and
  Grapple notes.
- New-runtime owner: `@dnd/battle-runtime` held/wielded state, weapon-mode
  procedure data, free-hand requirements, grapple links, and MCP action holes.
- Acceptance summary: hand occupancy and grapple relationships are typed battle
  state; off-hand and grapple actions use reusable procedures; weapon damage
  facts stay derived from Surface/Unit records.
- Non-goals: full equipment inventory UI, every weapon property, projected
  component-prep vocabulary.
- Restore condition: runtime models hand/weapon/grapple state without
  duplicating authored weapon facts.

Verification:

- RAW traceability check before rules edits.
- Focused runtime tests for hand occupancy, off-hand attack, Grapple,
  release, and Escape Grapple.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA13.

### Task 46 - PBA13 - Restore Hide Search And Class Rider Width

Status: `blocked`

Depends on: PBA12
Blocks: PBA14

Batch: old Core feature-parity restoration.

Next action: restore hidden-state discovery and remaining old class-feature
riders as promoted runtime subjects.

Backlog candidate:

- Old sources: BA1 "Hidden, Search, Hide, unseen attacker interaction" and
  "Class-feature battle actions/resources" rows; root `battle.qnt` `bHide`,
  `bBonusHide`, `bSearch`, verbal spell reveal, attack reveal paths, Rage,
  Reckless, Sneak Attack, Evasion, Deflect, Uncanny Dodge, Cutting Words.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` Hide, Search,
  Unseen Attackers, action table; relevant class files for selected riders;
  `UBIQUITOUS_LANGUAGE.md` Hidden and class/resource terms.
- New-runtime owner: `@dnd/battle-runtime` hidden state, discovery DCs,
  reveal triggers, reusable class-rider procedure families, and MCP snapshots.
- Acceptance summary: Hide/Search/hidden discovery works through typed state and
  act holes; class riders are restored only when they can be expressed as
  reusable procedure-family data or explicit support-gated Unit feature acts.
- Non-goals: broad stealth environment model, every class/subclass feature,
  old per-class Core fields as runtime architecture.
- Restore condition: runtime supports hidden-state and class-rider width without
  named-ability reducer drift.

Verification:

- RAW traceability check before rules edits.
- Runtime tests for selected hidden-state and class-rider cases.
- MCP tests if user-visible tools expose the subjects.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA14.

### Task 47 - PBA14 - Restore Turn Roster And Generic Combat Actions

Status: `blocked`

Depends on: PBA13
Blocks: PBA15

Batch: old Core feature-parity restoration.

Next action: restore mid-battle roster changes and the old generic combat
action subjects as promoted runtime behavior.

Backlog candidate:

- Old sources: BA1 "Initiative and turn order" and "Ready, Help, Dodge, Dash,
  Disengage, Stand from Prone, generic combat actions" rows; root `battle.qnt`
  `bAddCreature`, `bRemoveCreature`, `bDash`, `bDisengage`, `bDodge`, `bReady`,
  `bReadyRelease`, `bReadySpell`, `bHelpAttack`, and Core Stand from Prone
  routing in `battle-machine.ts`.
- RAW topics: `.references/srd-5.2.1/Playing-the-Game.md` Initiative, Combat
  Round, Turns, action table, movement, Prone, Help, Ready, Dodge, Dash,
  Disengage, and Reaction timing; `ASSUMPTIONS.md` mid-combat arrivals and
  Attack-opportunity notes; `UBIQUITOUS_LANGUAGE.md` Action, Reaction, Speed,
  Prone, Initiative.
- New-runtime owner: `@dnd/battle-runtime` battle roster/initiative state,
  turn-resource procedures, generic combat-action subjects, Ready pending
  state, Help/Dodge defensive state, movement-budget interaction, and MCP
  command/fill replay.
- Acceptance summary: mid-battle add/remove mutates the promoted roster without
  corrupting current turn order; Dash, Dodge, Disengage, Ready, Help, Stand from
  Prone, and any retained generic action subject consume the correct resources
  and expose typed state/hole effects for later procedures.
- Non-goals: tactical grid UI, broad movement catalog beyond the PBA10 spatial
  boundary, every Help target variant, old Core event names, projected action
  reducers.
- Restore condition: promoted runtime owns roster mutation and generic
  combat-action procedure state directly, with no Restore Ledger-only debt for
  BA1 rows 40 or 53.

Verification:

- RAW traceability check before rules edits.
- Focused battle-runtime tests for add/remove turn-order effects and each
  restored generic combat action subject.
- MCP tests if commands/fills expose roster or action subjects.
- Promoted QNT/MBT widening only if the task adds those semantics to the
  canonical battle-runtime spec.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, unblock PBA15.

### Task 48 - PBA15 - Plan Broader Battle Widening Queue

Status: `blocked`

Depends on: PBA14
Blocks: future tasks

Batch: broader widening after parity/composition archive and explicit
feature-parity queue.

Next action: replan broader battle widening only after the post-BA archive and
first feature-parity queue have reached their closeout point.

Input:

- PBA0-PBA4 archive/protocol/corrector outputs.
- PBA5-PBA14 feature-parity restoration outcomes and any explicitly deferred
  owner decisions.
- Restore Ledger rows that are still intentionally omitted.

Output:

- New ordered ACTIVE_PLAN tasks for broader Surface/catalog, MCP workflow, app
  battle UI, trace/snapshot, or additional monster/spell/class widening.
- Explicit deferrals for any old-only group the owner chooses not to restore.

Acceptance:

- Broad widening does not start until maximum promoted parity/composition is
  archived and the feature-parity queue is explicit.
- New tasks preserve the promoted battle authority and reducer procedure-family
  discipline.
- The Restore Ledger remains provenance/status evidence, not the only work
  queue.

Verification:

- Source-only planning check.
- No battle MBT runs.
- `/simplify` convergence, minimum 2 rounds.

Plan Impact:

- If successful, append the next concrete broad-widening tasks and unblock the
  first one.

## Deferred Previous Queue

Deferred Detail: owner directed the active queue to move to the Correction Application Migration DAG on 2026-04-29, deferring current ACTIVE_PLAN items.

Deferred groups:

- EPT9-EPT14 and EPT20: old executable-projection tracer-bullet integration, spell fact ownership, and projected Quint split work. These are superseded by deleting the projected vocabulary and building the Correction-backed runtimes.
- EPT16-EPT19: old MCP participant/projection cleanup tasks. Reintroduce only as new CAM restore tasks if they still apply after the green runtime exists.
- CSA5-CSA8, CSB1-CSB11, CSC1-CSC2: broader content-surface widening and convergence tasks. Parked behind the first minimal legal Surface character and battle vertical.
- CSD1-CSD11: already deferred historical whole-core rehaul placeholders; remain deferred.

Do not revive deferred previous-queue tasks by changing their old status. Add a new CAM task or Restore Ledger task if a preserved concern becomes relevant again.
