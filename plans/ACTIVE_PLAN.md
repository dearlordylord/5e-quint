# Active Plan

Date: 2026-04-10

This is the single active planning queue. It folds in the MCP Fighter vs. Goblin follow-up plan and replaces the standalone goblin plan.

## Batch Objective

Pick one or more bounded implementation slices that improve the D&D rules engine and MCP action surface without adding MCP-only state, duplicating owned facts, or widening into a geometry/grid engine.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Do not pick up unless the batch objective changes.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with the task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "K",
      "status": "done",
      "title": "Grapple Movable Cost SRD Parity Fix"
    },
    {
      "number": 1,
      "id": "MCP0-A",
      "status": "done",
      "title": "Dead-Creature Condition Mutation Bug"
    },
    {
      "number": 2,
      "id": "MCP0-B",
      "status": "done",
      "title": "Dead-Creature Exhaustion Mutation Decision"
    },
    {
      "number": 3,
      "id": "MCP0-C",
      "status": "done",
      "title": "Short Unknown Action Error"
    },
    {
      "number": 4,
      "id": "MCP0-D",
      "status": "done",
      "title": "SHORT_REST Documentation Clarity"
    },
    {
      "number": 5,
      "id": "MCP0-E",
      "status": "done",
      "title": "EXIT_COMBAT After Death UX Decision"
    },
    {
      "number": 6,
      "id": "B",
      "status": "done",
      "title": "Battle Size Ownership For Grapple"
    },
    {
      "number": 7,
      "id": "A",
      "status": "done",
      "title": "Condition Consequence Table Completion Research"
    },
    {
      "number": 8,
      "id": "C",
      "status": "done",
      "title": "ResourceCost Typed Refactor"
    },
    {
      "number": 9,
      "id": "D",
      "status": "done",
      "title": "Battle Attack Runtime/Session Boundary"
    },
    {
      "number": 10,
      "id": "MCP1-A",
      "status": "done",
      "title": "Session Host Architecture"
    },
    {
      "number": 11,
      "id": "MCP1-B",
      "status": "done",
      "title": "Core Statblock Facility + Initial Goblin Minion Entry"
    },
    {
      "number": 12,
      "id": "E",
      "status": "done",
      "title": "Movement And Help Geometry/Session Ownership"
    },
    {
      "number": 13,
      "id": "J",
      "status": "done",
      "title": "Generic Table Events, Environmental Hazards, And Monster Commands"
    },
    {
      "number": 14,
      "id": "F",
      "status": "done",
      "title": "Legendary Attack Payload Ownership"
    },
    {
      "number": 15,
      "id": "G",
      "status": "done",
      "title": "Attack Rider Ownership"
    },
    {
      "number": 16,
      "id": "MCP1-C",
      "status": "done",
      "title": "Encounter Start Tool/Command"
    },
    {
      "number": 17,
      "id": "MCP2-A",
      "status": "done",
      "title": "Battle Attack Public Boundary"
    },
    {
      "number": 18,
      "id": "MCP2-A1",
      "status": "done",
      "title": "Fighter Main-Hand Weapon/Loadout Projection On start_battle"
    },
    {
      "number": 19,
      "id": "MCP2-B",
      "status": "done",
      "title": "Fighter Attacks Goblin End-to-End"
    },
    {
      "number": 20,
      "id": "MCP3-A1",
      "status": "done",
      "title": "Stat-Block Advantage-Damage Rider Ownership"
    },
    {
      "number": 21,
      "id": "MCP3-A2",
      "status": "done",
      "title": "Monster Bonus-Action Option Boundary"
    },
    {
      "number": 22,
      "id": "MCP3-A3",
      "status": "done",
      "title": "Monster Reaction Retarget/Swap Boundary"
    },
    {
      "number": 23,
      "id": "MCP3-A",
      "status": "done",
      "title": "Goblin Warrior/Nimble Escape Follow-Up"
    },
    {
      "number": 24,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 25,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
    },
    {
      "number": 26,
      "id": "MCP2-C",
      "status": "ready-for-implementation-after-light-research",
      "title": "Concise Schema Validation Errors in MCP Tools"
    },
    {
      "number": 27,
      "id": "MCP2-D",
      "status": "ready-for-implementation-after-light-research",
      "title": "Unarmed Strike Fallback in Battle Attack"
    },
    {
      "number": 28,
      "id": "MCP4-A",
      "status": "done",
      "title": "BATTLE_ADD_CREATURE Mid-Battle Creature Insertion"
    },
    {
      "number": 29,
      "id": "MCP4-B",
      "status": "done",
      "title": "BATTLE_REMOVE_CREATURE Mid-Battle Creature Removal"
    },
    {
      "number": 30,
      "id": "ARCH-BATTLE-PROJ",
      "status": "ready-for-research",
      "title": "Battle Projection Contract And Methodology"
    },
    {
      "number": 31,
      "id": "MON1",
      "status": "ready-for-research",
      "title": "Canonical Stat Block Schema + Goblin Backfill"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status. The Ralph harness treats that JSON block as the machine-readable control surface.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Update the task status before ending the loop:
  - `done` if implementation/research and verification are complete;
  - `ready-for-implementation-after-light-research` if research made it implementable;
  - `blocked` if a required ownership/API decision is still unresolved;
  - `deferred` if research shows the task should not be in the current batch.
- When a task is marked `done` or `deferred`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- Do not leave a task `blocked` only because an old dependency label still says blocked. Reconcile the DAG table and the task's detailed `Depends on` section before ending the loop.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Do not fix semantic behavior only in MCP or XState. Adapter-only tasks, documentation-only tasks, and pure session-routing tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run MBT for research-only tasks. For implementation tasks, use the narrowest verification tier listed on the task.

## DAG / Queue Order

| Order | Task                                                                  | Status                                        | Depends on                                           | Blocks                                                                        | Next action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Handoff readiness                                                                                    |
| ----- | --------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 0     | K - Grapple Movable Cost SRD Parity Fix                               | done                                          | none                                                 | semantic grapple parity, future public `BATTLE_GRAPPLE`, QA triage confidence | Closed 2026-04-10: battle/spec/helpers now model 5.2.1 grapple dragging as extra movement cost instead of grappler speed halving; releasing mid-turn no longer refunds movement; A37 and repo glossary traceability updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Completed; no downstream task status changes                                                         |
| 1     | MCP0-A - Dead-Creature Condition Mutation Bug                         | done                                          | none                                                 | MCP0-B, safer MCP table events                                                | Closed 2026-04-10: dead-creature condition apply/remove now reject at MCP/XState and no-op in Quint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Completed; policy documented in A16                                                                  |
| 2     | MCP0-B - Dead-Creature Exhaustion Mutation Decision                   | done                                          | MCP0-A RAW/dead policy research                      | safer MCP table events                                                        | Closed 2026-04-10: dead-creature exhaustion add/reduce now reject at MCP/XState and no-op in Quint; generic starvation/dehydration exhaustion is also blocked while dead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Completed; policy documented in A16                                                                  |
| 3     | MCP0-C - Short Unknown Action Error                                   | done                                          | none                                                 | MCP UX and downstream agents                                                  | Closed 2026-04-10: `execute_action` / `preview_action` now return compact `UNKNOWN_ACTION_TYPE` errors before full decode, while known-action schema validation remains intact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed; no downstream plan changes                                                                |
| 4     | MCP0-D - SHORT_REST Documentation Clarity                             | done                                          | none                                                 | MCP docs accuracy                                                             | Closed 2026-04-10: docs/tool descriptions now keep `SHORT_REST` on the action-token lane and explicitly out of `execute_control_command`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Completed; no duplicate route added                                                                  |
| 5     | MCP0-E - EXIT_COMBAT After Death UX Decision                          | done                                          | MCP0-A policy context                                | optional UX cleanup                                                           | Closed 2026-04-10: keep `EXIT_COMBAT` available after death, document A33 caller-owned roster teardown, and clarify the MCP/core outcome text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed; no dead-creature special route                                                            |
| 6     | B - Battle Size Ownership For Grapple                                 | done                                          | none                                                 | Public `BATTLE_GRAPPLE`; helps clarify attack-size ownership patterns         | Closed 2026-04-10: battle/spec/init now own combatant `creatureSize`; `BATTLE_GRAPPLE` no longer accepts caller-supplied sizes and remains unexposed only because `targetSaveFailed` still needs the final public runtime/session contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Completed; audit blocker text updated                                                                |
| 7     | A - Condition Consequence Table Completion Research                   | done                                          | none                                                 | none                                                                          | Closed 2026-04-10: rejected redundant/single-condition table columns, deferred initiative modifiers, and landed the SRD 5.2.1 incapacitated speech fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Completed; no table expansion needed                                                                 |
| 8     | C - ResourceCost Typed Refactor                                       | done                                          | none                                                 | Cleaner MCP/UI cost display and future resource docs                          | Closed 2026-04-10: `ResourceCost` now models immediate selectable costs as typed pool/quota items, docs define the shared vocabulary, and MCP/core tests cover the new shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Completed; no downstream reorder needed                                                              |
| 9     | D - Battle Attack Runtime/Session Boundary                            | done                                          | none                                                 | F, G, MCP2-A, public `BATTLE_ATTACK`; off-hand/legendary/riders               | Closed 2026-04-10: documented the first-slice `BATTLE_ATTACK` boundary. Public token carries only `targetId` and `knockOut`; runtime `battleAttack` carries explicit table/session facts plus rolled `weaponDamage` and optional `sneakAttackDamage`; battle derives crit, weapon payload, and damage aggregation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Completed; MCP2-A can consume directly                                                               |
| 10    | MCP1-A - Session Host Architecture                                    | done                                          | MCP0 tasks done or intentionally deferred            | MCP1-C, MCP2-A                                                                | Closed 2026-04-10: stdio now runs through an in-process session router that auto-promotes `BATTLE_INIT` onto a battle host while keeping encounter drafts / character-list refs as optional adapter-only metadata and leaving mutable combat state in the machines. Task ownership is session routing/lifecycle only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Completed; shared public route established                                                           |
| 11    | MCP1-B - Core Statblock Facility + Initial Goblin Minion Entry        | done                                          | MCP0 tasks done or intentionally deferred            | MCP1-C, MCP2-B                                                                | Closed 2026-04-10: core now owns a runtime monster statblock catalog, `BATTLE_INIT` can reference `goblinMinion` by `statBlockId`, and SRD provenance is documented without adding an MCP registry, parser/importer, or widened Quint fixtures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Completed; init hook is ready                                                                        |
| 12    | E - Movement And Help Geometry/Session Ownership                      | done                                          | none                                                 | Public `BATTLE_MOVE`, `BATTLE_HELP_ATTACK`                                    | Closed 2026-04-10: keep core/MCP geometry-free; use explicit caller/session spatial facts for any future public movement/help surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Research closed                                                                                      |
| 13    | J - Generic Table Events, Environmental Hazards, And Monster Commands | done                                          | none                                                 | Future raw table event exposure and monster command work                      | Closed 2026-04-10: all four families (max-HP provenance, active effects, environmental hazards, monster commands) deferred; no family is ready for safe public exposure without source-specific provenance, stat-block validation, or multi-step progress tracking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Research closed                                                                                      |
| 14    | F - Legendary Attack Payload Ownership                                | done                                          | monster stat-block payload ownership                 | Public `BATTLE_LEGENDARY_ATTACK`                                              | Closed 2026-04-10: legendary attack is a `suggested_action` via `get_available_actions`; reuses Task D's attack runtime lane; battle derives weapon/damage/cost from stat-block `LegendaryActionDef.attackRef` → `StatBlock.attacks`; MCP never accepts arbitrary damage type, qualifiers, weapon properties, cost, or melee/ranged. Non-attack LA options (spell, save, utility) remain deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Research closed                                                                                      |
| 15    | G - Attack Rider Ownership                                            | done                                          | none                                                 | Attack rider tokens                                                           | Closed 2026-04-10: attack riders stay off creature MCP; Brutal Strike is a pre-roll attack declaration, Stunning Strike / Eldritch Smite / Divine Smite Free are post-hit rider windows, and Cunning Strike is a post-hit choice with post-damage effects layered onto Sneak Attack resolution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Research closed                                                                                      |
| 16    | MCP1-C - Encounter Start Tool/Command                                 | done                                          | MCP1-A, MCP1-B                                       | MCP2-A                                                                        | Closed 2026-04-10: added a session-level `start_battle` tool that compiles the active creature host's Fighter durable state into `BATTLE_INIT`, resolves `goblinMinion` through the core statblock catalog, and keeps mutable combatant state on the promoted battle host instead of the character-list snapshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Completed; MCP2-A unblocked                                                                          |
| 17    | MCP2-A - Battle Attack Public Boundary                                | done                                          | MCP1-C                                               | MCP2-B                                                                        | Closed 2026-04-10: public MCP `BATTLE_ATTACK` now uses Task D's exact token/runtime contract, requires explicit caller-owned attack facts instead of sampled MCP defaults, reuses the battle hit-reaction windows, and exposes stat-block-owned main-hand attack payloads by projecting the goblin minion's SRD dagger into battle state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Completed; fighter weapon ownership still separate                                                   |
| 18    | MCP2-A1 - Fighter Main-Hand Weapon/Loadout Projection On start_battle | done                                          | MCP1-C, MCP2-A                                       | MCP2-B                                                                        | Closed 2026-04-10: `start_battle` now projects a narrow core-owned Fighter longsword loadout into `BATTLE_INIT`, keeps monsters on the stat-block attack path, and exposes public `BATTLE_ATTACK` after the promoted battle turn starts. RAW check: `.references/srd-5.2.1/Equipment.md` longsword/shield rules and `.references/srd-5.2.1/Monsters/Overview.md` Gear vs. attack notation reviewed. `/simplify` rounds 1-2 found no further task-scoped reductions after consolidating the Fighter loadout source.                                                                                                                                                                                                                                                                                                                                                 | Completed; MCP2-B unblocked                                                                          |
| 19    | MCP2-B - Fighter Attacks Goblin End-to-End                            | done                                          | MCP2-A1                                              | motivating MCP flow                                                           | Closed 2026-04-10: added a `SessionRouter` integration test that runs `start_battle` -> `BATTLE_START_TURN` -> `get_available_actions` -> `BATTLE_ATTACK`, proves the goblin death state and fighter turn-state mutate only inside `BattleContext.creatures`, confirms the promoted battle is not left in a hit-reaction window, and confirms the original creature host snapshot stays unchanged until some later explicit battle-close/commit step. RAW check: reused Task MCP1-B / MCP2-A citations only; no new combat semantics. `/simplify` rounds 1-2 found no further task-scoped reductions beyond collapsing the workflow to a single durable-state-preservation scenario.                                                                                                                                                                               | Completed; motivating MCP flow now documented                                                        |
| 20    | MCP3-A1 - Stat-Block Advantage-Damage Rider Ownership                 | done                                          | MCP2-A                                               | MCP3-A                                                                        | Closed 2026-04-10: Goblin Warrior/Boss attack metadata now stores a minimal same-type `1d4` advantage-hit rider on the named stat-block attack, `statBlockToInitCreatureConfig` can project a selected named attack lane into battle without exposing new public catalog IDs or MCP payloads, and battle/spec damage resolution apply the rider only on hits with net Advantage (including crit doubling of the rider dice average). RAW check: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Warrior/Boss entries and `UBIQUITOUS_LANGUAGE.md` Advantage/Attack Roll terminology reviewed. `/simplify` rounds 1-2 removed public-schema exposure and collapsed the rider metadata to same-type dice only.                                                                                                                                               | Completed; warrior path now also has generic bonus-action support                                    |
| 21    | MCP3-A2 - Monster Bonus-Action Option Boundary                        | done                                          | MCP2-A                                               | MCP3-A                                                                        | Closed 2026-04-11: battle/spec now expose generic `BATTLE_BONUS_HIDE` / `BATTLE_BONUS_DISENGAGE` only for combatants that own `battleBonusActionOptions`; raw and catalog `BATTLE_INIT` can project those options; Nimble Escape stays goblin-owned data, not a goblin-specific public command. RAW check: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Warrior/Boss `Nimble Escape`, `.references/srd-5.2.1/Rules-Glossary.md` `Bonus Action`, `Disengage [Action]`, and `Hide [Action]`, plus `UBIQUITOUS_LANGUAGE.md` reviewed. `/simplify` rounds 1-2 converged after tightening direct-event ownership guards and removing the schema/parity gaps.                                                                                                                                                                                                 | Completed; Warrior path for MCP3-A is unblocked, Goblin Boss still needs MCP3-A3 for Redirect Attack |
| 22    | MCP3-A3 - Monster Reaction Retarget/Swap Boundary                     | done                                          | MCP2-A                                               | MCP3-A                                                                        | Closed 2026-04-11: `PIAttackHit` now owns generic `RRedirectAttack`, battle state owns redirect-side `battlePosition` / `battleSide` / redirect-candidate AC facts, Redirect Attack swaps positions and retargets the pending hit inside the hit window, and the rebuilt defender gets a fresh target-facing reaction window before damage proceeds. RAW check: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Boss `Redirect Attack`, `.references/srd-5.2.1/Monsters/Overview.md`, `.references/srd-5.2.1/Rules-Glossary.md` `Ally`, and `UBIQUITOUS_LANGUAGE.md` reviewed. `/simplify` round 1 added owned ally AC instead of a guessed redirect target AC; round 2 converged after collapsing redirect legality to battle-owned side/position checks and keeping the public surface on generic battle reactions.                                      | Completed; Goblin Boss path for MCP3-A is now ready                                                  |
| 23    | MCP3-A - Goblin Warrior / Nimble Escape Follow-Up                     | done                                          | MCP3-A1, MCP3-A2; optionally MCP3-A3 for Goblin Boss | fuller goblin behavior                                                        | Closed 2026-04-11: `start_battle` now uses a generic monster descriptor instead of goblin-named MCP fields, the core runtime catalog publishes `goblinWarrior` and `goblinBoss`, and focused core/MCP tests prove Nimble Escape bonus actions, advantage-hit riders, and Redirect Attack stay on the generic stat-block/battle surfaces rather than on goblin-specific MCP shortcuts. RAW check: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Warrior/Boss, `.references/srd-5.2.1/Monsters/Overview.md`, and `UBIQUITOUS_LANGUAGE.md` reviewed. `/simplify` round 1 removed the goblin-named `start_battle` schema surface; round 2 re-checked for redundant MCP aliases and converged with no further task-scoped reductions.                                                                                                                         | Completed; no downstream status changes                                                              |
| 24    | H - PassiveModifiers Sub-Record                                       | deferred                                      | none                                                 | Possible passive modifier cleanup                                             | Only revisit if the batch selects passive modifier restructuring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Not current-batch work                                                                               |
| 25    | I - Build-Map / Hole Metadata                                         | deferred                                      | Concrete consumer, possibly D                        | Future token-hole metadata                                                    | Only revisit when attack boundary, transcript disambiguation, or UI needs it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Not current-batch work                                                                               |
| 26    | MCP2-C - Concise Schema Validation Errors in MCP Tools                | ready-for-implementation-after-light-research | none                                                 | none                                                                          | Tighten MCP schema decode failures so invalid tool inputs report concise, field-local errors instead of massive union dumps, while preserving precise validation semantics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Ready; narrow MCP surface improvement                                                                |
| 27    | MCP2-D - Unarmed Strike Fallback in Battle Attack                     | ready-for-implementation-after-light-research | none                                                 | none                                                                          | Implement unarmed-strike fallback for weaponless battle combatants, keeping damage parity with `creature.qnt:unarmedDamage` and using the narrowest battle-owned facts necessary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Ready; bounded core attack change                                                                    |
| 28    | MCP4-A - BATTLE_ADD_CREATURE Mid-Battle Creature Insertion            | done                                          | none                                                 | MCP2-B                                                                        | Closed 2026-04-11: battle/spec/MCP now support mid-turn creature insertion with active-turn plus `turnStarted` guards, atomic duplicate-id rejection, stable in-block initiative sorting, turn-index repair, and default-position reindexing that preserves battle-owned init-derived rows without disturbing explicit positions. RAW/terminology check: `.references/srd-5.2.1/Playing-the-Game.md` / `Rules-Glossary.md` Initiative entries, `UBIQUITOUS_LANGUAGE.md`, and `ARCHITECTURE.md` tie/DM-decision notes reviewed; task remains architecture-only rather than a new SRD semantic extension. Verification: targeted core/MCP tests, Tier 1 battle projection MBT, `pnpm quality`, and `/simplify` rounds 1-2 converged.                                                                                                                                 | Completed; Task 29 unchanged and still ready                                                         |
| 29    | MCP4-B - BATTLE_REMOVE_CREATURE Mid-Battle Creature Removal           | done                                          | none                                                 | none                                                                          | Closed 2026-04-11: battle/spec/MCP now support mid-turn creature removal for one or more creatures with duplicate-id rejection, initiative turn-index repair, active-turn removal that ends the departing creature's turn and rolls the round when the removed active creature was last, cleanup for concentration, owned active effects, grapple links, and help targets, and parity plumbing in the battle projection MBT bridge. RAW/terminology check: `.references/srd-5.2.1/Rules-Glossary.md` Grappling + Help, `UBIQUITOUS_LANGUAGE.md` Grappled/Incapacitated/Concentration, and `ARCHITECTURE.md` battle-lifecycle notes reviewed; removal remains an architecture-owned battle-control slice rather than a new SRD mechanic. Verification: targeted core/MCP tests, Tier 1 battle projection MBT, `pnpm quality`, and `/simplify` rounds 1-2 converged. | Completed; no downstream plan changes                                                                |
| 30    | ARCH-BATTLE-PROJ - Battle Projection Contract And Methodology         | ready-for-research                            | none                                                 | none                                                                          | Research and document the explicit contract for what battle owns vs. what stays on creature/session layers, then decide whether battle projection should move to named projector functions or another common methodology.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Ready; architecture/doc research with possible follow-up                                             |
| 31    | MON1 - Canonical Stat Block Schema + Goblin Backfill                  | ready-for-research                            | none                                                 | future monster database follow-ups                                            | Research and land the canonical authored-section `StatBlock` shape with explicit SRD provenance and executable-vs-text-only ability modeling, then backfill the existing goblin entries without changing public MCP behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Ready; bounded first slice for monster database work                                                 |

## Current Integrated Baseline

Already wired on `master`:

- `BATTLE_HIDE`, `BATTLE_SEARCH`, `BATTLE_ESCAPE_GRAPPLE`, and `BATTLE_RELEASE_GRAPPLE` through `get_available_actions`.
- `BATTLE_ACTION_SURGE`, `BATTLE_ENTER_RAGE`, and `BATTLE_DECLARE_RECKLESS` through `get_available_actions`.
- Warlock `USE_MAGICAL_CUNNING`, Sorcerer `USE_INNATE_SORCERY`, and Druid `ENTER_WILD_SHAPE`, `EXIT_WILD_SHAPE`, `USE_WILD_RESURGENCE_SLOT`.
- Creature damage/recovery, condition/exhaustion, falling, voluntary concentration break, failed-save/check semantic triggers, and battle `BATTLE_HEAL` through `record_table_event`.

Still explicitly deferred in the `MCP_EVENT_SURFACE_AUDIT.md` baseline. Public `BATTLE_ATTACK` is now live for active creatures whose battle state already owns a main-hand attack payload, but public `BATTLE_GRAPPLE` remains deferred until its remaining runtime/session contract is finalized:

- `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`.
- Attack riders: `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, `USE_DIVINE_SMITE_FREE`.
- `BATTLE_HELP_ATTACK`, `BATTLE_MOVE`, `BATTLE_GRAPPLE`.
- Generic battle spell table events, raw effect/max-HP table events, environmental blockers such as `SUFFOCATE`, and monster-command blockers such as raw monster `USE_LEGENDARY_ACTION`.

Merged MCP Fighter vs. Goblin baseline:

- Confirmed MCP bugs should be tackled before the new battle-session workflow:
  - dead-creature condition mutation through MCP table events;
  - dead-creature Exhaustion mutation policy;
  - huge schema decode output for unknown `execute_action` types;
  - `SHORT_REST` documentation clarity;
  - `EXIT_COMBAT` after death UX decision.
- Task D fixed the public attack boundary, Task MCP2-A exposed public `BATTLE_ATTACK` when the battle state already owns a main-hand attack payload, Task MCP2-A1 projected the Fighter longsword into `start_battle`, and Task MCP2-B now records the full fighter-vs-goblin MCP workflow as a session-router integration test without mutating pre-battle durable state.
- Task MCP1-B is now complete: the first monster-content slice lives in a reusable core statblock facility, `BATTLE_INIT` can reference `goblinMinion` by ID, and MCP does not duplicate RAW stat-block numbers in its own registry.
- Goblin Warrior no longer needs one monolithic blocker. The remaining work splits into:
  - stat-block advantage-damage rider ownership for Scimitar/Shortbow;
  - generic monster bonus-action option support for Nimble Escape.
- Goblin Boss remains a later extension, but the reaction research is now narrowed: `Redirect Attack` should extend the existing `PIAttackHit` window with a retarget/swap decision rather than introduce a separate top-level interrupt family.

## Task Selection Guidance

Recommended first coding-loop tasks:

1. **Task K: Grapple Movable Cost SRD Parity Fix** before the remaining MCP queue. `battle.qnt` is the semantic source of truth for combat ownership decisions, and the current grapple-drag refresh path restores movement on release in a way that conflicts with the project's 5.2.1 SRD-parity claim.
2. **Task MCP2-A1: Fighter Main-Hand Weapon/Loadout Projection On start_battle** once Task K is either landed or explicitly deferred. Task MCP2-A already landed the public attack boundary and goblin stat-block attack payload projection; the remaining gap is the Fighter side of `start_battle`.
3. **Task MCP3-A1: Stat-Block Advantage-Damage Rider Ownership** if the goal is to keep moving toward Goblin Warrior without reopening MCP attack ownership.
4. **Task MCP3-A2: Monster Bonus-Action Option Boundary** immediately after or alongside Task MCP3-A1 if the batch wants Goblin Warrior's full `Nimble Escape` behavior.
   Tasks F and G are now complete. Reuse their ownership splits for any future `BATTLE_LEGENDARY_ATTACK` or attack-rider implementation rather than reopening the boundary question.

Do not widen `BATTLE_ATTACK` implementation beyond the Task D contract. The remaining risk is scope creep into off-hand attacks, hit reactions, legendary actions, and riders.

The fighter-vs-goblin MCP reference flow is now covered end to end. Keep future work focused on new ownership slices rather than reopening the already-landed `start_battle` -> `BATTLE_ATTACK` baseline.

### Task 0 - K - Grapple Movable Cost SRD Parity Fix

Status: done.

Depends on: none.

Blocks: semantic grapple parity, future public `BATTLE_GRAPPLE`, QA triage confidence for grapple rulings, and any article/demo claim that the current model reflects 5.2.1 RAW drag behavior.

Next action: None. Closed 2026-04-10 after replacing drag-via-speed-halving with drag-via-movement-cost in Quint battle semantics and the mirrored TS helpers, then updating A37 and glossary traceability.

Problem:

- The project claims SRD 5.2.1 parity, with `.references/srd-5.2.1/` as ground truth and `ASSUMPTIONS.md` as the sole record of deviations.
- `REVISION_RESEARCH.md` already records the 5.2.1 delta correctly: dragging a grappled creature costs 1 extra foot per foot moved; it is not a grappler speed-halving rule.
- `creature.qnt` still models same-size dragging by halving the grappler's `effectiveSpeed` in `pComputeEffectiveSpeed`.
- `battle.qnt` then refreshes current-turn movement budget from `newSpeed - spentMovement` whenever grapple state changes, which restores movement to the grappler on release.
- This is not merely different wording. It changes observable behavior for mid-turn grapple/release and is the engine-level reason "grapple leapfrog" works.
- `ASSUMPTIONS.md` A37 currently states the halving representation is "identical for all movement cases." That statement is false once grapple state can change mid-turn.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` entries for `Grappled` and `Speed`.
- `ARCHITECTURE.md` sections establishing SRD 5.2.1 as ground truth and `battle.qnt` as the semantic combat authority.
- `ASSUMPTIONS.md` A37.
- `REVISION_RESEARCH.md` grapple delta notes.
- `creature.qnt`:
  - `pComputeEffectiveSpeed`
  - `pMovementCost`
  - `pUseMovement`
- `battle.qnt`:
  - `refreshProjectedSpeed`
  - `linkBattleGrapple`
  - `releaseBattleGrappleByGrappler`
  - `escapeBattleGrapple`
  - `bMove`
- TS mirrors:
  - `packages/core/src/battle-machine-helpers.ts`
  - `packages/core/src/battle-machine-actions-movement.ts`
  - `packages/core/src/battle-rules-scenarios.test.ts`
  - any mirrored helper/test files touched by the Quint parity change

Implementation output:

- Quint semantics:
  - Remove drag-induced speed halving from `pComputeEffectiveSpeed`. Grappling another creature should not reduce the grappler's `effectiveSpeed` under the 5.2.1 model.
  - Extend `pMovementCost` with an explicit drag-cost input, e.g. `isDraggingGrappledCreature: bool`, and add a `dragExtra = if (isDraggingGrappledCreature) 1 else 0` term.
  - Keep the grappled target's own speed at 0; only the grappler's per-foot movement cost changes.
- Battle Quint wiring:
  - Update `bMove` to spend movement with a multiplier of 2 while the active creature is dragging a not-two-sizes-smaller grappled target.
  - Stop recomputing the grappler's current-turn `movementRemaining` on grapple link/release/escape. Grapple state changes should still refresh the target because the target's own speed changes to/from 0, but releasing a grapple must not "refund" movement to the grappler.
  - Keep any necessary projected-speed refresh for the grappled target only.
- TS / XState parity:
  - Mirror the same semantic change in `battle-machine-helpers.ts` and `battle-machine-actions-movement.ts`.
  - Update or replace tests that currently assert movement is restored to the grappler on `BATTLE_RELEASE_GRAPPLE`.
- Assumptions/docs:
  - Rewrite A37 from "modeled as speed halving" to the new policy: 5.2.1 drag cost is modeled as a movement-cost multiplier in battle semantics.
  - Explicitly record that the previous halving model was removed because it diverged when grapple state changed mid-turn.
  - If helper-level `creature.qnt` still carries any reduced abstraction after the patch, the assumption must describe the exact surviving boundary and why it does not affect battle semantics.

Recommended patch shape:

1. In `creature.qnt`, change `pComputeEffectiveSpeed(...)` so `isGrappling` no longer halves `afterExhaustion`.
2. In `creature.qnt`, change `pMovementCost(...)` signature from:
   - `pMovementCost(isDifficultTerrain, isCrawling, isClimbingOrSwimming, hasRelevantSpeed)`
     to:
   - `pMovementCost(isDifficultTerrain, isCrawling, isClimbingOrSwimming, hasRelevantSpeed, isDraggingGrappledCreature)`
     and add `dragExtra`.
3. In `battle.qnt` `bMove`, compute `isDraggingGrappledCreature = ac.grapplingTarget != "" and not(ac.grappledTargetTwoSizesSmaller)` and spend movement with that multiplier.
4. In `battle.qnt`, narrow `refreshProjectedSpeed` usage on grapple link/release/escape so the grappler's current-turn movement budget is not rebuilt from `newSpeed - spentMovement`.
5. Mirror the same change in TS battle helpers and tests before touching MCP-facing behavior.

Acceptance criteria:

- A grappler's `effectiveSpeed` is not reduced solely by holding a same-size grappled creature in the 5.2.1 path.
- Moving while dragging a same-size grappled creature costs 2 feet per foot moved.
- Releasing a grapple mid-turn does not restore movement budget to the grappler.
- The grappled target still has speed 0 until the grapple ends.
- Quint and TS/XState battle behavior agree after the change.
- `ASSUMPTIONS.md` no longer claims the removed speed-halving model is equivalent for all movement cases.
- Any QA seed or scenario that encoded the accepted-answer leapfrog interpretation is either updated, reclassified as disputed, or explicitly skipped.

Verification:

- RAW check: read the Grappled / Movable text in `.references/srd-5.2.1/Rules-Glossary.md`, plus `ARCHITECTURE.md`, `REVISION_RESEARCH.md`, and `ASSUMPTIONS.md` A37 before editing.
- `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.
- Focused Quint tests covering:
  - same-size drag movement cost;
  - release mid-turn does not restore grappler movement;
  - grappled target speed 0 / release restores target speed normally.
- Focused TS/core tests mirroring the same scenarios.
- `npx quint test` for the touched movement/grapple tests and relevant invariants.
- Tier 1 battle MBT if `battle.qnt` or its mirrored TS battle semantics change.

Implementation recommendation:

- Do this now, before the remaining MCP queue, unless a fresh RAW reread unexpectedly shows the local SRD source says something materially different from `REVISION_RESEARCH.md`.
- If the project wants to preserve the old accepted-answer behavior for historical 2014 experiments, keep it only behind an explicit legacy path or archived test fixture. Do not leave it in the main 5.2.1 combat semantics while claiming SRD parity.

Verification completed:

- RAW check: reread `.references/srd-5.2.1/Rules-Glossary.md` Grappled and Speed plus `ARCHITECTURE.md`, `REVISION_RESEARCH.md`, `UBIQUITOUS_LANGUAGE.md`, and `ASSUMPTIONS.md` A37 before editing. Final semantics match the local SRD text: grappler Speed is unchanged, target Speed remains 0, and dragging adds 1 extra foot of movement cost.
- `/simplify` round 1: removed the grappler-side current-turn speed refresh from battle/spec helper paths so release/escape only refresh the target whose Speed actually changes.
- `/simplify` round 2: rechecked helper signatures and kept the creature/machine `isGrappling` inputs as compatibility-only fields while removing their speed effect, avoiding broader non-task churn.
- Focused Quint tests: updated movement helper tests to cover the new drag-cost input and the no-halving speed behavior.
- Focused TS/core tests: updated battle regression cases for drag cost and added a mid-turn release-no-refund regression.
- `pnpm exec quint test --match "test_speed_grappling_full|test_movement_cost_(normal|difficult_terrain|crawling|climbing_no_speed|climbing_with_speed|crawl_difficult|climb_no_speed_difficult|climb_with_speed_difficult|dragging_grappled_creature)" dndTest.qnt`
- `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts -t "dragging a grappled target|release the target at any time|releasing a grapple mid-turn does not refund spent movement"`
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts -t "grappling does not reduce the grappler's speed|movementCostMultiplier helper|START_TURN with isGrappling keeps full speed"`
- Tier 1 battle MBT required because `battle.qnt` and its TS mirror changed. Run only after checking for existing `vitest` and `quint_evaluator` processes.

Plan Impact:

- Status: applied
- Affected tasks:
  - `K`: revise to `done`.
  - No downstream task status changed; this fixes semantic parity but does not alter any existing task dependency edges in the active queue.
- Plan edits: marked Task `K` done in the Ralph task index, DAG row, and Task 0 section; added closeout verification notes.

### Task 1 - MCP0-A - Dead-Creature Condition Mutation Bug

Status: done.

Depends on: none.

Blocks: Task MCP0-B, table-event confidence, MCP fighter-vs-goblin workflow.

Next action: Closed 2026-04-10. Use the A16 dead-creature condition policy as context for MCP0-B and MCP0-E follow-up work.

Problem:

- `record_table_event` accepts `REMOVE_CONDITION` on dead creatures.
- Current behavior can produce `dead: true, unconscious: false`, contradicting the modeled 0 HP unconscious/stable behavior.
- `record_table_event` also accepts `APPLY_CONDITION` on dead creatures.
- Root handlers are unguarded in `packages/core/src/machine-states.ts`.
- XState applies and removes conditions in `packages/core/src/machine.ts` without a dead guard.
- Quint `pApplyCondition` and `pRemoveCondition` in `creature.qnt` also have no dead guard.

Inputs:

- `.references/srd-5.2.1/Playing-the-Game.md` "Dropping to 0 Hit Points", "Falling Unconscious", and "Stabilizing a Character".
- `.references/srd-5.2.1/Rules-Glossary.md` "Dead", "Stable", and "Unconscious".
- `ASSUMPTIONS.md` A16 and A33.
- `UBIQUITOUS_LANGUAGE.md` death, stable, unconscious, condition terminology.
- `creature.qnt`.
- `packages/core/src/machine.ts`.
- `packages/core/src/machine-states.ts`.
- `packages/mcp/src/server-table-events.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add a focused test that reproduces `REMOVE_CONDITION` on a dead/unconscious creature through MCP.
- Add a focused test for `APPLY_CONDITION` on a dead creature and document the chosen behavior.
- Update `creature.qnt` first, then mirror the chosen behavior in XState and MCP. Preferred default unless RAW research contradicts it:
  - condition removal on a dead creature is a no-op or explicitly rejected for table-event entry;
  - new post-death condition application is rejected/no-op unless an owned revival/effect source authorizes it;
  - existing conditions can persist through death and revival per SRD Dead.
- Update MCP table-event behavior to return a structured not-accepted result if the core event is rejected.
- Update `MCP_EVENT_SURFACE_AUDIT.md` if public table-event semantics change.

Acceptance criteria:

- `REMOVE_CONDITION` cannot clear Unconscious from a dead creature through MCP.
- `APPLY_CONDITION` on a dead creature has an explicit modeled behavior and test coverage.
- Quint and XState agree.
- The implementation notes distinguish "existing conditions persist through death" from "new conditions can be applied after death."
- No MCP-only dead-condition state or special registry is introduced.

Verification:

- RAW check: read the SRD passages listed above and `UBIQUITOUS_LANGUAGE.md` before editing.
- `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.
- Focused core tests for the pure/machine behavior.
- Focused MCP tests for `record_table_event`.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if `creature.qnt` or the creature MBT bridge changes.

Verification completed:

- RAW check completed against `.references/srd-5.2.1/Playing-the-Game.md` ("Dropping to 0 Hit Points", "Falling Unconscious", "Stabilizing a Character"), `.references/srd-5.2.1/Rules-Glossary.md` ("Dead", "Stable", "Unconscious [Condition]"), `ASSUMPTIONS.md` A16/A33, and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: kept both the root guard and the action-level dead no-op. The root guard is needed for structured MCP rejection; the action-level no-op remains as defensive parity if condition actions are invoked outside the guarded root path. No simplification change needed.
- `/simplify` round 2: re-checked for duplicate state or MCP-only dead-condition handling. None found; no further changes needed.
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts -t "dead state rejects APPLY_CONDITION|dead state rejects REMOVE_CONDITION"`: passed.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "record_table_event rejects condition application on dead creatures|record_table_event rejects condition removal on dead creatures"`: passed.
- `npx quint test --match "test_dead_condition_(apply|remove)_noop" dndTest.qnt`: passed.
- `npx quint test --match "inv_" dndTest.qnt`: passed (47 passing).
- Tier 1b creature MBT: `START=$(date +%s); cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/creature.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` completed with the MBT replay passing for seed `0x07709fff`, but the run still failed on the pre-existing schema-sync assertion `New Quint CreatureState fields not in schema: maxHpReduction`. No new CreatureState fields were introduced by MCP0-A.
- `pnpm quality`: failed on pre-existing `prettier --check` drift in `packages/core/src` (`battle-machine-actions-attack.ts`, `context-encoding.ts`, `creature.mbt.test.ts`, `features/spell-available-actions.ts`, `machine-event-extractors.ts`, `machine-helpers.ts`, `machine-monk.ts`, `machine-queries.ts`, `machine-startturn.ts`, `machine.ts`, `types.ts`) before reaching typecheck.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-A`: revise to `done`.
  - `MCP0-B`: no-change; dependency context is now explicit in A16, and the task was already `ready-for-implementation-after-light-research`.
  - `MCP0-E`: no-change; the dead-condition policy context is now documented for the later UX decision.
- Plan edits: marked `MCP0-A` done in the Ralph task index and DAG row, updated the task closeout with verification results and downstream planning notes.

Extra research needed:

- Light. RAW Dead/Stable/Unconscious reread required before edits.

### Task 2 - MCP0-B - Dead-Creature Exhaustion Mutation Decision

Status: done.

Depends on: Task MCP0-A RAW/dead policy research.

Blocks: safer table-event behavior and later MCP session reliability.

Next action: Closed 2026-04-10. Use the A16 dead-creature exhaustion policy as context for MCP0-E and future table-event provenance work.

Problem:

- `ADD_EXHAUSTION` and `REDUCE_EXHAUSTION` are accepted on dead creatures.
- XState updates are in `packages/core/src/machine.ts`.
- Quint equivalents are `pAddExhaustion` and `pReduceExhaustion` in `creature.qnt`.
- SRD covers Exhaustion causing death and revival reducing existing Exhaustion by 1, but there is no known local assumption authorizing arbitrary Exhaustion changes while dead.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` "Dead" and "Exhaustion".
- `ASSUMPTIONS.md` A14, A16, A33.
- `UBIQUITOUS_LANGUAGE.md` Exhaustion and death terminology.
- `creature.qnt`.
- `packages/core/src/machine.ts`.
- `packages/mcp/src/server-table-events.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add focused tests for `ADD_EXHAUSTION` and `REDUCE_EXHAUSTION` on dead creatures through MCP.
- Decide in `creature.qnt` first, then mirror in XState/MCP, one of:
  - reject/no-op Exhaustion changes while dead except owned revival semantics;
  - allow a clearly documented subset tied to an explicit source;
  - document why current behavior is intentional in `ASSUMPTIONS.md`.
- Keep revival-specific "returns with 1 fewer Exhaustion level" separate from table-event `REDUCE_EXHAUSTION`.

Acceptance criteria:

- Dead-creature Exhaustion mutation has a RAW-backed or assumption-backed policy.
- MCP behavior matches core behavior.
- Quint and XState agree.
- No generic raw table event bypasses revival/source provenance.

Verification:

- RAW check: read SRD Dead and Exhaustion plus `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused core and MCP tests.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if `creature.qnt` or the bridge changes.

Verification completed:

- RAW check completed against `.references/srd-5.2.1/Rules-Glossary.md` ("Dead", "Exhaustion"), `ASSUMPTIONS.md` A14/A16/A33, and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: kept both the Quint dead no-op and the XState root guards. Quint remains the semantic authority, while the root guards are still needed so MCP table events return structured `TABLE_EVENT_NOT_ACCEPTED` results instead of silently no-oping after dispatch.
- `/simplify` round 2: checked for remaining dead-exhaustion mutation paths and found that `APPLY_STARVATION` / `APPLY_DEHYDRATION` bypass `pAddExhaustion` through `exhaustionWithConcBreak`, so the shared `canChangeExhaustion` guard stays on those root handlers to preserve Quint parity. No further simplification needed.
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts -t "dead state rejects exhaustion|dead state rejects starvation exhaustion|dead state rejects dehydration exhaustion"`: passed.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "record_table_event rejects ADD_EXHAUSTION on dead creatures|record_table_event rejects REDUCE_EXHAUSTION on dead creatures"`: passed.
- `npx quint test --match "test_dead_exhaustion_(add|reduce)_noop|inv_" dndTest.qnt`: passed.
- Tier 1b creature MBT: after confirming no live `vitest` processes and no stale `quint_evaluator` processes before launch, `START=$(date +%s); cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/creature.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` completed with MBT replay passing for seed `0xa6875358`, but the run still failed on the pre-existing schema-sync assertion `New Quint CreatureState fields not in schema: maxHpReduction`.
- `pnpm quality`: failed on pre-existing `prettier --check` drift in `packages/core/src` (`battle-machine-actions-attack.ts`, `context-encoding.ts`, `creature.mbt.test.ts`, `features/spell-available-actions.ts`, `machine-event-extractors.ts`, `machine-helpers.ts`, `machine-monk.ts`, `machine-queries.ts`, `machine-startturn.ts`, `machine.ts`, `types.ts`) before reaching circular-dependency and typecheck steps.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-B`: revise to `done`.
  - `MCP0-E`: no-change; the dead/exhaustion policy is now explicit for the later UX decision.
  - `J`: no-change; generic raw table-event provenance work still remains a separate research task.
- Plan edits: marked `MCP0-B` done in the Ralph task index and DAG row, and added the task closeout with verification and policy notes.

Extra research needed:

- Light. Depends on the dead-creature policy in Task MCP0-A.

### Task 3 - MCP0-C - Short Unknown Action Error

Status: done.

Depends on: none.

Blocks: MCP UX and downstream agents.

Next action: Closed 2026-04-10. Use the compact unknown-action error path as the MCP baseline for future action-surface work; no downstream plan updates were required.

Problem:

- Invalid `execute_action` input such as `{ type: "TOTALLY_FAKE_ACTION" }` returns a very large Effect schema decode string.
- Cause: `packages/mcp/src/server.ts` decodes the full `ResolvedActionTokenSchema` union and returns `String(decoded.left)`.

Inputs:

- `packages/mcp/src/server.ts`.
- `packages/core/src/available-actions.ts` action scope/type constants and resolved action schemas.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Add a small pre-decode discriminator check for `execute_action` and `preview_action`.
- Return a short structured error for unknown or missing action type, for example:
  - `error: "Unknown execute_action type: TOTALLY_FAKE_ACTION"`;
  - `details: { code: "UNKNOWN_ACTION_TYPE", type: "TOTALLY_FAKE_ACTION" }`.
- Keep full schema validation for known action types with malformed payloads.

Acceptance criteria:

- Unknown action type returns a compact error, not the full union decode output.
- Known action type with invalid fields still returns useful validation failure.
- Scope mismatch behavior remains unchanged.
- No action registry is duplicated in MCP if the type list can be derived/exported from core.

Verification:

- RAW check: not applicable; adapter UX only.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused MCP tests for unknown action type, missing type, malformed known type, and scope mismatch.
- `pnpm --filter @dnd/mcp test`.

Verification completed:

- Confirmed the core-owned discriminator source is `ResolvedActionTokenSchema`; MCP now derives the pre-decode type set from the schema AST instead of maintaining a parallel registry.
- `/simplify` round 1: removed the need for any new exported action-type list by deriving the discriminator check from the existing core schema. No duplicate MCP/core registry remains.
- `/simplify` round 2: re-checked the pre-decode path for behavior drift. Unknown and missing types stay compact, while known malformed payloads still fall through to full schema validation and scope mismatch remains unchanged.
- `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t "compact error|missing action type|malformed known action payloads|scope mismatch behavior"`: passed.
- `pnpm --filter @dnd/mcp lint`: passed.
- `pnpm --filter @dnd/mcp typecheck`: passed.
- `pnpm --filter @dnd/mcp test`: passed.
- `pnpm quality`: failed before reaching typecheck because `packages/core` has pre-existing `prettier --check` drift in `src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, and `src/types.ts`. No new `pnpm quality` failure was introduced by MCP0-C.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-C`: revise to `done`.
  - `MCP0-D`: no-change.
  - `B`: no-change.
- Plan edits: marked `MCP0-C` done in the Ralph task index, DAG row, task section, and refreshed the recommended task list to remove the completed item.

### Task 4 - MCP0-D - SHORT_REST Documentation Clarity

Status: done.

Depends on: none.

Blocks: MCP documentation accuracy.

Next action: Closed 2026-04-10. Keep `SHORT_REST` on `get_available_actions` / `execute_action`; do not add a mirrored `execute_control_command` route.

Problem:

- `SHORT_REST` is not missing. It intentionally stays on `get_available_actions` / `execute_action`, not `execute_control_command`.
- It is schema-supported in `packages/core/src/available-actions.ts` and tested in `packages/mcp/src/server.test.ts`.
- The fix is documentation/description clarity, not a new command.

Inputs:

- `ARCHITECTURE.md` MCP section.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- `plans/available-actions.md`.
- `packages/mcp/src/server.ts` tool descriptions.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.test.ts`.

Implementation output:

- Clarify public docs/tool descriptions that `SHORT_REST` remains an action token because it has user-selected hit-dice order and runtime rolls.
- Add a regression assertion if tool descriptions or docs are snapshot-tested.

Acceptance criteria:

- Docs do not imply `SHORT_REST` should be sent through `execute_control_command`.
- Existing `SHORT_REST` action-token path remains unchanged.
- No duplicate short-rest control route is added.

Verification:

- RAW check: Short Rest wording only if documentation cites SRD behavior.
- `/simplify` convergence: minimum two rounds after implementation or docs/tool-description edits.
- `pnpm --filter @dnd/mcp test` if tool description tests change.

Verification completed:

- Light research confirmed the misleading wording lived in `ARCHITECTURE.md`, `plans/available-actions.md`, `plans/MCP_EVENT_SURFACE_AUDIT.md`, and the MCP tool descriptions in `packages/mcp/src/server.ts`; the existing `SHORT_REST` action-token route and test coverage already lived in `packages/core/src/available-actions.ts` and `packages/mcp/src/server.test.ts`.
- RAW check: not applicable beyond avoiding new SRD claims. The final wording is routing/ownership documentation only and does not add or reinterpret rule text.
- `/simplify` round 1: kept the change set on the documentation/tool-description surface only. No schema, control-command, or action-routing code changed, so there was nothing to collapse into a new public route.
- `/simplify` round 2: re-checked for duplicated guidance between the audit, architecture note, and tool descriptions. The remaining repetition is intentional because each file serves a different reader surface; no further simplification needed.
- `pnpm --filter @dnd/mcp test -- --runInBand`: passed.
- `git diff --check`: passed.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-D`: revise to `done`.
  - `MCP0-E`: no-change; this task only clarified routing docs and did not change the pending UX decision.
- Plan edits: marked `MCP0-D` done in the Ralph task index, DAG row, task-selection guidance, and Task 4 closeout.

Extra research needed:

- Light. Confirm where the misleading docs/tool text is before editing.

### Task 5 - MCP0-E - EXIT_COMBAT After Death UX Decision

Status: done.

Depends on: Task MCP0-A policy context.

Blocks: optional UX cleanup.

Next action: Closed 2026-04-10. Keep `EXIT_COMBAT` available after death, document the A33 caller-owned teardown rationale, and use clearer outcome text in core/MCP surfaces.

Problem:

- `EXIT_COMBAT` remains available and succeeds after death.
- This is probably lower priority and may be intentional: the audit keeps it as an action-token control command, and `ASSUMPTIONS.md` says dead/unconscious creatures remain in initiative until caller removal.

Inputs:

- `ASSUMPTIONS.md` A33.
- `plans/MCP_EVENT_SURFACE_AUDIT.md` `EXIT_COMBAT` row.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.test.ts`.

Research output:

- Decision: keep `EXIT_COMBAT` available after death and clarify the outcome text so it describes caller-owned removal from combat/initiative tracking.

Acceptance criteria:

- The behavior is documented as intentional or changed with tests.
- If changed, no conflict is introduced with A33's caller-owned removal policy.
- If token availability or rule semantics change, the decision is made in the core/spec layer first, then mirrored through MCP. Do not special-case dead combat exit only in MCP.

Verification:

- RAW/assumption check: read A33 before changing behavior.
- `/simplify` convergence: minimum two rounds if implementation or docs/tool-description edits occur.
- Focused available-actions/MCP tests if token availability or text changes.

Verification completed:

- RAW/assumption check: reread `ASSUMPTIONS.md` A33 and kept the caller-owned roster teardown policy intact. This task does not add new SRD semantics; it clarifies the MCP/core UX around the existing assumption.
- `/simplify` round 1: rejected a dead-only MCP special case. The final change keeps ownership in the core action spec and uses one clearer `EXIT_COMBAT` summary for both living and dead creatures.
- `/simplify` round 2: re-checked for redundant state or duplicated routing. No new flags, control routes, or MCP-only logic were added; the remaining docs updates are intentional mirrors of the same A33 decision.
- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts`: passed.
- `pnpm --filter @dnd/mcp test -- --runInBand packages/mcp/src/server.test.ts`: passed.
- `git diff --check`: passed.
- `pnpm quality`: failed in a pre-existing repo state during `packages/core` lint because `prettier --check src` reported unrelated formatting drift in 11 existing files (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`). This task did not touch those files and did not run broad formatters.

Plan Impact:

- Status: applied
- Affected tasks:
  - `MCP0-E`: revise to `done`.
  - `MCP1-A`: no-change; the decision preserves caller-owned teardown and does not add a second MCP control surface.
  - `MCP1-C`: no-change; encounter teardown ownership remains aligned with the existing single-creature host route.
- Plan edits: marked `MCP0-E` done in the Ralph task index, DAG row, task-selection guidance, and Task 5 closeout.

Extra research needed:

- No. The decision is closed for this batch; only optional future UX copy cleanup remains.

### Task 6 - B - Battle Size Ownership For Grapple

Status: done.

Depends on: none.

Blocks: public `BATTLE_GRAPPLE` exposure and any grapple legality surface that requires owned combatant Size.

Next action: Closed 2026-04-10. Use the updated `plans/MCP_EVENT_SURFACE_AUDIT.md` row for the remaining `BATTLE_GRAPPLE` public-surface blocker (`targetId` plus runtime-owned `targetSaveFailed` contract).

Purpose:

- Move creature Size into battle-owned combatant state so `BATTLE_GRAPPLE` can stop accepting `attackerSize` and `targetSize` as public/raw event payload facts.

Context:

- Folded-in ownership note: battle Size ownership must be fixed before public
  `BATTLE_GRAPPLE` exposure.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Current problem: `BATTLE_GRAPPLE` needs size, but `BattleCreatureState` and `battle.qnt` `Combatant` do not store size.
- Current raw payload locations to inspect: `packages/core/src/battle-machine-events.ts` `BATTLE_GRAPPLE` and `packages/core/src/battle-machine-actions-turn.ts` grapple handling.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` Grapple and Size text.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-events.ts` if event payload shape changes.
- `packages/core/src/battle-machine-actions-turn.ts`.
- `packages/core/src/available-actions.ts`.
- Battle MBT projection files.

Implementation output:

- Add `creatureSize` to Quint `Combatant`.
- Add `creatureSize` to `BattleCreatureState`.
- Add optional `creatureSize` to `InitCreatureConfig`; default PCs to `"medium"` unless a better owned source is available.
- Add `creatureSize` to MCP `BATTLE_INIT` creature schema if battle init remains the public combatant config source.
- Update `BATTLE_GRAPPLE` handling to derive attacker and target size from battle state.
- Reassess whether public `BATTLE_GRAPPLE` token can be exposed after size is owned. If save/free-hand/target facts are still clean, expose; otherwise update blocker precisely.

Acceptance criteria:

- Public API no longer accepts caller-supplied `attackerSize`/`targetSize` for grapple.
- Battle machine and `battle.qnt` derive grapple size legality from combatant state.
- MBT bridge maps the new size field.
- No MCP-only size state is introduced.
- Existing release/escape grapple behavior remains unchanged.

Verification:

- RAW check: Grapple and Size entries in `.references/srd-5.2.1/Rules-Glossary.md` and terminology in `UBIQUITOUS_LANGUAGE.md` before implementation.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused battle scenario tests for size-blocked and size-allowed grapples.
- `pnpm --filter @dnd/core typecheck`.
- Tier 1 battle MBT after Quint and bridge changes.

Verification completed:

- RAW check: reread `.references/srd-5.2.1/Rules-Glossary.md` Grappled, Grappling, Unarmed Strike (grapple size limit), and Size; rechecked `UBIQUITOUS_LANGUAGE.md` entries for Grapple, Free Hand, and Size before editing. The final change only moves Size ownership into battle/spec state and keeps the existing SRD grapple legality.
- `/simplify` round 1: removed the raw `attackerSize`/`targetSize` payload from battle events/tests and rejected the bridge-side hardcoded grapple-size inputs.
- `/simplify` round 2: rechecked init/default ownership and public-surface wording; kept `BATTLE_GRAPPLE` unexposed because `targetSaveFailed` is still a runtime-owned fact, and updated the audit/plan text to describe that precise remaining blocker.
- Focused battle scenario tests: added a size-blocked grapple case and kept the size-allowed drag-speed exemption coverage.
- `pnpm --filter @dnd/core typecheck`: passed.
- `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts -t "grapple fails when the target is more than one size larger|dragging a grappled target halves the grappler's speed unless the target is two sizes smaller"`: passed.
- `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts -t 'release grapple|escape grapple'`: passed.
- `pnpm --filter @dnd/mcp test -- --runInBand packages/mcp/src/server.test.ts -t 'release grapple|escape grapple'`: passed.
- `node scripts/compile-battle-spec.cjs`: passed; rebuilt `.quint-cache/battle-compiled.json` for the updated battle spec.
- Tier 1 battle MBT: `cd packages/core && MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle-projection.mbt.test.ts` passed after recompiling the battle spec cache.
- `git diff --check`: passed.
- `pnpm quality`: failed in a pre-existing repo state during `packages/core` lint because `prettier --check src` reported unrelated formatting drift in 11 existing files (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`). This task-formatted its touched test files and did not run broad repo-wide formatting.

Plan Impact:

- Status: applied
- Affected tasks:
  - `B`: revise to `done`.
  - `D`: no-change; the remaining `BATTLE_GRAPPLE` blocker is now the same runtime/session-boundary problem family, but Task D scope itself is unchanged.
  - `MCP2-A`: no-change; attack-boundary research remains a separate blocker for public attacks.
- Plan edits: marked Task `B` done in the Ralph task index, DAG row, task-selection guidance, current baseline note, and Task 6 closeout; updated the next-step text to point at the audit's new post-size blocker wording.

Extra research needed:

- Light. RAW Grapple/Size reread required, but the ownership design is already documented.

### Task 7 - A - Condition Consequence Table Completion Research

Status: done.

Depends on: none.

Blocks: none.

Next action: Closed 2026-04-10. Task 7 research rejected the proposed redundant/single-condition columns, deferred initiative modifiers to future initiative work, and landed the narrow SRD 5.2.1 speech fix for Incapacitated/Stunned parity.

Purpose:

- Convert the under-documented competitor-derived condition-table gap into an implementation-ready scope.
- Decide whether to finish the full Quint+TS condition consequence table or only document why the current narrower TS table is sufficient.

Context:

- Competitor inspiration: `.references/inspirations/05-condition-effects-table.md`.
- Current TS table: `CANONICAL_CONDITION_CONSEQUENCES` in `packages/core/src/types.ts`.
- Current TS query usage: `packages/core/src/machine-queries.ts`.
- Current authoritative predicates: `creature.qnt` (`pOwnAttackModifiers`, `pDefenseModifiers`, `pCheckModifiers`, `pSaveModifiers`, `pCanSpeak`, `pApplyCondition`, `pComputeEffectiveSpeed`, `pTakeDamageAsCreature`).
- `plans/DAG.md` marks `canonical-condition-effects` complete, but current implementation is only partial relative to the inspiration design.

Known findings:

- Current TS table columns:
  - `ownAttackDisadvantage`
  - `defenseAdvantage`
  - `defenseAutoCritWithin5ft`
  - `checkDisadvantage`
  - `saveDexDisadvantage`
  - `saveStrDexAutoFail`
  - `speedZero`
  - `blocksActions`
  - `blocksSpeech`
- Inspiration-proposed extra columns:
  - `breaksConc`
  - `initDisadv`
  - `allDamageResist`
  - `blocksPoisonApp`
  - `impliesProne`
  - `impliesIncap`
- There is no authoritative Quint `CONDITION_EFFECTS` table.
- The inspiration note flags `pCanSpeak`/`canSpeak` and initiative disadvantage as possible gaps; those must be rechecked against SRD 5.2.1 before changing code.

Inputs:

- `.references/srd-5.2.1/Rules-Glossary.md` condition entries.
- `UBIQUITOUS_LANGUAGE.md` condition/effect terminology.
- `.references/inspirations/05-condition-effects-table.md`.
- `creature.qnt`, `packages/core/src/types.ts`, `packages/core/src/machine-queries.ts`, `packages/core/src/machine-helpers.ts`, `packages/core/src/battle-machine-creature.ts`.

Research output:

- Add a "Condition Table Delta" section to this file with:
  - exact SRD-backed columns to adopt or reject;
  - list of current behavior gaps, if any;
  - list of contextual effects that must remain outside the table;
  - implementation order and verification plan.

Implementation output, only after research:

- If adopted, add a Quint `ConditionEffects` table and align TS table naming/columns.
- Rewrite only unconditional condition consequences to table lookups.
- Keep contextual effects explicit: prone distance, frightened LOS, invisible attacker/defender role, deafened hearing checks, blinded sight checks, charmed source-specific effects, grappled non-grappler attack effects, and movement/path effects.

Acceptance criteria for research:

- Every proposed table column has a RAW citation or is explicitly rejected.
- The plan states whether `breaksConc`, `initDisadv`, `allDamageResist`, `blocksPoisonApp`, `impliesProne`, and `impliesIncap` should be implemented now, deferred, or rejected.
- The plan reconciles the `plans/DAG.md` "complete" status with current partial implementation.

Acceptance criteria for implementation:

- Quint and TS represent the same intended unconditional consequence set.
- Existing contextual behavior is not collapsed into incorrect booleans.
- Any behavior change is explicitly tied to RAW and noted in the plan.
- No new redundant condition state is introduced.

Verification:

- RAW check: condition entries in `.references/srd-5.2.1/Rules-Glossary.md` and terminology in `UBIQUITOUS_LANGUAGE.md` before any implementation.
- `/simplify` convergence: minimum two rounds after implementation if the research leads to code changes.
- `npx quint test --match "inv_" dndTest.qnt`.
- Tier 1b creature MBT if only creature-level parity changes.
- Tier 1 battle MBT if battle-facing behavior changes.

Extra research needed:

- No. RAW reread completed.

Implementation closeout:

- Research outcome: keep the existing 9-column support table, fix the `incapacitated.blocksSpeech` gap, and do not add redundant/single-condition columns.
- Implemented scope: `pCanSpeak` now keys off incapacitation, TS `blocksSpeech` now includes Incapacitated, tests expect stunned creatures to be speechless, and `UBIQUITOUS_LANGUAGE.md` now reflects SRD 5.2.1 wording.

Verification results:

- RAW check completed against `.references/srd-5.2.1/Rules-Glossary.md` for Incapacitated, Stunned, Invisible, Petrified, and Concentration, plus `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: removed candidate carryover that was only formatting/comment churn and kept the task to the SRD-backed speech fix plus terminology/test updates.
- `/simplify` round 2: no further important simplifications found; no redundant state or extra table columns remain.
- `pnpm quality` failed in `prettier --check` because unrelated existing files already have formatting drift (`src/battle-machine-actions-attack.ts`, `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-helpers.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`, `src/types.ts`).
- `pnpm --dir packages/core exec vitest run src/machine.test.ts -t "canAct and canSpeak"` passed.
- `pnpm exec quint test --match "test_can_speak_" dndTest.qnt` passed.
- `git diff --check` passed.

Plan Impact:

- Status: applied
- Affected tasks:
  - `A`: revised from `ready-for-research` to `done`; no new follow-up task added.
- Plan edits: synchronized Task 7 status/queue guidance and recorded the final closeout.

### Task 8 - C - ResourceCost Typed Refactor

Status: done.

Depends on: none.

Blocks: cleaner MCP/UI cost display and future resource consumption terminology.

Next action: closed 2026-04-10 after confirming all `ResourceCost` consumers remain immediate-cost display/selection surfaces only.

Purpose:

- Promote shallow action costs into a typed, self-describing support-layer representation without adding a generic consumption engine.

Context:

- Competitor inspiration: `.references/inspirations/10-first-class-consumption.md`.
- Current type: `ResourceCost` in `packages/core/src/available-actions.ts`.
- Current shape:
  - `action?: true`
  - `bonusAction?: true`
  - `reaction?: true`
  - `movement?: number`
  - `charge?: ResourceCostCharge`
  - `shape?: "spend" | "grant" | "reserve" | "refund"`
- Missing domain language: `UBIQUITOUS_LANGUAGE.md` and `battle/DOMAIN.md` do not currently define Pool/Quota/Lock/Timer or Spend/Grant/Reserve/Refund.

Inputs:

- `.references/inspirations/10-first-class-consumption.md`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server.ts`.
- Any app/MCP consumers of token `cost`.
- `UBIQUITOUS_LANGUAGE.md`, `battle/DOMAIN.md`.

Implementation output:

- Add resource consumption vocabulary to docs:
  - Pool, Quota, Lock, Timer.
  - Spend, Grant, Reserve, Refund.
- Confirm `ResourceCost` means immediate up-front selectable/displayable costs only.
- Replace shallow `ResourceCost` with typed cost items, likely `ReadonlyArray<QuotaCost | PoolCost>`.
- Update token builders and cost grouping/rendering consumers.
- Do not add a generic Quint `Cost` record or generic `consume()` function.

Acceptance criteria:

- Cost representation is typed enough for MCP/UI consumers to distinguish quotas from pools.
- Ready spell and Counterspell refund semantics are documented as resource-shape examples without moving their actual semantics into a generic engine.
- Existing token execution behavior is unchanged.
- All cost consumers compile without stringly matching old shallow fields.

Verification:

- RAW/domain-language check: confirm the representation is support-layer terminology and does not change SRD semantics.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/core typecheck`.
- Focused available-actions tests if token snapshots/shape tests exist.
- MCP tests if JSON schema or grouping output changes.

Extra research needed:

- Light. Confirm consumer blast radius before code changes.

Implementation closeout:

- Confirmed blast radius stayed on support-layer display/preview consumers in `packages/core/src/available-actions.ts`, `packages/mcp/src/server.ts`, and the directly affected tests.
- Replaced the shallow `ResourceCost` object with typed `ReadonlyArray<ResourceCostItem>` entries split into quota costs and pool costs, plus `FREE_COST` and small builders for token construction.
- Updated battle and creature preview paths plus MCP `groupByCost` to consume the new typed representation without adding any generic Quint cost engine or changing token execution semantics.
- Added shared resource-consumption vocabulary to `UBIQUITOUS_LANGUAGE.md` and `battle/DOMAIN.md`, including ready-spell reserve semantics and Counterspell refund framing as documentation examples only.

Verification results:

- RAW/domain-language check completed against `.references/srd-5.2.1/Rules-Glossary.md` (`Ready [Action]`) and `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` (spell-slot expenditure), plus `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: kept the representation limited to pool/quota items and rejected adding lock/timer entries or a generic consumption engine, because those remain outcome semantics rather than selectable token costs.
- `/simplify` round 2: rechecked for redundant state and helper duplication across core and MCP consumers. The remaining local test helpers only adapt expectations to the shared typed shape; no additional runtime registry or parallel state remains.
- `pnpm quality`.

Plan Impact:

- Status: applied
- Affected tasks:
  - `C`: revised from `ready-for-implementation-after-light-research` to `done`; no downstream unblock/reorder was required.
- Plan edits: synchronized Task 8 status in the index and DAG, recorded the final closeout, and updated task-selection guidance to point at the remaining open work.

### Task 9 - D - Battle Attack Runtime/Session Boundary

Status: done.

Depends on: none.

Blocks: Task F, Task G, public `BATTLE_ATTACK`, `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`, and attack riders.

Next action: Closed 2026-04-10. Task MCP2-A should consume this contract directly; off-hand, legendary, unarmed, and rider paths stay blocked.

Purpose:

- Define the public resolved-token/runtime input contract for a first-slice main-hand `BATTLE_ATTACK` without letting MCP fabricate table/session facts.

Context:

- Main audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Audit row: `plans/MCP_EVENT_SURFACE_AUDIT.md` `BATTLE_ATTACK`.
- Architectural rule: `ARCHITECTURE.md` says MCP must not remember, fabricate, or re-derive combat facts.

Known split:

- Battle-owned/derivable:
  - active attacker;
  - action/extra-attack spend;
  - `attackActionUsed`;
  - `lightAttackUsedThisTurn`;
  - help consumption;
  - crit range;
  - main-hand weapon profile;
  - melee/ranged flag;
  - damage type;
  - default damage qualifiers;
  - weapon properties;
  - Sneak Attack state.
- User holes:
  - `targetId`;
  - `knockOut`.
- Runtime dice/result inputs:
  - `attackRoll`;
  - damage dice/final damage;
  - possibly `crit`;
  - possibly `saDmg`.
- Table/session facts still missing from the public contract:
  - target AC;
  - `attackerWithin5ft`;
  - optional `attackerWithin60ft`;
  - `hostileWithin5ft`;
  - `targetCanSeeAttacker`;
  - `attackerCanSeeTarget`;
  - `frightSourceInLOS`;
  - `hasAllyAdjacentToTarget`;
  - `hitReactionCandidates`.

Inputs:

- `.references/srd-5.2.1/Playing-the-Game.md` Attack rules.
- `.references/srd-5.2.1/Rules-Glossary.md` relevant attack/visibility/cover/condition entries.
- `UBIQUITOUS_LANGUAGE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-actions-attack.ts`.
- `packages/core/src/available-actions.ts`.
- `packages/mcp/src/server-runtime.ts`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- A contract proposal in this file or a task-specific plan:
  - exact resolved token shape;
  - exact runtime input shape;
  - explicit table/session facts allowed;
  - facts forbidden because battle already owns them;
  - stop conditions.

Implementation output, only after research:

- Add only one active-creature main-hand weapon `BATTLE_ATTACK` token.
- Do not include unarmed, off-hand, legendary, spell attack, custom weapon payloads, or attack riders.
- Do not accept caller-supplied `weaponProperties`, `isFinesse`, `dt`, or `damageQualifiers` for the first slice.

Acceptance criteria for research:

- The contract can execute without MCP inventing AC, geometry, visibility, adjacency, or hit-reaction candidates.
- The plan says whether `crit` is runtime-supplied or derived from `attackRoll` and `critRange`.
- The plan says whether damage aggregation is runtime-owned or battle-owned.

Acceptance criteria for implementation:

- Token appears only when active creature has an owned main-hand weapon and attack budget.
- Event construction derives weapon payload facts from battle state.
- Missing table/session facts are explicit inputs, not sampled or hidden in MCP.
- Off-hand, legendary, unarmed, and rider paths remain blocked.

Verification:

- RAW check: attack and relevant condition/visibility entries in `.references/srd-5.2.1/` and terminology in `UBIQUITOUS_LANGUAGE.md` before implementation.
- `/simplify` convergence: minimum two rounds after implementation if the research leads to code changes.
- Focused available-actions tests.
- MCP tests if schema/runtime handling changes.
- Tier 1 battle MBT if battle/spec/bridge semantics change.

Extra research needed:

- No. This task's research output is recorded below.

Research closeout:

- RAW checked before writing the contract against `.references/srd-5.2.1/Playing-the-Game.md` ("Making an Attack", "Unseen Attackers and Targets", "Cover", ranged attack within 5 feet, long range disadvantage, and "Critical Hits"), `.references/srd-5.2.1/Rules-Glossary.md` (`Attack [Action]`, `Attack Roll`, `Armor Class`, `Help [Action]`, `Cover`, `Critical Hit`, `Invisible`, `Blinded`, `Frightened`, `Prone`, and `Unconscious`), and `UBIQUITOUS_LANGUAGE.md` (`Attack Roll`, `Critical Hit`, `Armor Class (AC)`, `Cover`, and condition / advantage terminology).
- The first public slice remains one active-creature main-hand weapon attack token only. The public resolved token is `{ scope: "battle"; actorId: string; type: "BATTLE_ATTACK"; targetId: string; knockOut: boolean }`.
- The runtime lane is `{ runtime: "battleAttack"; values: { attackRoll: number; targetAc: number; weaponDamage: number; sneakAttackDamage?: number; attackerWithin5ft: boolean; attackerWithin60ft?: boolean; hostileWithin5ft: boolean; targetCanSeeAttacker: boolean; attackerCanSeeTarget: boolean; frightSourceInLOS: boolean; hasAllyAdjacentToTarget: boolean; hitReactionCandidates: ReadonlyArray<string> } }`.
- `attackerWithin60ft` may be omitted only when `attackerWithin5ft` is `true`; otherwise it remains an explicit session fact. `weaponDamage` is only the rolled main-hand weapon damage, and `sneakAttackDamage` defaults to `0` and is ignored unless battle determines Sneak Attack is legal.
- Battle-owned facts that remain forbidden public inputs are active attacker identity, action / extra-attack spend, `attackActionUsed`, `lightAttackUsedThisTurn`, help consumption, crit range, main-hand weapon existence/profile, melee or ranged shape, damage type, default damage qualifiers, weapon properties, finesse status, on-hit payloads, battle-owned additive damage modifiers, and Sneak Attack legality / once-per-turn state.
- `crit` is battle-derived, not runtime-supplied. Natural crit classification comes from `attackRoll` plus the battle-owned `critRange`, while effective crit handling can still incorporate battle-owned auto-crit rules.
- Damage aggregation is battle-owned. Runtime supplies only rolled `weaponDamage` and optional `sneakAttackDamage`; battle applies additive modifiers, validates Sneak Attack legality, owns damage type/qualifiers, and enforces melee-only knockout legality.
- Stop conditions for downstream implementation: Task MCP2-A may add only the active-creature main-hand `BATTLE_ATTACK` token using this exact contract. `BATTLE_OFF_HAND_ATTACK`, `BATTLE_LEGENDARY_ATTACK`, unarmed strike attack exposure, spell attacks, attack riders, and custom weapon payloads from MCP remain out of scope.

Verification results:

- RAW/domain-language check completed against the SRD and terminology sources listed above.
- `/simplify` round 1: kept the public token limited to `targetId` and `knockOut`, and rejected moving battle-owned weapon or crit payload into MCP-visible input.
- `/simplify` round 2: rechecked the runtime lane for redundant or fabricated state and kept target AC, geometry, visibility, adjacency, and hit-reaction candidates as explicit session inputs only.

Plan Impact:

- Status: applied
- Affected tasks:
  - `D`: revised from `ready-for-research` to `done`
  - `F`: unblocked to `ready-for-research`
  - `G`: unblocked to `ready-for-research`
  - `MCP2-A`: left `blocked`, but revised to consume the Task D contract instead of redesigning it
  - `I`: no change
- Plan edits: synchronized Task 9 status in the index and DAG, removed `MCP1-C` from Task D's block list, unblocked Tasks F and G, and updated Task MCP2-A to consume the resolved-token and `battleAttack` runtime contract.

### Task 10 - MCP1-A - Session Host Architecture

Status: done.

Depends on: MCP0 tasks done or intentionally deferred.

Blocks: Task MCP1-C, Task MCP2-A.

Purpose:

- Define the smallest in-process MCP session/router boundary that can switch between creature and battle hosts without copying combat state into MCP.
- Keep this task adapter-only: the router may own host selection, encounter-draft inputs, and durable creature/battle references or IDs, but HP, conditions, action economy, initiative, and other mutable combat facts stay in `creatureMachine` / `battleMachine`.
- Make the stdio entrypoint and test harness use the same routing shape so battle setup does not require a one-off demo tool or a parallel host registry.

Inputs:

- `packages/mcp/src/index.ts`.
- `packages/mcp/src/server.ts`.
- `packages/mcp/src/server-shared.ts`.
- `packages/mcp/src/server.test.ts`.
- `ARCHITECTURE.md` MCP section.
- Current host construction and tool dispatch paths in `packages/mcp`.

Research output:

- Document the current host wiring: stdio starts with `createDemoHost()` in `index.ts`, tests inject `SupportedActionHost` directly, and `server.ts` already distinguishes creature vs battle hosts at dispatch time.
- Define the minimal `SessionHost` shape needed for routing only: active host selection, optional pre-battle encounter draft data, and durable character-list references or IDs only.
- Decide whether session creation/selection belongs in a new tool, a narrow control command extension, or a pure in-process router object. Prefer the generic route that can also support later battle selection without a one-off `start_fighter_vs_goblin_demo`.
- Call out any facts that must remain owned elsewhere so the plan never introduces duplicate mutable state.

Implementation output:

- Add a session/router layer in `packages/mcp`.
- Route existing tools through the selected active host instead of letting `index.ts` hardwire one demo host for every workflow.
- Add session-level tool(s) only if the router cannot express the needed battle-selection flow cleanly.
- Keep battle creation/selection working through the same public path used by stdio and tests.

Acceptance criteria:

- Stdio no longer assumes one demo creature host for all workflows.
- Existing creature-host tests still pass unchanged or with only routing-focused assertions updated.
- Battle-host tests can use the same public routing path that stdio uses.
- MCP does not store mutable HP, conditions, action economy, initiative, or goblin combat facts outside `battleMachine`.
- The router does not add duplicate combat state, a second character list, or a separate battle-state mirror.

Verification:

- RAW check: not applicable; adapter/session architecture only.
- Read `ARCHITECTURE.md` and the current `packages/mcp` wiring before implementation to confirm the adapter boundary and shared-host assumptions.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- `pnpm --filter @dnd/mcp typecheck`.

Completed work:

- Confirmed the current wiring before implementation: stdio started from `createDemoHost()` in `packages/mcp/src/index.ts`, tests injected `SupportedActionHost` directly, and `packages/mcp/src/server.ts` already dispatched on creature vs battle host scope.
- Added a pure in-process `SessionRouter` in `packages/mcp/src/session-router.ts`. It owns only active host selection plus optional encounter-draft and durable character-list-reference metadata; it does not mirror HP, conditions, initiative, or any other mutable combat facts.
- Moved the stdio entrypoint onto that router and made `execute_control_command { scope: "battle", type: "BATTLE_INIT" }` the shared public path that promotes from the default creature host onto a fresh battle host for both stdio and tests.
- Kept all mutable combat state inside `creatureMachine` / `battleMachine`. The router only swaps which host receives tools; it does not copy or reproject live battle state.

Verification:

- RAW check: not applicable; adapter/session architecture only.
- Read `ARCHITECTURE.md` and the current `packages/mcp` wiring before implementation to confirm the adapter boundary and shared-host assumptions.
- `/simplify` convergence: round 1 removed the parallel `setHost()` path and ensured replaced hosts are stopped on successful promotion; round 2 found no further important simplifications.
- `pnpm --filter @dnd/mcp test`.
- `pnpm --filter @dnd/mcp typecheck`.
- `pnpm quality`.

Plan impact:

- `MCP1-C`: no-change on status; it still depends on `MCP1-B`, but it must now reuse the shared routed `execute_control_command` / `BATTLE_INIT` path instead of adding a separate selector or demo bootstrap lane.
- `MCP2-A`: no-change on status; it should consume the active battle host created by the routed session boundary landed here rather than adding a parallel host-selection surface.

### Task 11 - MCP1-B - Core Statblock Facility + Initial Goblin Minion Entry

Status: done.

Depends on: MCP0 tasks done or intentionally deferred.

Blocks: Task MCP1-C, Task MCP2-B.

Next action: Closed 2026-04-10. Reuse the core monster catalog and `statBlockId`-based `BATTLE_INIT` path in Task MCP1-C rather than adding any MCP-owned monster registry.

Purpose:

- Consolidate the existing core monster stat-block path into one reusable facility that core and battle/session adapters can consume, without introducing a parallel MCP-owned monster registry or duplicating RAW fields in multiple layers.
- Add Goblin Minion as the first SRD-backed entry in that facility.
- Treat the current `creature.qnt` proof-of-concept monster definitions and `packages/core/src/monster-types.ts` / `packages/core/src/mbt-shared.ts` projection helpers as the starting ownership surface, not as throwaway scaffolding.

Inputs:

- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Minion.
- `.references/srd-5.2.1/Monsters/Overview.md` stat-block rules.
- `UBIQUITOUS_LANGUAGE.md`.
- `packages/core/src/monster-types.ts`.
- `packages/core/src/mbt-shared.ts` stat-block parsing/projection helpers, if the shared facility reuses them.
- `creature.qnt` stat-block definitions if Quint parity must be extended.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-actions-turn.ts`.
- Nearby provenance or maintenance docs that explain where future statblocks should be sourced from.

Implementation output:

- Reuse the existing `StatBlock` shape and helper path instead of introducing a second monster schema.
- Add an explicit provenance note for future entries: `.references/srd-5.2.1/` is the source of truth for this batch; other corpora require explicit owner approval; 5etools is research-only unless later promoted by a plan change.
- Add a core-owned Goblin Minion entry in the shared facility.
- Add the smallest projection from that entry into the battle-init/creature-init path chosen by Task MCP1-A.
- If Quint parity is extended, keep the Goblin Minion definition aligned across Quint and TS rather than duplicating the numbers in MCP.
- Represent only facts currently supported by core types:
  - name: Goblin Minion;
  - creature type: Fey with Goblinoid tag;
  - size: Small;
  - AC 12;
  - initiative modifier +2, or initiative score 12 if a helper uses the stat-block fallback;
  - HP 7 (2d6);
  - walk speed 30;
  - ability scores Str 8, Dex 15, Con 10, Int 10, Wis 8, Cha 8;
  - save proficiency Dex +2;
  - skill proficiency Stealth +6;
  - gear note for daggers (3), if the shared facility records gear;
  - darkvision 60 ft. and Passive Perception 9;
  - Languages Common, Goblin;
  - CR 1/8, PB +2;
  - dagger attack +4, reach 5 ft. or range 20/60 ft., average 4 Piercing.
- Defer Goblin Warrior and Nimble Escape unless the needed attack-rider and bonus-action support already exists.
- Do not build a parser, importer, bulk corpus ingestion path, or an MCP-local monster registry in this task.

Acceptance criteria:

- There is one core-owned source of truth for named monster stat blocks.
- Goblin Minion can be instantiated from that source without hand-written RAW literals in MCP.
- MCP selects or references the core content; it does not repeat RAW numbers or maintain a second monster registry.
- Future statblock provenance is documented clearly enough that later entries can follow the same SRD-first sourcing rule without reopening ownership.
- Goblin Warrior remains deferred until advantage-based damage rider support exists.
- No bulk importer or non-SRD corpus ingestion is introduced by this task.
- If Quint changes, the bridge projection and tests stay aligned with the same Goblin Minion facts.

Verification:

- RAW check: reread Goblin Minion, Monsters Overview, and `UBIQUITOUS_LANGUAGE.md` before editing code.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused unit tests for the shared statblock facility, Goblin Minion catalog values, and the chosen projection path.
- Creature MBT only if `creature.qnt` or the Quint bridge changes.
- Tier 1 battle MBT only if battle semantics or the battle bridge changes.

Extra research needed:

- Resolved. The runtime named-monster catalog now lives in TS/core for adapter and `BATTLE_INIT` consumption. Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Plan impact:

- `MCP1-C`: unblock to `ready-for-implementation-after-light-research`; it can now compile a Goblin Minion through the shared `statBlockId`-based `BATTLE_INIT` path after a fighter durable/config mapping check.
- `MCP2-B`: no-change; it still waits on Task MCP2-A.
- `MCP3-A`: revise blocked assumptions; `MCP1-B` is no longer the live blocker, but Goblin Warrior/Nimble Escape still wait on Task MCP2-A plus monster attack-rider and bonus-action support.

### Task 12 - E - Movement And Help Geometry/Session Ownership

Status: done.

Depends on: none.

Blocks: public `BATTLE_MOVE` and `BATTLE_HELP_ATTACK`.

Next action: Closed 2026-04-10. Keep core/MCP geometry-free, record the caller/session ownership split, and leave movement/help implementation for a later bounded token task.

Purpose:

- Decide whether to introduce a session geometry owner or keep `BATTLE_MOVE` and `BATTLE_HELP_ATTACK` deferred.

Context:

- `BATTLE_MOVE` is blocked on position, path/destination, difficult terrain beyond a fixed step, reach exit, threatened creature set, and OA provocation.
- `BATTLE_HELP_ATTACK` initially looked blocked on helper/ally/target visibility and range/reach facts; RAW review in this task narrows that to helper-target 5-foot proximity plus ally/target choice.
- `ARCHITECTURE.md` and `battle/DOMAIN.md` intentionally keep formal geometry out of the core.
- `.references/inspirations/12-opportunity-attack-path-analysis.md` recommends adopting vocabulary but not adding grid/pathfinding.

Inputs:

- `ARCHITECTURE.md`.
- `battle/DOMAIN.md`.
- `.references/inspirations/12-opportunity-attack-path-analysis.md`.
- `plans/MCP_EVENT_SURFACE_AUDIT.md`.

Research output:

- Decision note:
  - continue deferring;
  - accept explicit caller/session facts for a narrow action;
  - or define a future session geometry owner.

Acceptance criteria:

- The note must not add a grid/geometry engine by accident.
- The note must identify the owner of visibility, reach, threat, path, and provocation facts.

Verification:

- Docs-only unless implementation is explicitly scheduled later.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- No. Ownership decision recorded in `plans/MOVEMENT_GEOMETRY_OWNERSHIP.md`.

Research closeout:

- RAW check completed against `.references/srd-5.2.1/Playing-the-Game.md` (movement rules, Difficult Terrain) and `.references/srd-5.2.1/Rules-Glossary.md` (`Help [Action]`, `Opportunity Attacks`, `Reach`), plus `UBIQUITOUS_LANGUAGE.md`, `ARCHITECTURE.md`, `battle/DOMAIN.md`, `.references/inspirations/12-opportunity-attack-path-analysis.md`, and `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Decision: do not introduce a geometry/grid owner in core, battle, or MCP. The existing positionless boundary is intentional and should remain durable.
- Ownership split:
  - visibility relations are caller/session-owned;
  - path, destination, and difficult-terrain geometry are caller/session-owned;
  - threat and reach-exit facts are caller/session-owned, using battle-owned reach statistics as inputs;
  - provocation classification for movement remains caller/session-owned at the public boundary, while battle still owns downstream rule filters such as reaction availability and incapacitation;
  - reach as a creature or weapon statistic remains core-owned, but "within reach now" and "left reach on this step" are spatial relations, so they stay caller/session-owned.
- `BATTLE_HELP_ATTACK` is narrower than the original blocker text implied. RAW Help attack requires distracting an enemy within 5 feet of the helper; it does not require helper-to-ally or helper-to-target visibility. A future public Help token can therefore use explicit caller/session proximity only, plus `allyId` and `targetId`, without a geometry engine.
- `BATTLE_MOVE` remains deferred. A future public movement token should stay checkpoint-based and accept explicit caller/session facts rather than positions or pathfinding internals: destination/path label, difficult-terrain cost beyond the fixed 5-foot spend, reach-exit and threatened-creature facts, and provocation classification.
- The inspiration note remains useful vocabulary, not architecture direction: keep reach-exit checkpoint language and reject engine-owned grid or pathfinding.

Verification results:

- RAW/source check completed against the local SRD corpus and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1: rejected the overreaching candidate guidance that would have treated movement/help as implementation-ready just because the ownership split is now explicit.
- `/simplify` round 2: no further important simplifications found; the final note keeps only the ownership decision, the RAW-backed Help narrowing, and the deferred movement boundary.
- `git diff --check` passed.

Plan Impact:

- Status: applied
- Affected tasks:
  - `E`: revised from `ready-for-research` to `done`; recorded the final ownership split in the plan and task note.
  - future public `BATTLE_MOVE` / `BATTLE_HELP_ATTACK` work: no status change; downstream implementation stays deferred, but future tasks should now reuse the explicit caller/session spatial-fact boundary instead of reopening geometry ownership.
- Plan edits: synchronized the Ralph index and Task 12 section, removed Task E from queue guidance, added the tracked decision note in `plans/MOVEMENT_GEOMETRY_OWNERSHIP.md`, and updated `plans/MCP_EVENT_SURFACE_AUDIT.md` to replace the stale Help visibility blocker with the finalized ownership split.

### Task 13 - J - Generic Table Events, Environmental Hazards, And Monster Commands

Status: done.

Depends on: none.

Blocks: future raw table event exposure and monster command work.

Next action: Closed 2026-04-10. All four families remain deferred; reuse the documented blockers instead of reopening this batch.

Purpose:

- Decide whether to schedule a table-event provenance or monster-command ownership batch.

Context:

- Max-HP reduction/restoration needs source-specific provenance and caps.
- Raw effect add/remove needs source, duration, dependency, and payload ownership.
- Generic battle spell table events are blocked on multi-phase reaction resolution and spell payload ownership.
- `SUFFOCATE` is blocked because the current raw event is a terminal drop-to-0 shortcut, not a public SRD suffocation-progress hazard event.
- Raw monster `USE_LEGENDARY_ACTION` is blocked because named monster legendary actions need action-name legality and stat-block ownership; `BATTLE_LEGENDARY_PASS` is already the safe control command for passing a legendary-action window.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Relevant SRD spell/effect examples if a specific table event is selected.
- Monster stat-block/action data if a monster command is selected.

Research output:

- All four candidate families remain deferred; no family is ready for safe public exposure in this batch.
- `REDUCE_MAX_HP` / `RESTORE_MAX_HP` stay deferred until source-specific provenance, caps, and full-restoration semantics are owned by modeled commands rather than arbitrary `amount` payloads.
- Raw `ADD_EFFECT` / `REMOVE_EFFECT` stay deferred until semantic spell/feature owners define duration, hooks, granted facts, and removal provenance instead of accepting internal payload dumps.
- `SUFFOCATE`, `APPLY_STARVATION`, and `APPLY_DEHYDRATION` stay deferred because SRD 5.2.1 requires multi-step hazard progress tracking plus source-specific Exhaustion removal that the current raw events do not model.
- `USE_LEGENDARY_ACTION`, `USE_RECHARGE_ABILITY`, and `USE_DAILY_ABILITY` stay deferred until stat-block validation, cost validation, and ability-specific payload ownership exist.

Acceptance criteria:

- No raw payload command is exposed without source/provenance constraints.
- Prefer modeled semantic spell/action tokens when possible.
- Public monster commands do not accept arbitrary action names, damage, damage types, or payload facts without stat-block validation.

Verification:

- Docs-only research; no code changes, `/simplify`, or MBT runs required.
- RAW check completed against `.references/srd-5.2.1/Rules-Glossary.md` for suffocation/malnutrition/dehydration and `.references/srd-5.2.1/Monsters/Overview.md` for monster-command ownership context.
- `UBIQUITOUS_LANGUAGE.md` was reviewed as required; it still contains legacy suffocation wording, but because this task deferred environmental hazard exposure rather than implementing it, the tracked outcome is to keep the blocker in place rather than normalize terminology in this batch.
- `plans/MCP_EVENT_SURFACE_AUDIT.md` blocker text was reviewed and remains aligned with the deferred outcome.

Extra research needed:

- No for Task J itself. Future implementation work should start from one deferred family and carry its source-specific provenance/ownership model before any MCP exposure.

Plan impact:

- Status: applied
- Affected tasks:
  - `J`: revised from `ready-for-research` to `done`; recorded the research closeout and kept all four families deferred.
  - `F`: no-change; legendary attack payload ownership remains its own next research slice.
  - `G`: no-change; attack rider ownership remains its own next research slice.
  - `MCP1-C`: no-change; encounter-start work remains the highest-priority implementation task.
- Plan edits: synchronized the Ralph task index, DAG row, queue guidance, and Task 13 closeout with the final research result. No downstream task statuses changed.

### Task 14 - F - Legendary Attack Payload Ownership

Status: done.

Depends on: monster stat-block action payload ownership.

Blocks: public `BATTLE_LEGENDARY_ATTACK`.

Next action: Closed 2026-04-10. Implementation should extend `LegendaryActionDef` with an `attackRef` field, then build the public token and runtime lane documented below.

Purpose:

- Define what entity owns monster Legendary Action option payloads before exposing `BATTLE_LEGENDARY_ATTACK`.

Context:

- `BATTLE_LEGENDARY_PASS` is already wired as a control command.
- `BATTLE_LEGENDARY_ATTACK` remains blocked because battle owns the legendary-action window and charges, but not the specific stat-block Legendary Action option payload/name/cost.
- It also needs the same attack runtime/session contract as `BATTLE_ATTACK`.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md`.
- Monster stat-block files/types.
- `battle.qnt` legendary action handling.
- Task D research output.

Research output:

- A monster stat-block action payload ownership proposal.
- Decide whether legendary attack is a suggested action, monster-control command, or both.

Acceptance criteria:

- MCP does not accept arbitrary damage type, damage qualifier, weapon property, action cost, or melee/ranged facts.
- The plan reuses the Task D attack boundary where possible.

Verification:

- Docs-only until implementation.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- No. Research is complete; see closeout below.

Research closeout:

RAW checked against `.references/srd-5.2.1/Monsters/Overview.md` (Legendary Actions section, lines 251-256), all SRD 5.2.1 monster stat blocks with Legendary Actions (dragons, kraken, lich, mummy lord, solar, sphinxes), and `UBIQUITOUS_LANGUAGE.md` (Legendary Action, Stat Block, Creature entries).

**1. SRD Legendary Action option taxonomy.** SRD 5.2.1 LA options fall into four shapes:

- **Attack-shaped**: "makes one [Attack Name] attack" and references a named stat-block attack.
- **Spell-shaped**: "uses Spellcasting to cast [Spell]" and references a stat-block Spellcasting action.
- **Save-shaped**: direct save with damage/condition effect in the LA description.
- **Utility-shaped**: teleport, movement, or other self-contained effects.

Per-turn cooldown ("can't take this action again until the start of its next turn") applies to spell- and save-shaped options in the SRD corpus, but generally not to attack-shaped options.

**2. `BATTLE_LEGENDARY_ATTACK` is a `suggested_action`, not a `control_command`.**

It requires user choices (`monsterId`, LA option, target, knockout intent) plus runtime session facts, so it belongs on `get_available_actions` / `execute_action`, reusing Task D's attack lane. This is distinct from:

- `BATTLE_LEGENDARY_PASS`: pure phase-advance control command.
- Raw `USE_LEGENDARY_ACTION`: still deferred monster command work that would need stat-block validation, cost validation, and ability-specific payload ownership.

**3. First-slice scope: attack-shaped LA options only.**

Only LA options that reference a named stat-block attack are in scope. Spell-, save-, and utility-shaped LA options remain deferred until their own semantic tokens exist.

**4. Public resolved token (reuses Task D pattern):**

```typescript
{
  scope: "battle";
  type: "BATTLE_LEGENDARY_ATTACK";
  monsterId: CreatureId;
  actionName: string;
  targetId: CreatureId;
  knockOut: boolean;
}
```

Compared to Task D's `BATTLE_ATTACK` token, this adds `monsterId` constrained by `laCtx.eligibleMonsters` and `actionName` validated against the stat block's `legendaryActions`.

**5. Runtime lane (same family as Task D's `battleAttack`):**

```typescript
{
  runtime: "legendaryAttack";
  values: {
    attackRoll: number;
    targetAc: number;
    weaponDamage: number;
    sneakAttackDamage?: number;
    attackerWithin5ft: boolean;
    attackerWithin60ft?: boolean;
    hostileWithin5ft: boolean;
    targetCanSeeAttacker: boolean;
    attackerCanSeeTarget: boolean;
    frightSourceInLOS: boolean;
    hasAllyAdjacentToTarget: boolean;
    hitReactionCandidates: ReadonlyArray<string>;
  }
}
```

Runtime session/table facts are identical to `battleAttack`; only the source of the attack payload differs.

**6. Ownership split.**

Battle derives, and public callers must not supply:

- eligible monster identity from `laCtx.eligibleMonsters`
- LA cost from `StatBlock.legendaryActions[actionName].cost`
- referenced attack profile from `LegendaryActionDef.attackRef` to `StatBlock.attacks[ref]`
- weapon payload facts such as damage type, qualifiers, melee/ranged, properties, and finesse
- crit range, Help consumption, Sneak Attack legality, and damage aggregation

MCP/caller supplies only:

- `actionName`, validated against stat-block `legendaryActions`
- `targetId`
- `knockOut`
- runtime session facts on the same `battleAttack` lane family

MCP must not accept arbitrary `damageType`, `damageQualifiers`, `weaponProperties`, `isFinesse`, `actionCost`, or `isMelee` fields for legendary attacks.

**7. Required `LegendaryActionDef` extension.**

Current shape `{ name: string; cost: number }` needs:

- `attackRef?: string` referencing a key in `StatBlock.attacks`

When present, the LA option is attack-shaped and battle can derive the payload. When absent, it is non-attack-shaped and remains deferred. Quint needs the same extension so `battle.qnt` can stop nondeterministically inventing legendary-attack payload facts.

**8. Current codebase gaps for future implementation.**

- `bLegendaryAttack` in `battle.qnt` still nondeterministically chooses damage type, melee/ranged shape, and related payload facts instead of looking up the selected LA option.
- `BATTLE_LEGENDARY_ATTACK` in `battle-machine-events.ts` currently accepts caller-supplied payload facts that should become battle-derived.
- `battleLegendaryAttack` in `battle-machine-actions-turn.ts` currently reads those facts from the event instead of the stat block.
- `LegendaryActionDef` in both `monster-types.ts` and `creature.qnt` needs the new `attackRef` field.
- Per-option cooldown tracking remains deferred; it is not needed for the first attack-shaped slice.

**9. Stop conditions.**

- Only add attack-shaped LA support via `attackRef`.
- Do not add spell-, save-, or utility-shaped LA options here.
- Do not add per-option cooldown tracking in the first slice.
- Do not add multiattack-style LA support.
- Do not let MCP accept arbitrary payload facts for legendary attacks.

Verification results:

- RAW/domain-language check completed against the local SRD corpus and `UBIQUITOUS_LANGUAGE.md`.
- Docs-only research; no code changes, `/simplify`, or MBT runs required.

Plan Impact:

- Status: applied
- Affected tasks:
  - `F`: revised from `ready-for-research` to `done`
  - `G`: no-change; attack rider ownership remains its own next research slice
  - `MCP2-A`: no-change; remains blocked on MCP1-C encounter start. A future legendary attack implementation should consume this ownership split rather than reopening it.
- Plan edits: synchronized Task 14 status in the index and DAG, recorded the ownership closeout above. No downstream task statuses changed.

### Task 15 - G - Attack Rider Ownership

Status: done.

Depends on: none.

Blocks: attack rider tokens.

Next action: Closed 2026-04-10. Reuse the timing/ownership split below when rider implementation work is scheduled; do not reintroduce creature-scope rider tokens.

Purpose:

- Keep attack riders out of creature-level MCP and prepare them as battle-owned rider windows after attack ownership exists.

Context:

- Blocked riders:
  - `USE_BRUTAL_STRIKE`;
  - `STUNNING_STRIKE`;
  - `USE_CUNNING_STRIKE`;
  - `USE_ELDRITCH_SMITE`;
  - `USE_DIVINE_SMITE_FREE`.
- Each requires specific attack timing and qualifying-hit facts.

Inputs:

- `plans/MCP_EVENT_SURFACE_AUDIT.md` rider rows.
- `.references/srd-5.2.1/Classes/` relevant class passages.
- Task D research output.

Research output:

- For each rider, classify:
  - pre-roll choice;
  - post-hit/pre-damage choice;
  - post-damage effect;
  - runtime save/target facts;
  - battle-owned feature state.

Acceptance criteria:

- No creature-level token is added for a hit-qualified rider.
- Rider timing is explicit and maps to battle attack resolution phases.

Verification:

- Docs-only until implementation.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- No. This task's research output is recorded below.

Research closeout:

- RAW checked against `.references/srd-5.2.1/Classes/Barbarian.md` (`Reckless Attack`, `Brutal Strike`, `Improved Brutal Strike`), `.references/srd-5.2.1/Classes/Monk.md` (`Stunning Strike`), `.references/srd-5.2.1/Classes/Rogue.md` (`Sneak Attack`, `Cunning Strike`, `Improved Cunning Strike`), `.references/srd-5.2.1/Classes/Warlock.md` (`Eldritch Smite`), `.references/srd-5.2.1/Classes/Paladin.md` (`Paladin's Smite`), `.references/srd-5.2.1/Spells/Descriptions-A-D.md` (`Divine Smite`), `.references/srd-5.2.1/Rules-Glossary.md` (`Attack Roll`, `Armor Class`, `Critical Hit`, `Cover`, `Help [Action]`, `Blinded`, `Frightened`, `Invisible`, `Prone`, `Unconscious`), and `UBIQUITOUS_LANGUAGE.md` (`Attack Roll`, `Critical Hit`, `Armor Class (AC)`, `Cover`, and `Advantage and Disadvantage`).
- No hit-qualified rider belongs on creature-scope MCP. Each rider depends on attack-phase facts that are only honest inside battle attack resolution after Task D's `BATTLE_ATTACK` / `battleAttack` split.
- `USE_BRUTAL_STRIKE`: pre-roll declaration on one chosen Strength-based attack roll on the Barbarian's turn after `DECLARE_RECKLESS`. Battle owns the chosen-attack window, the "forgo Advantage" choice, the "mustn't have Disadvantage" gate, Barbarian level scaling for damage/effect count, and `brutalStrikeUsedThisTurn`. Runtime only needs a save result for `Staggering Blow`; `Forceful Blow` still needs later movement/session follow-through.
- `STUNNING_STRIKE`: post-hit rider choice on a qualifying Monk-weapon or Unarmed Strike hit. Battle owns the hit qualification, target identity, once-per-turn timing, Monk level, `focusPoints`, and `stunningStrikeUsedThisTurn`. Runtime must supply the target's Constitution save result.
- `USE_CUNNING_STRIKE`: post-hit / pre-Sneak-Attack-damage-roll rider choice when battle has already determined that Sneak Attack applies. Battle owns Sneak Attack legality, remaining Sneak Attack dice, Rogue level scaling, and `cunningStrikeUsesThisTurn`. Runtime must supply any per-effect saving throw result, and battle must still know target Size for `Trip`; the chosen effect resolves immediately after the attack's damage is dealt.
- `USE_ELDRITCH_SMITE`: post-hit rider choice on a qualifying pact-weapon hit before final damage aggregation. Battle owns pact-weapon qualification, target identity, Warlock level, Pact Magic slot spend, `eldritchSmiteUsedThisTurn`, and target Size for the optional `Prone` rider. No extra runtime save is needed.
- `USE_DIVINE_SMITE_FREE`: post-hit rider choice on a qualifying melee-weapon or Unarmed Strike hit. Battle owns the hit qualification, target identity, Paladin free-use availability, and the target's creature type for the Fiend / Undead bonus-damage clause. Because the spell's casting time is "Bonus Action, which you take immediately after hitting," implementation must respect the post-hit timing window rather than expose it as a generic turn action.
- Preferred rider phase split for future implementation:
  - pre-roll declaration window: Brutal Strike only
  - post-hit / pre-damage window: Stunning Strike, Eldritch Smite, Divine Smite Free, and Cunning Strike choice
  - post-damage effect resolution: Cunning Strike effects and any Brutal Strike option that later needs movement/session follow-through

Plan Impact:

- Status: applied
- Affected tasks:
  - `G`: revised from `ready-for-research` to `done`
  - `MCP2-A`: no change; it still must implement the public main-hand attack boundary before any rider work can land
  - `MCP3-A`: no change; Goblin Warrior follow-up still depends on future attack / monster-option implementation, not on reopening rider ownership
- Plan edits: synchronized Task 15 status in the index and DAG, removed Task 15 from the recommended ready-task list, and recorded the rider timing / ownership split for future implementation work.

### Task 16 - MCP1-C - Encounter Start Tool/Command

Status: done.

Depends on: Task MCP1-A, Task MCP1-B.

Blocks: Task MCP2-A, Task MCP2-B.

Purpose:

- Let MCP initialize a battle containing an existing/selected Fighter and a core-owned Goblin Minion.

Inputs:

- Session router/lifecycle from Task MCP1-A.
- Shared statblock catalog/projection from Task MCP1-B.
- Existing `BATTLE_INIT` control command.
- Fighter feature/config helpers, including `fightingStyleBattleModifiers` if relevant.

Implementation output:

- Add a public MCP flow for encounter initialization. It may be a session-level `start_battle` tool using combatant descriptors, an `execute_control_command` extension that accepts core-owned combatant descriptors, or another architecture approved by Task MCP1-A.
- Compile Fighter durable/config data to `InitCreatureConfig`:
  - `maxHp`;
  - `kind: "PC"`;
  - `fighterLevel`;
  - owned weapon/shield/two-hand flags if available;
  - derived feature fields only where battle init expects them.
- Compile Goblin Minion via core stat-block content, not MCP literals.
- Call `BATTLE_INIT` on the battle actor.

Acceptance criteria:

- MCP can initialize a battle with `fighter` and `goblin-1` IDs.
- `get_state` returns battle scope, initiative, active creature ID, and both creature IDs.
- The active battle actor owns both mutable combatant states.
- No character-list HP/condition copy is updated during active battle initialization.

Verification:

- RAW check: only if the task maps RAW stat-block or Fighter combat facts; otherwise reuse Task MCP1-B citations.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- Focused MCP adapter tests for valid start, invalid stat-block ID, duplicate creature ID, and scope/routing errors.

Extra research needed:

- None. The implementation confirmed that the current creature host owns Fighter durable facts such as `maxHp`, `fighterLevel`, and `baseWalkSpeed`, while equipment/fighting-style battle payload is not yet session-owned and therefore stays out of the public `start_battle` contract.

Verification completed:

- RAW check: reused Task MCP1-B's goblin stat-block provenance (`.references/srd-5.2.1/Monsters/Monsters-E-G.md`) and re-read `UBIQUITOUS_LANGUAGE.md` for `Initiative`, `Surprise`, `holding / wielding`, and `free hand` terminology. No new combat-rule semantics were modeled beyond routing existing core-owned facts into `BATTLE_INIT`.
- `/simplify` round 1: removed the hidden fighter/goblin descriptor payload shape from the candidate implementation and kept the public tool limited to IDs plus explicit initiative/surprise inputs that the session can own without duplicating battle state.
- `/simplify` round 2: re-checked for redundant state and malformed-init paths. Kept duplicate-ID rejection on both `start_battle` and the raw `BATTLE_INIT` MCP lane so the still-exposed low-level control command cannot silently collapse combatants through `Map.set`.
- Verification: `pnpm --filter @dnd/mcp test`

Plan Impact:

- Status: applied.
- MCP1-C: done; recorded the final `start_battle` ownership split and verification closeout.
- MCP2-A: unblock; status changed from `blocked` to `ready-for-implementation-after-light-research` now that encounter start is available through the session router.
- MCP2-B: no-change; remains blocked on MCP2-A.

### Task 17 - MCP2-A - Battle Attack Public Boundary

Status: done.

Depends on: Task MCP1-C.

Blocks: Task MCP2-B.

Purpose:

- Expose the first safe public battle attack action through MCP.

Scope:

- Main-hand weapon attack by the active creature only.
- No off-hand, legendary, spell attack, unarmed strike, custom weapon payload, or attack rider.

Required design from Task D:

- exact `BattleActionToken` shape;
- exact resolved-token shape;
- explicit runtime dice inputs;
- explicit table/session facts;
- facts forbidden because battle already owns them;
- whether `crit` is runtime-supplied or derived from `attackRoll` and `critRange`;
- whether damage aggregation is runtime-owned or battle-owned.

Implementation output:

- Add `BATTLE_ATTACK` to `BattleActionToken`.
- Add resolved schema and resolver/finalizer support.
- Derive weapon payload facts from `BattleCreatureState` / compiled weapon or stat-block action data.
- Accept explicit open table/session facts rather than sampling them in `server-runtime.ts`.

Acceptance criteria:

- Token appears only when active creature has an owned main-hand weapon/attack payload and attack budget.
- Token exposes target choices without accepting arbitrary weapon properties, damage type, damage qualifiers, or finesse flags.
- Missing session facts such as target AC, visibility, distance, adjacency, and hit-reaction candidates are explicit inputs and not invented by MCP.
- Existing reaction windows still route through battle state after attack resolution.
- Off-hand, legendary, unarmed, and rider paths remain blocked.

Verification:

- RAW check: attack rules and relevant visibility/condition entries in `.references/srd-5.2.1/`; terminology in `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `available-actions` tests.
- Focused MCP tests for token discovery, invalid session facts, successful hit, miss, and reaction-window behavior if applicable.
- Tier 1 battle MBT if battle/spec/bridge semantics change.

Extra research needed:

- Light. Re-read Task D's settled contract and the new Task MCP1-C `start_battle` flow; do not redesign attack ownership inside MCP.

Verification completed:

- RAW check: re-read `.references/srd-5.2.1/Playing-the-Game.md` (`Attack Rolls`, `Armor Class`, `Rolling 20 or 1`), `.references/srd-5.2.1/Rules-Glossary.md` (`Attack [Action]`, `Attack Roll`, `Armor Class`, `Cover`, `Critical Hit`, `Help [Action]`, `Invisible`, `Blinded`, `Frightened`, `Prone`, `Unconscious`, `Knocking Out a Creature`), `.references/srd-5.2.1/Equipment.md` (`Dagger`, `Longsword`), and `UBIQUITOUS_LANGUAGE.md` (`Attack Roll`, `Critical Hit`, `Armor Class`, `Cover`, `Knock Out`, and the relevant condition terminology).
- `/simplify` round 1: removed duplicate stat-block weapon-profile lookup in the catalog projection and kept the MCP attack runtime on a single explicit decoder instead of duplicating validation in multiple call sites.
- `/simplify` round 2: re-checked for scope creep and kept `start_battle` free of synthetic fighter equipment while still projecting stat-block-owned attack payloads into battle state.
- Focused verification: `pnpm --filter @dnd/core exec vitest run src/monster-catalog.test.ts src/available-actions.test.ts`; `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts`

Plan Impact:

- Status: applied.
- MCP2-A: done; public `BATTLE_ATTACK` now exists behind explicit runtime/session facts and battle-owned weapon derivation, with goblin stat-block dagger projection through the core catalog.
- MCP2-B: revise; it remains blocked, but the blocker is now fighter battle-weapon ownership on `start_battle` promotion rather than the public attack boundary itself.
- Plan edits: marked MCP2-A done in the index and DAG, revised MCP2-B's dependency/next-action text to call out fighter weapon projection, and updated the integrated baseline/task-selection notes to reflect that public `BATTLE_ATTACK` is already live for battle-owned attack payloads.

### Task 18 - MCP2-A1 - Fighter Main-Hand Weapon/Loadout Projection On start_battle

Status: done.

Depends on: Task MCP1-C, Task MCP2-A.

Blocks: Task MCP2-B.

Purpose:

- Give the promoted Fighter battle state an owned main-hand weapon/loadout profile so the already-landed public `BATTLE_ATTACK` lane can appear after `start_battle`.
- Keep the ownership split explicit:
  - PCs project battle weapon/loadout facts from owned character/loadout data.
  - Monsters continue to project attack payloads from named stat-block attack entries, which may diverge from normal `Equipment` rules.

Inputs:

- `.references/srd-5.2.1/Equipment.md` for the chosen Fighter initial SRD weapon/loadout (and Shield if used).
- `.references/srd-5.2.1/Monsters/Overview.md` for the stat-block/gear distinction and monster-specific attack notation.
- `UBIQUITOUS_LANGUAGE.md`.
- `packages/mcp/src/start-battle.ts`.
- `packages/core/src/available-actions.ts` `BATTLE_INIT` schema and `toBattleInitCreatureConfig`.
- `packages/core/src/battle-machine-types.ts` `InitCreatureConfig`.
- `packages/core/src/monster-catalog.ts`.
- Existing core battle tests that construct `BattleWeaponProfile` fixtures.

Implementation output:

- Choose the narrowest owned source for the Fighter's initial main-hand weapon/loadout on `start_battle` promotion.
- Prefer a core-owned named Fighter weapon/loadout reference over arbitrary public MCP weapon payloads.
- Project the chosen Fighter main-hand `BattleWeaponProfile` into `BATTLE_INIT` for the Fighter combatant.
- If the chosen initial loadout requires it, also project only the minimum related battle facts needed by existing core types, such as `hasShieldEquipped`, `mainHandUsesTwoHands`, or named fighting-style battle modifiers.
- Do not reinterpret monster stat-block attacks as generic equipment loadouts in this task. Monster attack payloads continue to come from the core statblock catalog.
- Do not add a generic MCP-side weapon registry or a free-form weapon payload schema in this task.

Acceptance criteria:

- After `start_battle`, the Fighter's `BattleCreatureState` owns a main-hand weapon/loadout profile sufficient for `BATTLE_ATTACK`.
- `get_available_actions` exposes public `BATTLE_ATTACK` for the Fighter without inventing any hidden session facts.
- The source of the Fighter weapon facts is explicit and reusable.
- Monster attack ownership remains stat-block-action-based rather than newly equipment-derived.
- No arbitrary public weapon payload can be injected through MCP.

Verification:

- RAW check: reread the chosen Fighter weapon/loadout entry (and Shield if used) in `.references/srd-5.2.1/Equipment.md`, plus `.references/srd-5.2.1/Monsters/Overview.md` for the monster stat-block / gear split; terminology in `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts src/battle-rules-scenarios.test.ts`.
- Focused `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts`.

Extra research needed:

- Light. Confirm there is no existing runtime Fighter equipment/loadout owner to project from; if none exists, keep the first slice on a narrow core-owned Fighter weapon/loadout reference rather than inventing a public arbitrary weapon payload contract.
- Confirm the plan text keeps Fighters and monsters on separate sources of truth: Fighter loadout via owned character/loadout data, monster attacks via named stat-block actions.

### Task 19 - MCP2-B - Fighter Attacks Goblin End-to-End

Status: done.

Depends on: Task MCP2-A1.

Blocks: objective completion.

Purpose:

- Complete the motivating MCP flow after the attack boundary exists.

Implementation output:

- Add an MCP integration test or harness scenario:
  1. Create/start battle with Fighter and Goblin Minion.
  2. Start the active creature turn with explicit start-turn facts.
  3. Query `get_available_actions`.
  4. Resolve and execute `BATTLE_ATTACK` against the goblin with explicit runtime/session facts.
  5. Assert the battle state, not a character-list copy, reflects HP/death/reaction-window changes.

Acceptance criteria:

- A coding agent can follow the test as the reference "fighter vs goblin through MCP" workflow.
- The goblin's mutable combat state lives only in `BattleContext.creatures`.
- The Fighter's mutable battle state lives only in `BattleContext.creatures` during combat.
- Durable character-list update, if any, happens only at a future explicit battle-close/commit boundary and is not part of this task.

Verification:

- RAW check: reuse Task MCP1-B and Task MCP2-A citations.
- `/simplify` convergence: minimum two rounds after implementation.
- `pnpm --filter @dnd/mcp test`.
- `pnpm --filter @dnd/core test` only if core action logic changes.
- Tier 1 battle MBT only if battle/spec semantics change.

Extra research needed:

- Light. Mostly integration wiring once the fighter-side weapon ownership path is defined.

Verification completed:

- RAW check: reused Task MCP1-B / MCP2-A citations only. Re-read `UBIQUITOUS_LANGUAGE.md` to confirm the task remained adapter-only and did not add new combat semantics beyond exercising the existing `start_battle` and `BATTLE_ATTACK` contract.
- `/simplify` round 1: rejected multi-test hit/miss/lethal expansions and kept one end-to-end scenario that proves the actual acceptance criteria: promoted battle-only mutable state, durable source-state preservation, and the routed MCP workflow.
- `/simplify` round 2: re-checked for redundant fixtures and left the runtime facts inline in the single scenario instead of adding a one-off shared helper that would only duplicate the task-local inputs.
- Verification: `pnpm --filter @dnd/mcp test`

Plan Impact:

- Status: applied.
- MCP2-B: done; the motivating fighter-vs-goblin MCP flow is now covered by a task-scoped `SessionRouter` integration test.
- Plan edits: marked MCP2-B done in the index and DAG, updated the integrated baseline and task-selection guidance to remove the stale pending-work wording, and recorded the task verification closeout.

### Task 20 - MCP3-A1 - Stat-Block Advantage-Damage Rider Ownership

Status: done.

Depends on: Task MCP2-A.

Blocks: Task MCP3-A.

Purpose:

- Add a core-owned way for a named stat-block attack to contribute extra on-hit damage when battle already knows the attack had net Advantage.

Research output:

- The current attack engine already computes net Advantage / Disadvantage in battle via `aggregateAttackMods(...)`, and `resolveAttack(...)` already consumes that result.
- Goblin Warrior and Goblin Boss both use the same rider shape on `Scimitar` and `Shortbow`: extra `1d4` damage of the same damage type if the attack roll had Advantage.
- No new public MCP runtime field is required for this first rider slice if the rider is derived from battle-owned attack context and stat-block-owned attack metadata.

Inputs:

- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Warrior and Goblin Boss entries.
- `packages/core/src/monster-types.ts`.
- `packages/core/src/monster-catalog.ts`.
- `packages/core/src/battle-machine-actions-attack.ts`.
- `packages/core/src/machine-combat.ts`.

Implementation output:

- Extend the core stat-block attack representation with the minimum owned metadata needed for the goblin rider.
- Apply that rider only when battle has already determined the hit used net Advantage.
- Keep the rider stat-block-owned and battle-resolved; MCP must not accept a caller-supplied "had advantage rider" payload.

Acceptance criteria:

- Goblin Warrior / Boss attack metadata can express the SRD's extra-on-Advantage damage clause without a goblin-specific MCP shortcut.
- Battle applies the extra damage only when the attack hit and the battle-owned attack context resolves to net Advantage.
- The rider remains attached to the named stat-block attack rather than duplicated as MCP/runtime literals.

Verification:

- RAW check: Goblin Warrior and Goblin Boss attack entries in `.references/srd-5.2.1/Monsters/Monsters-E-G.md`.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `pnpm --filter @dnd/core exec vitest run src/monster-catalog.test.ts src/battle-rules-scenarios.test.ts`.
- Tier 1 battle MBT only if battle/spec semantics change.

Closeout:

- Landed a minimal same-type rider shape on `MonsterAttack.extraDamageOnAdvantageHit` (`{ diceCount, dieSize }`) for Goblin Warrior/Boss `Scimitar` and `Shortbow`.
- Kept Goblin Warrior/Boss internal-only for now; `MONSTER_STAT_BLOCK_IDS` remains unchanged, and MCP still cannot accept any caller-supplied rider payload.
- `statBlockToInitCreatureConfig(...)` can now project a selected named stat-block attack lane into battle state, which lets battle resolve either scimitar or shortbow from stat-block-owned metadata.
- TS `resolveAttack(...)` and Quint `resolveAttack(...)` both apply the rider only on hit with net Advantage and double the rider dice average on crit.

Verification notes:

- RAW check completed against `.references/srd-5.2.1/Monsters/Monsters-E-G.md` and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1 removed the rejected public-schema/public-ID exposure; round 2 collapsed the rider metadata to same-type dice only and confirmed no further task-scoped reductions were needed.

### Task 21 - MCP3-A2 - Monster Bonus-Action Option Boundary

Status: done.

Depends on: Task MCP2-A.

Blocks: Task MCP3-A.

Purpose:

- Add generic battle support for monster-owned bonus-action options such as Nimble Escape without introducing goblin-specific action shortcuts.

Research output:

- Battle already has generic action-costed `BATTLE_HIDE` and `BATTLE_DISENGAGE`.
- Their handlers currently spend an action, not a bonus action.
- `Nimble Escape` therefore needs a generic battle bonus-action boundary for Hide/Disengage rather than a goblin-only exception.

Inputs:

- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Warrior and Goblin Boss `Nimble Escape`.
- `packages/core/src/available-actions.ts`.
- `packages/core/src/battle-machine-events.ts`.
- `packages/core/src/battle-machine-actions-turn.ts`.

Implementation output:

- Add the narrowest generic battle token/event support needed to take Hide or Disengage as a bonus action.
- Surface those options only when a combatant owns the relevant feature/trait.
- Keep the public MCP surface generic; no `GOBLIN_NIMBLE_ESCAPE` token.

Acceptance criteria:

- A monster trait can expose Hide/Disengage as a bonus action in battle without duplicating the underlying action semantics.
- Bonus-action usage is tracked on the creature's existing `bonusActionUsed` state.
- The public MCP surface remains generic battle actions rather than monster-specific commands.

Verification:

- RAW check: Goblin Warrior and Goblin Boss `Nimble Escape`; relevant `Hide` / `Disengage` glossary entries if implementation lands.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts src/battle-rules-scenarios.test.ts`.
- Tier 1 battle MBT only if battle/spec semantics change.

Extra research needed:

- None for this slice.

### Task 22 - MCP3-A3 - Monster Reaction Retarget/Swap Boundary

Status: done.

Depends on: Task MCP2-A.

Blocks: Task MCP3-A when Goblin Boss is selected in-batch.

Purpose:

- Extend the current hit-reaction interrupt family so monster-owned reactions like `Redirect Attack` can retarget an incoming attack and swap creature positions without bypassing battle reaction windows.

Research output:

- Goblin Boss `Redirect Attack` triggers on an incoming attack roll, swaps positions with a Small or Medium ally within 5 feet, and retargets the attack to that ally.
- The existing `PIAttackHit` window is the right home for this effect because it already owns attack-roll / target-AC hit reactions before damage resolution proceeds.
- Unlike `Shield`, `Parry`, or `Cutting Words`, `Redirect Attack` must rewrite the pending defender and mutate battle position state; it cannot be modeled as a pure attack-roll or AC adjustment.
- The current `HitReactionDecision` / `AttackHitCtx` shapes therefore need a narrow extension for:
  - the chosen redirect ally;
  - legality facts for ally size and within-5-feet adjacency;
  - battle-owned target rewrite plus position swap before the hit pipeline continues.
- No new public monster command is needed. This should stay inside the existing battle reaction surface.

Inputs:

- `.references/srd-5.2.1/Monsters/Monsters-E-G.md` Goblin Boss `Redirect Attack`.
- `.references/srd-5.2.1/Monsters/Overview.md`.
- `packages/core/src/battle-machine-events.ts`.
- `packages/core/src/battle-machine-types.ts`.
- `packages/core/src/battle-machine-helpers.ts`.
- `packages/core/src/battle-machine-actions-attack.ts`.
- `packages/core/src/available-actions.ts`.

Implementation output:

- Landed generic `RRedirectAttack` inside `PIAttackHit`.
- Added battle-owned redirect inputs to the hit context: battle-side ownership, battle positions, and redirect-candidate ally AC facts.
- Resolve the reaction inside `PIAttackHit` by:
  - spending the reactor's reaction;
  - swapping goblin/ally positions in battle state;
  - replacing the pending attack target;
  - rebuilding target-facing hit-reaction legality for the redirected defender before attack resolution continues.
- Kept the public MCP surface on generic battle reactions; no `GOBLIN_REDIRECT_ATTACK` public command was added.

Acceptance criteria:

- `Redirect Attack` has a concrete implementation home inside `PIAttackHit`.
- The design names the owned proximity/size facts needed for legality.
- Target rewrite and position swap remain battle-owned and do not require caller-supplied monster command payloads.

Verification:

- RAW check: Goblin Boss plus Monsters Overview.
- `/simplify` convergence: minimum two rounds after implementation.
- Focused `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts src/battle-rules-scenarios.test.ts`.
- Tier 1 battle MBT only if battle/spec semantics change.

Closeout:

- Done 2026-04-11.
- Focused verification:
  - `pnpm --filter @dnd/core exec vitest run src/available-actions.test.ts src/battle-rules-scenarios.test.ts`
    - Redirect Attack coverage passed.
    - One pre-existing unrelated failure remains: `runbook_7: Great Weapon Fighting requires explicit weapon damage die faces`.
- `/simplify`:
  - Round 1 replaced a guessed redirect-target AC with battle-owned `baseArmorClass`.
  - Round 2 found no further task-scoped reductions worth landing.

Plan Impact:

- Status: applied.
- Affected tasks:
  - `MCP3-A3`: mark done.
  - `MCP3-A`: update handoff readiness; Goblin Boss is no longer waiting on Redirect Attack.
- Plan edits: updated Ralph index status, DAG row 22 closeout, and task 23 handoff text.

Extra research needed:

- Light. Confirm the minimum added fields on `HitReactionDecision` / `AttackHitCtx` before implementation; the placement decision is already settled.

### Task 23 - MCP3-A - Goblin Warrior/Nimble Escape Follow-Up

Status: done.

Depends on: Task MCP3-A1, Task MCP3-A2; optionally Task MCP3-A3 for Goblin Boss.

Blocks: fuller goblin behavior.

Purpose:

- Move beyond the minimal Goblin Minion slice toward fuller SRD goblin support.

Research output:

- Land Goblin Warrior by combining:
  - stat-block-owned advantage-damage rider support;
  - monster-owned bonus-action support for `Nimble Escape`.
- Extend to Goblin Boss only if the batch also selects `Redirect Attack`.

Acceptance criteria:

- No goblin-specific MCP shortcuts.
- Stat-block attack riders and bonus actions are core-owned.
- MCP exposes only generic action/session surfaces.

Verification:

- RAW check: Goblin Warrior and Goblin Boss entries plus Monsters Overview.
- `/simplify` convergence: minimum two rounds if implementation occurs.
- Focused stat-block/action tests.
- Tier 1 battle MBT if battle semantics change.

Closeout:

- Landed the combined follow-up by exposing `goblinWarrior` and `goblinBoss` through the core runtime stat-block catalog and by removing goblin-named MCP `start_battle` fields in favor of generic `monsterId` / `monsterStatBlockId` descriptors.
- Focused verification covers the generic `statBlockId` `BATTLE_INIT` path in core plus the generic session-router `start_battle` path in MCP, including Goblin Warrior Nimble Escape projection and Goblin Boss Redirect Attack ownership.

Verification notes:

- RAW check completed against `.references/srd-5.2.1/Monsters/Monsters-E-G.md` (Goblin Warrior, Goblin Boss), `.references/srd-5.2.1/Monsters/Overview.md`, and `UBIQUITOUS_LANGUAGE.md`.
- `/simplify` round 1 removed goblin-specific MCP field names and descriptions from `start_battle`.
- `/simplify` round 2 re-checked for duplicate session surfaces and redundant state; kept the single generic monster descriptor and found no further task-scoped reductions.

Plan Impact:

- Status: applied.
- Affected tasks:
  - `MCP3-A`: mark done; no downstream queue/status changes required.
- Plan edits: updated Ralph index status, DAG row 23 closeout, and task 23 closeout/verification text.

### Task 24 - H - PassiveModifiers Sub-Record

Status: deferred.

Depends on: none.

Blocks: possible passive modifier field cleanup.

Next action: do not pick up unless the batch explicitly selects passive modifier restructuring.

Purpose:

- Reduce flat modifier field boilerplate by grouping explicit named fields into a closed `PassiveModifiers` record.

Context:

- Competitor inspiration: `.references/inspirations/11-modifier-algebra.md`.
- The repo intentionally rejects open modifier registries in favor of explicit Quint fields.
- Current flat fields include `hasEvasion`, `saveMiscBonus`, `critRange`, `rangedWeaponAttackRollBonus`, `defenseArmorClassBonus`, `greatWeaponFightingDamageFloor`, `meleeDamageBonus`, `recklessThisTurn`, and related fields.
- `ARCHITECTURE.md` lists planned future passive fields: `conditionImmunities`, `dexSaveAdvantage`, `attacksCannotHaveAdvantage`.

Inputs:

- `.references/inspirations/11-modifier-algebra.md`.
- `ARCHITECTURE.md`.
- `battle.qnt`.
- `packages/core/src/battle-machine-types.ts`.
- Battle MBT bridge.

Implementation output:

- Add `PassiveModifiers`/`FRESH_MODS` in Quint and TS only if this batch is deliberately selected.
- Mechanically nest existing passive modifier fields.
- Do not add a generic modifier resolver unless there is a real multi-source stacking case.

Acceptance criteria:

- Behavior unchanged.
- Field grouping reduces boilerplate without hiding semantics in an open registry.
- MBT bridge remains explicit and parity-tested.

Verification:

- RAW/domain-language check before implementation if this grouping lands with new modifier semantics; pure mechanical grouping still needs `UBIQUITOUS_LANGUAGE.md` terminology review.
- `/simplify` convergence: minimum two rounds after implementation.
- Typecheck.
- Focused battle tests if setup types change.
- Tier 1 battle MBT because the bridge/spec shape changes.

Extra research needed:

- Moderate. Not urgent; best paired with adding new passive modifier fields.

### Task 25 - I - Build-Map / Hole Metadata

Status: deferred.

Depends on: a concrete consumer; possibly Task D if the first consumer is attack-boundary parameterization.

Blocks: future token-hole metadata.

Next action: do not pick up until a concrete attack, transcript, or UI consumer exists.

Purpose:

- Enrich action-token holes with metadata such as domain name, legality source, and whether filling one hole narrows later holes.

Context:

- Competitor inspiration: `.references/inspirations/15-build-map-parameterization.md`.
- Current implementation already has `ActionToken` -> `ResolvedActionToken` -> `ResolutionRequest` -> event.
- Current `Hole<T>` is just `{ options: ReadonlyArray<T> }`.

Inputs:

- `.references/inspirations/15-build-map-parameterization.md`.
- `packages/core/src/available-actions.ts`.
- `plans/available-actions.md`.
- Task D research output if this is used for battle attacks.

Research output:

- Decide whether the first user is attack boundary, transcript disambiguation, or a future UI.

Acceptance criteria:

- Metadata is not added speculatively without a consumer.
- No UI-specific abstraction leaks into core action legality.

Verification:

- Docs-only unless a consumer is selected.
- RAW check and `/simplify` convergence are required if the research later leads to implementation.

Extra research needed:

- Yes, but defer until a concrete consumer exists.

### Task 26 - MCP2-C - Concise Schema Validation Errors in MCP Tools

Status: ready-for-implementation-after-light-research.

Depends on: none.

Blocks: none (UX polish).

Next action: annotate the union schemas with `.annotations({ message })` so `String(decoded.left)` produces concise output. No call-site changes needed.

Purpose:

- When invalid input is passed to MCP tools (e.g., a bad `type` in `execute_control_command`), Effect Schema validation dumps the entire union type definition (10K+ characters of nested type signatures). Users should see a concise error like "Invalid control command. Valid types: END_TURN, LONG_REST, BATTLE_INIT, BATTLE_START_TURN, BATTLE_END_TURN, BATTLE_LEGENDARY_PASS".

Context:

- Root cause: `String(decoded.left)` already uses `TreeFormatter` under the hood, but TreeFormatter dumps every union branch for complex `Schema.Union` types.
- Effect's `.annotations({ message: () => ({ message: "...", override: true }) })` on a `Schema.Union` makes TreeFormatter return only the custom string — no branch dump.

Suggested approach: annotate each `Schema.Union` that surfaces through MCP with a `message` annotation with `override: true`. The schema owns its error message; no call-site changes to the 4 `String(decoded.left)` locations. Example:

```typescript
export const ControlCommandSchema = Schema.Union(
  CreatureEndTurnControlSchema,
  CreatureLongRestControlSchema,
  // ...
).annotations({
  message: () => ({
    message: "Invalid control command. Valid types: END_TURN, LONG_REST, ...",
    override: true,
  }),
});
```

Affected union schemas:

1. `ControlCommandSchema` in `packages/core/src/available-actions.ts:1384`
2. Action token union in `packages/mcp/src/server.ts` (if applicable)
3. Table event schema in `packages/mcp/src/server-table-events.ts` (if applicable)
4. Start battle schema in `packages/mcp/src/start-battle.ts` (if applicable)

Acceptance criteria:

- All 4 locations produce concise error messages on invalid input.
- Error messages include the invalid value and the valid alternatives where feasible.
- No change to happy-path behavior.

Verification:

- Manual test: send an invalid `type` to `execute_control_command` and confirm the error fits in a few lines.
- `/simplify` convergence (2 rounds).

### Task 27 - MCP2-D - Unarmed Strike Fallback in Battle Attack

Status: ready-for-implementation-after-light-research.

Depends on: Task MCP2-A (battle attack public boundary, done).

Blocks: Task MCP2-B (fighter attacks goblin end-to-end) — removes the need for a weapon-hardcoding workaround.

Next action: light research on how `battleAttack` in `battle-machine-actions-attack.ts` resolves damage when `mainHandWeapon` is null, then implement the unarmed strike fallback.

Purpose:

- Per SRD 5.2.1 (Rules-Glossary.md), every creature can make an unarmed strike: 1 + STR mod bludgeoning damage, attack bonus = STR mod + Proficiency Bonus. The current `canUseBattleAttack` function returns `false` when `mainHandWeapon == null`, blocking all attacks for unarmed creatures.

Context:

- Bug location: `packages/core/src/available-actions.ts:3444-3447` — `canUseBattleAttack` returns false when `mainHandWeapon == null`.
- Quint spec already models unarmed damage correctly: `creature.qnt:757-761` has `unarmedDamage(strMod)` returning `max(0, 1 + strMod)`.
- The attack handler in `battle-machine-actions-attack.ts` is flexible — it falls back to event-provided values for most fields, so changes should be contained.
- SRD unarmed strike offers three options (Damage, Grapple, Shove); only Damage needs modeling now. Grapple/Shove are separate actions.

Implementation sketch:

1. Remove the `mainHandWeapon == null` early-return in `canUseBattleAttack`.
2. Define a synthetic unarmed `BattleWeaponProfile` constant: `{ name: "unarmed strike", damageType: "bludgeoning", isMelee: true, properties: new Set(), damageDie: undefined }`.
3. In `battleAttack`, fall back to the unarmed profile when `mainHandWeapon` is null; compute flat damage as `1 + strMod` (matching `creature.qnt:unarmedDamage`).
4. Ensure BATTLE_ATTACK token generation in `available-actions.ts` uses the unarmed profile for its summary text.

Acceptance criteria:

- A creature with `mainHandWeapon == null` can make a BATTLE_ATTACK (unarmed strike).
- Unarmed strike damage = max(0, 1 + STR mod), bludgeoning, always proficient.
- Unarmed strike is melee, 5-foot reach.
- No regression for creatures with weapons equipped.
- Quint parity: TS unarmed damage matches `creature.qnt:unarmedDamage`.

Verification:

- Tier 1 MBT run passes.
- `/simplify` convergence (2 rounds).
- RAW check against `.references/srd-5.2.1/Rules-Glossary.md` unarmed strike entry.

### Task 28 - MCP4-A - BATTLE_ADD_CREATURE Mid-Battle Creature Insertion

Status: done.

Depends on: none.

Blocks: Task MCP2-B (enables multi-goblin encounters).

Next action: none.

Purpose:

- Allow adding one or more creatures to an ongoing battle mid-turn (DM spawns reinforcements, summons arrive, etc.). This is a pure state insertion — no automatic trigger evaluation (readied action triggers are DM decisions per ARCHITECTURE.md).

Context:

**Event shape:**

```typescript
{
  type: "BATTLE_ADD_CREATURE";
  creatures: ReadonlyArray<InitCreatureConfig>;
  insertAtIndex: number; // 0-based position in current initiative array
}
```

- `creatures`: Non-empty array. Reuses `InitCreatureConfig` (same as BATTLE_INIT entries — supports both `statBlockId` catalog monsters and full PC configs).
- `insertAtIndex`: Where in the initiative array the new creatures are inserted as a contiguous block. Range: `[0, initiative.length]`. New creatures are sorted among themselves by effective initiative score (descending, stable) within the block.
- Per ARCHITECTURE.md: "Initiative tie-breaking: The DM decides ties (the spec receives the sorted order)." The caller controls placement via `insertAtIndex`.

**Initiative turnIndex adjustment:**

- If `insertAtIndex <= turnIndex`: `turnIndex' = turnIndex + creatures.length` (active creature shifts right).
- If `insertAtIndex > turnIndex`: `turnIndex' = turnIndex` (unchanged).

**Guards:**

- Only accepted in `activeTurn` phase (not during reaction, AoE, movement, legendary action, or readied action windows).
- Reject duplicate IDs (any new creature ID already in `creatures` map → silent no-op).

**MCP surface:** `execute_control_command` with `scope: "battle", type: "BATTLE_ADD_CREATURE"`.

Implementation sketch:

1. **`battle-machine-events.ts`**: Add `BATTLE_ADD_CREATURE` variant to `BattleEvent` union.
2. **`battle-machine-actions-turn.ts`**: Add `battleAddCreature` action function. Extract shared `buildCreatureState(cfg: InitCreatureConfig): BattleCreatureState` helper from existing `battleInit` logic (lines 132-259) to avoid duplication.
3. **`battle-machine.ts`**: Register action in the XState machine; add `BATTLE_ADD_CREATURE` event handler in the `activeTurn` state's `on` map.
4. **`available-actions.ts`**: Add `BattleAddCreatureControlSchema` to `ControlCommandSchema` union. Schema: `{ scope: "battle", type: "BATTLE_ADD_CREATURE", creatures: NonEmptyArray(BattleInitCreatureConfigSchema), insertAtIndex: int >= 0 }`.
5. **`server-control.ts`**: Add `Match.when` clause in `buildBattleControlEvent` mapping the command to the event (call `toBattleInitCreatureConfig` on each creature). Add duplicate-ID validation.
6. **Quint spec (`battle.qnt`)**: Add `bAddCreature` action with nondeterministic creature + insertion index. Guard on `BPActiveTurn` and `bTurnStarted`. Add to `battleStep` dispatch. Single fixed creature ID "E" to keep state space manageable.
7. **MBT bridge (`battle-projection.mbt.test.ts`)**: Add driver handler for `bAddCreature`.

Acceptance criteria:

- Creatures added mid-turn appear in `creatures` map and `initiative` array at correct position.
- `turnIndex` adjusted correctly (active creature unchanged after insertion).
- Duplicate IDs silently rejected.
- Event rejected during reaction/AoE/movement/legendary/ready phases.
- Multiple creatures sorted among themselves by initiative score within the inserted block.
- Invariants preserved: `initiativeMatchesCreatures`, `initiativeNoDuplicates`, `turnIndexValid`.

Verification:

- Unit tests: insert before/at/after turnIndex; duplicate ID rejection; phase guard.
- Tier 1 MBT run passes with `bAddCreature` in `battleStep`.
- `/simplify` convergence (2 rounds).

Closeout (2026-04-11):

- Added `BATTLE_ADD_CREATURE` across Quint, XState, the battle control schema, MCP routing, and the battle projection MBT driver.
- Runtime acceptance is limited to `activeTurn` after `BATTLE_START_TURN`; insertion before the first turn or in reaction/AoE/movement/legendary/readied windows is rejected by no-op.
- Duplicate IDs are rejected atomically against both the incoming batch and the existing battle roster; mixed batches do not partially apply.
- New creatures are stable-sorted within the inserted block by effective initiative score, and `turnIndex` shifts only when insertion happens at or before the active creature.
- Battle-owned default positions stay collision-free by shifting only combatants still using the init-derived `{ row: index * 2, col: 0 }` layout, leaving explicitly positioned combatants untouched.
- RAW / terminology verification: reviewed `.references/srd-5.2.1/Playing-the-Game.md` and `.references/srd-5.2.1/Rules-Glossary.md` for Initiative ordering, plus `UBIQUITOUS_LANGUAGE.md` and `ARCHITECTURE.md` for initiative/tie terminology and DM-owned tie breaking. This task is an architecture/control-surface addition, not a new SRD combat mechanic.
- Verification completed with targeted tests, a generated Tier 1 battle projection MBT run (`CI=true QUINT_SEED=0x1a2b3c4d MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`), `pnpm quality`, and `/simplify` rounds 1-2 convergence.

### Task 29 - MCP4-B - BATTLE_REMOVE_CREATURE Mid-Battle Creature Removal

Status: done.

Depends on: none (pairs with MCP4-A).

Blocks: none.

Next action: none; completed 2026-04-11.

Purpose:

- Allow removing one or more creatures from an ongoing battle mid-turn (creature flees, is banished, teleports away, DM narrative, etc.). This is a pure state removal — no automatic trigger evaluation.

Context:

**Event shape:**

```typescript
{
  type: "BATTLE_REMOVE_CREATURE";
  creatureIds: ReadonlyArray<CreatureId>; // Non-empty
}
```

- `creatureIds`: Non-empty array of creature IDs to remove.
- Removing the **active creature** (the one whose turn it is) should be handled: skip to the next turn (set `turnStarted: false`, advance `turnIndex`).

**Initiative turnIndex adjustment:**

- Count how many removed creatures have indices < `turnIndex` in the initiative array. Call this `removedBefore`.
- `turnIndex' = turnIndex - removedBefore`.
- If the active creature itself is removed: advance to next creature (`turnIndex` points to the next entry after removal, effectively ending the removed creature's turn).

**Side effects on removal:**

- **Concentration**: If a removed creature is concentrating, break concentration (end the spell's effects on other creatures via existing `breakConcentrationAndPropagate`).
- **Grapple**: If a removed creature is grappling someone, release them (`grappledBy: null` on the grappled target). If a removed creature is being grappled, the grappler's `grapplingTarget` becomes null.
- **Help targets**: Remove any help links involving the removed creature.
- **Readied actions targeting removed creature**: Ready fizzles naturally — when the DM tries to release it, there's no valid target. No special handling needed.

**Guards:**

- Only accepted in `activeTurn` phase (same as BATTLE_ADD_CREATURE).
- Reject if any `creatureId` is not in the `creatures` map (silent no-op).
- Cannot remove ALL creatures (at least one must remain) — or allow it and let the battle end naturally.

**MCP surface:** `execute_control_command` with `scope: "battle", type: "BATTLE_REMOVE_CREATURE"`.

Implementation sketch:

1. **`battle-machine-events.ts`**: Add `BATTLE_REMOVE_CREATURE` variant to `BattleEvent` union.
2. **`battle-machine-actions-turn.ts`**: Add `battleRemoveCreature` action function.
3. **`battle-machine.ts`**: Register action; add event handler in `activeTurn` state.
4. **`available-actions.ts`**: Add `BattleRemoveCreatureControlSchema` to `ControlCommandSchema` union. Schema: `{ scope: "battle", type: "BATTLE_REMOVE_CREATURE", creatureIds: NonEmptyArray(Schema.String) }`.
5. **`server-control.ts`**: Add `Match.when` clause mapping the command to the event.
6. **Quint spec (`battle.qnt`)**: Add `bRemoveCreature` action. Guard on `BPActiveTurn`. Nondeterministic choice of which creature to remove (from existing non-active creatures). Handle concentration break and grapple release.
7. **MBT bridge**: Add driver handler for `bRemoveCreature`.

Edge cases:

- Removing a creature whose turn is active: treat as "fled on their turn" — end their turn immediately (equivalent to `BATTLE_END_TURN` + removal).
- Removing the last enemy: battle continues (DM decides when combat ends per ARCHITECTURE.md).
- Removing a creature that is a spell target: spell effects referencing that creature should clean up gracefully (existing `activeEffects` with source = removed creature get removed).

Acceptance criteria:

- Removed creatures disappear from `creatures` map and `initiative` array.
- `turnIndex` adjusted correctly (active creature unchanged unless it was removed).
- Concentration broken on removal (spell effects cleaned up).

### Task 30 - ARCH-BATTLE-PROJ - Battle Projection Contract And Methodology

Status: ready-for-research.

Depends on: none.

Blocks: none.

Next action: research the existing battle/creature ownership split in `ARCHITECTURE.md`, `battle.qnt`, `battle-machine-types.ts`, `battle-machine-actions-turn.ts`, and the MCP `start_battle` path; then write back a concrete projection contract and, if needed, spawn follow-up implementation tasks.

Purpose:

- The repo intentionally uses battle-owned combatant projections instead of embedding creature child actors inside battle. That architectural decision is documented, but the projection methodology is not declared as a first-class contract.
- Recent task work exposed drift: `dexMod` is projected into battle for battle-owned Monk reaction math, while `strMod` is not, even though new unarmed-attack work started depending on Strength-owned semantics. That is a signal that battle-field promotion is happening opportunistically rather than through an explicit method.
- We need a documented answer to:
  - why battle owns a flat `Map<CreatureId, BattleCreatureState>` instead of reusing the creature machine directly;
  - what facts must be promoted into `BattleCreatureState` / `Combatant`;
  - what facts remain caller/session-owned;
  - how future projection changes must be implemented consistently across Quint, TS, init config, MCP routing, and tests.

Context:

- `ARCHITECTURE.md` already says the battle machine is authoritative for combat semantics, while the creature machine is a local projection/debugging surface, and that battle uses flat creature context instead of child actors because combat needs atomic cross-creature updates and ordered reaction phases.
- `battle.qnt` and `BattleCreatureState` already act as the de facto battle projection contract, but fields are added case-by-case.
- `InitCreatureConfig` plus `battleInit` in `battle-machine-actions-turn.ts` is the real promotion path into battle state today.
- `battle-projection.mbt.test.ts` already contains a more explicit projection pattern (`projectToBattle`) for MBT normalization, which may be a useful model for production projection methodology.
- Recent work and docs (`plans/TODO.md`) show multiple abstraction leaks where generic battle helpers carry rule-specific logic; this task is about the adjacent architectural leak where battle ownership rules are implicit instead of declared.

Research questions:

1. What is the minimal explicit projection contract that matches current architecture without introducing redundant state?
2. Should production code adopt named projector functions for PC and monster battle init, instead of ad hoc field accumulation in `battleInit` and session adapters?
3. For battle-owned semantics, should the rule be "if battle resolves it, all required inputs belong on `Combatant` / `BattleCreatureState`"?
4. Is the current `dexMod` without `strMod` split intentional, temporary, or architectural drift?
5. What concrete documentation and code-structure changes would prevent future one-off field promotion mistakes?

Acceptance criteria:

- The plan records a clear, repo-consistent projection contract covering:
  - authoritative owner for combat semantics;
  - battle-owned projected facts;
  - caller/session-owned facts;
  - required update surfaces when promoting a new field.
- The research writes back specific recommendations for code and docs, not just observations.
- If the contract reveals missing implementation work, add bounded follow-up tasks rather than burying them in prose.
- The conclusion explicitly addresses the `dexMod` / `strMod` mismatch and says whether it is intentional or should be corrected.

Verification:

- Read and cite the relevant local sources:
  - `ARCHITECTURE.md`
  - `battle.qnt`
  - `packages/core/src/battle-machine-types.ts`
  - `packages/core/src/battle-machine-actions-turn.ts`
  - `packages/core/src/battle-projection.mbt.test.ts`
  - MCP `start_battle` / runtime routing files
- `/simplify` convergence (2 rounds).
- Confirm the resulting plan/doc update keeps the `ralph-task-index`, DAG row, and task section synchronized.
- Grapple links severed on removal.
- Help targets cleaned up.
- Event rejected during reaction/AoE/movement/legendary/ready phases.
- At least one creature must remain after removal (or define explicit battle-end behavior).

Verification:

- Unit tests: remove before/at/after turnIndex; remove active creature; concentration break; grapple release; help cleanup.
- Tier 1 MBT run passes with `bRemoveCreature` in `battleStep`.
- `/simplify` convergence (2 rounds).

### Task 31 - MON1 - Canonical Stat Block Schema + Goblin Backfill

Status: ready-for-research.

Depends on: none.

Blocks: follow-up monster database slices such as derived battle-option projection from authored sections, the first broader non-goblin SRD slice, spellcasting stat-block support, and later advanced generic monster facilities.

Next action: read the relevant SRD goblin entries in `.references/srd-5.2.1/Monsters/Monsters-E-G.md`, re-read `UBIQUITOUS_LANGUAGE.md`, inspect `packages/core/src/monster-types.ts`, `packages/core/src/monster-catalog.ts`, and `packages/core/src/monster-catalog.md`, then write back and implement the canonical authored-section `StatBlock` shape with explicit provenance and goblin backfill while preserving current public MCP behavior.

Purpose:

- The repo already proved the ownership direction with a narrow goblin-focused stat-block facility, but the current `StatBlock` shape still centers attack maps and shortcut fields such as `battleBonusActionOptions` and `battleReactionOptions`.
- The monster database PRD now fixes the durable decisions: `StatBlock` is the canonical monster-authored type, SRD is provenance, 5e-tools may assist normalization but never becomes provenance, and unsupported abilities must remain representable structurally rather than through decorative status enums.
- Before wider SRD coverage or new generic monster facilities are queued, the core schema has to move from "goblin plus a few runtime shortcuts" to a durable authored record model that can absorb future monster sections without spawning duplicate registries or monster-specific handlers.

Context:

- `packages/core/src/monster-types.ts` currently defines `StatBlock`, `MonsterAttack`, `MultiattackSlot`, and the goblin-era bonus-action/reaction shortcut fields.
- `packages/core/src/monster-catalog.ts` owns the current named goblin entries and already documents SRD provenance and core ownership.
- `packages/core/src/monster-catalog.md` now states explicitly that SRD is provenance and 5e-tools is never provenance.
- `PRD_MONSTER_DATABASE.md` and `plans/monster-database-plan.md` define the intended next architecture, but `ACTIVE_PLAN.md` should queue only the first bounded slice, not the whole rollout.
- Existing goblin MCP behavior is already live and should remain stable while the underlying authored shape is widened.

Research questions:

1. What is the minimal canonical `StatBlock` authored-section shape that covers current goblins while remaining durable for later monster expansion?
2. How should executable and text-only monster abilities be represented so the distinction exists in both type shape and runtime data without introducing a no-op status enum?
3. Which current goblin shortcut fields should remain as derived projection outputs, and which should stop being primary authored storage?
4. What explicit provenance shape on the owned goblin records best preserves SRD citation clarity without introducing redundant state or a speculative importer layer?
5. What, if any, temporary compatibility aliases are justified during the backfill, and which should be avoided to keep the new shape clean?

Implementation output:

- Widen the monster type family around canonical authored sections such as traits, actions, bonus actions, reactions, legendary actions, and spellcasting-ready placeholders where needed by the new shape.
- Add explicit provenance typing and owned-record provenance for the current goblin entries.
- Represent executable abilities and text-only abilities structurally in the new type family.
- Backfill `goblinMinion`, `goblinWarrior`, and `goblinBoss` into the new canonical authored shape.
- Preserve current battle and MCP behavior by using compatibility projection rather than widening public surfaces in this task.
- Write back any settled schema/projection decisions into the relevant monster docs if the implementation clarifies them.

Acceptance criteria:

- `StatBlock` is the canonical monster-authored type and stores goblin-authored sections explicitly instead of relying on attack-only and action-shortcut fields as the primary shape.
- The current goblin entries carry explicit SRD provenance directly on the owned records.
- The type system and runtime data distinguish executable abilities from text-only abilities structurally.
- Existing goblin battle and MCP flows keep working without new monster-specific public commands or adapter-owned monster facts.
- Any compatibility-only shortcut field retained for transition purposes is derived or clearly temporary rather than the new primary authored representation.

Verification:

- RAW check: read the relevant goblin stat blocks in `.references/srd-5.2.1/Monsters/Monsters-E-G.md`, plus `UBIQUITOUS_LANGUAGE.md`, before editing.
- `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.
- Focused core tests covering the widened goblin stat-block shape and any updated projection helpers.
- Focused MCP or integration tests sufficient to confirm the existing goblin encounter path still works after the backfill.
- Run the narrowest parity checks needed for touched core behavior; avoid widening into unrelated MBT work unless the implementation changes battle semantics.

Follow-up shape note:

- If this task lands cleanly, likely follow-up queue items are:
  - derive generic battle action surfaces from authored stat-block sections rather than primary shortcut fields;
  - add the first non-goblin SRD monsters that fit the already-supported generic facilities;
  - add the spellcasting stat-block foundation slice;
  - add advanced generic monster facilities only when repeated SRD patterns justify them.
- Do not append those as concrete active-queue tasks until this schema/backfill slice closes and its exact projection consequences are known.

## Extra Research Summary

Needs extra research before coding:

- Task MCP0-A: dead-creature condition policy and RAW citations for Unconscious/Dead/Stable.
- Task MCP0-B: dead-creature exhaustion mutation policy.
- Task A: Condition table completion. RAW condition reread and column decision required.
- Task E: Movement/help geometry. Session/product ownership decision required.
- Task G: Attack riders. RAW class feature reread required.
- Task I: Build-map metadata. Needs a concrete consumer.
- Task J: Generic table events. Needs source/provenance review.
- Task MCP1-A: current MCP stdio/test-host routing and minimal session-host shape.
- Task MCP1-B: existing monster/stat-block ownership and Goblin Minion RAW projection.
- Task MCP1-C: Fighter durable/config mapping into battle init.
- Task MCP2-A: blocked on Task MCP1-C encounter start work; consume Task D's settled battle attack boundary.
- Task MCP3-A: fuller goblin support after stat-block rider/bonus-action support exists.

Light research only:

- Task MCP0-C: current decode path and available action type index.
- Task MCP0-D: current documentation/tool description wording for `SHORT_REST`.
- Task MCP2-B: integration wiring once prerequisites are done.
- Task MCP2-C: confirm `ParseResult.TreeFormatter` output is concise enough, check all 4 affected locations.
- Task MCP2-D: confirm `battleAttack` damage resolution path for null weapon, check feature interactions (Rage, Divine Smite).
- Task B: Battle size ownership. RAW Grapple/Size reread required, but design is already documented.
- Task C: ResourceCost typed refactor. Confirm consumer blast radius and immediate-cost scope.
- Task H: PassiveModifiers. Research only if selected; otherwise defer.

## Recommended Coding Loop

If choosing one implementation batch:

1. Task MCP0-A: Dead-Creature Condition Mutation Bug.
2. Task MCP0-C: Short Unknown Action Error.

If choosing one research-first batch:

1. Task MCP1-A: Session Host Architecture.
2. Task A: Condition Consequence Table Completion Research.

If choosing a support-layer cleanup:

1. Task C: ResourceCost Typed Refactor.

Avoid in the first APR10 implementation loop:

- `BATTLE_ATTACK` implementation.
- Fighter-vs-goblin end-to-end implementation before Task MCP1-C and Task MCP2-A are complete.
- Full Goblin Warrior/Nimble Escape support before core stat-block rider/bonus-action ownership exists.
- `BATTLE_MOVE` / `BATTLE_HELP_ATTACK` implementation.
- `BATTLE_LEGENDARY_ATTACK` implementation.
- Attack riders.
- Build-map metadata without a consumer.
