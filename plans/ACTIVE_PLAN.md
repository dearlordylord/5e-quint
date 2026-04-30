# Active Plan

Date: 2026-04-29

This is the single active planning queue.

Active batch: Correction Application Migration.

Batch goal: replace the old Core/projected-executable vertical with a Surface/Unit-driven character-creation runtime, battle runtime, and MCP green path. The first runnable vertical is the Orc Soldier Fighter 1 from [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md) versus the Goblin Warrior Stat Block, through real creation holes, battle Attack with damage, and End Turn.

Primary planning documents:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)
- [CORRECTION_APPLICATION_VOCABULARY.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_VOCABULARY.md)

Previous active queue status: the Executable Projection Tracer Bullet and Content-Surface Taxonomy Convergence queue is deferred by owner direction on 2026-04-29. Its in-progress/ready/blocked work is superseded for now by the Correction Application Migration. Preserve old domain knowledge through the Restore Ledger in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md), not by continuing projected-executable tasks.

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
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Full Green Vertical Fixture"
    },
    {
      "number": 8,
      "id": "CAM18E",
      "status": "blocked",
      "title": "Add Post-Battle Character State Handoff"
    },
    {
      "number": 9,
      "id": "CAM19A",
      "status": "blocked",
      "title": "Refresh Core And Projected Deletion Inventory"
    },
    {
      "number": 10,
      "id": "CAM19B",
      "status": "blocked",
      "title": "Isolate Legacy Core MCP Path"
    },
    {
      "number": 11,
      "id": "CAM19C",
      "status": "blocked",
      "title": "Delete Projected Vocabulary From Promoted Path"
    },
    {
      "number": 12,
      "id": "CAM19D",
      "status": "blocked",
      "title": "Reconcile Post-Deletion Docs And Tests"
    },
    {
      "number": 13,
      "id": "CAM20",
      "status": "blocked",
      "title": "Green Reconciliation And MCP Promotion"
    },
    {
      "number": 14,
      "id": "CAM21",
      "status": "blocked",
      "title": "End-User Vertical Acceptance"
    },
    {
      "number": 15,
      "id": "POST2",
      "status": "blocked",
      "title": "Add First Width Slice Surface Records And Readers"
    },
    {
      "number": 16,
      "id": "POST3",
      "status": "blocked",
      "title": "Widen Character Creation Runtime Support Profile"
    },
    {
      "number": 17,
      "id": "POST4",
      "status": "blocked",
      "title": "Widen Battle Runtime For First Width Slice"
    },
    {
      "number": 18,
      "id": "POST5",
      "status": "blocked",
      "title": "Add Widened MCP User Workflow Coverage"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
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

| Order | Task                                                             | Status                                        | Depends on         | Blocks       | Next action                                                                                                                                                                                      | Handoff readiness                                                           |
| ----- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 0     | CAM16A - Prepare Character Creation Runtime For Catalog Widening | done                                          | completed baseline | CAM17, POST0 | Localized Phase 1 support gates, derived build projection from accepted selections, and indexed hole/option validation before MCP exposes the creation runtime.                                  | Completed.                                                                  |
| 1     | POST0 - Reconsider Post-CAM Width Plan After CAM16A              | done                                          | CAM16A             | POST1        | Rewrote the mandatory post-CAM width queue around CAM16A's support-profile boundary.                                                                                                             | Completed.                                                                  |
| 2     | POST1 - Research First Width Slice RAW And Corpus                | done                                          | POST0              | POST2        | Confirmed Fighter 2 + Wizard 1 and selected Skeleton as the second SRD Stat Block pressure case, with deterministic scenario and POST2-POST5 scope recorded below.                               | Completed; POST2 remains blocked by CAM21.                                  |
| 3     | CAM17 - Add MCP Character Creation Tools                         | done                                          | CAM16A             | CAM18A       | Added green MCP tools for create draft, discover holes, fill holes, and finalize minimal Fighter.                                                                                                | Completed.                                                                  |
| 4     | CAM18A - Add MCP Battle Session Shell                            | done                                          | CAM17              | CAM18B       | Added green MCP tools for selecting a Stat Block, starting battle with explicit Initiative, storing battle session state, and returning battle state/snapshot.                                   | Completed.                                                                  |
| 5     | CAM18B - Add MCP Fighter Battle Flow                             | done                                          | CAM18A             | CAM18C       | Added MCP Fighter battle act discovery, Attack fill accumulation/resolution, BattleState storage, fill clearing, and End Turn initiative advancement.                                             | Completed.                                                                  |
| 6     | CAM18C - Add Goblin Warrior Attack Support                       | done                                          | CAM18B             | CAM18D       | Added Goblin Warrior Scimitar and Shortbow Attack discovery/resolution from authored StatBlockRecord, through the shared battle-runtime and MCP Attack replay.                                   | Completed.                                                                  |
| 7     | CAM18D - Add Full Green Vertical Fixture                         | ready-for-implementation-after-light-research | CAM18C             | CAM18E       | Add the full MCP-only green fixture: create/finalize Fighter, select Goblin Warrior, start battle, Fighter attacks, End Turn, and Goblin attacks using normal-range Goblin target legality.       | Ready after CAM18C.                                                         |
| 8     | CAM18E - Add Post-Battle Character State Handoff                 | blocked                                       | CAM18D             | CAM19A       | Add explicit end-battle/finalize-battle handoff and character-list read model showing post-battle facts such as reduced current HP.                                                              | Blocker Type: dependency. Blocker Detail: waits on full green fixture.      |
| 9     | CAM19A - Refresh Core And Projected Deletion Inventory           | blocked                                       | CAM18E             | CAM19B       | Inventory current Core/projected/MCP legacy call sites after the full green path and update Restore Ledger coverage before deletion.                                                             | Blocker Type: dependency. Blocker Detail: waits on post-battle green path.  |
| 10    | CAM19B - Isolate Legacy Core MCP Path                            | blocked                                       | CAM19A             | CAM19C       | Move old Core-backed MCP routes/tests into a deletion-marked legacy package/path and keep them out of the promotable MCP entrypoint.                                                             | Blocker Type: dependency. Blocker Detail: waits on deletion inventory.      |
| 11    | CAM19C - Delete Projected Vocabulary From Promoted Path          | blocked                                       | CAM19B             | CAM19D       | Delete projected executable vocabulary from the promoted MCP/runtime path after legacy isolation, preserving omitted semantics only through Restore Ledger rows.                                 | Blocker Type: dependency. Blocker Detail: waits on legacy isolation.        |
| 12    | CAM19D - Reconcile Post-Deletion Docs And Tests                  | blocked                                       | CAM19C             | CAM20        | Reconcile docs, tests, Restore Ledger status, and expected failures after isolation/deletion so CAM20 has a concrete promotion handoff.                                                          | Blocker Type: dependency. Blocker Detail: waits on projected cleanup.       |
| 13    | CAM20 - Green Reconciliation And MCP Promotion                   | blocked                                       | CAM19D             | CAM21        | Promote the Surface-backed green tools into the normal MCP server path, retire `src/green` as a user-facing namespace, and replace green-specific tests with normal MCP server tests.            | Blocker Type: dependency. Blocker Detail: waits on controlled Core break.   |
| 14    | CAM21 - End-User Vertical Acceptance                             | blocked                                       | CAM20              | POST2        | Verify the promoted user workflow end to end: create character, start battle, add Goblin Warrior, run battle, end battle, and see the character list with post-battle facts such as reduced HP.  | Blocker Type: dependency. Blocker Detail: waits on promoted MCP path.       |
| 15    | POST2 - Add First Width Slice Surface Records And Readers        | blocked                                       | POST1, CAM21       | POST3        | Add the researched width slice to Surface records/readers: Fighter 2 advancement facts, Wizard 1 spellcasting creation facts, and the Skeleton SRD Stat Block with vulnerability/immunity shape. | Blocker Type: dependency. Blocker Detail: POST1 complete; waits on CAM21.   |
| 16    | POST3 - Widen Character Creation Runtime Support Profile         | blocked                                       | POST2              | POST4        | Extend CAM16A's support profile, projections, QNT slice, and docs so the researched class/species/background/spellcasting choices finalize without scattered Phase 1 branches.                   | Blocker Type: dependency. Blocker Detail: waits on Surface width.           |
| 17    | POST4 - Widen Battle Runtime For First Width Slice               | blocked                                       | POST3              | POST5        | Add battle-runtime support for the researched Fighter 2/Wizard/monster pressure through Surface-backed acts/resources/spell or monster facts, preserving runtime parity discipline.              | Blocker Type: dependency. Blocker Detail: waits on character runtime width. |
| 18    | POST5 - Add Widened MCP User Workflow Coverage                   | blocked                                       | POST4              | none         | Exercise the widened slice through promoted MCP/user workflows and update Restore Ledger status for restored width rows.                                                                         | Blocker Type: dependency. Blocker Detail: waits on battle runtime width.    |

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
  pressure spells: `magic_missile` for level-1 prepared Spell Invocation and
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
  Spell Invocation that does not spend a slot. Skeleton then uses one authored
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
  the Wizard scenario; remains blocked by CAM21.
- POST3: revised to widen character creation for Fighter 2 advancement and
  Wizard 1 spellbook/prepared-spell legality without adding Acolyte background
  runtime support; remains blocked by POST2.
- POST4: revised to cover Action Surge, Wizard Spell Invocation pressure, and
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
- Use final user-facing tool names inside the temporary Surface-runtime MCP
  registration boundary. Do not prefix tool names with `green_`; isolation comes
  from the module/package boundary until CAM20 promotion, not from user-visible
  vocabulary.

Input:

- Character creation runtime.
- MCP green composition root.

Output:

- Surface-runtime MCP tools for create character draft, discover creation holes, fill creation holes, and finalize minimal Fighter.

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
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
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

- Surface-runtime MCP tools for selecting a Stat Block and starting battle with
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
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
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
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
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
  Stat Block attack profile exists.
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
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
  packages.

Plan Impact:

- CAM18D unblocked.
- Ranged Stat Block attacks in the current battle-runtime slice support normal
  range only; long-range Disadvantage remains outside the green vertical.

### Task 7 - CAM18D - Add Full Green Vertical Fixture

Status: `ready-for-implementation-after-light-research`

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
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
  packages.

Plan Impact:

- Unblock CAM18E.

### Task 8 - CAM18E - Add Post-Battle Character State Handoff

Status: `blocked`

Depends on: CAM18D
Blocks: CAM19A

Blocker Type: dependency
Blocker Detail: waits on full green fixture.

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

- Unblock CAM19A.

### Task 9 - CAM19A - Refresh Core And Projected Deletion Inventory

Status: `blocked`

Depends on: CAM18E
Blocks: CAM19B

Blocker Type: dependency
Blocker Detail: waits on post-battle green path.

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

- Unblock CAM19B.

### Task 10 - CAM19B - Isolate Legacy Core MCP Path

Status: `blocked`

Depends on: CAM19A
Blocks: CAM19C

Blocker Type: dependency
Blocker Detail: waits on deletion inventory.

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

Status: `blocked`

Depends on: CAM19B
Blocks: CAM19D

Blocker Type: dependency
Blocker Detail: waits on legacy isolation.

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

Status: `blocked`

Depends on: CAM19C
Blocks: CAM20

Blocker Type: dependency
Blocker Detail: waits on projected cleanup.

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
- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime` has no green/promoted-path hits.

Plan Impact:

- Unblock CAM20 and update [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md) with actual deletion status and any remaining Restore Ledger rows.

### Task 13 - CAM20 - Green Reconciliation And MCP Promotion

Status: `blocked`

Depends on: CAM19D
Blocks: CAM21

Blocker Type: dependency
Blocker Detail: waits on controlled Core break.

Input:

- Passing MCP green vertical through post-battle character state.
- CAM19A-CAM19D deletion/isolation results.
- Surface-runtime MCP modules and the deletion-marked legacy MCP package.
- Phase 5 criteria in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md).

Output:

- Surface-backed tools promoted into the normal MCP server/router entrypoint.
- `packages/mcp/src/green/` deleted or reduced to internal composition helpers with no user-facing green namespace.
- Deletion-marked legacy MCP package removed, or kept only with explicit Restore
  Ledger coverage outside the promoted MCP route.
- Normal MCP server tests replace green-specific fixture-only coverage.

Acceptance:

- The runnable Fighter/Goblin vertical works through the normal MCP server path.
- `packages/mcp/src/server.ts` or its replacement no longer routes the vertical through Core/projected vocabulary.
- No user-facing MCP tool requires importing from `packages/mcp/src/green`.
- `src/green/` is deleted, or remaining files are internal helpers without "green" API naming.
- MCP docs describe the promoted Surface runtime path, not a green path as the active user workflow.
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

- If successful, unblock CAM21 and update the migration plan and MCP docs to mark green reconciliation complete and remove temporary green-path wording.

### Task 14 - CAM21 - End-User Vertical Acceptance

Status: `blocked`

Depends on: CAM20
Blocks: none

Blocker Type: dependency
Blocker Detail: waits on promoted MCP path.

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

- If successful, mark the Correction Application Migration accepted for the
  first end-user vertical and record any explicitly deferred post-battle facts
  in the Restore Ledger or a follow-up CAM task.

### Task 15 - POST2 - Add First Width Slice Surface Records And Readers

Status: `blocked`

Depends on: POST1, CAM21
Blocks: POST3

Blocker Type: dependency
Blocker Detail: POST1 RAW/corpus research is complete; waits on CAM21 end-user acceptance.

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
  existing Action Surge authored feature and a Tactical Mind sheet feature fact;
  reconcile the duplicate `fighter_action_surge` / `fighter_action_surge_l2`
  authored records into one canonical Unit id before widening readers.
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

- If successful, unblock POST3.

### Task 16 - POST3 - Widen Character Creation Runtime Support Profile

Status: `blocked`

Depends on: POST2
Blocks: POST4

Blocker Type: dependency
Blocker Detail: waits on first width slice Surface records/readers.

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

- If successful, unblock POST4.

### Task 17 - POST4 - Widen Battle Runtime For First Width Slice

Status: `blocked`

Depends on: POST3
Blocks: POST5

Blocker Type: dependency
Blocker Detail: waits on character creation runtime width.

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
  Spell Invocation pressure for the deterministic spells selected by POST1, and
  Skeleton's authored combat shape including vulnerability/immunity facts.
- Surface-backed act/resource/spell/monster facts derived from records and
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
- Wizard Spell Invocations distinguish prepared level-1 spells that spend Spell
  Slots from cantrips that do not. Runtime state owns expended slots; Character
  Build owns only starting capacity/access facts.
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

Status: `blocked`

Depends on: POST4
Blocks: none

Blocker Type: dependency
Blocker Detail: waits on battle runtime width.

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

- If successful, mark the first post-CAM width slice restored and add any next
  width tasks discovered during implementation.

## Deferred Previous Queue

Deferred Detail: owner directed the active queue to move to the Correction Application Migration DAG on 2026-04-29, deferring current ACTIVE_PLAN items.

Deferred groups:

- EPT9-EPT14 and EPT20: old executable-projection tracer-bullet integration, spell fact ownership, and projected Quint split work. These are superseded by deleting the projected vocabulary and building the Correction-backed runtimes.
- EPT16-EPT19: old MCP participant/projection cleanup tasks. Reintroduce only as new CAM restore tasks if they still apply after the green runtime exists.
- CSA5-CSA8, CSB1-CSB11, CSC1-CSC2: broader content-surface widening and convergence tasks. Parked behind the first minimal legal Surface character and battle vertical.
- CSD1-CSD11: already deferred historical whole-core rehaul placeholders; remain deferred.

Do not revive deferred previous-queue tasks by changing their old status. Add a new CAM task or Restore Ledger task if a preserved concern becomes relevant again.
