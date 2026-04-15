# Active Plan

Date: 2026-04-13

This is the single active planning queue.

The previous character-formalization and MCP monster-control batch is complete and no longer belongs in the active queue. This file now tracks the next sequenced architecture batch:

- Monster database Phase 1-2 first;
- spell ownership and generic spell execution surfaces second;
- monster database continuation after the spell boundary lands.

## Batch Objective

Land the next content-architecture staircase without:

- duplicating monster or spell authored facts across core, MCP, app, runtime, or battle layers;
- collapsing provenance, structured input, and runtime projection into one type;
- inventing monster-specific or spell-specific adapter APIs where generic engine facilities should own execution;
- letting monster work become the owner of spell execution semantics;
- letting spell work create a second monster registry or bypass stat-block ownership;
- widening battle or MCP into the canonical owner of authored content.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Only use when the owner explicitly says to park the task for now. Do not use for queue ordering or "later batch" scheduling.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "MONDB1",
      "status": "done",
      "title": "Canonical Goblin Tracer Bullet"
    },
    {
      "number": 1,
      "id": "MONDB1a",
      "status": "done",
      "title": "Battle Participation Semantics And Goblin Add Flow"
    },
    {
      "number": 2,
      "id": "MONDB2",
      "status": "done",
      "title": "Second Monster Tracer Bullet"
    },
    {
      "number": 3,
      "id": "SPELL1",
      "status": "done",
      "title": "Freeze Spell Ownership Surface"
    },
    {
      "number": 4,
      "id": "SPELL2a",
      "status": "done",
      "title": "Canonical Spell Records And Identity Projection"
    },
    {
      "number": 5,
      "id": "SPELL2b",
      "status": "done",
      "title": "Battle Spell Projection For One Generic Spell Family"
    },
    {
      "number": 6,
      "id": "MONDB3",
      "status": "done",
      "title": "Advanced Monster Pattern Tracer Bullet"
    },
    {
      "number": 7,
      "id": "MONDB4a",
      "status": "done",
      "title": "Freeze Dataset Expansion Scope"
    },
    {
      "number": 8,
      "id": "MONDB4b",
      "status": "done",
      "title": "Martial Humanoid Dataset Slice"
    },
    {
      "number": 9,
      "id": "MONAUD1",
      "status": "done",
      "title": "Stable Unsupported Pattern Report"
    },
    {
      "number": 10,
      "id": "MONFAC1",
      "status": "done",
      "title": "Monster Save-Effect Action Surface"
    },
    {
      "number": 11,
      "id": "MONFAC2",
      "status": "done",
      "title": "Monster Combat Modifier Trait Surface"
    },
    {
      "number": 19,
      "id": "MONFAC1A",
      "status": "done",
      "title": "Conditional Failure-Band Save Effect Surface"
    },
    {
      "number": 20,
      "id": "MONFAC1B",
      "status": "done",
      "title": "Save-Plus-Prone Maneuver Surface"
    },
    {
      "number": 21,
      "id": "MONFAC1C",
      "status": "done",
      "title": "Movement-Coupled Save Effect Surface"
    },
    {
      "number": 22,
      "id": "MONMOB1",
      "status": "done",
      "title": "Monster Traversal Movement Surface"
    },
    {
      "number": 12,
      "id": "CHAREDIT1",
      "status": "ready-for-implementation-after-light-research",
      "title": "Mandatory Character Draft Update Preview"
    },
    {
      "number": 13,
      "id": "CHARMCP1",
      "status": "blocked",
      "title": "Stored Character MCP Surface"
    },
    {
      "number": 14,
      "id": "CHAROWN1",
      "status": "ready-for-implementation-after-light-research",
      "title": "Character Ownership Gap Cleanup"
    },
    {
      "number": 15,
      "id": "CHAROWN2",
      "status": "blocked",
      "title": "Fighting Style And Expertise Ownership"
    },
    {
      "number": 16,
      "id": "CHARMODEL1",
      "status": "blocked",
      "title": "Make Invalid Character States Unrepresentable"
    },
    {
      "number": 17,
      "id": "CHARTYPE1",
      "status": "blocked",
      "title": "Strengthen Character Result Shapes"
    },
    {
      "number": 18,
      "id": "CHARAUTH1",
      "status": "blocked",
      "title": "Character Quint Authority Convergence"
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
  - `blocked` if a required dependency or owner decision is still unresolved;
  - `deferred` only if the owner explicitly directed the loop to park the task.
- When a task is marked `done`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks and documentation-only tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks.
- Treat battle MBT as scarce for implementation tasks too. Use deterministic unit and projection tests first, and only run the narrowest relevant MBT tier once the code change is complete.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched ownership surface, record that baseline noise and stop. Do not widen the task into repo-wide cleanup; unrelated cleanup belongs in a separate task or sidecar investigation.

## DAG / Queue Order

| Order | Task                                                           | Status                                        | Depends on         | Blocks    | Next action                                                                                                                                                                                                                                                                                                                                                             | Handoff readiness                                                                                                                                                          |
| ----- | -------------------------------------------------------------- | --------------------------------------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | MONDB1 - Canonical Goblin Tracer Bullet                        | done                                          | none               | MONDB1a   | Landed on `integration`: goblin stock-weapon projection now reuses the shared SRD equipment weapon table, keeping one source of weapon identity while preserving existing goblin battle and MCP behavior.                                                                                                                                                               | Complete. Goblin stat blocks remain SRD-backed authored `StatBlock` data and deterministic verification is green.                                                          |
| 1     | MONDB1a - Battle Participation Semantics And Goblin Add Flow   | done                                          | MONDB1             | MONDB2    | Landed on `integration`: battle-participation wording is now explicit across the documented `BATTLE_INIT` / `BATTLE_ADD_CREATURE` surfaces, and deterministic regressions cover one initial goblin projection and one mid-battle goblin projection.                                                                                                                     | Complete. Goblins are now regression-covered through the same generic projection semantics at battle init and mid-battle add time.                                         |
| 2     | MONDB2 - Second Monster Tracer Bullet                          | done                                          | MONDB1a            | SPELL1    | Landed on `integration`: `Harpy` now serves as the task-owned non-goblin tracer bullet in this batch, preserving `Luring Song` as explicit text-authored unsupported data while `Claw` projects through the same generic stat-block, battle-init, and battle-add paths used by goblins.                                                                                 | Complete. A materially different non-spellcasting monster now proves the shared `StatBlock` and MCP/battle projection seam without pulling spell ownership forward.         |
| 3     | SPELL1 - Freeze Spell Ownership Surface                        | done                                          | MONDB2             | SPELL2a   | Landed on `integration`: [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) now freezes the canonical spell owner, canonical `SpellId` identity, provenance/supporting-input split, and the exact authored-reference/battle/MCP boundary for the spell stack.                                                                                    | Complete. `SPELL2a` can now implement one canonical spell-owned record and one-way projection layer without reopening ownership or identity scope.                          |
| 4     | SPELL2a - Canonical Spell Records And Identity Projection      | done                                          | SPELL1             | SPELL2b   | Landed on `integration`: canonical spell records now own `SpellId`, SRD provenance, and spell-authored mechanics/projection hooks in `packages/core/src/features/spell-registry.ts`, while character summaries, monster spell references, and current battle payload builders consume those records without restating authored spell facts.                                | Complete. Spell identity/provenance now lives on the spell side, and downstream layers reference the same canonical `SpellId` seam rather than parallel name-based spell owners. |
| 5     | SPELL2b - Battle Spell Projection For One Generic Spell Family | done                                          | SPELL2a            | MONDB3    | Landed on `integration`: the first generic save-spell battle family now resolves action discovery from canonical spell-owned mechanics and battle payload projection (`burning_hands`, `fireball`, `hold_person`) instead of battle-local spell tables, while counterspell timing remains battle-owned.                                                                | Complete. One bounded generic spell family now proves the canonical `SpellId` to battle-action seam end to end, including higher-slot Hold Person target projection and MCP exposure. |
| 6     | MONDB3 - Advanced Monster Pattern Tracer Bullet                | done                                          | SPELL2b            | MONDB4a   | Landed on `integration`: `Mage` now proves the first advanced monster spellcasting slice by projecting action-section `Fireball (2/Day Each)` through the existing generic battle-owned AoE spell payload lane, spending a monster daily-use resource instead of a slot while keeping the remaining spell references explicit authored spellcasting data.                   | Complete. The advanced tracer bullet now proves reusable monster spellcasting on top of the canonical `SpellId` and battle payload surface without adding monster-specific battle or MCP APIs. |
| 7     | MONDB4a - Freeze Dataset Expansion Scope                       | done                                          | MONDB3             | MONDB4b, MONAUD1 | Landed on `integration`: the post-tracer-bullet dataset policy is now frozen around one data-heavy first slice, one explicit unsupported-pattern report surface, and later one-facility-per-task generic-runtime follow-ons rather than a single open-ended expansion phase.                                                                                            | Complete. The queue now names a bounded first implementation slice and a stable audit/report target without reopening monster ownership or spell-boundary decisions.         |
| 8     | MONDB4b - Martial Humanoid Dataset Slice                       | done                                          | MONDB4a            | MONAUD1   | Landed on `integration`: the first bounded bulk SRD roster slice now adds `Bandits`, `Berserker`, `Commoner`, `Cultists`, `Gladiator`, `Guards`, `Noble`, `Pirates`, `Spy`, `Toughs`, and `Warriors` as hand-authored stat blocks, keeping compatible stock-weapon attacks on the current generic projection path and preserving unsupported clauses as explicit text-only or structured spellcasting entries. | Complete. The targeted martial-humanoid sections fit the existing stat-block, attack, multiattack, spellcasting-reference, and text-only unsupported surfaces without adding a new monster runtime facility. |
| 9     | MONAUD1 - Stable Unsupported Pattern Report                    | done                                          | MONDB4a, MONDB4b   | MONFAC1, MONFAC2 | Landed on `integration`: the unsupported monster audit is now a stable code-derived report with explicit row fields, blocker-family ownership on authored text-only abilities, SRD citations, grouped counts by blocker family and stat block, and a generated markdown summary for planning review.                                                                  | Complete. Later monster-facility tasks can now choose from a frozen blocker-family inventory and grouped counts without re-deriving categories from prose or maintaining a parallel registry. |
| 10    | MONFAC1 - Monster Save-Effect Action Surface                   | done                                          | MONAUD1            | MONFAC1A, MONFAC1B, MONFAC1C | Landed in plan only: the coarse `saveEffectAction` audit bucket is now explicitly split into three child runtime families instead of being treated as one implementation task. `Pseudodragon` `Sting` anchors the conditional-failure-band save family, `Gladiator` `Shield Bash` anchors the save-plus-Prone maneuver family, and `Centaur Trooper` `Trampling Charge` anchors the movement-coupled save family. | Complete as research. The queue now exposes implementation-sized child slices instead of one mixed bucket that would have forced control, prone, and movement semantics into the same task. |
| 11    | MONFAC2 - Monster Combat Modifier Trait Surface                | done                                          | MONAUD1            | none      | Landed on `integration`: `Magic Resistance` now projects from `Pseudodragon` authored traits into the generic save-resolution lane, including stat-block battle init, raw battle creature command decoding, persisted battle state, and spell/magical-effect save resolution without adding monster-specific flags.                                                   | Complete. The first combat-modifier trait family now proves a reusable save-modifier surface, while `Pack Tactics`, `Sunlight Sensitivity`, `Bloodied Frenzy`, and `Blood Frenzy` remain explicitly unsupported for later family-specific work. |
| 19    | MONFAC1A - Conditional Failure-Band Save Effect Surface        | done                                          | MONFAC1            | none      | Landed on `integration`: `Pseudodragon` `Sting` now projects through one generic stat-block-authored save-effect runtime lane with a timed base `Poisoned` effect, a failure-by-5 conditional `Unconscious` rider, source-specific effect identities, and early-end handling for damage or a nearby wake action without broadening into attack-hit riders. | Complete. The first conditional failure-band save family now proves reusable save-only delivery and conditional rider cleanup while leaving `Homunculus`-style attack riders to later work. |
| 20    | MONFAC1B - Save-Plus-Prone Maneuver Surface                    | done                                          | MONFAC1            | none      | Landed on `integration`: `Gladiator` `Shield Bash` now projects through the shared single-target monster save-effect lane as an immediate fail rider that deals damage and applies a size-gated `Prone` condition without timed-effect bookkeeping. | Complete. Size-gated direct `Prone` riders belong in the same single-target save-effect family, while area shapes, push-coupled riders, and movement-coupled targeting remain separate follow-on families. |
| 21    | MONFAC1C - Movement-Coupled Save Effect Surface                | done                                          | MONFAC1            | MONMOB1   | Landed as research only: `Centaur Trooper` `Trampling Charge` should not extend the current single-target `saveEffectAction` lane. The durable prerequisite is a movement-owned traversal surface because the current battle movement event spends movement and handles opportunity attacks only; it does not own path, entered-creature enumeration, or position updates. | Complete as research. The family boundary is now explicit: traversal movement must land first, then `Trampling Charge` can consume it as the first entered-creature save rider. |
| 22    | MONMOB1 - Monster Traversal Movement Surface                   | done                                          | MONFAC1C           | none      | Landed on `integration`: the battle runtime now owns one generic monster traversal movement surface with explicit destination, movement-spend, pass-through-size, and ordered entered-creature facts, and `Centaur Trooper` `Trampling Charge` is the first consumer. Traversal save continuation, Legendary Resistance, and half-on-success parity now resume through the same shared lane without widening adjacent families like `Engulf`, `Aquatic Charge`, or move-then-attack actions. | Complete. Traversal-triggered entered-creature save riders now have a movement-owned shell, while adjacent traversal families remain explicitly out of scope for later tasks. |
| 12    | CHAREDIT1 - Mandatory Character Draft Update Preview           | ready-for-implementation-after-light-research | none               | CHARMCP1, CHARMODEL1 | Implement the core-domain preview-before-commit operation for destructive character draft edits using [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md) and the convergence direction in [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).                                      | The shape is already stable enough for implementation. Do the light repo/SRD check, then land the canonical preview-before-commit seam.                                                     |
| 13    | CHARMCP1 - Stored Character MCP Surface                        | blocked                                       | CHAREDIT1          | CHARAUTH1 | Wait for `CHAREDIT1`, then add the stored-server-side character MCP surface over canonical `CharacterDraft` / `CharacterSheet` operations using [PRD_CHARACTER_MCP_SURFACE.md](../PRD_CHARACTER_MCP_SURFACE.md).                                                                                                                                                                | The contract is well-scoped, but it should consume preview-before-commit semantics rather than inventing adapter-local draft mutation behavior.                    |
| 14    | CHAROWN1 - Character Ownership Gap Cleanup                     | ready-for-implementation-after-light-research | none               | CHAROWN2  | Clean up stale character-side ownership residue, starting with subclass validation scaffolding that no longer matches advancement-owned subclass semantics, using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md). | Small and well-scoped. It is implementation-ready and no longer parked behind a fake batch boundary.                                     |
| 15    | CHAROWN2 - Fighting Style And Expertise Ownership              | blocked                                       | CHAROWN1           | CHARMODEL1 | Wait for `CHAROWN1`, then add Fighting Style selections and expertise as character-side owned or explicitly derived facts and thread them through validation, sanitization, projection, and Quint parity using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).      | These are real missing character-side ownership gaps, but they should build on the cleanup slice first so the ownership line stays single-source. |
| 16    | CHARMODEL1 - Make Invalid Character States Unrepresentable     | blocked                                       | CHAREDIT1, CHAROWN2 | CHARTYPE1, CHARAUTH1 | Wait for `CHAREDIT1` and `CHAROWN2`, then remove character-side representable invalid states by eliminating duplicated owned progression facts, replacing weak status/result bags with discriminated unions, and tightening finalized-sheet submodels so canonical character state cannot encode contradictions that core/Quint only repair after the fact. Use [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md), [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md), and [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md). | This is the structural hardening slice for authored character state. It should land after preview semantics and missing ownership facts are settled, but before the narrower result-API hardening and final Quint-authority convergence passes. |
| 17    | CHARTYPE1 - Strengthen Character Result Shapes                 | blocked                                       | CHARMODEL1         | CHARMCP1, CHARAUTH1 | Wait for `CHARMODEL1`, then strengthen the TypeScript result types for assessment/finalization/advancement so impossible combinations become unrepresentable and add an advancement-assessment/preview surface that preserves open-hole versus illegal-issue distinction. Use [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md) and [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md). | This is the domain API hardening slice. It should consume the settled preview semantics and the cleaned-up canonical character model rather than freezing weak shapes too early. |
| 18    | CHARAUTH1 - Character Quint Authority Convergence              | blocked                                       | CHARMCP1, CHARTYPE1 | none      | Wait for `CHARMCP1` and `CHARTYPE1`, then tighten parity and ownership rules until the character stack is operationally Quint-led and TS is clearly adapter/runtime code, following [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).                                                    | This is the convergence capstone, not the starting slice. It needs the MCP boundary, remaining authored character-side facts, and hardened public result shapes settled first. |

## Current Integrated Baseline

Already wired on `master` / `integration` and relevant to this batch:

- `battle.qnt` remains the authoritative combat boundary.
- Monster control and legendary action MCP surfaces already exist and consume core-owned monster data through generic battle-facing routes rather than adapter-owned monster registries.
- `packages/core/src/monster-types.ts`, `packages/core/src/monster-catalog.ts`, and `packages/core/src/monster-catalog.md` already provide the starting point for the monster catalog, but the current shape is intentionally narrow and still too goblin-specific for durable SRD dataset growth.
- `CONTENT_ARCHITECTURE_ROADMAP.md` already establishes the intended sequence after the completed character batch:
  - monsters first;
  - spells second;
  - monster continuation after the spell boundary exists.
- `plans/monster-database-plan.md` already contains the durable phase structure for Monster DB phases 1-4.
- `MCP_EVENT_SURFACE_AUDIT.md` already identifies generic battle spell surfaces as blocked on a canonical spell-content owner and battle-owned multi-phase spell resolution boundary.

Current architecture decisions for this batch:

- `StatBlock` is the canonical monster-authored record.
- SRD is provenance for shipped SRD monsters; 5e-tools may inform normalization but is never provenance.
- Monster-authored sections should be modeled explicitly as typed authored data.
- The type shape must distinguish executable abilities from text-only unsupported abilities structurally.
- Runtime battle state is a one-way projection from authored monster or spell records.
- Battle owns participation, not creature existence. `BATTLE_INIT` should be understood as the initial batch add of already-authored creatures into a new battle, and `BATTLE_ADD_CREATURE` as the same projection semantics later in the battle lifecycle.
- Monster work may reference spell identities and authored spellcasting prose, but it must not become the owner of spell execution semantics.
- Spell work must first define canonical spell records and identity projection, then one narrow battle spell family slice, before advanced monster continuation depends on them.
- Canonical spell identity is `SpellId`; display names and open `SpellName` strings are adapter/input conveniences rather than a second identity system.
- Canonical spell provenance follows the same split already required for monsters: provenance on the authored record, supporting machine-readable inputs separate, runtime payloads separate from both.
- Canonical spell records now live in `packages/core/src/features/spell-registry.ts`; record-owned `modeling` and `projections` carry the reusable authored spell mechanics and one-way battle payload projection hooks that later spell-family work should consume.
- Advanced monster spellcasting now reuses that same spell-owned payload surface: modeled monster action spells can seed `preparedSpells`, `readyableSpellPayloads`, and spell-scoped daily-use resources from authored stat-block sections without creating a monster-specific spell execution lane.
- The unsupported report's `saveEffectAction` blocker family is currently an audit taxonomy, not an implementation taxonomy. Existing rows already split across distinct runtime families: conditional failure bands, save-plus-Prone maneuvers, and movement-coupled save effects.
- The narrowest first child from that split is the conditional failure-band save-only family anchored by `Pseudodragon` `Sting`.
- The shared single-target monster save-effect lane now covers both timed fail riders such as `Pseudodragon` `Sting` and immediate fail riders such as `Gladiator` `Shield Bash`; size-gated direct `Prone` stays in that lane, while area, push-coupled, and movement-coupled variants remain separate families.
- Movement-coupled monster actions require a movement-owned traversal surface before they can become executable runtime abilities: the current `BATTLE_MOVE` event spends movement and resolves opportunity-attack checkpoints only, while `Trampling Charge` needs explicit path traversal, entered-creature enumeration, and once-per-creature targeting facts.
- Local SRD review did not find a second source-accurate peer with the same authored shape. `Homunculus` `Bite` is adjacent but not equivalent: it is attack-hit gated, has a different base failure duration, and its escalated `Unconscious` clause ends early only on damage, not on an adjacent creature's wake action.

Planning note:

- The completed character-formalization and MCP monster-control work is intentionally removed from the active queue. Use git history and the supporting PRDs for context when needed; do not re-open that finished batch here.
- The character tasks below are real queue items. Keep them runnable when they can proceed now, or blocked only on concrete dependencies or explicit owner decisions.

## Recommended Coding Loop

1. Start with [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md), [plans/monster-database-plan.md](./monster-database-plan.md), [ARCHITECTURE.md](../ARCHITECTURE.md), and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
2. For monster implementation tasks, read the relevant SRD monster text in `.references/srd-5.2.1/Monsters/` before editing code.
3. Keep monster spellcasting sections reference-only or text-only until `SPELL1`, `SPELL2a`, and the relevant `SPELL2b` slice land.
4. For spell planning and implementation tasks, use [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) as the public-surface dependency ledger, and use [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) as the frozen spell-content owner and projection-boundary note.
5. Treat `SPELL2a` and `SPELL2b` as separate coding loops. Do not merge canonical spell identity work and battle spell family work into one unbounded task unless this plan is updated first.
6. Keep future verification narrow and ownership-focused; do not widen MONDB or SPELL tasks into repo-wide cleanup.

## Task Bodies

### Task 0 - MONDB1 - Canonical Goblin Tracer Bullet

Status: `done`

Depends on: none

Blocks: `MONDB1a`

Scope:

- Replace the current goblin-oriented stat-block shortcuts with the canonical `StatBlock` authored-section shape described in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [plans/monster-database-plan.md](./monster-database-plan.md).
- Keep the owned collection in `packages/core`; do not create a second monster registry in MCP, app, or runtime code.
- Add explicit SRD provenance to the goblin-owned records.
- Model authored sections explicitly enough to distinguish executable entries from text-only unsupported entries structurally.
- Preserve existing goblin battle and MCP behavior through the same public surfaces.
- Do not widen this task into spell execution ownership, importer pipelines, or full-dataset expansion.

Next action:

- None. This task is complete on `integration`.

Research note:

- The phase and acceptance criteria already exist in [plans/monster-database-plan.md](./monster-database-plan.md).
- The goblin tracer bullet should prove vocabulary, provenance, and projection, not advanced execution support.
- If goblin spellcasting or advanced facility pressure appears, stop at the reference/text boundary and leave that work for later tasks.

Verification requirements:

- Confirm the modeled goblin rules and provenance trace to the local SRD corpus.
- Run task-scoped TypeScript tests for the monster catalog, projection, battle, and MCP paths touched by the migration.
- Include `/simplify` convergence, minimum two rounds.
- If battle behavior changed, run only the narrowest relevant verification surface after deterministic tests are green.

Closeout note:

- Integrated result keeps goblin stock-weapon projection (`Dagger`, `Scimitar`, `Shortbow`) on the shared SRD equipment weapon table rather than duplicating weapon identity inside monster battle projection code.

### Task 1 - MONDB1a - Battle Participation Semantics And Goblin Add Flow

Status: `done`

Depends on: `MONDB1`

Blocks: `MONDB2`

Scope:

- Lock the durable domain rule that creatures exist outside battle and are projected into battle participation rather than created by battle lifecycle commands.
- Make `BATTLE_INIT` explicitly mean initial batch add into battle, not creature creation.
- Make `BATTLE_ADD_CREATURE` explicitly mean the same projection semantics later in the battle lifecycle.
- Prove one initial goblin add flow and one mid-battle goblin add flow through the existing MCP/core surfaces.
- Allow wording cleanup in `plans/ACTIVE_PLAN.md`, [ARCHITECTURE.md](../ARCHITECTURE.md), MCP tool descriptions/examples, and implementation-facing code comments where current wording implies creature creation at battle start.
- Do not rename public command types or change payload shapes in this task.

Next action:

- None. This task is complete on `integration`.

Research note:

- This is intentionally a hard-gate semantic cleanup task, not a request for new monster-addition mechanics.
- The existing MCP/core paths already support goblin add flows; the task is to make their shared semantics explicit and regression-covered.

Verification requirements:

- Confirm the cleaned-up wording consistently states battle participation rather than creature creation.
- Verify both flows:
  - initial goblin batch add via `BATTLE_INIT`;
  - mid-battle goblin add via `BATTLE_ADD_CREATURE`.
- Include `/simplify` convergence, minimum two rounds.

Closeout note:

- The integrated result keeps `BATTLE_INIT` and `BATTLE_ADD_CREATURE` aligned on the same battle-participation projection semantics, with explicit goblin regression coverage in core battle and MCP control-command tests.

### Task 2 - MONDB2 - Second Monster Tracer Bullet

Status: `done`

Depends on: `MONDB1a`

Blocks: `SPELL1`

Scope:

- Add one non-goblin SRD monster that proves the canonical `StatBlock` shape works beyond the goblin slice.
- Reuse the same owned record and projection path established in `MONDB1`.
- Prefer a monster that exercises a materially different authored-section shape without forcing spell ownership decisions.
- Preserve unsupported abilities as text-only structured data with explicit reasons instead of dropping them.

Next action:

- None. This task is complete on `integration`.

Research note:

- `Harpy` is the chosen task-owned monster because it widens authored-section shape without pulling spell ownership forward.
- `Luring Song` remains explicit text-authored unsupported data with a recorded reason, while `Claw` projects through the generic battle path.

Verification requirements:

- RAW / terminology traceability: reviewed `.references/srd-5.2.1/Monsters/Monsters-H-L.md` (`Harpy`) and `UBIQUITOUS_LANGUAGE.md` terms `Stat Block`, `Creature`, `Attack Roll`, `Initiative`, `Charmed`, `Incapacitated`, and `Opportunity Attack` before finalizing the owned record.
- Deterministic verification:
  - `pnpm --filter @dnd/core exec vitest run src/monster-catalog.test.ts`
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/core lint`
  - `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t Harpy`
  - `pnpm --filter @dnd/mcp lint`
  - `pnpm quality`
- `/simplify` convergence:
  - Round 1: removed catalog-side attack-name special cases and moved compatible attack projection facts into authored `MonsterAttack.battleProfile` data so Harpy, goblins, and existing natural-weapon monsters share one generic projector.
  - Round 2: removed redundant stock-weapon identity from authored attack records so compatible stock-weapon projection remains single-source-of-truth on attack name, then confirmed no further important dedup or simplification issues remained on the task-owned surface.

### Task 3 - SPELL1 - Freeze Spell Ownership Surface

Status: `done`

Depends on: `MONDB2`

Blocks: `SPELL2a`

Scope:

- Freeze the canonical spell-authored record and spell-ownership seam before implementation.
- Inventory where spell identity, metadata, execution semantics, and public battle spell payloads currently live across core, features, battle, and MCP.
- Define the lasting boundary between:
  - authored spell records;
  - spell references used by monsters or characters;
  - battle-owned multi-phase spell resolution;
  - MCP/public input contracts.

Next action:

- None. This task is complete on `integration`; use [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) as the frozen boundary note.

Research note:

- `MCP_EVENT_SURFACE_AUDIT.md` already names the blocked public spell surfaces and why they are blocked.
- The missing piece is the spell-content owner and the spell-to-battle projection contract, not another MCP-specific schema.

Verification requirements:

- Confirm the frozen ownership surface is specific enough that `SPELL2a` can implement it without reopening task scope.
- Confirm the frozen seam prevents monster work from becoming the spell-content owner.

Closeout note:

- The integrated ownership freeze names core spell-owned data as the canonical spell owner, fixes canonical spell identity on `SpellId`, keeps display names separate from identity, and forbids character, monster, battle, and MCP layers from becoming shadow owners of spell provenance or authored mechanics.

### Task 4 - SPELL2a - Canonical Spell Records And Identity Projection

Status: `done`

Depends on: `SPELL1`

Blocks: `SPELL2b`

Scope:

- Implement the canonical spell-owned record and the one-way identity/projection boundary used by character and monster authored content.
- Keep spell identity, provenance, and authored metadata on the spell side.
- Define the minimum projection contract that lets downstream layers reference canonical spells without restating spell facts.
- Do not implement full battle spell resolution in this task.
- Do not expose raw internal event payloads as MCP schemas.

Next action:

- None. This task is complete on `integration`.

Research note:

- This task should make spell identity referenceable from monsters, characters, and later battle spell-family projections.
- The main blast radius is the current split between canonical `SpellId`, adapter-facing `SpellName`, and remaining raw-string spell fields in character, battle, and MCP surfaces.
- It should not widen into full content ingestion, app UX redesign, battle event ownership, or adapter-owned spell registries.

Verification requirements:

- Confirm all modeled rules trace to the local SRD corpus plus the repo's ubiquitous language.
- Run the narrowest relevant core tests for the touched spell/projection paths.
- Include `/simplify` convergence, minimum two rounds.

Closeout note:

- The integrated result keeps canonical spell identity, provenance, and modeled spell-authored mechanics on the spell side; characters, monsters, battle-init payloads, and MCP-facing tests now project or reference `SpellId` instead of restating spell facts.

### Task 5 - SPELL2b - Battle Spell Projection For One Generic Spell Family

Status: `done`

Depends on: `SPELL2a`

Blocks: `MONDB3`

Scope:

- Implement one battle-facing generic spell family on top of canonical spell records and identity projection.
- Pick one bounded family, such as save spells or concentration spells, and define the projection contract from canonical spell records into battle-owned resolution inputs.
- Keep save/DC/damage loops, counterspell windows, concentration transitions, and per-target resolution battle-owned.
- Do not widen this task to every battle spell family or all `BATTLE_CAST_*` surfaces at once.

Outcome:

- The save-spell family now routes battle discovery through canonical spell-owned mechanics and payload projection for `burning_hands`, `fireball`, and `hold_person`, without restoring a battle-local lookup table.
- `hold_person` higher-slot targeting is projected from the canonical spell record into the battle-owned staged save loop, and counterspell slot handling remains battle-owned.

Research note:

- This task should directly support one future generic battle spell surface without forcing the entire spell system to land in one change.
- Public MCP schemas should still remain narrow and derived from the battle-owned spell family boundary.

Verification requirements:

- Confirm the chosen spell family routes through a reusable generic projection path from canonical spell records into battle-owned semantics.
- Run the narrowest relevant core/battle/MCP tests for the touched spell family path.
- Include `/simplify` convergence, minimum two rounds.

Verification evidence:

- RAW check: reviewed `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for `Burning Hands` and `Counterspell`, `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for `Fireball` and `Hold Person`, and `UBIQUITOUS_LANGUAGE.md` spellcasting terminology before closeout.
- `/simplify` round 1: re-reviewed the accepted Task 5 diff for task-local duplication, battle-local spell tables, and spell-owned versus battle-owned boundary drift; no additional task-owned reductions were needed beyond the accepted code change.
- `/simplify` round 2: re-reviewed the post-fix diff and verification surface; no further task-owned issues remained, so the change converged.
- Deterministic checks:
  - `pnpm --dir packages/core exec vitest run src/available-actions.test.ts -t "battle discovery resolves AoE spell setup from canonical spell payload facts|battle discovery keeps non-AoE save spells off the AoE cast route|battle discovery resolves active save-spell casting from canonical spell payload facts|battle discovery filters save-spell targets to legal humanoids and carries higher-slot target selections"`
  - `pnpm --dir packages/mcp exec vitest run src/server.test.ts -t "battle hosts surface and execute AoE spell setup through MCP|battle hosts surface CAST_COUNTERSPELL from the authoritative spell-cast window|execute_action routes CAST_COUNTERSPELL through the battle lane end to end"`

Plan Impact:

- Status: applied
- Affected tasks:
  - `SPELL2b`: mark `done`
  - `MONDB3`: unblock to `ready-for-implementation-after-light-research`
- Plan edits: synchronized the task index, DAG row, and task body with the already-landed generic save-spell battle family implementation and its acceptance evidence.

### Task 6 - MONDB3 - Advanced Monster Pattern Tracer Bullet

Status: `done`

Depends on: `SPELL2b`

Blocks: `MONDB4a`

Scope:

- Return to monster continuation once spell ownership exists.
- Add one advanced repeated monster pattern through a generic engine facility rather than a monster-specific handler.
- Candidate patterns include recharge, legendary actions, stronger multiattack shapes, or monster spellcasting that now targets the canonical spell boundary.

Next action:

- None. Landed on `integration`: `Mage` action spellcasting now projects `Fireball (2/Day Each)` through the existing generic AoE spell payload lane and spends a spell-scoped daily-use resource rather than a slot.

Research note:

- The point of this task is not merely another monster record. It is to prove one durable advanced facility over canonical authored sections.

Verification requirements:

- Confirm the chosen advanced pattern routes through a reusable generic facility.
- Verify public battle and MCP surfaces remain generic after the tracer bullet lands.
- Include `/simplify` convergence, minimum two rounds.

Verification notes:

- RAW traceability check: `.references/srd-5.2.1/Monsters/Monsters-M-O.md` (`Mage`) and `.references/srd-5.2.1/Monsters/Overview.md` confirm the stat-block spellcasting section and action ownership; `UBIQUITOUS_LANGUAGE.md` terms `Action`, `Spell Save DC`, `Area of Effect`, and `Apply`/`Resolve` were used to keep the projection aligned with existing battle terminology.
- `/simplify` round 1: removed any need for a monster-specific cast token by routing the modeled spell through the existing `BATTLE_CAST_AOE` discovery and resolution lane.
- `/simplify` round 2: re-checked the task-owned diff for redundant state and boundary leakage; no further task-owned simplifications remained.
- Deterministic checks:
  - `pnpm exec vitest run src/monster-catalog.test.ts src/available-actions.test.ts src/battle-rules-scenarios.test.ts` (from `packages/core`)
  - `pnpm quality`

### Task 7 - MONDB4a - Freeze Dataset Expansion Scope

Status: `done`

Depends on: `MONDB3`

Blocks: `MONDB4b`, `MONAUD1`

Scope:

- Freeze the next SRD dataset expansion slice before bulk implementation starts.
- Choose the initial dataset batch size, the batching strategy for follow-on monster additions, and the unsupported-pattern audit/report shape.
- Convert the old monolithic dataset-expansion phase into explicit future implementation tasks once the scope is frozen.

Next action:

- None. Landed on `integration`: the first post-freeze dataset slice, the batching policy for later monster additions, and the report shape for unsupported patterns are now concrete enough to open child tasks without revisiting monster ownership.

Research note:

- This task exists to keep the queue implementation-sized. Do not treat the full dataset expansion as one coding-loop task.

Findings:

- The first bounded expansion slice is the martial-humanoid roster sections `Bandits`, `Berserker`, `Commoner`, `Cultists`, `Gladiator`, `Guards`, `Noble`, `Pirates`, `Spy`, `Toughs`, and `Warriors`.
- Data-heavy dataset slices are now frozen at about 8-12 SRD sections. The initial slice is explicitly 11 sections, and later data-heavy slices should stay in that same order of magnitude so batching does not need to be re-decided task by task.
- Generic-runtime follow-ons remain one-facility slices with 1-3 validation monsters. Long-horizon control, domination, breathing, suffocation, and external-companion command effects remain outside the initial data slices.
- The unsupported-pattern report shape is frozen to one code-derived row per unsupported authored ability or structured spellcasting entry, with stable fields for `statBlockId`, `monsterName`, `section`, `abilityId`, `abilityName`, blocker-family classification, SRD citation, and human-readable reason, plus grouped counts by blocker family and by stat block.

Verification requirements:

- Confirm the frozen dataset slice and batching strategy are specific enough to open concrete implementation tasks without reopening monster ownership decisions.
- Confirm the unsupported-pattern report shape is explicit enough to guide later generic-facility work.

Verification notes:

- Research sources:
  - `plans/monster-database-plan.md`
  - `PRD_MONSTER_DATABASE.md`
  - `UBIQUITOUS_LANGUAGE.md`
  - `packages/core/src/monster-catalog.md`
  - `packages/core/src/monster-catalog.ts`
  - `packages/core/src/monster-catalog-audit.ts`
  - `.references/srd-5.2.1/Monsters/Monsters-A-B.md`, `Monsters-C-D.md`, `Monsters-E-G.md`, `Monsters-M-O.md`, `Monsters-P-S.md`, and `Monsters-T-Z.md`
- Current-state findings used to freeze the plan:
  - the shipped catalog already contains 14 stat blocks;
  - the current unsupported audit contains 22 rows across 9 monsters;
  - the named first slice consists of SRD sections already present in the local corpus and mostly reuses the current attack, multiattack, stock-weapon, and text-only unsupported lanes.
- `/simplify` round 1: removed the stale “one monolithic Phase 4 dataset expansion” framing and replaced it with explicit child tasks plus a concrete batching policy.
- `/simplify` round 2: tightened the follow-on queue so only the first data slice is implementation-ready, the report surface is explicitly queued behind that slice, and generic runtime families remain research-scoped instead of being pre-expanded into a fuzzy batch.
- Cross-check: verified the Ralph task index, DAG table, task bodies, and task-selection guidance all encode the same `MONDB4a -> MONDB4b -> MONAUD1 -> MONFAC{1,2}` ordering.

### Task 8 - MONDB4b - Martial Humanoid Dataset Slice

Status: `done`

Depends on: `MONDB4a`

Blocks: `MONAUD1`

Scope:

- Add the first bounded hand-authored SRD dataset slice using the current `StatBlock` schema and battle projection surfaces only.
- Cover the martial-humanoid roster sections `Bandits`, `Berserker`, `Commoner`, `Cultists`, `Gladiator`, `Guards`, `Noble`, `Pirates`, `Spy`, `Toughs`, and `Warriors`.
- Preserve unsupported clauses as explicit text-only entries rather than widening battle ownership for this slice.
- Do not add a new generic monster runtime facility in this task.

Next action:

- Inventory the exact stat blocks inside those SRD sections, confirm each one fits the current attack, multiattack, spellcasting-reference, or text-only unsupported model, then land them as hand-authored SRD records in `packages/core`.

Research note:

- This slice is deliberately data-heavy and facility-light. If a candidate monster would require a new runtime surface rather than a text-only unsupported entry, move it to a later facility task instead of widening this one.

Verification requirements:

- Confirm every added monster cites the local SRD corpus directly.
- Verify the new additions reuse the current `StatBlock` and projection path without monster-specific handlers.
- Run narrow core monster-catalog tests; only run Tier 1b MBT if the task unexpectedly changes creature-level projection semantics.
- Include `/simplify` convergence, minimum two rounds.

### Task 9 - MONAUD1 - Stable Unsupported Pattern Report

Status: `done`

Depends on: `MONDB4a`, `MONDB4b`

Blocks: `MONFAC1`, `MONFAC2`

Scope:

- Turn the current code-derived unsupported audit into the frozen report surface for later generic-runtime work.
- Preserve one row per unsupported authored ability or structured spellcasting entry.
- Keep stable fields for `statBlockId`, `monsterName`, `section`, `abilityId`, `abilityName`, blocker-family classification, SRD citation, and human-readable reason.
- Publish grouped counts by blocker family and by stat block without changing monster runtime semantics.

Next action:

- Complete. The stable blocker-family vocabulary now lives on authored text-only abilities, and the code-derived report publishes row-level citations plus grouped counts and markdown summary directly from the canonical catalog.

Research note:

- This is a report-shape hardening task, not a monster-rules task. Do not widen it into new battle semantics or spell-family work.

Verification requirements:

- Confirm the row-level report remains code-derived from the canonical catalog rather than a second manually maintained registry.
- Verify grouped outputs stay in sync with the row data.
- Run narrow core tests around the audit/report surface only; MBT is out of scope.
- Include `/simplify` convergence, minimum two rounds.

Handoff readiness:

- Complete. `MONFAC1` and `MONFAC2` can now research against the landed blocker-family inventory and grouped report counts instead of the pre-slice tracer-bullet baseline.

### Task 10 - MONFAC1 - Monster Save-Effect Action Surface

Status: `done`

Depends on: `MONAUD1`

Blocks: `MONFAC1A`, `MONFAC1B`, `MONFAC1C`

Scope:

- Split the coarse `saveEffectAction` audit bucket into implementation-sized runtime families.
- Validate the narrowest first family by confirming which nearby SRD actions are actually different shapes rather than treating the audit bucket itself as an implementation surface.
- Leave long-duration control, charm prerequisites, domination effects, and movement-coupled sequencing outside this split unless the SRD text proves they are structurally inseparable.

Research outcome:

- The bucket is now split into three child families:
  - `MONFAC1A`: conditional failure-band save effects, anchored by `Pseudodragon` `Sting`.
  - `MONFAC1B`: save-plus-Prone maneuvers, anchored by `Gladiator` `Shield Bash`.
  - `MONFAC1C`: movement-coupled save effects, anchored by `Centaur Trooper` `Trampling Charge`.
- `MONFAC1A` is the first implementation candidate because the reusable payload is narrow even without a second exact peer in the local SRD corpus: it is a save-only single-target failure-band action with explicit base-failure and failure-by-5-or-more outcomes.
- `MONFAC1B` proved that direct single-target save-plus-`Prone` maneuvers can reuse the shared save-effect lane.
- `MONFAC1C` resolved as planning research: movement-coupled save effects require a movement-owned traversal surface before they become executable runtime abilities.

Research note:

- SRD evidence confirms the split is durable:
  - `Pseudodragon` `Sting` is a single-target Constitution save with a base failure package and a stricter failure-by-5-or-more package.
  - `Gladiator` `Shield Bash` is a single-target Strength save whose failure deals damage and applies `Prone` only to Medium-or-smaller targets.
  - `Centaur Trooper` `Trampling Charge` is a recharge-gated bonus action whose save rider is downstream of a special movement sequence and per-target traversal rule.
- Nearby SRD actions confirm where the family boundary stops:
  - `Homunculus` `Bite` is not a source-accurate peer for `MONFAC1A`; it is attack-hit gated, has different failure durations, and its escalated `Unconscious` clause ends early only on damage.
  - `Nightmare` and dragon `Sleep Breath` actions share the early-wake idea but not the same single-target save-only failure-band authored shape, so they should not be used to justify the first child surface.

Verification requirements:

- Confirm the child split tracks one generic runtime facility per task rather than one monster-specific handler per stat block.
- Confirm the new child tasks are narrow enough that future implementation can keep unrelated movement, area, and control semantics out of scope.
- No code changed in this research task, so no core or MBT verification run is required.
- Include `/simplify` convergence, minimum two rounds, on the child implementation task that edits code.

Handoff readiness:

- Complete as planning research. Ralph should pick `MONFAC1A` next if it wants the narrowest reusable first implementation slice.

### Task 19 - MONFAC1A - Conditional Failure-Band Save Effect Surface

Status: `done`

Depends on: `MONFAC1`

Blocks: none

Scope:

- Land one generic monster runtime facility for a single-target save action with a base failure package and a stricter failure-by-threshold package.
- Start with `Pseudodragon` `Sting`.
- Keep attack-hit-gated cousins such as `Homunculus` `Bite` out of scope for this first slice.

Next action:

- None. Keep later save-effect follow-ups scoped to their own families instead of widening this landed save-only surface.

Research note:

- The reusable part here is narrower than the earlier draft claimed: a save-only single-target failure-band action with explicit base-failure and failure-by-5-or-more outcomes.
- `Homunculus` `Bite` remains useful as a boundary check for what this task does not own, but it is not evidence that attack-hit delivery belongs in the same first implementation slice.

Verification requirements:

- Verify the landed surface is generic and stat-block-authored, with no monster-specific runtime handler.
- Run narrow core tests for the authored stat block and the new outcome package.
- Run Tier 1b creature MBT only if creature-level projection semantics change.
- Include `/simplify` convergence, minimum two rounds.

Handoff readiness:

- Complete. `Pseudodragon` `Sting` now lands as the generic save-only conditional-failure-band tracer bullet, and later work should continue to keep `Shield Bash`, `Trampling Charge`, and `Homunculus`-style attack riders out of this ownership slice.

### Task 20 - MONFAC1B - Save-Plus-Prone Maneuver Surface

Status: `done`

Depends on: `MONFAC1`

Blocks: none

Scope:

- Define the generic runtime family for save-driven maneuvers whose failure deals damage and can apply `Prone`.
- Start from `Gladiator` `Shield Bash`.
- Decide whether size gates, push effects, and area shapes belong in the first pass.

Next action:

- None. Keep push-coupled, area, and movement-coupled `Prone` shapes in their own follow-up families instead of widening this landed single-target save-effect lane.

Implementation note:

- `Gladiator` `Shield Bash` proves that immediate size-gated `Prone` riders can reuse the existing single-target save-effect runtime without timed-effect identities or failure-band cleanup. The same lane continues to carry timed riders such as `Pseudodragon` `Sting`.

Verification requirements:

- Confirm the chosen family is one generic runtime maneuver surface rather than a `Shield Bash` special case.
- Verify text-only neighbors stay explicit unless they fit the exact same family.
- Run narrow core tests plus the minimum relevant Tier 1b MBT only if creature-level projection semantics change.
- Include `/simplify` convergence, minimum two rounds.

Handoff readiness:

- Complete. The family boundary is now settled for direct single-target save-plus-`Prone` maneuvers; later work should stay focused on area, push-coupled, or movement-coupled variants instead of reopening this lane.

### Task 21 - MONFAC1C - Movement-Coupled Save Effect Surface

Status: `done`

Depends on: `MONFAC1`

Blocks: `MONMOB1`

Scope:

- Define the generic runtime family for monster actions whose save effect is downstream of a special movement sequence.
- Start from `Centaur Trooper` `Trampling Charge`.
- Keep the save rider and the movement sequencing separate in the design unless the SRD wording makes them inseparable.

Research outcome:

- `Centaur Trooper` `Trampling Charge` does depend on a more general movement-owned traversal surface before any save-effect implementation begins.
- The current generic save-effect lane is the wrong owner because it assumes one chosen target before resolution and has no path or traversal facts.
- The current battle movement lane is also insufficient by itself because `BATTLE_MOVE` spends movement and handles opportunity-attack checkpoints, but it does not own path, entered-creature enumeration, or position updates.
- Nearby SRD text confirms the boundary:
  - `Gelatinous Cube` `Engulf` shares the traversal shell and proves the movement-owned requirement is durable.
  - `Aquatic Charge`, `Charging Horn`, and dragon `Pounce` are adjacent movement-first families, but they are not the same traversal-triggered save-effect shape.

Research note:

- The hard part is not `damage + Prone`; it is the traversal owner: explicit movement path facts, entered-creature ordering, pass-through permissions, and once-per-creature targeting.

Verification requirements:

- Confirm the eventual facility is generic and movement-owned rather than a `Trampling Charge` special case.
- Verify text-only entries remain explicit unless they match the exact same movement-first targeting shape.
- No code changed in this research task, so no core or MBT verification run is required.
- Include `/simplify` convergence, minimum two rounds, on the implementation task that lands the movement surface.

Handoff readiness:

- Complete as planning research. `MONMOB1` is now the implementation-ready follow-up, and `Trampling Charge` should not be widened into the current single-target save-effect lane.

### Task 22 - MONMOB1 - Monster Traversal Movement Surface

Status: `ready-for-implementation-after-light-research`

Depends on: `MONFAC1C`

Blocks: none

Scope:

- Land one generic movement-owned monster traversal surface for actions that move through creature spaces and target entered creatures once during that traversal.
- Start with `Centaur Trooper` `Trampling Charge`.
- Keep the traversal shell separate from broader rider families such as `Gelatinous Cube` `Engulf`.

Next action:

- Re-read `plans/monster-movement-coupled-save-effect-surface-research.md` plus the local SRD passages for `Centaur Trooper` and `Gelatinous Cube`.
- Thread an explicit traversal fact surface through battle discovery and resolution rather than widening `BATTLE_MONSTER_SAVE_EFFECT`.

Research note:

- The prerequisite is explicit traversal ownership, not a monster-specific action handler.

Verification requirements:

- Confirm the new runtime surface is movement-owned and generic rather than `Trampling Charge`-named.
- Verify `Centaur Trooper` is the first consumer and adjacent actions remain text-only unless they match the landed movement shell.
- Run narrow core tests around battle discovery/resolution; MBT only if creature-level projection semantics change.
- Include `/simplify` convergence, minimum two rounds.

Handoff readiness:

- Ready for implementation after light research. The movement ownership boundary and adjacent-family exclusions are now explicit.

### Task 11 - MONFAC2 - Monster Combat Modifier Trait Surface

Status: `done`

Depends on: `MONAUD1`

Blocks: none

Scope:

- Land one reusable combat-modifier trait family from the unsupported-pattern report as a generic runtime surface.
- Keep the implementation on the existing save-resolution owner rather than introducing monster-specific runtime flags or handler tables.
- Keep environment predicates and attack-position families out of scope for later dedicated tasks.

Completed outcome:

- `Magic Resistance` is now the first landed combat-modifier trait family, starting with `Pseudodragon`.
- The trait projects from authored stat-block traits into generic `saveAdvantageContexts`, through stat-block battle init, raw `BATTLE_INIT` / `BATTLE_ADD_CREATURE` creature command decoding, persisted battle state, and spell / magical-effect save resolution.
- `Pack Tactics`, `Sunlight Sensitivity`, `Bloodied Frenzy`, and `Blood Frenzy` remain explicit authored unsupported text because they require different predicate families and should not be collapsed into this save-modifier slice.

Verification requirements:

- Confirmed the chosen trait family projects through generic battle/runtime questions rather than ad hoc monster flags.
- Verified remaining unsupported traits keep explicit authored text and durable reasons.
- Narrow core regression coverage is sufficient; no Tier 1b MBT was required because this slice did not change creature-level Quint semantics.
- `/simplify` convergence remains a standing implementation-loop requirement for future substantial slices.

### Task 12 - CHAREDIT1 - Mandatory Character Draft Update Preview

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CHARMCP1`, `CHARMODEL1`

Scope:

- Implement the core-domain preview-before-commit operation for destructive character draft edits described in [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md).
- Keep the semantic owner on the character side; do not make app or MCP invent their own draft-impact interpretation.
- Compute, at minimum:
  - candidate next draft;
  - authored facts dropped by the change;
  - newly opened required choices;
  - newly introduced illegal issues.
- Keep commit separate from preview.
- Do not widen this task into rollback, undo, redo, checkpoints, or multi-user history.

Next action:

- Start from the current `applyCharacterDraftUpdate()` and `assessCharacterDraft()` surfaces and design the stable preview result shape before editing callers.

Research note:

- The key fact is already settled: current sanitization is post-change only, and the next slice requires mandatory preview before commit.
- Rollback/checkpoints are intentionally deferred and should remain documented as deferred rather than pulled into this slice.

Verification requirements:

- Confirm preview does not mutate stored/current draft state.
- Verify destructive upstream changes surface dropped facts, reopened holes, and new illegal issues before commit.
- Run task-scoped character-domain tests only; battle MBT is out of scope.
- Include `/simplify` convergence, minimum two rounds.

### Task 13 - CHARMCP1 - Stored Character MCP Surface

Status: `blocked`

Depends on: `CHAREDIT1`

Blocks: `CHARAUTH1`

Scope:

- Add the stored-server-side character MCP surface described in [PRD_CHARACTER_MCP_SURFACE.md](../PRD_CHARACTER_MCP_SURFACE.md).
- Keep canonical stored records as core-owned `CharacterDraft` / `CharacterSheet` state.
- Expose narrow MCP operations over that stored state:
  - inspect draft/sheet state;
  - preview draft update;
  - apply accepted draft update;
  - assess/finalize/advance/project through core-owned semantics.
- Do not invent an MCP-only character schema or a second character registry.
- Keep MCP downstream of the owned character domain and the preview-before-commit semantics.

Next action:

- After `CHAREDIT1`, inventory the current MCP storage/runtime facilities and choose the minimal stored-record pattern that keeps the adapter thin.

Research note:

- The repo already contains an explicit transitional note in `packages/core/src/player-loadouts.ts` that MCP still lacks the honest caller-facing character-sheet boundary.
- This task is the adapter completion slice for that gap, not a request to redesign character semantics.

Verification requirements:

- Confirm MCP stores and returns canonical `CharacterDraft` / `CharacterSheet`-shaped data rather than adapter-owned alternates.
- Verify preview and apply remain separate MCP operations.
- Run the narrowest relevant MCP and character-domain tests for the touched surface.
- Include `/simplify` convergence, minimum two rounds.

### Task 14 - CHAROWN1 - Character Ownership Gap Cleanup

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `CHAROWN2`

Scope:

- Clean up stale character-side ownership residue documented in [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md).
- Start with subclass validation scaffolding that no longer matches the current advancement-owned subclass model.
- Remove or rewrite dead helper paths so the codebase reflects one clear owner for subclass timing and legality.
- Keep subclass legality on ordered advancement replay; do not reintroduce a second side channel.
- Do not widen this task into new authored features such as Fighting Style ownership.

Next action:

- Trace the residual subclass helper path from current code and tests, then remove or narrow it so the ownership line becomes explicit.

Research note:

- This task already has a durable root cause: subclass ownership moved from a draft-side side channel into ordered `advancement` entries, and the remaining stub is residue from that migration.

Verification requirements:

- Confirm subclass legality still surfaces correctly through advancement replay and assessment after cleanup.
- Run narrow character-domain and parity tests only.
- Include `/simplify` convergence, minimum two rounds.

### Task 15 - CHAROWN2 - Fighting Style And Expertise Ownership

Status: `blocked`

Depends on: `CHAROWN1`

Blocks: `CHARMODEL1`

Scope:

- Add Fighting Style selections and expertise as character-side owned or explicitly derived facts using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).
- Thread those facts through:
  - draft/sheet ownership;
  - legality and timing validation;
  - sanitization;
  - character-creature projection;
  - Quint parity.
- Remove the current placeholder empty-set projection behavior once the authored owner exists.
- Do not widen this task into unrelated class-feature backlog.

Next action:

- After `CHAROWN1`, freeze the authored Fighting Style shape and timing semantics on the character side first, then thread them through projection.

Research note:

- Fighting Style is explicitly documented in both TypeScript and Quint as a missing character-side owner.
- Expertise is in the same architectural category even though it is less explicitly documented today: the projection surface already includes `expertiseSkills`, but both TypeScript and Quint currently thread the empty set.

Verification requirements:

- Confirm Fighting Style selections and expertise facts persist on or are explicitly derived from the character side before projection consumes them.
- Verify legality/timing, sanitization, and projection outputs through task-scoped tests.
- Add or extend Quint parity where the new authored fact crosses the formal boundary.
- Include `/simplify` convergence, minimum two rounds.

### Task 16 - CHARMODEL1 - Make Invalid Character States Unrepresentable

Status: `blocked`

Depends on: `CHAREDIT1`, `CHAROWN2`

Blocks: `CHARTYPE1`, `CHARAUTH1`

Scope:

- Remove duplicated owned progression facts from canonical character models.
  - Today `CharacterSheet` and the Quint character models can carry both ordered `advancement` and derived `classLevels`, which allows contradictory finalized characters and forces replay or legality code to detect contradictions after the fact.
  - The target is one canonical owner for progression facts, with any derived projection computed from that owner rather than stored beside it.
- Tighten character result shapes so impossible combinations are not representable in public APIs.
  - Today `CharacterDraftAssessment` permits combinations like `status: "complete"` with unrelated `issues`, `openChoices`, or missing `sheet`.
  - Today `CharacterFinalizationResult` permits `ok: false` with an empty issue set.
  - Quint currently mirrors the same looseness in `Blocked` and `AdvanceBlocked`.
  - Replace these with discriminated unions whose payloads are structurally tied to the variant.
- Tighten finalized character submodels so `CharacterSheet` is not still a draft-shaped bag of optionals.
  - `CharacterBuildChoices`, `CharacterSpellcastingChoices`, and `CharacterLoadout` currently allow canonical-sheet states that are only ruled out later by validators.
  - Keep draft editability on `CharacterDraft`, but stop carrying that looseness into the finalized-sheet boundary.
- Keep this task focused on character authored-state modeling.
  - Do not widen into general battle-state cleanup, monster typing cleanup, or feature-store cleanup.
  - Do not use adapter-side registries or parallel schemas to paper over weak core types; fix the owned models directly.

Next action:

- After `CHAREDIT1` and `CHAROWN2`, start with the canonical character-owner seam in [packages/core/src/character-domain-model.ts](../packages/core/src/character-domain-model.ts), [character-creation.qnt](../character-creation.qnt), and [character.qnt](../character.qnt), then remove duplicate progression ownership before tightening the downstream result wrappers.

Research note:

- This task should explicitly reuse the invalid-state audit already surfaced in planning:
  - duplicated `advancement` plus `classLevels`;
  - weak assessment and finalization result shapes;
  - finalized-sheet optional bags that belong only on drafts.
- Compare against the stronger result and state modeling discipline used in the Huly MCP repo and copy the useful modeling patterns instead of inventing a new style locally.

Verification requirements:

- Confirm the tightened character models preserve draft editability where intended and only harden finalized and assessment boundaries.
- Confirm TypeScript and Quint expose matching strengthened semantics at the finalization and advancement boundary.
- Run the narrowest relevant character-domain and parity tests for finalization, advancement, and projection.
- Include `/simplify` convergence, minimum two rounds.
- If any modeled rule semantics change while hardening the shapes, verify the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` first.

Handoff readiness:

- This is the structural authored-model cleanup slice. It should land before the narrower result-API hardening task because otherwise `CHARTYPE1` would freeze weak canonical models into a cleaner outer wrapper.

### Task 17 - CHARTYPE1 - Strengthen Character Result Shapes

Status: `blocked`

Depends on: `CHARMODEL1`

Blocks: `CHARMCP1`, `CHARAUTH1`

Scope:

- Strengthen the TypeScript result shapes for assessment, finalization, and advancement so impossible combinations become unrepresentable at the public domain API boundary.
- Replace loose interfaces/results such as:
  - `CharacterDraftAssessment`;
  - `CharacterFinalizationResult`;
  - advancement failure results that currently collapse open holes and illegal issues into one undifferentiated failure shape.
- Add an advancement-assessment/preview surface that preserves the same open-hole versus illegal-issue distinction already present in draft assessment.
- Use the preview-before-commit semantics from [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md) and the convergence goals in [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).
- Do not widen this task into full rollback/history or unrelated UX redesign.

Next action:

- After `CHARMODEL1`, inspect the weakest current public result shapes and replace them with discriminated unions or stronger non-empty failure guarantees before updating callers.

Research note:

- The current domain semantics are stronger than some of the public TypeScript types that describe them.
- This task exists to align the type-level API with the actual domain invariants once the underlying canonical character model is no longer carrying duplicated ownership and draft-style residue.

Verification requirements:

- Confirm impossible result combinations become unrepresentable at the public type boundary.
- Verify advancement preview surfaces open required choices separately from illegal issues.
- Run narrow character-domain, typecheck, and caller-surface tests.
- Include `/simplify` convergence, minimum two rounds.

### Task 18 - CHARAUTH1 - Character Quint Authority Convergence

Status: `blocked`

Depends on: `CHARMCP1`, `CHARTYPE1`

Blocks: none

Scope:

- Tighten the remaining character stack until it is operationally Quint-led and TypeScript is clearly adapter/runtime code, following [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).
- Expand parity and ownership checks across:
  - draft assessment/finalization;
  - advancement;
  - character-creature projection;
  - newly added edit-preview and MCP surfaces where they consume owned character semantics.
- Harden the repo rule that new character semantics land in Quint first and TypeScript/MCP/app follow.
- Do not widen this task into unrelated product/UI redesign.

Next action:

- After `CHARMCP1` and `CHARTYPE1`, inventory the remaining places where character semantics still feel operationally TypeScript-first, then narrow them one by one behind parity-backed ownership decisions.

Research note:

- This is a convergence capstone. It should not start until the stored MCP boundary and the remaining authored character-side gaps are settled enough that parity can target the durable seams.

Verification requirements:

- Confirm the touched character semantics have explicit Quint ownership and parity coverage.
- Run the narrowest relevant character-domain, parity, and adapter tests for the changed surfaces.
- Include `/simplify` convergence, minimum two rounds.
