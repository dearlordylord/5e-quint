# Active Plan

Date: 2026-04-11

This is the single active planning queue.

The previous MCP/battle follow-up queue is complete and has been reintroduced as a bounded MCP contract/ownership track. The active queue now contains three coordinated tracks:

- the character-creation program defined in [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md);
- the monster-database tracer-bullet rollout defined in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [monster-database-plan.md](./monster-database-plan.md).
- the MCP action-surface contract/ownership track summarized in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).

## Batch Objective

Land the current bounded implementation slices for SRD 5.2.1 character creation/character-sheet projection, the SRD monster database, and the MCP action-surface foundation work without:

- duplicating character facts across app, MCP, creature runtime, or battle runtime;
- duplicating monster-authored facts across core, MCP, app, or battle/runtime projections;
- widening the main battle machine into a character builder;
- introducing adapter-owned character registries;
- introducing adapter-owned monster registries;
- inventing MCP-owned battle semantics, geometry, or monster-action registries;
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
      "status": "done",
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
      "status": "done",
      "title": "Formal Creation Semantics"
    },
    {
      "number": 10,
      "id": "POST2",
      "status": "done",
      "title": "Open Choices And Selective Invalidation"
    },
    {
      "number": 11,
      "id": "POST3",
      "status": "done",
      "title": "Formal Advancement And Higher-Level Starts"
    },
    {
      "number": 12,
      "id": "POST4",
      "status": "ready-for-implementation-after-light-research",
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
      "status": "ready-for-research",
      "title": "Battle Attack Public Contract"
    },
    {
      "number": 18,
      "id": "MCPA2",
      "status": "blocked",
      "title": "Public Attack Action Slices"
    },
    {
      "number": 19,
      "id": "MCPA3",
      "status": "ready-for-research",
      "title": "Spatial Action Public Contracts"
    },
    {
      "number": 20,
      "id": "MCPA4",
      "status": "blocked",
      "title": "Public Grapple Attack Slice"
    },
    {
      "number": 21,
      "id": "MCPA5",
      "status": "blocked",
      "title": "Battle Attack Rider Windows"
    },
    {
      "number": 22,
      "id": "MCPA6",
      "status": "ready-for-research",
      "title": "Generic Spell Resolution Ownership"
    },
    {
      "number": 23,
      "id": "MCPA7",
      "status": "ready-for-research",
      "title": "Semantic Table Event Expansion"
    },
    {
      "number": 24,
      "id": "MCPA8",
      "status": "blocked",
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
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched ownership surface, record that baseline noise and stop. Do not widen the task into repo-wide cleanup; unrelated cleanup belongs in a separate task or sidecar investigation.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
| ----- | ---- | ------ | ---------- | ------ | ----------- | ----------------- |
| 0 | CHAR1 - Canonical Character Domain | done | none | CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7 | Landed `CharacterDraft` / `CharacterSheet` in `packages/core/src/character-domain.ts` with finalization that rejects incomplete or contradictory class/background/species/language/alignment state. | Complete |
| 1 | CHAR2 - Score Generation And Origin Validation | done | CHAR1 | CHAR3, CHAR5 | Landed owned ability-score generation, background score-increase validation, and SRD starting-language validation on the canonical character sheet. | Complete |
| 2 | CHAR3 - Proficiencies Features And Level-Gated Character Facts | done | CHAR1, CHAR2 | CHAR4, CHAR5, CHAR7 | Landed owned build choices for class/background/species/feat-driven proficiencies, subclass ownership/gating, multiclass prerequisite validation, granted-language choices, and class-resource derivation helpers on the canonical character sheet. | Complete |
| 3 | CHAR4 - Equipment And Loadout Projection | done | CHAR1, CHAR3 | CHAR5 | Landed owned starting-equipment choices, leftover starting-gold tracking, bounded combat-equipment ownership, loadout validation, and battle-facing weapon/hand/shield/armor projection sourced from `CharacterSheet`. | Complete |
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | done | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Landed owned spellcasting selections plus one `CharacterSheet` derivation path for sheet numbers, `DndMachineInput`, and battle init projection. | Complete |
| 5 | CHAR6 - Guided Workflow Shell | done | CHAR1, CHAR2, CHAR5 | none | Landed a thin `/character` workflow shell that persists `CharacterDraft`, keeps step order in the app surface, and renders canonical finalization plus derived projection outputs without UI-owned validation. | Complete |
| 6 | CHAR7 - Level Advancement And Multiclass Continuation | done | CHAR1, CHAR3, CHAR5 | none | Landed ordered `advancement` history as the canonical legality surface for higher-level starts and multiclass continuation, including in-order subclass timing and feat / Epic Boon choices applied through final sheet derivation. | Complete |
| 7 | H - PassiveModifiers Sub-Record | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 8 | I - Build-Map / Hole Metadata | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 9 | POST1 - Formal Creation Semantics | done | CHAR6, CHAR7 | POST2, POST3, POST4 | Closed by `POST1_FORMAL_CREATION_SEMANTICS.md`: creation semantics should live in Quint draft/sheet records that mirror the landed TS domain, with ordered `advancement` retained as the legality surface and runtime kept as one-way projection. | Complete |
| 10 | POST2 - Open Choices And Selective Invalidation | done | POST1 | POST4 | Landed core-owned `assessCharacterDraft()` and `applyCharacterDraftUpdate()` so the draft boundary now distinguishes open required choices from illegal state, preserves unrelated authored facts during backtracking, and lets the workflow show incomplete, invalid, and review-ready states separately. | Complete |
| 11 | POST3 - Formal Advancement And Higher-Level Starts | done | CHAR7, POST1 | POST4 | Landed `advanceCharacterSheet()` as a thin canonical sheet-to-sheet transition that appends one ordered advancement entry and reuses `finalizeCharacterDraft()` instead of inventing a second higher-level-start rules path. | Complete |
| 12 | POST4 - Workflow And Projection Convergence | done | POST1, POST2, POST3 | none | Landed a thin workflow shell that persists only canonical `CharacterDraft`, uses core-owned assessment to separate open choices from illegal state, derives runtime outputs from finalized sheets, and routes review-step level-up plus higher-level presets through the canonical sheet-to-draft advancement surface. | Complete |
| 13 | MON1 - Canonical Goblin Tracer Bullet | done | none | MON2 | Landed canonical goblin `StatBlock` records with explicit SRD provenance and one projection path into generic battle/MCP surfaces. | Complete |
| 14 | MON2 - Second Monster Tracer Bullet | ready-for-implementation-after-light-research | MON1 | MON3, MON4 | Add one non-goblin SRD monster through the same core-owned `StatBlock` and projection path. Prefer a monster that proves a materially different slice, but avoid new shared generic facilities unless the RAW forces them. | Ready if kept to catalog/schema/projection work and scoped away from shared runtime refactors owned by post-`CHAR` convergence |
| 15 | MON3 - Advanced Pattern Tracer Bullet | blocked | MON2 | MON4 | Add one advanced monster that proves a repeated pattern such as recharge, legendary actions, or a stronger multiattack shape through a generic facility. Sequence this after MON2 and coordinate with shared runtime/projection work so it does not race `POST4`. | Blocked on a stable non-goblin baseline plus shared-surface sequencing |
| 16 | MON4 - Hand-Authored SRD Dataset Expansion | blocked | MON2, MON3 | none | Expand from the tracer bullets to the agreed SRD monster dataset, keeping unsupported patterns explicit and preserving core-owned provenance. | Blocked on tracer-bullet validation of schema and advanced-generic-facility path |
| 17 | MCPA1 - Battle Attack Public Contract | ready-for-research | none | MCPA2, MCPA4, MCPA5, MCPA8 | Finalize the strict public/runtime boundary for `BATTLE_ATTACK` first. Lock the minimal caller-owned payload and battle-owned legality/runtime facts before any attack-shaped MCP implementation work. | This is the highest-leverage MCP prerequisite and should land before attack, grapple, rider, or legendary-attack implementation |
| 18 | MCPA2 - Public Attack Action Slices | blocked | MCPA1 | none | After `MCPA1`, expose the bounded public attack slices beginning with `BATTLE_ATTACK`, then `BATTLE_OFF_HAND_ATTACK` once the Light-property follow-through is wired. | Depends on the finalized battle attack contract rather than inventing separate payloads |
| 19 | MCPA3 - Spatial Action Public Contracts | ready-for-research | none | none | Define bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` over explicit caller/session spatial facts only. | Independent MCP foundation research; no geometry owner in core or MCP |
| 20 | MCPA4 - Public Grapple Attack Slice | blocked | MCPA1 | none | After `MCPA1`, expose `BATTLE_GRAPPLE` once the public contract for `targetId` plus resolved save outcome is wired cleanly. | Battle already owns Size legality; remaining work is public contract shape plus sequencing behind the attack boundary |
| 21 | MCPA5 - Battle Attack Rider Windows | blocked | MCPA1 | none | After `MCPA1`, add battle-owned rider windows for `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE`. | Treat these as battle interrupt/hit windows, not creature-scope tokens |
| 22 | MCPA6 - Generic Spell Resolution Ownership | ready-for-research | none | none | Decide and document the honest public ownership path for generic save, concentration, and AoE spell resolution surfaces. | Design-heavy foundation work; may split into follow-up implementation slices after research |
| 23 | MCPA7 - Semantic Table Event Expansion | ready-for-research | none | none | Design narrow semantic public routes for max-HP change, effect application/removal, and environmental hazard progression where the audit says raw events are not safe public schemas. | Prefer semantic commands over raw payload passthrough; likely implementable in slices after research |
| 24 | MCPA8 - Monster Control And Legendary Action Surface | blocked | MCPA1, MON3 | none | After `MCPA1` and `MON3`, add explicit monster-control/public MCP routes for named legendary/recharge/daily abilities and then the bounded `BATTLE_LEGENDARY_ATTACK` slice. | Depends on both the generic attack boundary and stable stat-block-owned monster action projection |

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
- `MCPA1`, `MCPA3`, `MCPA6`, and `MCPA7` are the active MCP foundation tasks. They should resolve ownership/contract shape first.
- `MCPA2`, `MCPA4`, `MCPA5`, and `MCPA8` stay sequenced behind those contracts and should not start early.

## Task Selection Guidance

Recommended next coding-loop task:

1. **POST2 - Open Choices And Selective Invalidation**
   POST1 settled the draft/sheet ownership boundary. The next slice should add explicit `OpenChoices` and dependency-aware invalidation on that boundary without making workflow-step state the semantic owner.
2. **MON2 - Second Monster Tracer Bullet**
   This is the safe parallel monster task as long as it stays on catalog/schema/provenance/projection work and does not introduce a new shared generic runtime facility.
3. **POST3 - Formal Advancement And Higher-Level Starts**
   This is now implementable on the POST1 boundary. Keep higher-level starts and multiclass continuation on repeated legal sheet transitions rather than a second leveling model.
4. **MCPA1 - Battle Attack Public Contract**
   This remains the MCP prerequisite with the highest downstream leverage. Attack-shaped public work should not proceed until this boundary is explicit.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.
Do not start `MON3` before checking whether the needed generic facility would collide with active shared-surface work in `POST4` or other runtime/projection refactors.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute POST2 next.
3. Execute POST3 after POST2, unless monster or MCP work is intentionally chosen for parallelism.
4. Monster work may proceed in parallel only on MON2 while it remains a catalog/provenance/projection slice and does not add a new shared generic runtime facility.
5. Keep `POST4` blocked until POST2 and POST3 land on the POST1 draft/sheet boundary.
6. Keep `MON3` and `MON4` blocked until the tracer-bullet sequence proves the shared-surface path.
7. Keep H and I deferred.
8. Treat `MCPA1`, `MCPA3`, `MCPA6`, and `MCPA7` as active research tasks; keep `MCPA2`, `MCPA4`, `MCPA5`, and `MCPA8` blocked until their prerequisites land.

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

### Task 0 - CHAR1 - Canonical Character Domain

Status: done.

Archived foundation summary:

- Landed the canonical `CharacterDraft` / `CharacterSheet` boundary in core with finalization that rejects incomplete or contradictory origin/class/language/alignment state.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 1 - CHAR2 - Score Generation And Origin Validation

Status: done.

Archived foundation summary:

- Landed owned SRD score-generation, background score adjustments, and Standard-Language validation on the canonical sheet.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 2 - CHAR3 - Proficiencies Features And Level-Gated Character Facts

Status: done.

Archived foundation summary:

- Landed owned proficiency/subclass/class-resource build choices and validation on the canonical sheet.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 3 - CHAR4 - Equipment And Loadout Projection

Status: done.

Archived foundation summary:

- Landed owned equipment/loadout facts and one-way projection into creature/battle-facing loadout fields.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 4 - CHAR5 - Sheet-Derived Numbers And Spellcasting Projection

Status: done.

Archived foundation summary:

- Landed one owned derivation path for sheet numbers, spellcasting projection, machine input projection, and battle-init projection.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 5 - CHAR6 - Guided Workflow Shell

Status: done.

Archived foundation summary:

- Landed the thin `/character` workflow shell over `CharacterDraft` plus direct finalization/derivation reuse.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

### Task 6 - CHAR7 - Level Advancement And Multiclass Continuation

Status: done.

Depends on: CHAR1, CHAR3, CHAR5.

Blocks: none.

Next action: none. Landed on integration.

Acceptance criteria:

- Higher-level starts are represented as legal ordered advancement over the same owned character domain, not a bespoke bootstrap path.
- The character domain can represent all advancement choices needed to determine legality and downstream derivation for this slice, including subclass timing, feat/ASI choices, non-ASI feat choices where allowed, and level-19 Epic Boon decisions.
- Multiclass legality is checked at the time of class entry using the character state that existed at that step.
- The implementation does not keep contradictory peer-owned `classLevels` and advancement history state, and does not keep legality-relevant advancement choices in unordered side channels outside the canonical advancement record.
- Illegal feat timing is rejected: no early ASI, no early Epic Boon, and no legality-sensitive feat application on class levels that do not grant a feat choice.
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
- Focused core verification passed: `pnpm -C packages/core exec vitest run src/character-domain.test.ts src/character-sheet-derived.test.ts`.
- `pnpm quality` still fails on pre-existing Prettier drift in unrelated core files (`packages/core/src/context-encoding.ts`, `packages/core/src/creature.mbt.test.ts`, `packages/core/src/machine-event-extractors.ts`, `packages/core/src/machine-monk.ts`, `packages/core/src/machine-queries.ts`, `packages/core/src/machine-startturn.ts`, `packages/core/src/machine.ts`).
- Did not run MBT because the touched surface is character-domain validation and projection, and the repo guidance says to avoid battle MBT outside actual end-to-end need.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR7`: mark done.
  - `POST1`: unblock to `ready-for-research`; formal creation now needs to consume the landed ordered advancement surface instead of a speculative handoff.
  - `POST3`: no status change; formal advancement should consume the same ordered-transition model now landed in product code.

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

Status: done.

Depends on: CHAR6, CHAR7.

Blocks: POST2, POST3, POST4.

User stories:

- 32, 33, 35, 40, 41, 44, 47, 48, 50, 52

What to build:

- Formalize the creation-side semantic model in Quint using the landed `CharacterDraft` / `CharacterSheet` product shape as foundation rather than replacing it.
- Model the canonical creation surfaces needed to explain an editable draft, a finalizable sheet, ordered advancement attached to that sheet, and projection from sheet to creature runtime.
- Keep battle out of character creation while making the formal layer the durable owner of creation semantics that should not drift over time.

Acceptance criteria:

- The plan for formal creation semantics treats the existing `CHAR` work as foundation, not as throwaway implementation.
- The formal model owns canonical creation semantics rather than relying on workflow state or battle init as a proxy.
- A clear projection boundary from finalized sheet to creature runtime is part of the formal design.

Research closeout:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` for the creation step order, level advancement, starting at higher levels, and multiclassing, plus `UBIQUITOUS_LANGUAGE.md`.
- The landed TS ownership split is already correct: `CharacterDraft` is the editable surface, `finalizeCharacterDraft` is the legality gate, `CharacterSheet` is the canonical finalized record, ordered `advancement` is the legality surface for higher-level starts and multiclass timing, and `character-sheet-derived.ts` is the one-way runtime projection path.
- `creature.qnt` already owns most low-level reusable creation helpers, but it does not yet expose a creation-side semantic layer that directly explains the landed draft/sheet product model.
- POST1 therefore should not replace the TS domain or pull creation semantics into battle/runtime config. It should add a Quint creation layer that mirrors draft/sheet ownership, treats `CharConfig` as a projection target, and reuses existing creature helpers under that surface.
- The task-specific outcome is recorded in `POST1_FORMAL_CREATION_SEMANTICS.md`.
- POST1 defines the intended formal module `character.qnt`, the core formal types `CharacterSheet`, `AdvancementEntry`, and `AdvancementFeatChoice`, the core functions `isLegalSheet`, `canAdvance`, `advanceLevel`, and `sheetToCharConfig`, five formal properties, and the downstream Tier 1b parity plan.

Verification:

- Read `.references/srd-5.2.1/Character-Creation.md` for creation order, level advancement, higher-level starts, and multiclassing, plus `.references/srd-5.2.1/Character-Origins.md` for background/species-owned creation facts.
- Read `UBIQUITOUS_LANGUAGE.md` to confirm the owned object remains the character sheet and runtime facts remain projections.
- Inspected the current ownership surfaces in `packages/core/src/character-domain.ts`, `packages/core/src/character-advancement.ts`, `packages/core/src/character-sheet-derived.ts`, `packages/app/src/components/character-creation/CharacterCreationPage.tsx`, and `creature.qnt`.
- `/simplify` round 1: removed a false alternative that would have made `CharConfig` the creation owner; kept it as a projection target instead.
- `/simplify` round 2: expanded the note to the minimum task-complete formal surface: named module, named formal types/functions, five formal properties, and a creature-tier parity plan without introducing a parallel sheet model.
- Did not run `pnpm quality` or MBT because this task changes only planning/documentation artifacts and no executable code paths.

Plan Impact:

- Status: applied
- Affected tasks:
  - `POST1`: mark done.
  - `POST2`: unblock to `ready-for-implementation-after-light-research`; it should implement `OpenChoices` and selective invalidation on the POST1 draft/sheet boundary.
  - `POST3`: unblock to `ready-for-implementation-after-light-research`; it should implement repeated legal level-up transitions on the POST1 draft/sheet boundary.
  - `POST4`: no status change; it remains blocked on POST2 and POST3 after the POST1 ownership decision.

### Task 10 - POST2 - Open Choices And Selective Invalidation

Status: done.

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

Verification:

- Re-read `POST1_FORMAL_CREATION_SEMANTICS.md`, `.references/srd-5.2.1/Character-Creation.md`, `.references/srd-5.2.1/Character-Origins.md`, and `UBIQUITOUS_LANGUAGE.md` before implementation.
- Keep the implementation on the owned draft/sheet domain. Do not let workflow state become the legality owner.

### Task 11 - POST3 - Formal Advancement And Higher-Level Starts

Status: done.

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

Verification:

- Re-read `POST1_FORMAL_CREATION_SEMANTICS.md` plus `.references/srd-5.2.1/Character-Creation.md` sections for level advancement, higher-level starts, and multiclassing before implementation.
- Keep Quint as the owner of advancement semantics and preserve the one-way projection boundary from finalized sheet to runtime.

Archived foundation summary:

- Landed `advanceCharacterSheet()` in `packages/core/src/character-sheet-advancement.ts` as the canonical sheet-to-sheet advancement helper.
- The helper appends exactly one ordered advancement entry and reuses `finalizeCharacterDraft()` rather than introducing a second advancement validator or a bespoke higher-level-start bootstrap path.
- Focused tests now cover repeated higher-level advancement, illegal subclass timing, and multiclass continuation on the same sheet boundary.
- See `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` for the task note and RAW anchors.

### Task 12 - POST4 - Workflow And Projection Convergence

Status: done.

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

Archived foundation summary:

- The app workflow now persists only `CharacterDraft` and renders review/runtime outputs from `assessCharacterDraft()` plus finalized-sheet projections.
- Review-step level-up no longer appends raw advancement entries in UI state; it starts from the finalized sheet and uses the canonical core sheet-to-draft projection for the next draft state.
- The level-5 fighter preset is derived from the level-1 fighter draft by replaying canonical advancement transitions rather than duplicating a second authored draft blob.
- Focused app tests cover the higher-level preset plus review-step advancement reopening required choices without introducing a second rules engine.

Verification:

- RAW / terminology check: reviewed `.references/srd-5.2.1/Character-Creation.md` for character-creation ordering plus multiclass level-gain ownership, and `UBIQUITOUS_LANGUAGE.md` for shared creation terminology such as Standard Array and caster-type language. Task 12 does not add new rule semantics; it keeps the workflow aligned to those existing core-owned creation and advancement surfaces.
- `/simplify` round 1: confirmed [packages/app/src/components/character-creation/CharacterCreationPage.tsx](/workspace/typescript/dnd/packages/app/src/components/character-creation/CharacterCreationPage.tsx) persists only `CharacterDraft`, calls `assessCharacterDraft()`, and renders review outputs from finalized-sheet projections instead of re-deriving sheet or runtime semantics in app state.
- `/simplify` round 2: confirmed [packages/app/src/components/character-creation/characterCreationPresets.ts](/workspace/typescript/dnd/packages/app/src/components/character-creation/characterCreationPresets.ts) and [packages/core/src/character-sheet-advancement.ts](/workspace/typescript/dnd/packages/core/src/character-sheet-advancement.ts) keep higher-level presets and review-step level-up on the canonical sheet-to-draft path via `advanceCharacterSheet()` / `characterDraftFromSheet()` rather than a second authored higher-level draft or UI-owned advancement path.
- Verification command: `pnpm quality`

Plan Impact:

- Status: none
- Affected tasks:
  - `POST4` - no-change; closeout updated to record required verification evidence only.
- Plan edits: none

### Task 13 - MON1 - Canonical Goblin Tracer Bullet

Status: done.

Archived foundation summary:

- Landed the canonical goblin tracer-bullet `StatBlock` with explicit SRD provenance and one projection path into generic battle and MCP surfaces.
- See the archived done foundations section above for the durable downstream summary; inspect git history for full implementation detail.

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

Status: ready-for-research.

Depends on: none.

Blocks: MCPA2, MCPA4, MCPA5, MCPA8.

Next action:

- Finalize the strict public/runtime contract for `BATTLE_ATTACK` before picking up other attack-shaped MCP surfaces.
- Identify the minimal caller-owned payload, the battle-owned legality/runtime facts, and the exact facts that must stay out of MCP payloads.
- Write the resulting contract back into this file and `MCP_EVENT_SURFACE_AUDIT.md`, then update downstream MCP task statuses accordingly.

Acceptance criteria:

- One bounded public contract exists for the first safe `BATTLE_ATTACK` slice.
- Battle-owned facts stay battle-owned; MCP/runtime supplies only explicit battle-external facts.
- The resulting contract is reusable by later off-hand, legendary, and rider work rather than spawning parallel attack payload shapes.

### Task 18 - MCPA2 - Public Attack Action Slices

Status: blocked.

Depends on: MCPA1.

Blocks: none.

Next action: After `MCPA1`, expose the bounded public attack slices beginning with `BATTLE_ATTACK`, then `BATTLE_OFF_HAND_ATTACK` once the Light-property follow-through is wired.

Acceptance criteria:

- `BATTLE_ATTACK` is publicly callable through the agreed bounded contract.
- `BATTLE_OFF_HAND_ATTACK` reuses the same contract rather than adding a second attack payload design.
- Light-property and ability-modifier handling remain battle-owned and SRD-accurate.

### Task 19 - MCPA3 - Spatial Action Public Contracts

Status: ready-for-research.

Depends on: none.

Blocks: none.

Next action:

- Define bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` over explicit caller/session spatial facts only.
- Make the non-goal explicit: core and MCP do not gain a geometry owner, pathfinder, or persistent map model.
- Record the proposed caller/session fact surface and any unresolved battle-owned legality checks.

Acceptance criteria:

- `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` have explicit public contracts over caller/session-owned facts.
- Core and MCP do not gain a geometry owner, pathfinder, or persistent map model.
- The public contract preserves the ownership findings in `MCP_EVENT_SURFACE_AUDIT.md`.

### Task 20 - MCPA4 - Public Grapple Attack Slice

Status: blocked.

Depends on: MCPA1.

Blocks: none.

Next action: After `MCPA1`, expose `BATTLE_GRAPPLE` once the public contract for `targetId` plus resolved save outcome is wired cleanly.

Acceptance criteria:

- `BATTLE_GRAPPLE` becomes publicly callable without reintroducing caller-owned size facts.
- The remaining runtime save outcome stays explicit and honest in the public contract.

### Task 21 - MCPA5 - Battle Attack Rider Windows

Status: blocked.

Depends on: MCPA1.

Blocks: none.

Next action: After `MCPA1`, add battle-owned rider windows for `USE_BRUTAL_STRIKE`, `STUNNING_STRIKE`, `USE_CUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE`.

Acceptance criteria:

- Rider windows are battle-owned and keyed off the correct pre-roll or post-hit timing window.
- Creature MCP does not gain duplicate rider tokens that guess battle context.
- Each rider consumes the right battle-owned legality and runtime/save facts.

### Task 22 - MCPA6 - Generic Spell Resolution Ownership

Status: ready-for-research.

Depends on: none.

Blocks: none.

Next action:

- Decide and document the honest public ownership path for generic save, concentration, and AoE spell resolution surfaces.
- Make the owning layer explicit for counterspell windows, save-failed reactions, and per-target AoE resolution loops.
- Split any implementation follow-up into bounded tasks only after the ownership writeup is stable.

Acceptance criteria:

- The plan no longer relies on raw generic spell event passthrough.
- Counterspell windows, save-failed reactions, and AoE per-target loops have an explicit owner before public exposure.
- The resulting route is either a bounded semantic spell-action surface or a clearly owned table-event flow.

### Task 23 - MCPA7 - Semantic Table Event Expansion

Status: ready-for-research.

Depends on: none.

Blocks: none.

Next action:

- Design narrow semantic public routes for max-HP change, effect application/removal, and environmental hazard progression where the audit says raw events are not safe public schemas.
- Preserve provenance/source semantics so MCP does not become a raw internal-event passthrough.
- Break out implementation slices only after the semantic route set is stable.

Acceptance criteria:

- New public table-event routes are semantic and provenance-aware, not arbitrary raw payload passthrough.
- Max-HP change and effect ownership stay aligned with the audit findings.
- Environmental hazards use SRD-shaped progression semantics rather than current shortcut events.

### Task 24 - MCPA8 - Monster Control And Legendary Action Surface

Status: blocked.

Depends on: MCPA1, MON3.

Blocks: none.

Next action: After `MCPA1` and `MON3`, add explicit monster-control/public MCP routes for named legendary/recharge/daily abilities and then the bounded `BATTLE_LEGENDARY_ATTACK` slice.

Acceptance criteria:

- Named monster-control routes derive legality and cost from core-owned stat-block data.
- `BATTLE_LEGENDARY_ATTACK` reuses the generic attack boundary instead of introducing a monster-specific attack payload.
- MCP and app continue consuming generic surfaces rather than monster-named adapter routes.
