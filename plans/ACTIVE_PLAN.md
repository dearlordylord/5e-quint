# Active Plan

Date: 2026-04-12

This is the single active planning queue.

The active queue now contains two coordinated tracks:

- the Quint-driven character formalization program defined in [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md);
- the remaining MCP action-surface follow-up summarized in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md).

## Batch Objective

Land the remaining formal character-semantics work and the last bounded MCP follow-up without:

- duplicating character facts across app, core, runtime, or battle layers;
- widening the battle machine into a character builder;
- making runtime or battle config the owner of character-creation facts;
- collapsing character creation, level advancement, and combat into one semantic surface;
- hardcoding content catalogs into rule semantics when typed content descriptors should own them;
- drifting away from the existing Quint helper semantics already owned in `creature.qnt`;
- introducing adapter-owned character registries or MCP-owned combat semantics.

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
      "id": "CQ1a",
      "status": "done",
      "title": "Freeze Character Creation Surface"
    },
    {
      "number": 1,
      "id": "CQ1b",
      "status": "done",
      "title": "Implement Character Creation Module"
    },
    {
      "number": 2,
      "id": "CQ2",
      "status": "done",
      "title": "Formal Character Advancement Module"
    },
    {
      "number": 3,
      "id": "CQ3",
      "status": "done",
      "title": "Character To Creature Projection Boundary"
    },
    {
      "number": 4,
      "id": "CQ4",
      "status": "ready-for-implementation-after-light-research",
      "title": "Character Quint Parity Harness"
    },
    {
      "number": 5,
      "id": "MCPA8",
      "status": "ready-for-implementation-after-light-research",
      "title": "Monster Control And Legendary Action Surface"
    },
    {
      "number": 6,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 7,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
    },
    {
      "number": 8,
      "id": "QFULL",
      "status": "blocked",
      "title": "Full Workspace Quality Run"
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
- Only add durable planning facts to this file. Attempt-specific failure notes, parser mistakes, or "next attempt must..." reminders belong in run-local review/decider artifacts, not here.
- Before editing this file during a task closeout, answer a new-information gate in the closeout: what new fact was learned, why it was not already implied by the current plan text, and why it is durable enough to keep after run-local artifacts are deleted. If that gate is weak, leave the plan unchanged.
- Update the task status before ending the loop:
  - `done` if implementation/research and verification are complete;
  - `ready-for-implementation-after-light-research` if research made it implementable;
  - `blocked` if a required ownership/API decision is still unresolved;
  - `deferred` if research shows the task should not be in the current batch.
- When a task is marked `done` or `deferred`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks and documentation-only tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. For character-formalization tasks, prefer deterministic Quint tests and the narrowest character/creature-level parity surface before considering battle MBT.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched ownership surface, record that baseline noise and stop. Do not widen the task into repo-wide cleanup; unrelated cleanup belongs in a separate task or sidecar investigation.

## DAG / Queue Order

| Order | Task                                                 | Status                                 | Depends on | Blocks       | Next action                                                                                                                                                                                                                                  | Handoff readiness                                                                                                                                              |
| ----- | ---------------------------------------------------- | -------------------------------------- | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | CQ1a - Freeze Character Creation Surface             | done                                   | none       | CQ1b         | Keep the frozen target in [plans/CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md](./CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md). Do not reopen this task unless a genuinely missing owned surface is discovered.                              | Completed. The inventory plus stable acceptance gates below define the implementation target.                                                                |
| 1     | CQ1b - Implement Character Creation Module           | done                                   | CQ1a       | CQ2, CQ3, CQ4 | Landed `character-creation.qnt`, deterministic Quint coverage in `dndTest.qnt`, generated spell-data support, and a TS parity test scaffold for the frozen TS-owned creation surface. Keep shared fuzz/MBT tooling untouched and leave `POST1` for CQ4 cleanup. | Completed. The finalized-sheet boundary now exists in Quint, so downstream character formalization can build on it.                                      |
| 2     | CQ2 - Formal Character Advancement Module            | done                                   | CQ1b   | CQ3, CQ4     | Landed `character.qnt` over finalized `CharacterSheet` semantics, including `pIsLegalSheet`, `pCanAdvance`, `pAdvanceLevel`, deterministic Quint coverage for higher-level starts and advancement legality, and the `POST3` status-note refresh pointing at the landed formal owner. | Completed. Advancement semantics now sit on the finalized-sheet boundary, so projection/parity work can size against the formal owner instead of the historical TS helper alone. |
| 3     | CQ3 - Character To Creature Projection Boundary      | done                                   | CQ1b, CQ2  | CQ4          | Landed `CharacterCreatureProjection` in `character.qnt`, the downstream `pProjectionToCharConfig` / `pSheetToCharConfig` mapping, the shared TypeScript helper in `packages/core/src/character-sheet-creature-projection.ts`, focused TS projection coverage, and status-note redirects away from `POST1` / `POST3` as the primary implementation brief. | Completed. The one-way character-to-creature handoff now exists in both Quint and shared TS, so CQ4 can target parity at that settled boundary instead of re-sizing the projection surface. |
| 4     | CQ4 - Character Quint Parity Harness                 | ready-for-implementation-after-light-research | CQ1b, CQ2, CQ3 | none   | Read the landed projection helper and deterministic Quint coverage, then add shared-core parity for draft/finalization, advancement transitions, and the character-to-creature projection boundary. Delete `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` only if the landed `CQ*` artifacts and current PRD fully subsume their remaining value. | Implementation-ready now that the formal modules and projection handoff are landed. Keep parity at shared-core depth; do not make MCP transport the first comparison target.             |
| 5     | MCPA8 - Monster Control And Legendary Action Surface | ready-for-implementation-after-light-research | MCPA1, MON3 | none | Use `plans/MCPA8_MONSTER_CONTROL_AND_LEGENDARY_ACTION_SURFACE.md` to implement generic `execute_control_command` routes for named monster legendary/recharge/daily ability choice, then wire the attack-shaped legendary follow-up through the settled generic attack boundary plus stat-block `abilityId`. | Implementation-ready once the worker reads the MCPA8 writeup, re-checks `.references/srd-5.2.1/Monsters/Overview.md` and `UBIQUITOUS_LANGUAGE.md`, and keeps non-attack legendary options deferred. |
| 6     | H - PassiveModifiers Sub-Record                      | deferred                               | none       | none         | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup.                                                                                                                                    | Explicitly outside the current batch.                                                                                                                        |
| 7     | I - Build-Map / Hole Metadata                        | deferred                               | none       | none         | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup.                                                                                                                                    | Explicitly outside the current batch.                                                                                                                        |
| 8     | QFULL - Full Workspace Quality Run                   | blocked                                | CQ3, CQ4, MCPA8 | none      | After the remaining active implementation tasks land, run the full workspace verification surface from a clean installed checkout: `pnpm quality`, the relevant deterministic Quint test commands, and the task-owned TS test commands needed to prove the integrated branch is coherent end-to-end. | Blocked until the remaining active implementation tasks settle; use this as the final integration-quality gate rather than widening feature tasks into repo-wide verification. |

## Current Integrated Baseline

Already wired on `master` / `integration` and relevant to this batch:

- `battle.qnt` remains the authoritative combat boundary.
- `creature.qnt` already contains reusable helper semantics relevant to character formalization:
  - `CharConfig`
  - point-buy validation
  - XP/level helpers
  - ASI helpers
  - multiclass prerequisite helpers
  - first-level and level-up HP helpers
  - class-level aggregation helpers
- TypeScript already contains the landed character foundation:
  - `CharacterDraft` / `CharacterSheet`
  - open-choice and finalization analysis
  - ordered `advancement`
  - sheet-to-runtime projection helpers
  - a thin `/character` workflow shell that persists only draft state
  - partial authored creation facts, including incomplete ability-score assignment plus owned choice / equipment / spellcasting state that CQ1 must formalize rather than trim away
- The character/creature boundary is now stated explicitly in [ARCHITECTURE.md](../ARCHITECTURE.md):
  - in peace you're a character; in combat you're a creature
- The new synthesis artifact for the remaining formalization work is [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).

Current architecture decisions for this batch:

- `CharacterDraft` and `CharacterSheet` remain the canonical player-character ownership surfaces.
- `character-creation.qnt` should own draft/open-choice/finalization semantics.
- `character.qnt` should own finalized-sheet advancement and character-to-creature projection semantics.
- `CharacterCreatureProjection` is the intended formal handoff between character semantics and creature runtime semantics.
- Level-1 creation is not level advancement.
- Higher-level starts are explained as legal level-1 creation plus repeated legal advancement.
- Runtime projections remain one-way derived data from character-owned facts.
- Rule semantics may be hardcoded where they are stable SRD mechanics; content should enter through typed descriptors where possible so future licensed content can reuse the same semantic engine without semantic forks.

Planning note:

- `CHAR1` through `CHAR7` and `POST1` through `POST4` are complete foundation work, not active queue items.
- `MON1` through `MON4` are complete and no longer belong in the active queue.
- New character work is additive: formalize the already-landed character domain rather than reopening the ownership decisions already made.
- `MCPA8` remains the only active MCP follow-up in this batch.

## Task Selection Guidance

Recommended next coding-loop task:

1. **CQ4 - Character Quint Parity Harness**
   The projection boundary is now landed. The next character-semantic loop should prove shared-core parity across finalization, advancement, and the settled character-to-creature handoff.
2. **MCPA8 - Monster Control And Legendary Action Surface**
   This remains implementation-ready and can proceed if the current loop intentionally chooses MCP work instead of the character-formalization track.
3. **QFULL - Full Workspace Quality Run**
   Run this only after the remaining implementation tasks are landed, from a clean installed checkout, as the final broad quality gate.

Do not reopen the completed `CHAR*`, `POST*`, or monster tracer-bullet tasks inside the active queue. Use the archived foundation summary and git history when context is needed.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Treat CQ1a as frozen and done; do not reopen it unless the implementation uncovers a genuinely missing owned surface.
3. CQ3 is complete; use the landed projection boundary as the shared-core target for CQ4.
4. Execute CQ4 after CQ1b, CQ2, and CQ3.
7. `MCPA8` may proceed in parallel only if the loop intentionally chooses MCP work and does not touch the character-formalization ownership surfaces.
8. Keep H and I deferred.
9. Execute `QFULL` only after `CQ3`, `CQ4`, and `MCPA8` are complete or intentionally deferred for the batch.

## Task Bodies

### Task 0 - CQ1a - Freeze Character Creation Surface

Status: `done`

Depends on: none

Blocks: `CQ1b`

Scope:

- Freeze the canonical TS-owned character-creation surface before implementation.
- Capture the inventory of authored fields, choice categories, and legality/open-choice ownership that `character-creation.qnt` must preserve.
- Define stable acceptance gates for the implementation task so later CQ1 rejections do not keep mutating scope.

Next action:

- None. This task is complete; use its artifacts as the stable brief for CQ1b.

Research note:

- The frozen surface inventory lives in [plans/CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md](./CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md).
- CQ1b must preserve the canonical TS-owned authored shape rather than inventing a surrogate or shadow-state model.
- CQ1b must keep `finalizeDraft` guarded/partial: incomplete or illegal drafts must not produce a `CharacterSheet`.
- CQ1b must preserve the TS-owned legality/open-choice surface for character creation instead of collapsing it into summary invalidity checks.

Verification requirements:

- Confirm the inventory and stable acceptance gates exist and are specific enough for CQ1b to implement without reopening task scope.

### Task 1 - CQ1b - Implement Character Creation Module

Status: `done`

Depends on: `CQ1a`

Blocks: `CQ2`, `CQ3`, `CQ4`

Scope:

- Implement `character-creation.qnt` over the frozen CQ1 surface defined by [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) and [plans/CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md](./CQ1_CHARACTER_CREATION_SURFACE_INVENTORY.md).
- Formalize `CharacterDraft`, open choices, incompleteness, legality, and finalization semantics.
- Ground the design in SRD 5.2.1 character-creation text and existing reusable helper semantics in [creature.qnt](../creature.qnt).
- Preserve the canonical TS-owned authored creation shape rather than introducing a reduced surrogate model, flattened replacement record, or duplicate shadow-presence metadata.
- Keep `finalizeDraft` guarded/partial: an illegal or incomplete draft must not produce a `CharacterSheet`.
- Preserve the TS-owned legality/open-choice surface for character creation rather than collapsing it into looser summary invalidity checks.
- Do not edit unrelated shared verification tooling as part of CQ1b.
- Update `POST1_FORMAL_CREATION_SEMANTICS.md` only if the aligned formal module and deterministic tests actually land in the same change.

Next action:

- None. This task is complete; use the landed finalized-sheet boundary in `character-creation.qnt` as the starting point for `CQ2`.

Verification requirements:

- Read the relevant SRD text in `.references/srd-5.2.1/` plus [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) before editing code.
- Confirm all modeled rules trace to specific SRD passages.
- Verify that `character-creation.qnt` covers the same authored creation facts already owned by the TS draft/sheet surface, including incompleteness states and legality-relevant choice categories needed by downstream CQ2/CQ4 work.
- Demonstrate that the Quint issue/open-choice surface still covers TS-owned categories for granted-language/proficiency validation, multiclass-specific choices, duplicate-choice detection, equipment/loadout legality, and spellcasting legality rather than replacing them with looser summary checks.
- Verify that no shared fuzz/MBT/helper scripts changed as part of CQ1b.
- Use deterministic Quint tests and the narrowest relevant parity surface.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 2 - CQ2 - Formal Character Advancement Module

Status: `done`

Depends on: `CQ1b`

Blocks: `CQ3`, `CQ4`

Scope:

- After `CQ1b` lands, implement `character.qnt` over finalized `CharacterSheet` semantics.
- Cover `isLegalSheet`, `canAdvance`, `advanceLevel`, and higher-level starts as legal level-1 creation plus repeated legal advancement.
- Update `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` so it points at the landed formal advancement module and becomes deletion-ready once the full `CQ*` track is complete.

Next action:

- None. This task is complete; use the landed advancement owner in `character.qnt` as the formal prerequisite for `CQ3` and later parity work.

Verification requirements:

- Confirm the landed advancement module remains grounded in the local SRD advancement text and `UBIQUITOUS_LANGUAGE.md`.
- Keep deterministic Quint coverage for advancement legality, contradiction rejection, and higher-level-start equivalence close to the formal owner.
- Keep TypeScript advancement helpers thin wrappers over the shared finalized-sheet boundary until CQ4 closes the remaining parity work.

### Task 3 - CQ3 - Character To Creature Projection Boundary

Status: `done`

Depends on: `CQ1b`, `CQ2`

Blocks: `CQ4`

Scope:

- After `CQ1b` and `CQ2` land, implement the formal handoff from character semantics into creature-facing execution semantics.
- Use the PRD's proposed `CharacterCreatureProjection` boundary and map it into `CharConfig`.
- Remove or redirect remaining references that still treat `POST1` or `POST3` as the current design authority.

Next action:

- None. This task is complete; use the landed `CharacterCreatureProjection` and shared TS helper as the fixed boundary for CQ4 parity work.

Verification requirements:

- Confirm the landed projection remains one-way and derived from character-owned facts.
- Confirm the Quint-to-TS handoff still routes through the settled `CharacterCreatureProjection` boundary and downstream `CharConfig` mapping.
- `/simplify` round 1 removed a broken optional-subclass assumption from the candidate merge and aligned the formal `CharConfig` mapping with the existing non-optional `creature.qnt:CharConfig.subclass` surface.
- `/simplify` round 2 pulled the new TS projection helper off the `character-domain.ts` barrel and onto direct imports, eliminating an avoidable circular-dependency risk without changing the CQ3 behavior.

### Task 4 - CQ4 - Character Quint Parity Harness

Status: `ready-for-implementation-after-light-research`

Depends on: `CQ1b`, `CQ2`, `CQ3`

Blocks: none

Scope:

- After the formal modules land, add deterministic Quint tests and TypeScript parity for draft/finalization, advancement transitions, and the character-to-creature projection boundary.
- Target shared core functions rather than adapter shells.
- Delete `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` if their remaining value is fully subsumed by the landed `CQ*` artifacts and the current PRD.

Next action:

- Read the landed `character.qnt` projection functions and `packages/core/src/character-sheet-creature-projection.ts`, then add shared-core parity checks without widening into MCP or battle MBT work.

Verification requirements:

- Prefer deterministic Quint tests and narrow parity coverage over broader MBT.
- Record any remaining documentation deletions or retained artifacts as part of closeout.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 5 - MCPA8 - Monster Control And Legendary Action Surface

Status: `ready-for-implementation-after-light-research`

Depends on: `MCPA1`, `MON3`

Blocks: none

Scope:

- Use [MCPA8_MONSTER_CONTROL_AND_LEGENDARY_ACTION_SURFACE.md](./MCPA8_MONSTER_CONTROL_AND_LEGENDARY_ACTION_SURFACE.md) to implement generic `execute_control_command` routes for named monster legendary, recharge, and daily ability choice.
- Wire the attack-shaped legendary follow-up through the settled generic attack boundary plus stat-block `abilityId`.
- Keep non-attack legendary options deferred.

Next action:

- Re-check `.references/srd-5.2.1/Monsters/Overview.md` and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md), then implement against the existing generic attack boundary.

Verification requirements:

- Read the relevant SRD text plus [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) before editing code.
- Keep MCP ownership limited to the public action surface; do not introduce MCP-owned combat semantics.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 6 - H - PassiveModifiers Sub-Record

Status: `deferred`

Depends on: none

Blocks: none

Scope:

- Keep deferred unless the batch objective changes back toward MCP or action-surface cleanup.

Next action:

- Do not pick up in the current batch.

### Task 7 - I - Build-Map / Hole Metadata

Status: `deferred`

Depends on: none

Blocks: none

Scope:

- Keep deferred unless the batch objective changes back toward MCP or action-surface cleanup.

Next action:

- Do not pick up in the current batch.

### Task 8 - QFULL - Full Workspace Quality Run

Status: `blocked`

Depends on: `CQ3`, `CQ4`, `MCPA8`

Blocks: none

Scope:

- Run the full integrated quality surface from a clean installed checkout after the remaining active implementation tasks land.
- Use this task for broad repository verification rather than widening feature tasks into repo-wide cleanup mid-implementation.
- Capture any remaining baseline failures as explicit follow-up work instead of folding unrelated cleanup into earlier character/MCP tasks.

Next action:

- Wait until `CQ3`, `CQ4`, and `MCPA8` are complete or intentionally deferred for the batch, then run:
  - `pnpm quality`
  - the deterministic Quint commands relevant to the landed character modules
  - the task-owned TS test commands needed to validate the integrated branch end-to-end

Verification requirements:

- Run from a clean checkout with valid `node_modules`.
- Record the exact commands used and whether failures are task-caused or baseline noise.
- Do not treat this task as permission to reopen already-landed feature scope unless the failure proves a real integrated regression.

## Archived Done Foundations

Completed-task details were trimmed from the active execution artifact. Keep only the durable downstream findings here.

Character foundation:

- `CHAR1`: landed the canonical `CharacterDraft` / `CharacterSheet` boundary in core.
- `CHAR2`: landed owned SRD score-generation, background score adjustments, and starting-language validation.
- `CHAR3`: landed owned proficiency/subclass/class-resource build choices and validation.
- `CHAR4`: landed owned equipment/loadout facts and one-way projection into creature/battle-facing loadout fields.
- `CHAR5`: landed one owned derivation path for sheet numbers, spellcasting projection, machine input projection, and battle-init projection.
- `CHAR6`: landed the thin `/character` workflow shell over `CharacterDraft` plus direct finalization/derivation reuse.
- `CHAR7`: landed ordered `advancement` history as the canonical legality surface for higher-level starts and multiclass continuation.
- `POST1`: closed the research/design boundary for formal character creation semantics.
- `POST2`: landed open-choice and selective-invalidation behavior on the draft/sheet boundary in TypeScript.
- `POST3`: landed the canonical sheet-to-sheet advancement helper in TypeScript.
- `POST4`: converged workflow and runtime projections on the canonical draft/sheet story.

Monster and MCP foundation:

- `MON1` through `MON4`: landed the hand-authored SRD monster catalog foundation and the generic recharge projection path.
- `MCPA1` through `MCPA7`: landed the current public attack/spell/table-event ownership boundaries.

Archive rule:

- If a future task needs the full implementation history for a done foundation task, inspect git history instead of re-expanding this file.
- Once `CQ1` through `CQ4` are complete, delete `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` if the landed formal modules, current PRD, and git history fully cover their remaining documentary value.
