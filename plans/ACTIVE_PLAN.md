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
      "id": "CQ1",
      "status": "ready-for-research",
      "title": "Formal Character Creation Module"
    },
    {
      "number": 1,
      "id": "CQ2",
      "status": "blocked",
      "title": "Formal Character Advancement Module"
    },
    {
      "number": 2,
      "id": "CQ3",
      "status": "blocked",
      "title": "Character To Creature Projection Boundary"
    },
    {
      "number": 3,
      "id": "CQ4",
      "status": "blocked",
      "title": "Character Quint Parity Harness"
    },
    {
      "number": 4,
      "id": "MCPA8",
      "status": "ready-for-implementation-after-light-research",
      "title": "Monster Control And Legendary Action Surface"
    },
    {
      "number": 5,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 6,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
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
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks and documentation-only tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. For character-formalization tasks, prefer deterministic Quint tests and the narrowest character/creature-level parity surface before considering battle MBT.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched ownership surface, record that baseline noise and stop. Do not widen the task into repo-wide cleanup; unrelated cleanup belongs in a separate task or sidecar investigation.

## DAG / Queue Order

| Order | Task                                                 | Status                                 | Depends on | Blocks       | Next action                                                                                                                                                                                                                                  | Handoff readiness                                                                                                                                              |
| ----- | ---------------------------------------------------- | -------------------------------------- | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | CQ1 - Formal Character Creation Module               | ready-for-research                     | none       | CQ2, CQ3, CQ4 | Use [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) to design `character-creation.qnt`: formal `CharacterDraft`, open choices, incompleteness, legality, and finalization semantics grounded in SRD 5.2.1 creation text. Keep the Quint draft/sheet aligned with the canonical TS domain surface instead of introducing a reduced surrogate or shadow-presence metadata. Update the historical `POST1` note only when the landed module actually covers that owned surface and is deletion-ready once the full `CQ*` track is complete. | Start with RAW and ubiquitous-language review, then inventory the existing TS-owned draft/sheet fields and open-choice categories before sizing the Quint surface or tests. |
| 1     | CQ2 - Formal Character Advancement Module            | blocked                                | CQ1        | CQ3, CQ4     | After CQ1 lands, implement `character.qnt` over finalized `CharacterSheet` semantics: `isLegalSheet`, `canAdvance`, `advanceLevel`, and higher-level starts as creation plus repeated legal level-ups. Also update the historical `POST3` note so it points at the landed formal advancement module and becomes deletion-ready once the full `CQ*` track is complete. | Blocked on CQ1 because advancement starts from the finalized-sheet boundary defined by creation formalization.                                               |
| 2     | CQ3 - Character To Creature Projection Boundary      | blocked                                | CQ1, CQ2   | CQ4          | After CQ1 and CQ2 land, implement the formal handoff from character semantics into creature-facing execution semantics using the PRD's proposed `CharacterCreatureProjection` boundary and the downstream mapping into `CharConfig`. Remove or redirect any remaining references that still treat `POST1` / `POST3` as the current design authority. | Blocked until both creation and advancement semantics are formalized and the handoff surface can be sized once instead of guessed.                         |
| 3     | CQ4 - Character Quint Parity Harness                 | blocked                                | CQ1, CQ2, CQ3 | none      | After the formal modules land, add deterministic Quint tests and TS parity for draft/finalization, advancement transitions, and the character-to-creature projection boundary against shared core functions rather than adapter shells. As part of closeout, delete `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` if their remaining value is fully subsumed by the landed `CQ*` artifacts and the current PRD. | Blocked on the formal modules and projection surface. Keep parity at shared-core depth; do not make MCP transport the first comparison target.             |
| 4     | MCPA8 - Monster Control And Legendary Action Surface | ready-for-implementation-after-light-research | MCPA1, MON3 | none   | Use `plans/MCPA8_MONSTER_CONTROL_AND_LEGENDARY_ACTION_SURFACE.md` to implement generic `execute_control_command` routes for named monster legendary/recharge/daily ability choice, then wire the attack-shaped legendary follow-up through the settled generic attack boundary plus stat-block `abilityId`. | Implementation-ready once the worker reads the MCPA8 writeup, re-checks `.references/srd-5.2.1/Monsters/Overview.md` and `UBIQUITOUS_LANGUAGE.md`, and keeps non-attack legendary options deferred. |
| 5     | H - PassiveModifiers Sub-Record                      | deferred                               | none       | none         | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup.                                                                                                                                    | Explicitly outside the current batch.                                                                                                                        |
| 6     | I - Build-Map / Hole Metadata                        | deferred                               | none       | none         | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup.                                                                                                                                    | Explicitly outside the current batch.                                                                                                                        |

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

1. **CQ1 - Formal Character Creation Module**
   This is the new highest-priority task. The formal creation owner does not exist yet, and CQ2/CQ3/CQ4 all depend on it.
2. **MCPA8 - Monster Control And Legendary Action Surface**
   This remains implementation-ready and can proceed if the current loop intentionally chooses MCP work instead of the new character-formalization track.
3. **CQ2 - Formal Character Advancement Module**
   Pick this up immediately after CQ1 defines the finalized-sheet boundary in Quint.
4. **CQ3 - Character To Creature Projection Boundary**
   Do not size or implement the projection handoff before the formal creation and advancement layers settle.
5. **CQ4 - Character Quint Parity Harness**
   Add parity only after the formal modules and projection boundary exist.

Do not reopen the completed `CHAR*`, `POST*`, or monster tracer-bullet tasks inside the active queue. Use the archived foundation summary and git history when context is needed.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CQ1 next.
3. Execute CQ2 after CQ1.
4. Execute CQ3 after CQ1 and CQ2.
5. Execute CQ4 after CQ1, CQ2, and CQ3.
6. `MCPA8` may proceed in parallel only if the loop intentionally chooses MCP work and does not touch the character-formalization ownership surfaces.
7. Keep H and I deferred.

## Task Bodies

### Task 0 - CQ1 - Formal Character Creation Module

Status: `ready-for-research`

Depends on: none

Blocks: `CQ2`, `CQ3`, `CQ4`

Scope:

- Use [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) to design `character-creation.qnt`.
- Formalize `CharacterDraft`, open choices, incompleteness, legality, and finalization semantics.
- Ground the design in SRD 5.2.1 character-creation text and existing reusable helper semantics in [creature.qnt](../creature.qnt).
- Keep the Quint ownership surface aligned with the canonical TS domain in `packages/core/src/character-domain-model.ts`, `packages/core/src/character-ability-scores.ts`, and `packages/core/src/character-draft-analysis.ts`; do not replace optional / partial authored facts with a narrowed surrogate type or a duplicate `present`/status shadow.
- Do not edit unrelated shared verification tooling as part of CQ1.
- Update `POST1_FORMAL_CREATION_SEMANTICS.md` so it clearly points at the landed formal module only after that aligned surface exists, then leave it deletion-ready once the full `CQ*` track is complete.

Next action:

- Start with RAW and ubiquitous-language review.
- Inventory the existing TS-owned draft/sheet fields, partial ability-score state, and open-choice / issue categories that CQ1 must preserve.
- Pin the formal type/function surface and the minimum deterministic Quint test set for draft/finalization from that inventory.
- If the owned surface still feels ambiguous after the inventory, stop and write the mapping back into this plan before implementing rather than shipping a reduced slice.

Verification requirements:

- Read the relevant SRD text in `.references/srd-5.2.1/` plus [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) before editing code.
- Confirm all modeled rules trace to specific SRD passages.
- Verify that `character-creation.qnt` covers the same authored creation facts already owned by the TS draft/sheet surface, including incompleteness states and legality-relevant choice categories needed by downstream CQ2/CQ4 work.
- Use deterministic Quint tests and the narrowest relevant parity surface.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 1 - CQ2 - Formal Character Advancement Module

Status: `blocked`

Depends on: `CQ1`

Blocks: `CQ3`, `CQ4`

Scope:

- After `CQ1` lands, implement `character.qnt` over finalized `CharacterSheet` semantics.
- Cover `isLegalSheet`, `canAdvance`, `advanceLevel`, and higher-level starts as legal level-1 creation plus repeated legal advancement.
- Update `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` so it points at the landed formal advancement module and becomes deletion-ready once the full `CQ*` track is complete.

Next action:

- Wait for `CQ1` to define the finalized-sheet boundary in Quint, then implement advancement semantics against that surface.

Verification requirements:

- Read the relevant SRD text in `.references/srd-5.2.1/` plus [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) before editing code.
- Confirm all modeled rules trace to specific SRD passages.
- Prefer deterministic Quint tests and narrow character/creature-level parity before any broader MBT.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 2 - CQ3 - Character To Creature Projection Boundary

Status: `blocked`

Depends on: `CQ1`, `CQ2`

Blocks: `CQ4`

Scope:

- After `CQ1` and `CQ2` land, implement the formal handoff from character semantics into creature-facing execution semantics.
- Use the PRD's proposed `CharacterCreatureProjection` boundary and map it into `CharConfig`.
- Remove or redirect remaining references that still treat `POST1` or `POST3` as the current design authority.

Next action:

- Do not size or implement the projection handoff before the formal creation and advancement layers settle.

Verification requirements:

- Keep the projection one-way and derived from character-owned facts.
- Maintain parity with the authoritative Quint semantics and downstream bridge expectations.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 3 - CQ4 - Character Quint Parity Harness

Status: `blocked`

Depends on: `CQ1`, `CQ2`, `CQ3`

Blocks: none

Scope:

- After the formal modules land, add deterministic Quint tests and TypeScript parity for draft/finalization, advancement transitions, and the character-to-creature projection boundary.
- Target shared core functions rather than adapter shells.
- Delete `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` if their remaining value is fully subsumed by the landed `CQ*` artifacts and the current PRD.

Next action:

- Keep parity at shared-core depth; do not make MCP transport the first comparison target.

Verification requirements:

- Prefer deterministic Quint tests and narrow parity coverage over broader MBT.
- Record any remaining documentation deletions or retained artifacts as part of closeout.
- Include `/simplify` convergence in closeout with a minimum of two rounds unless the changeset is trivial.

### Task 4 - MCPA8 - Monster Control And Legendary Action Surface

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

### Task 5 - H - PassiveModifiers Sub-Record

Status: `deferred`

Depends on: none

Blocks: none

Scope:

- Keep deferred unless the batch objective changes back toward MCP or action-surface cleanup.

Next action:

- Do not pick up in the current batch.

### Task 6 - I - Build-Map / Hole Metadata

Status: `deferred`

Depends on: none

Blocks: none

Scope:

- Keep deferred unless the batch objective changes back toward MCP or action-surface cleanup.

Next action:

- Do not pick up in the current batch.

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
