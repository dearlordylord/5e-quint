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
      "status": "ready-for-implementation-after-light-research",
      "title": "Prepare Character Creation Runtime For Catalog Widening"
    },
    {
      "number": 1,
      "id": "CAM17",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add MCP Character Creation Tools"
    },
    {
      "number": 2,
      "id": "CAM18A",
      "status": "blocked",
      "title": "Add MCP Battle Session Shell"
    },
    {
      "number": 3,
      "id": "CAM18B",
      "status": "blocked",
      "title": "Add MCP Fighter Battle Flow"
    },
    {
      "number": 4,
      "id": "CAM18C",
      "status": "blocked",
      "title": "Add Goblin Warrior Attack Support"
    },
    {
      "number": 5,
      "id": "CAM18D",
      "status": "blocked",
      "title": "Add Full Green Vertical Fixture"
    },
    {
      "number": 6,
      "id": "CAM18E",
      "status": "blocked",
      "title": "Add Post-Battle Character State Handoff"
    },
    {
      "number": 7,
      "id": "CAM19A",
      "status": "blocked",
      "title": "Refresh Core And Projected Deletion Inventory"
    },
    {
      "number": 8,
      "id": "CAM19B",
      "status": "blocked",
      "title": "Isolate Legacy Core MCP Path"
    },
    {
      "number": 9,
      "id": "CAM19C",
      "status": "blocked",
      "title": "Delete Projected Vocabulary From Promoted Path"
    },
    {
      "number": 10,
      "id": "CAM19D",
      "status": "blocked",
      "title": "Reconcile Post-Deletion Docs And Tests"
    },
    {
      "number": 11,
      "id": "CAM20",
      "status": "blocked",
      "title": "Green Reconciliation And MCP Promotion"
    },
    {
      "number": 12,
      "id": "CAM21",
      "status": "blocked",
      "title": "End-User Vertical Acceptance"
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

| Order | Task                                                             | Status                                        | Depends on         | Blocks | Next action                                                                                                                                                                                     | Handoff readiness                                                           |
| ----- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0     | CAM16A - Prepare Character Creation Runtime For Catalog Widening | ready-for-implementation-after-light-research | completed baseline | CAM17  | Localize Phase 1 support gates, derive build projection from accepted selections, and index hole/option validation before MCP exposes the creation runtime.                                     | Ready after character-creation runtime architecture check.                  |
| 1     | CAM17 - Add MCP Character Creation Tools                         | ready-for-implementation-after-light-research | CAM16A             | CAM18A | Add green MCP tools for create draft, discover holes, fill holes, and finalize minimal Fighter.                                                                                                 | Ready after MCP green character-tool architecture check.                    |
| 2     | CAM18A - Add MCP Battle Session Shell                            | blocked                                       | CAM17              | CAM18B | Add green MCP tools for selecting a Stat Block, starting battle with explicit Initiative, storing battle session state, and returning battle state/snapshot.                                    | Blocker Type: dependency. Blocker Detail: waits on character MCP tools.     |
| 3     | CAM18B - Add MCP Fighter Battle Flow                             | blocked                                       | CAM18A             | CAM18C | Drive Fighter battle acts through MCP: discover Attack/End Turn, resolve target/attack-roll/damage fills, store returned BattleState, clear transient fills, and End Turn.                      | Blocker Type: dependency. Blocker Detail: waits on battle session shell.    |
| 4     | CAM18C - Add Goblin Warrior Attack Support                       | blocked                                       | CAM18B             | CAM18D | Derive Goblin Warrior attacks from authored StatBlockRecord and resolve Goblin Attack through the same battle flow without a second attack IR.                                                  | Blocker Type: dependency. Blocker Detail: waits on Fighter MCP battle flow. |
| 5     | CAM18D - Add Full Green Vertical Fixture                         | blocked                                       | CAM18C             | CAM18E | Add the full MCP-only green fixture: create/finalize Fighter, select Goblin Warrior, start battle, Fighter attacks, End Turn, and Goblin attacks.                                               | Blocker Type: dependency. Blocker Detail: waits on both combatant flows.    |
| 6     | CAM18E - Add Post-Battle Character State Handoff                 | blocked                                       | CAM18D             | CAM19A | Add explicit end-battle/finalize-battle handoff and character-list read model showing post-battle facts such as reduced current HP.                                                             | Blocker Type: dependency. Blocker Detail: waits on full green fixture.      |
| 7     | CAM19A - Refresh Core And Projected Deletion Inventory           | blocked                                       | CAM18E             | CAM19B | Inventory current Core/projected/MCP legacy call sites after the full green path and update Restore Ledger coverage before deletion.                                                            | Blocker Type: dependency. Blocker Detail: waits on post-battle green path.  |
| 8     | CAM19B - Isolate Legacy Core MCP Path                            | blocked                                       | CAM19A             | CAM19C | Move old Core-backed MCP routes/tests into a deletion-marked legacy package/path and keep them out of the promotable MCP entrypoint.                                                            | Blocker Type: dependency. Blocker Detail: waits on deletion inventory.      |
| 9     | CAM19C - Delete Projected Vocabulary From Promoted Path          | blocked                                       | CAM19B             | CAM19D | Delete projected executable vocabulary from the promoted MCP/runtime path after legacy isolation, preserving omitted semantics only through Restore Ledger rows.                                | Blocker Type: dependency. Blocker Detail: waits on legacy isolation.        |
| 10    | CAM19D - Reconcile Post-Deletion Docs And Tests                  | blocked                                       | CAM19C             | CAM20  | Reconcile docs, tests, Restore Ledger status, and expected failures after isolation/deletion so CAM20 has a concrete promotion handoff.                                                         | Blocker Type: dependency. Blocker Detail: waits on projected cleanup.       |
| 11    | CAM20 - Green Reconciliation And MCP Promotion                   | blocked                                       | CAM19D             | CAM21  | Promote the Surface-backed green tools into the normal MCP server path, retire `src/green` as a user-facing namespace, and replace green-specific tests with normal MCP server tests.           | Blocker Type: dependency. Blocker Detail: waits on controlled Core break.   |
| 12    | CAM21 - End-User Vertical Acceptance                             | blocked                                       | CAM20              | none   | Verify the promoted user workflow end to end: create character, start battle, add Goblin Warrior, run battle, end battle, and see the character list with post-battle facts such as reduced HP. | Blocker Type: dependency. Blocker Detail: waits on promoted MCP path.       |

## Task Details

### Completed Baseline

CAM0-CAM16 are complete and removed from the active queue to keep this file small. The current baseline includes the Phase 0 audit pack, active `@dnd/surface` package, first SRD Unit/Stat Block content, character-creation runtime through QNT parity, battle runtime through End Turn and package-local QNT slice, and the MCP green composition root. Historical detail lives in git history and the primary planning documents listed above.

### Task 0 - CAM16A - Prepare Character Creation Runtime For Catalog Widening

Status: `ready-for-implementation-after-light-research`

Depends on: completed baseline
Blocks: CAM17

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

- If successful, CAM17 remains ready and depends only on CAM16A.

### Task 1 - CAM17 - Add MCP Character Creation Tools

Status: `ready-for-implementation-after-light-research`

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

- Unblock CAM18A when CAM17 is done.

### Task 2 - CAM18A - Add MCP Battle Session Shell

Status: `blocked`

Depends on: CAM17
Blocks: CAM18B

Blocker Type: dependency
Blocker Detail: waits on character MCP tools.

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

- Unblock CAM18B.

### Task 3 - CAM18B - Add MCP Fighter Battle Flow

Status: `blocked`

Depends on: CAM18A
Blocks: CAM18C

Blocker Type: dependency
Blocker Detail: waits on battle session shell.

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

- Unblock CAM18C.

### Task 4 - CAM18C - Add Goblin Warrior Attack Support

Status: `blocked`

Depends on: CAM18B
Blocks: CAM18D

Blocker Type: dependency
Blocker Detail: waits on Fighter MCP battle flow.

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

- Unblock CAM18D.

### Task 5 - CAM18D - Add Full Green Vertical Fixture

Status: `blocked`

Depends on: CAM18C
Blocks: CAM18E

Blocker Type: dependency
Blocker Detail: waits on both combatant flows.

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

### Task 6 - CAM18E - Add Post-Battle Character State Handoff

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

### Task 7 - CAM19A - Refresh Core And Projected Deletion Inventory

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

### Task 8 - CAM19B - Isolate Legacy Core MCP Path

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

### Task 9 - CAM19C - Delete Projected Vocabulary From Promoted Path

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

### Task 10 - CAM19D - Reconcile Post-Deletion Docs And Tests

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

### Task 11 - CAM20 - Green Reconciliation And MCP Promotion

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

### Task 12 - CAM21 - End-User Vertical Acceptance

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

## Deferred Previous Queue

Deferred Detail: owner directed the active queue to move to the Correction Application Migration DAG on 2026-04-29, deferring current ACTIVE_PLAN items.

Deferred groups:

- EPT9-EPT14 and EPT20: old executable-projection tracer-bullet integration, spell fact ownership, and projected Quint split work. These are superseded by deleting the projected vocabulary and building the Correction-backed runtimes.
- EPT16-EPT19: old MCP participant/projection cleanup tasks. Reintroduce only as new CAM restore tasks if they still apply after the green runtime exists.
- CSA5-CSA8, CSB1-CSB11, CSC1-CSC2: broader content-surface widening and convergence tasks. Parked behind the first minimal legal Surface character and battle vertical.
- CSD1-CSD11: already deferred historical whole-core rehaul placeholders; remain deferred.

Do not revive deferred previous-queue tasks by changing their old status. Add a new CAM task or Restore Ledger task if a preserved concern becomes relevant again.
