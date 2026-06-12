# Active Plan: Level 3 Ultra-Golden Residuals

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3UG-01-DIAGNOSTIC-ROW-TRANSPARENCY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Make current level-3 diagnostic non-green rows scanner-visible"
    },
    {
      "number": 2,
      "id": "L3UG-02-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY",
      "status": "ready-for-research",
      "title": "Inventory remaining Wild Shape Stat Block action pressure"
    },
    {
      "number": 3,
      "id": "L3UG-03-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION",
      "status": "ready-for-research",
      "title": "Close or promote Wild Shape sense and language projection"
    },
    {
      "number": 4,
      "id": "L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY",
      "status": "ready-for-research",
      "title": "Inventory remaining Quickened action-spell procedure pressure"
    },
    {
      "number": 5,
      "id": "L3UG-05-METAMAGIC-NEXT-QUICKENED-SLICE",
      "status": "blocked",
      "title": "Promote one next Quickened procedure tracer bullet"
    },
    {
      "number": 6,
      "id": "L3UG-06-ULTRA-GOLDEN-CONSOLIDATION",
      "status": "blocked",
      "title": "Regenerate and summarize level-3 ultra-golden residuals"
    }
  ]
}
-->

## Default Queue

This file is the default `--plan` / `--source` for Ralph tooling
(`scripts/ralph-run.sh` and `scripts/sync-active-plan-to-ralph.sh`). The
deterministic replay portability lane drained in DRP-T19, so this file now
carries the next runnable default queue instead of ending on an empty task
index.

The queue is a narrow level-3 ultra-golden cleanup batch. It does not reopen the
strict level-3 full-support claim: `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
reports `Full-support claim: pass`, strict target closure `197/197`, selected
identity readiness `168/168`, SRD-authored product readiness `79/79`, and
rules-kernel supported Unit coverage `140/140`.

Current generated source-of-truth metrics:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`: diagnostic product
  readiness `594/607 (97.9%)`, with `owner-evidence-required: 11` and
  `partial-battle-runtime: 2`.
- `plans/unit-profile-coverage/UNIT_REPORT.md`: supported Unit rules-kernel
  chain coverage `168/168 (100%)`.
- `plans/rules-kernel-coverage/REPORT.md`: 120 obligations, 114 covered,
  zero open transitional obligations, and 6 permanent boundary or unsupported
  rows.

## DRP-T19 Closeout

The deterministic replay portability lane audited the checked replay inventory
from `plans/rules-kernel-coverage/obligations.jsonl` and did not change the
durable witness-mode mix.

Kept deterministic replays:

- 22 `deterministic-qnt-replay` witness entries.
- 21 obligation rows with at least one deterministic replay.
- 19 replay-only obligation rows, carrying 20 replay entries because
  `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` has init-side and
  settlement-side deterministic replay witnesses.
- 2 supplemental deterministic replay rows beside existing focused MBT:
  `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES` and
  `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`.

Promoted focused MBT witnesses in the DRP lane: none. The mixed rows above kept
their deterministic replay evidence beside already-existing focused MBT
coverage, and the portable parity closeout in
`plans/QNT_COVERAGE_PROGRAM.md#Portable-Parity-Witness-Closeout` already records
the previously promoted focused MBT composition seams:

- `BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN`
- `BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING`
- `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION`

Deferred owner-decision blockers from DRP-T19: none. The heavy computed-oracle
integration lane remains parked per `plans/QNT_COVERAGE_PROGRAM.md`, and
`QCP-LANG-PARITY-MARKER` remains blocked until a first non-TS language target
arrives.

Because the DRP witness-mode mix did not change, `plans/QNT_COVERAGE_PROGRAM.md`
does not need a portable-witness closeout update for this task.

## Source Of Truth

Read these before starting a task in this queue:

- `CLAUDE.md`
- The current task details in this file.
- `plans/unit-profile-coverage/README.md`
- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/REPORT.md`

For rule-bearing work, read the relevant local SRD anchors under
`.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before
implementation. Do not browse external rules sources for SRD meaning.

## Lane Rules

- Before starting each task, run the Ralph task-base check from `CLAUDE.md`:
  log the declared base ref, log `HEAD`, and confirm the task Base SHA is an
  ancestor of `HEAD`. Stop on mismatch.
- Use pnpm only.
- Do not treat diagnostic product readiness as a hidden full-support blocker.
  If a diagnostic status should become a strict gate, add checker logic and
  self-tests in the same task.
- Do not dispatch production runtime behavior on authored Unit, Spell, class,
  subclass, or Stat Block identity. SRD identity may appear only at
  catalog/selection/fixture boundaries.
- Do not duplicate state across Surface, Character Creation, Character Sheet,
  Character Battle, battle runtime, QNT, or generated coverage artifacts.
- Treat battle MBT as scarce. Do not run MBT for exploratory inventory or
  accounting. If a completed task changes battle-runtime behavior, use the
  repository MBT protocol from `CLAUDE.md`.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L3UG-01-DIAGNOSTIC-ROW-TRANSPARENCY | ready-for-implementation-after-light-research | none | Make current level-3 diagnostic non-green rows discoverable from generated artifacts instead of stale audit prose. |
| 2 | L3UG-02-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY | ready-for-research | none | Inventory remaining level-3-reachable Wild Shape Stat Block action pressure. |
| 3 | L3UG-03-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION | ready-for-research | none | Decide whether active-form senses, retained languages, and speech blockers are already closed or need a small shared projection. |
| 4 | L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY | ready-for-research | none | Recompute remaining Quickened action-time Spell Invocation procedure pressure from current generated evidence. |
| 5 | L3UG-05-METAMAGIC-NEXT-QUICKENED-SLICE | blocked | L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY | Promote one procedure only after Task 4 identifies a concrete small slice. |
| 6 | L3UG-06-ULTRA-GOLDEN-CONSOLIDATION | blocked | Tasks 1-4 and any unblocked implementation task | Regenerate reports and summarize remaining level-3 ultra-golden residuals. |

## Task Details

### Task 1 - L3UG-01-DIAGNOSTIC-ROW-TRANSPARENCY

Status: `ready-for-implementation-after-light-research`

Input:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/LEVEL1_3_DIAGNOSTIC_READINESS_AUDIT.md`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/level1-full-support-report.cjs`

Output:

- Make the current `owner-evidence-required` and `partial-battle-runtime`
  diagnostic rows scanner-visible without relying on stale hand-written row
  inventories.
- Update or retire stale diagnostic audit prose that conflicts with generated
  `594/607 (97.9%)` accounting.

Acceptance:

- Current diagnostic non-green rows can be found from generated/checker-owned
  artifacts.
- `pnpm unit-profile-coverage:check:self-test` and
  `pnpm unit-profile-coverage:check` pass.

### Task 2 - L3UG-02-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY

Status: `ready-for-research`

Input:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- Current Wild Shape Unit claim, task-claim, and evidence rows.
- Relevant Wild Shape and Stat Block SRD anchors.

Output:

- Inventory remaining Wild Shape Stat Block action pressure for selected known
  Beast forms reachable by level-3 Wild Shape.
- Classify each branch as already promoted, battle-owned future work,
  table/prose-only, generic object/Utilize boundary work, or later-level work.

Acceptance:

- The inventory names concrete runtime shapes, not authored Beast identity as a
  reducer dispatch key.
- No runtime behavior, QNT, MBT, or owner evidence is widened by the inventory
  itself.
- Any follow-up implementation task is unblocked only for one small
  battle-owned branch.

### Task 3 - L3UG-03-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION

Status: `ready-for-research`

Input:

- Current Wild Shape Unit claim, task-claim, and evidence rows.
- Current Character Sheet, Character Battle, battle runtime, app, and MCP
  consumers of active-form sense, language, and speech facts.
- Relevant SRD anchors for Wild Shape, Stat Blocks, senses, languages, and
  condition/speech blockers.

Output:

- Decide whether prior work already closes the Wild Shape
  sense/language/speech residual.
- If not closed, carve the smallest shared projection tracer bullet needed for
  active-form senses, retained languages, and speech blockers.

Acceptance:

- No duplicate language or sense state is added to battle state.
- Any projection derives from selected active form facts, retained Character
  Sheet language facts, and existing condition/speech blockers.
- Follow-up implementation work is precise if the residual remains open.

### Task 4 - L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY

Status: `ready-for-research`

Input:

- Current `sorcerer_metamagic` Unit claim, task-claim, and evidence rows.
- Current rules-kernel obligations and profile joins for Metamagic and Spell
  Invocation procedures.
- Relevant SRD anchors for Metamagic, Quickened Spell, Magic Action, Bonus
  Action, Spell Slot spending, and spellcasting turn limits.

Output:

- Recompute which action-time Spell Invocation procedures remain outside the
  promoted Quickened subset.
- Identify whether one next procedure shape is small enough for a tracer bullet
  without authored spell identity dispatch.

Acceptance:

- Inventory is procedure-shape based, not spell-name based.
- Remaining resource-threading, same-turn spell lock, and QNT parity needs are
  explicit.
- Task 5 is unblocked only if there is one concrete next procedure slice.

### Task 5 - L3UG-05-METAMAGIC-NEXT-QUICKENED-SLICE

Status: `blocked`

Depends on:

- L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY

Output:

- Promote one next Quickened procedure through typed runtime support, QNT
  parity ownership, focused tests, and generated evidence.

Acceptance:

- Shared Font of Magic point-pool spending remains the resource source.
- The same-turn level-1-plus spell lock is preserved for slot, free-cast, and
  cantrip paths that need it.
- No production behavior dispatches on authored spell or Metamagic option
  identity.

### Task 6 - L3UG-06-ULTRA-GOLDEN-CONSOLIDATION

Status: `blocked`

Depends on:

- L3UG-01-DIAGNOSTIC-ROW-TRANSPARENCY
- L3UG-02-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY
- L3UG-03-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION
- L3UG-04-METAMAGIC-QUICKENED-RESIDUAL-INVENTORY
- Any implementation task unblocked by those inventories.

Output:

- Regenerate relevant Unit and rules-kernel reports.
- Update this plan statuses and summarize remaining level-3 ultra-golden
  pressure.

Acceptance:

- Generated reports are green or unrelated baseline failures are documented
  without broad cleanup.
- Any remaining residual has a precise owner, non-runnable reason, or follow-up
  task.

## Verification

Every implementation task in this plan must include:

- RAW and ubiquitous-language check against local SRD anchors and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Run `pnpm quality` for consolidation tasks, checker changes, package-script
changes, QNT changes, or TypeScript runtime changes.
