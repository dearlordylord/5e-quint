# Active Plan

Date: 2026-04-11

This is the single active planning queue.

The previous MCP/battle follow-up queue is complete and has been removed from the active file. The active queue now contains two coordinated implementation tracks plus one deferred MCP backlog track:

- the character-creation program defined in [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md);
- the monster-database tracer-bullet rollout defined in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [monster-database-plan.md](./monster-database-plan.md).
- the deferred MCP action-surface backlog summarized in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).

## Batch Objective

Land the current bounded implementation slices for SRD 5.2.1 character creation/character-sheet projection and the SRD monster database without:

- duplicating character facts across app, MCP, creature runtime, or battle runtime;
- duplicating monster-authored facts across core, MCP, app, or battle/runtime projections;
- widening the main battle machine into a character builder;
- introducing adapter-owned character registries;
- introducing adapter-owned monster registries;
- drifting away from the existing Quint construction/leveling semantics in `creature.qnt`.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Do not pick up unless the batch objective changes.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "CHAR1",
      "status": "done",
      "title": "Canonical Character Domain"
    },
    {
      "number": 1,
      "id": "CHAR2",
      "status": "done",
      "title": "Score Generation And Origin Validation"
    },
    {
      "number": 2,
      "id": "CHAR3",
      "status": "done",
      "title": "Proficiencies Features And Level-Gated Character Facts"
    },
    {
      "number": 3,
      "id": "CHAR4",
      "status": "done",
      "title": "Equipment And Loadout Projection"
    },
    {
      "number": 4,
      "id": "CHAR5",
      "status": "done",
      "title": "Sheet-Derived Numbers And Spellcasting Projection"
    },
    {
      "number": 5,
      "id": "CHAR6",
      "status": "done",
      "title": "Guided Workflow Shell"
    },
    {
      "number": 6,
      "id": "CHAR7",
      "status": "ready-for-implementation-after-light-research",
      "title": "Level Advancement And Multiclass Continuation"
    },
    {
      "number": 7,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 8,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
    },
    {
      "number": 9,
      "id": "POST1",
      "status": "blocked",
      "title": "Formal Creation Semantics"
    },
    {
      "number": 10,
      "id": "POST2",
      "status": "blocked",
      "title": "Open Choices And Selective Invalidation"
    },
    {
      "number": 11,
      "id": "POST3",
      "status": "blocked",
      "title": "Formal Advancement And Higher-Level Starts"
    },
    {
      "number": 12,
      "id": "POST4",
      "status": "blocked",
      "title": "Workflow And Projection Convergence"
    },
    {
      "number": 13,
      "id": "MON1",
      "status": "done",
      "title": "Canonical Goblin Tracer Bullet"
    },
    {
      "number": 14,
      "id": "MON2",
      "status": "ready-for-implementation-after-light-research",
      "title": "Second Monster Tracer Bullet"
    },
    {
      "number": 15,
      "id": "MON3",
      "status": "blocked",
      "title": "Advanced Pattern Tracer Bullet"
    },
    {
      "number": 16,
      "id": "MON4",
      "status": "blocked",
      "title": "Hand-Authored SRD Dataset Expansion"
    },
    {
      "number": 17,
      "id": "MCPA1",
      "status": "deferred",
      "title": "Battle Attack Public Contract"
    },
    {
      "number": 18,
      "id": "MCPA2",
      "status": "deferred",
      "title": "Public Attack Action Slices"
    },
    {
      "number": 19,
      "id": "MCPA3",
      "status": "deferred",
      "title": "Spatial Action Public Contracts"
    },
    {
      "number": 20,
      "id": "MCPA4",
      "status": "deferred",
      "title": "Public Grapple Attack Slice"
    },
    {
      "number": 21,
      "id": "MCPA5",
      "status": "deferred",
      "title": "Battle Attack Rider Windows"
    },
    {
      "number": 22,
      "id": "MCPA6",
      "status": "deferred",
      "title": "Generic Spell Resolution Ownership"
    },
    {
      "number": 23,
      "id": "MCPA7",
      "status": "deferred",
      "title": "Semantic Table Event Expansion"
    },
    {
      "number": 24,
      "id": "MCPA8",
      "status": "deferred",
      "title": "Monster Control And Legendary Action Surface"
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
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks, documentation-only tasks, and pure workflow-shell tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. For implementation tasks, use the narrowest verification tier that matches the touched ownership surface.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
| ----- | ---- | ------ | ---------- | ------ | ----------- | ----------------- |
| 0 | CHAR1 - Canonical Character Domain | done | none | CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7 | Landed `CharacterDraft` / `CharacterSheet` in `packages/core/src/character-domain.ts` with finalization that rejects incomplete or contradictory class/background/species/language/alignment state. | Complete |
| 1 | CHAR2 - Score Generation And Origin Validation | done | CHAR1 | CHAR3, CHAR5 | Landed owned ability-score generation, background score-increase validation, and SRD starting-language validation on the canonical character sheet. | Complete |
| 2 | CHAR3 - Proficiencies Features And Level-Gated Character Facts | done | CHAR1, CHAR2 | CHAR4, CHAR5, CHAR7 | Landed owned build choices for class/background/species/feat-driven proficiencies, subclass ownership/gating, multiclass prerequisite validation, granted-language choices, and class-resource derivation helpers on the canonical character sheet. | Complete |
| 3 | CHAR4 - Equipment And Loadout Projection | done | CHAR1, CHAR3 | CHAR5 | Landed owned starting-equipment choices, leftover starting-gold tracking, bounded combat-equipment ownership, loadout validation, and battle-facing weapon/hand/shield/armor projection sourced from `CharacterSheet`. | Complete |
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | done | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Landed owned spellcasting selections plus one `CharacterSheet` derivation path for sheet numbers, `DndMachineInput`, and battle init projection. | Complete |
| 5 | CHAR6 - Guided Workflow Shell | done | CHAR1, CHAR2, CHAR5 | none | Landed a thin `/character` workflow shell that persists `CharacterDraft`, keeps step order in the app surface, and renders canonical finalization plus derived projection outputs without UI-owned validation. | Complete |
| 6 | CHAR7 - Level Advancement And Multiclass Continuation | ready-for-implementation-after-light-research | CHAR1, CHAR3, CHAR5 | none | Implement ordered level-up transitions over `CharacterDraft` / `CharacterSheet` with advancement history as the canonical legality record for higher-level starts and multiclass continuation. Model the full level-gated advancement choice surface needed for legality and downstream derivation: class taken each level, subclass selections when they occur, Ability Score Improvement feat choices, alternative feat choices where allowed, and level-19 Epic Boon choices. Reuse `creature.qnt` as the semantic source for XP thresholds, multiclass legality, HP growth, hit-die growth, proficiency progression, and caster-level/slot behavior, but align any stale helper semantics to SRD 5.2.1 before relying on them. Keep finalized `CharacterSheet` and `deriveCharacterSheetNumbers` as the single downstream projection path, and do not keep `classLevels` and advancement history as contradictory peer-owned facts. | Ready only if implementation treats ordered advancement as the canonical legality surface, includes feat/ASI/Epic Boon choices where they affect legality or derivation, and removes stale SRD cadence assumptions before landing |
| 7 | H - PassiveModifiers Sub-Record | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 8 | I - Build-Map / Hole Metadata | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 9 | POST1 - Formal Creation Semantics | blocked | CHAR6, CHAR7 | POST2, POST4 | Once the current `CHAR` sequence is complete, formalize the creation draft/sheet semantics in Quint, keeping the landed TS character domain as the implementation baseline and parity target rather than rewriting the product shape from scratch. | Future post-`CHAR` phase; depends on current workflow and advancement research landing |
| 10 | POST2 - Open Choices And Selective Invalidation | blocked | POST1 | POST4 | Build the explicit `open choices` / `validation issues` / dependency-aware invalidation model on top of the immutable `CHAR` foundation so guided workflows can distinguish incompleteness from illegality. | Depends on formal creation semantics |
| 11 | POST3 - Formal Advancement And Higher-Level Starts | blocked | CHAR7, POST1 | POST4 | Formalize advancement as repeated legal level-up transitions over the same canonical sheet, then use that path for higher-level starts rather than bespoke bootstrapping. | Depends on advancement research plus formal creation semantics |
| 12 | POST4 - Workflow And Projection Convergence | blocked | POST1, POST2, POST3 | none | Converge the guided workflow shell and runtime projections onto the formal creation/advancement surfaces without introducing a second semantic model. | Final post-`CHAR` integration phase |
| 13 | MON1 - Canonical Goblin Tracer Bullet | done | none | MON2 | Landed canonical goblin `StatBlock` records with explicit SRD provenance and one projection path into generic battle/MCP surfaces. | Complete |
| 14 | MON2 - Second Monster Tracer Bullet | ready-for-implementation-after-light-research | MON1 | MON3, MON4 | Add one non-goblin SRD monster through the same core-owned `StatBlock` and projection path. Prefer a monster that proves a materially different slice, but avoid new shared generic facilities unless the RAW forces them. | Ready if kept to catalog/schema/projection work and scoped away from shared runtime refactors owned by post-`CHAR` convergence |
| 15 | MON3 - Advanced Pattern Tracer Bullet | blocked | MON2 | MON4 | Add one advanced monster that proves a repeated pattern such as recharge, legendary actions, or a stronger multiattack shape through a generic facility. Sequence this after MON2 and coordinate with shared runtime/projection work so it does not race `POST4`. | Blocked on a stable non-goblin baseline plus shared-surface sequencing |
| 16 | MON4 - Hand-Authored SRD Dataset Expansion | blocked | MON2, MON3 | none | Expand from the tracer bullets to the agreed SRD monster dataset, keeping unsupported patterns explicit and preserving core-owned provenance. | Blocked on tracer-bullet validation of schema and advanced-generic-facility path |
| 17 | MCPA1 - Battle Attack Public Contract | deferred | none | MCPA2, MCPA5, MCPA8 | Keep deferred unless the batch objective changes back toward MCP/action-surface work. When reactivated, lock the strict public/runtime boundary for `BATTLE_ATTACK` first. | Detailed blockers live in `MCP_EVENT_SURFACE_AUDIT.md`; this is the shared prerequisite for most attack-shaped MCP work |
| 18 | MCPA2 - Public Attack Action Slices | deferred | MCPA1 | none | Keep deferred. After `MCPA1`, expose the bounded public attack slices beginning with `BATTLE_ATTACK`, then `BATTLE_OFF_HAND_ATTACK` once the Light-property follow-through is wired. | Depends on the finalized battle attack contract rather than inventing separate payloads |
| 19 | MCPA3 - Spatial Action Public Contracts | deferred | none | none | Keep deferred. If reprioritized, define bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` over explicit caller/session spatial facts only. | No geometry owner in core or MCP; keep the contract aligned with `MCP_EVENT_SURFACE_AUDIT.md` |
| 20 | MCPA4 - Public Grapple Attack Slice | deferred | none | none | Keep deferred. If reprioritized, expose `BATTLE_GRAPPLE` once the public contract for `targetId` plus resolved save outcome is wired cleanly. | Battle already owns Size legality; the remaining issue is public contract shape |
| 21 | MCPA5 - Battle Attack Rider Windows | deferred | MCPA1 | none | Keep deferred. If reprioritized, add battle-owned rider windows for `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE`. | Treat these as battle interrupt/hit windows, not creature-scope tokens |
| 22 | MCPA6 - Generic Spell Resolution Ownership | deferred | none | none | Keep deferred. If reprioritized, decide and then implement the honest public ownership path for generic save, concentration, and AoE spell resolution surfaces. | This is design-heavy and may stay partially research-first |
| 23 | MCPA7 - Semantic Table Event Expansion | deferred | none | none | Keep deferred. If reprioritized, add narrow semantic public routes for max-HP change, effect application/removal, and environmental hazard progression where the audit says raw events are not safe public schemas. | Prefer semantic commands over raw payload passthrough |
| 24 | MCPA8 - Monster Control And Legendary Action Surface | deferred | MCPA1, MON3 | none | Keep deferred. If reprioritized, add explicit monster-control/public MCP routes for named legendary/recharge/daily abilities and then the bounded `BATTLE_LEGENDARY_ATTACK` slice. | Depends on both the generic attack boundary and stable stat-block-owned monster action projection |

## Current Integrated Baseline

Already wired on `master` and relevant to this batch:

- The repo's authoritative combat boundary remains `battle.qnt` plus `battle-machine.ts`.
- `creature.qnt` already contains substantial construction and leveling helpers:
  - `CharConfig`
  - point-buy validation
  - XP/level helpers
  - ASI helpers
  - multiclass prerequisite helpers
  - first-level and level-up HP helpers
  - class-level aggregation helpers
- TypeScript already contains several partial character-facing derivations:
  - hit dice and multiclass prerequisites in `class-tables.ts`
  - slot derivation in `machine-spells.ts`
  - partial species combat traits in `species-traits.ts`
- The current TS runtime starts from pre-derived combat inputs rather than an owned character-sheet model.
- `start_battle` and current player loadouts are intentionally narrow and should be treated as transitional, not the long-term character architecture.

Current architecture decisions for this batch:

- `CharacterSheet` is the PC-owned canonical record; `StatBlock` remains monster-only language.
- Canonical class/level ownership is `primaryClass + classLevels`; total level is derived from `classLevels` instead of being stored twice.
- Character creation must not be generalized into the main battle machine.
- Runtime projections must flow from owned character data to creature/battle runtime, not the reverse.
- Monster-authored data must remain core-owned and project exactly once into runtime/battle surfaces; MCP and app consume IDs or projections, not their own monster registries.
- Shared battle/runtime facilities are sequenced resources: character and monster work may both use them, but only one task should reshape them at a time.

Planning note:

- `CHAR1` through `CHAR7` are treated as immutable foundation for any appended work below.
- The post-`CHAR` queue is additive only; it does not revise the completed or in-flight `CHAR` tasks.
- New work should extend the landed character-domain/product shape toward the revised PRD semantics rather than reopening the earlier ownership decisions.
- `MON1` through `MON4` are the active monster track. They should reuse the landed monster ownership/provenance boundary and avoid racing `POST4` on shared projection/runtime refactors.
- `MCPA1` through `MCPA8` are a deferred MCP backlog track. They are visible here so the overnight loop can reason about them, but they must stay deferred unless this file is explicitly reprioritized back toward MCP/action-surface work.

## Task Selection Guidance

Recommended next coding-loop task:

1. **CHAR7 - Level Advancement And Multiclass Continuation**
   CHAR6 landed the thin workflow shell. The next slice should extend the same owned character domain and reuse the landed sheet-derived projection path instead of inventing a parallel higher-level-start surface.
2. **MON2 - Second Monster Tracer Bullet**
   This is the safe parallel monster task as long as it stays on catalog/schema/provenance/projection work and does not introduce a new shared generic runtime facility.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.
Do not start `MON3` before checking whether the needed generic facility would collide with active shared-surface work in `POST4` or other runtime/projection refactors.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CHAR7 next.
3. Monster work may proceed in parallel only on MON2 while it remains a catalog/provenance/projection slice and does not add a new shared generic runtime facility.
4. Keep `POST1` through `POST4` as the additive post-`CHAR` queue described above once CHAR7 lands.
5. Keep `MON3` and `MON4` blocked until the tracer-bullet sequence proves the shared-surface path.
6. Keep H, I, and `MCPA1` through `MCPA8` deferred unless this file is explicitly reprioritized.

## Archived Done Foundations

Completed-task details were trimmed from the active execution artifact. Keep only the durable downstream findings here.

- `CHAR1`: landed the canonical `CharacterDraft` / `CharacterSheet` boundary in core with `primaryClass + classLevels` as the owned class/level shape.
- `CHAR2`: landed owned SRD score-generation, background score adjustments, and Standard-Language validation on the canonical sheet.
- `CHAR3`: landed owned proficiency/subclass/class-resource build choices and validation on the canonical sheet.
- `CHAR4`: landed owned equipment/loadout facts and one-way projection into creature/battle-facing loadout fields.
- `CHAR5`: landed one owned derivation path for sheet numbers, spellcasting projection, machine input projection, and battle-init projection.
- `CHAR6`: landed the thin `/character` workflow shell over `CharacterDraft` plus direct finalization/derivation reuse.
- `MON1`: landed the canonical goblin tracer-bullet `StatBlock` with explicit SRD provenance and one projection path into generic battle/MCP surfaces.

Archive rule:

- If a future task needs the full implementation history for a done foundation task, inspect git history instead of re-expanding this file.

### Task 6 - CHAR7 - Level Advancement And Multiclass Continuation

Status: ready-for-implementation-after-light-research.

Depends on: CHAR1, CHAR3, CHAR5.

Blocks: none.

Next action:

- Implement an owned `advancement` / level-history record on the character domain and make it the canonical source for validating higher-level starts and multiclass continuation.
- Record every legality-relevant advancement choice in order: gained class each level, subclass picks when they occur, Ability Score Improvement feat choices, alternative feat choices, and level-19 Epic Boon choices.
- Validate multiclass entry against the character state that existed at the moment the new class level was taken, not only against final-sheet scores.
- Derive aggregate class totals, proficiency-sensitive values, HP/hit dice growth, and caster-level/slot projections from that ordered history through the existing finalization and sheet-derivation path.
- Align TS helpers, `creature.qnt`, and `UBIQUITOUS_LANGUAGE.md` to SRD 5.2.1 where current repo helpers still encode stale level-19 ASI assumptions.
- Model the full ordered advancement choice surface rather than only class totals: each gained class level, score-changing feat/ASI choices, and level-19 Epic Boon choices where they affect legality or downstream derivation.
- Align repo-owned traceability helpers to SRD 5.2.1 before depending on them; level 19 is an Epic Boon feature, not an Ability Score Improvement.

Acceptance criteria:

- Higher-level starts are represented as legal ordered advancement over the same owned character domain, not a bespoke bootstrap path.
- The character domain can represent all advancement choices needed to determine legality and downstream derivation for this slice, including feat/ASI and level-19 Epic Boon decisions.
- Multiclass legality is checked at the time of class entry using the character state that existed at that step.
- The implementation does not keep contradictory peer-owned `classLevels` and advancement history state.
- Advancement updates HP, hit dice, proficiency-sensitive values, features, and slot structures through one derivation path.

Research closeout:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` multiclassing and higher-level-start text, plus `UBIQUITOUS_LANGUAGE.md`.
- `creature.qnt` already owns the reusable advancement semantics this task needs: XP thresholds (`pXpForLevel`), ASI levels (`ASI_LEVELS` / `pIsASILevel` / `pApplyASI`), multiclass prerequisite helpers, first-level HP, level-up HP, class-level aggregation, and multiclass caster-level/slot helpers.
- The landed TS character layer already has the downstream projection path this task should feed: `deriveCharacterSheetNumbers`, class-resource derivation, and battle-init projection from finalized `CharacterSheet`.
- Therefore CHAR7 should not ship a standalone TS advancement rules engine. The implementation should add the minimal ordered advancement input needed to reuse the existing sheet finalization/projection flow and to preserve parity with Quint-owned semantics.
- Higher-level starts must preserve the ordered advancement history needed to verify each multiclass entry when it happened. Terminal validation against only the final post-ASI ability scores is too weak and would admit illegal builds.

Verification:

- Read `.references/srd-5.2.1/Character-Creation.md` for multiclass prerequisites, level advancement, and higher-level starts.
- Read `UBIQUITOUS_LANGUAGE.md` to confirm advancement remains on the owned `CharacterDraft` / `CharacterSheet` boundary and runtime facts remain projections.
- Inspected the current TS and Quint ownership surfaces (`packages/core/src/character-domain.ts`, `packages/core/src/character-sheet-derived.ts`, `packages/core/src/features/class-tables.ts`, `packages/core/src/machine-spells.ts`, `creature.qnt`) plus both Ralph implementation worktrees and review reports.
- Did not run MBT because CHAR7 closeout in this merge is research/plan-only and the repo guidance forbids battle MBT for research tasks.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR7`: keep the task open and tighten the implementation handoff around ordered advancement choices, feat/ASI recording, and SRD-accurate Epic Boon handling.
  - `POST3`: no status change; formal advancement should consume the same ordered-transition model discovered here.

### Task 7 - H - PassiveModifiers Sub-Record

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. It is not part of the current character-creation batch.

### Task 8 - I - Build-Map / Hole Metadata

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. It is not part of the current character-creation batch.

### Task 9 - POST1 - Formal Creation Semantics

Status: blocked.

Depends on: CHAR6, CHAR7.

Blocks: POST2, POST4.

User stories:

- 32, 33, 35, 40, 41, 44, 47, 48, 50, 52

What to build:

- Formalize the creation-side semantic model in Quint using the landed `CharacterDraft` / `CharacterSheet` product shape as foundation rather than replacing it.
- Model the canonical creation surfaces needed to explain an editable draft, a finalizable sheet, and projection from sheet to creature runtime.
- Keep battle out of character creation while making the formal layer the durable owner of creation semantics that should not drift over time.

Acceptance criteria:

- The plan for formal creation semantics treats the existing `CHAR` work as foundation, not as throwaway implementation.
- The formal model owns canonical creation semantics rather than relying on workflow state or battle init as a proxy.
- A clear projection boundary from finalized sheet to creature runtime is part of the formal design.

### Task 10 - POST2 - Open Choices And Selective Invalidation

Status: blocked.

Depends on: POST1.

Blocks: POST4.

User stories:

- 26, 27, 28, 29, 30, 41, 42, 47

What to build:

- Add explicit product/domain support for `open choices` distinct from `validation issues`.
- Define dependency-aware invalidation so changing an earlier choice only invalidates later choices that actually depend on it.
- Preserve the sequential SRD workflow shape without making step position the owner of legality or completeness.

Acceptance criteria:

- The system can distinguish missing required choices from illegal choices.
- Backtracking semantics preserve unrelated later choices whenever they remain valid.
- The guided workflow can surface open holes, illegal state, and reviewable complete state separately.

### Task 11 - POST3 - Formal Advancement And Higher-Level Starts

Status: blocked.

Depends on: CHAR7, POST1.

Blocks: POST4.

User stories:

- 12, 13, 16, 17, 31, 37, 38, 39, 46, 50

What to build:

- Model level advancement as a repeated legal transition over a finalized character sheet.
- Use that same advancement path to explain higher-level starts: create the level 1 character, then advance repeatedly until the target level is reached.
- Keep multiclass continuation, subclass gating, HP/hit-dice growth, feat/ASI picks, and spellcasting expansion on the same advancement path.

Acceptance criteria:

- Higher-level starts do not require a bespoke semantic path separate from creation plus advancement.
- Advancement uses the same canonical sheet model as creation.
- The design makes repeated level-up transitions the durable explanation for reaching higher-level characters.

### Task 12 - POST4 - Workflow And Projection Convergence

Status: blocked.

Depends on: POST1, POST2, POST3.

Blocks: none.

User stories:

- 28, 30, 31, 34, 39, 43, 44, 47, 48, 49, 50

What to build:

- Converge the guided workflow shell and runtime projections on the formal creation and advancement surfaces.
- Keep the UI/workflow thin: it should persist draft state, surface open choices and issues, and render derived sheet/runtime outputs instead of re-deriving semantics locally.
- Align higher-level starts, advancement, and battle-ready projection around the same finalized-sheet contract.

Acceptance criteria:

- Workflow, formal semantics, and runtime projections all use one canonical draft/sheet story.
- The workflow shell does not become a second rules engine.
- Runtime projection remains one-way derived from finalized owned character state.

### Task 14 - MON2 - Second Monster Tracer Bullet

Status: ready-for-implementation-after-light-research.

Depends on: MON1.

Blocks: MON3, MON4.

Next action:

- Add one non-goblin SRD monster through the same owned `StatBlock` and projection path.
- Prefer a monster that proves a materially different slice from goblins, such as spellcasting structure or a text-only unsupported authored ability.
- Keep the slice bounded to catalog/schema/provenance/projection work unless the RAW makes a new shared generic facility unavoidable.

Acceptance criteria:

- At least one non-goblin SRD monster can be added without introducing a monster-specific runtime handler.
- The new monster cites SRD provenance directly on the owned record.
- The new monster reuses the same `StatBlock` and projection path as goblins.
- Any unsupported authored ability on this monster is preserved structurally as text-only data instead of being dropped or silently improvised.

Verification:

- Read the relevant SRD monster passage in `.references/srd-5.2.1/Monsters/` and cross-check `UBIQUITOUS_LANGUAGE.md` before implementation.
- Prefer focused catalog/projection tests over MBT. Do not run battle MBT unless the task actually changes battle semantics.

### Task 15 - MON3 - Advanced Pattern Tracer Bullet

Status: blocked.

Depends on: MON2.

Blocks: MON4.

Next action:

- After MON2 lands, add one monster that proves a repeated advanced pattern such as recharge, legendary actions, or a stronger multiattack shape through a generic facility.
- If a new shared runtime/projection facility is required, coordinate that change against the post-`CHAR` convergence queue before implementation so the same files are not being reshaped in parallel.

Acceptance criteria:

- At least one repeated advanced monster pattern is handled through a generic facility.
- The chosen monster uses that generic facility through canonical authored sections rather than bespoke runtime code.
- Unsupported advanced clauses remain present as text-only entries with explicit reasons instead of being silently discarded.
- Public battle and MCP surfaces remain generic after the slice lands.

### Task 16 - MON4 - Hand-Authored SRD Dataset Expansion

Status: blocked.

Depends on: MON2, MON3.

Blocks: none.

Next action:

- Expand from the tracer-bullet monsters to the agreed hand-authored SRD dataset once the schema and advanced-pattern path are proven.
- Keep unsupported patterns explicit so later generic-facility work has a grounded queue.

Acceptance criteria:

- The agreed SRD monster dataset exists as hand-authored core-owned stat block data with explicit SRD provenance.
- New monster additions are primarily data entry and projection, not monster-specific engine work.
- The project has an explicit report or audit view of unsupported ability patterns to drive later generic-facility work.
- MCP, app, and other adapters continue consuming the core-owned stat block collection instead of maintaining parallel monster registries.

### Task 17 - MCPA1 - Battle Attack Public Contract

Status: deferred.

Depends on: none.

Blocks: MCPA2, MCPA5, MCPA8.

Next action: Keep deferred unless the batch objective changes back toward MCP/action-surface work. When reactivated, finalize the strict public/runtime contract for `BATTLE_ATTACK` before picking up other attack-shaped MCP surfaces.

Acceptance criteria:

- One bounded public contract exists for the first safe `BATTLE_ATTACK` slice.
- Battle-owned facts stay battle-owned; MCP/runtime supplies only explicit battle-external facts.
- The resulting contract is reusable by later off-hand, legendary, and rider work rather than spawning parallel attack payload shapes.

### Task 18 - MCPA2 - Public Attack Action Slices

Status: deferred.

Depends on: MCPA1.

Blocks: none.

Next action: Keep deferred. After `MCPA1`, expose the bounded public attack slices beginning with `BATTLE_ATTACK`, then `BATTLE_OFF_HAND_ATTACK` once the Light-property follow-through is wired.

Acceptance criteria:

- `BATTLE_ATTACK` is publicly callable through the agreed bounded contract.
- `BATTLE_OFF_HAND_ATTACK` reuses the same contract rather than adding a second attack payload design.
- Light-property and ability-modifier handling remain battle-owned and SRD-accurate.

### Task 19 - MCPA3 - Spatial Action Public Contracts

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. If reprioritized, define bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` over explicit caller/session spatial facts only.

Acceptance criteria:

- `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` have explicit public contracts over caller/session-owned facts.
- Core and MCP do not gain a geometry owner, pathfinder, or persistent map model.
- The public contract preserves the ownership findings in `MCP_EVENT_SURFACE_AUDIT.md`.

### Task 20 - MCPA4 - Public Grapple Attack Slice

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. If reprioritized, expose `BATTLE_GRAPPLE` once the public contract for `targetId` plus resolved save outcome is wired cleanly.

Acceptance criteria:

- `BATTLE_GRAPPLE` becomes publicly callable without reintroducing caller-owned size facts.
- The remaining runtime save outcome stays explicit and honest in the public contract.

### Task 21 - MCPA5 - Battle Attack Rider Windows

Status: deferred.

Depends on: MCPA1.

Blocks: none.

Next action: Keep deferred. If reprioritized, add battle-owned rider windows for `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE`.

Acceptance criteria:

- Rider windows are battle-owned and keyed off the correct pre-roll or post-hit timing window.
- Creature MCP does not gain duplicate rider tokens that guess battle context.
- Each rider consumes the right battle-owned legality and runtime/save facts.

### Task 22 - MCPA6 - Generic Spell Resolution Ownership

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. If reprioritized, decide and then implement the honest public ownership path for generic save, concentration, and AoE spell resolution surfaces.

Acceptance criteria:

- The plan no longer relies on raw generic spell event passthrough.
- Counterspell windows, save-failed reactions, and AoE per-target loops have an explicit owner before public exposure.
- The resulting route is either a bounded semantic spell-action surface or a clearly owned table-event flow.

### Task 23 - MCPA7 - Semantic Table Event Expansion

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. If reprioritized, add narrow semantic public routes for max-HP change, effect application/removal, and environmental hazard progression where the audit says raw events are not safe public schemas.

Acceptance criteria:

- New public table-event routes are semantic and provenance-aware, not arbitrary raw payload passthrough.
- Max-HP change and effect ownership stay aligned with the audit findings.
- Environmental hazards use SRD-shaped progression semantics rather than current shortcut events.

### Task 24 - MCPA8 - Monster Control And Legendary Action Surface

Status: deferred.

Depends on: MCPA1, MON3.

Blocks: none.

Next action: Keep deferred. If reprioritized, add explicit monster-control/public MCP routes for named legendary/recharge/daily abilities and then the bounded `BATTLE_LEGENDARY_ATTACK` slice.

Acceptance criteria:

- Named monster-control routes derive legality and cost from core-owned stat-block data.
- `BATTLE_LEGENDARY_ATTACK` reuses the generic attack boundary instead of introducing a monster-specific attack payload.
- MCP and app continue consuming generic surfaces rather than monster-named adapter routes.
