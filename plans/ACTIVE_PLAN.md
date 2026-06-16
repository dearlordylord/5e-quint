# Active Plan: Level 1-4 Ultra-Golden Gate

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-01-LEVEL4-ASI-CATALOG-SOURCE",
      "status": "ready-for-implementation",
      "title": "Close level-4 Ability Score Improvement catalog/source gaps"
    },
    {
      "number": 2,
      "id": "L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT",
      "status": "done",
      "title": "Audit level-4 class-table progression deltas"
    },
    {
      "number": 3,
      "id": "L14G-03-MONK-SLOW-FALL-TRIAGE",
      "status": "ready-for-research",
      "title": "Classify or promote Monk Slow Fall"
    },
    {
      "number": 4,
      "id": "L14G-04-MCP-LEVEL14-SCENARIO-GATE",
      "status": "ready-for-implementation",
      "title": "Add level-1-4 MCP scenario evidence"
    },
    {
      "number": 5,
      "id": "L14G-05-GATE-CONSOLIDATION",
      "status": "blocked",
      "title": "Regenerate and close the level 1-4 ultra-golden gate"
    }
  ]
}
-->

## Current State

The level 1-3 ultra-golden gate remains complete. The checker now also models a
level-1-4 scope:

- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md` reports 25 level-4
  class-feature rows.
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md` exists and reports
  support completeness as pass: strict target closure `206/206`, selected
  identity readiness `168/168`, and SRD-authored product readiness with zero
  authored-readiness blockers.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md` reports the aggregate gate
  as blocked only for `level-1-4`; that scope is `3/4` layers complete.
- The formal blocker is MCP scenario evidence: `level-1-4` has `0/4` required
  MCP flows covered for `mcp-workflow-discovery`, `character-creation`,
  `character-sheet`, and `battle`.

The level-4 inventory also surfaces source/catalog work that should be split
from the MCP scenario lane:

- Missing no-matrix level-4 class feature rows: `fighter_ability_score_improvement_l4`,
  `paladin_ability_score_improvement_l4`, `warlock_ability_score_improvement_l4`,
  and `monk_slow_fall`.
- Existing installed ASI rows are closed as `closed-selection-grant-container`;
  selected downstream feat Units or Character Sheet facts own executable
  behavior.
- Spell-level-3 remains outside level 1-4 and belongs to the character-level-5
  frontier for full casters.

Completed scope-construction tasks were intentionally removed from the Ralph
task index. The live queue now starts at `L14G-01`; the deleted completed work
was the level-4 inventory scope, the level-1-4 strict full-support report, and
the level-1-4 ultra-golden aggregate scope.

## Source Of Truth

Read these before starting a task in this queue:

- `CLAUDE.md`
- `plans/unit-profile-coverage/README.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/level1-4-full-support.json`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/rules-kernel-coverage/REPORT.md`
- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

For rule-bearing work, read the relevant local SRD anchors under
`.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before
implementation. Do not browse external rules sources for SRD meaning.

## Gate Shape

The level 1-4 gate uses the same four-layer ultra-golden shape as level 1-3:

| Layer | Current level-1-4 result | Meaning |
| --- | --- | --- |
| Support completeness | pass | The generated strict report has no open strict rows, selected-identity blockers, or SRD-authored product-readiness blockers. |
| QNT/generator readiness | pass | Every scoped reducer-semantic obligation is covered, and scoped semantic-core QNT owners are generation-subset-clean with no run-block blocker. |
| MBT/parity evidence | pass | Every scoped reducer-semantic obligation has at least one rules-kernel parity witness. |
| MCP scenario evidence | blocked | The level-1-4 MCP scenario manifest needs checker-owned scenario evidence for discovery, character creation, Character Sheet, and battle flows. |

## Parallel Ralph Lanes

Use four parallel Ralph agents at most. The first four lanes are independent
enough to launch together after normal branch-base checks; the fifth lane is
serial consolidation after their outputs land.

| Lane | Ralph source file | Task | Size | Status | Independence |
| --- | --- | --- | ---: | --- | --- |
| A | `plans/RALPH_L14G_01_ASI_CATALOG_SOURCE.md` | L14G-01-LEVEL4-ASI-CATALOG-SOURCE | ~1 day | ready-for-implementation | Source/catalog lane for Fighter, Paladin, and Warlock ASI records plus class feature-grant refs and ASI closure claims. Does not need MCP changes. |
| B | `plans/RALPH_L14G_02_PROGRESSION_DELTA_AUDIT.md` | L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | ~1 day | done | Audit lane found no new implementation follow-up; existing ASI and Slow Fall lanes remain the correct owners. |
| C | `plans/RALPH_L14G_03_MONK_SLOW_FALL_TRIAGE.md` | L14G-03-MONK-SLOW-FALL-TRIAGE | ~1 day | ready-for-research | RAW/domain decision lane for Slow Fall. It may close as a boundary or spawn later QNT/runtime/MBT implementation work. |
| D | `plans/RALPH_L14G_04_MCP_LEVEL14_SCENARIO_GATE.md` | L14G-04-MCP-LEVEL14-SCENARIO-GATE | ~1.5-2 days | ready-for-implementation | Formal ultra-golden blocker. Designs and implements MCP scenario evidence for level-4 advancement, sheet durability, and battle handoff. |
| E | `plans/RALPH_L14G_05_GATE_CONSOLIDATION.md` | L14G-05-GATE-CONSOLIDATION | ~0.5 day | blocked | Serial lane after A-D. Regenerates, reviews residuals, and updates this plan. |

The per-lane files above are the Ralph launch sources for parallel runs. Each
file has its own `ralph-task-index` block and matching `### Task 1` body. This
`ACTIVE_PLAN.md` remains the coordination rollup and serial fallback, not the
recommended source for launching all four parallel agents.

## Work Shape

The split is intentionally coarser than half-day tasks. ASI source records and
claims stay together because splitting them would create checker churn without
reducing risk. MCP stays one larger lane because scenario design and evidence
updates need to converge in one artifact.

| Task | Day 1 | Day 2 |
| --- | --- | --- |
| L14G-01-LEVEL4-ASI-CATALOG-SOURCE | Read existing ASI records/class records, author missing Fighter/Paladin/Warlock records, add class feature-grant refs, and add/update Unit claims. | Usually not needed; use spillover for regeneration, reviewer-loop fixes, and closing generated no-matrix rows. |
| L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | Extract level-3 to level-4 table deltas from all 12 local SRD class files and map each delta to an existing owner if one exists. | Usually not needed; use spillover to write the audit artifact and split uncovered deltas into concrete follow-up task rows. |
| L14G-03-MONK-SLOW-FALL-TRIAGE | Read Slow Fall RAW, reaction terminology, damage-reduction owners, and existing fall/movement assumptions; write the boundary decision or implementation plan. | Usually not needed; use spillover only if the decision requires a detailed QNT/runtime/MBT follow-up plan. |
| L14G-04-MCP-LEVEL14-SCENARIO-GATE | Trace the existing MCP level-3 scenario pattern and design the level-4 advancement/ASI/sheet/handoff scenario using returned holes. | Implement the scenario, update MCP evidence manifest rows, regenerate the ultra-golden gate, and verify level-1 through level-1-3 evidence remains valid. |
| L14G-05-GATE-CONSOLIDATION | Re-run all generated reports after lanes 1-4, inspect remaining level-1-4 residuals, update this plan, and close or split residual blockers. | Not expected. |

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L14G-01-LEVEL4-ASI-CATALOG-SOURCE | ready-for-implementation | none | Close ASI source/catalog gaps without adding per-class runtime behavior. |
| 2 | L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | done | none | Audit artifact added at `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`; no new follow-up tasks discovered. |
| 3 | L14G-03-MONK-SLOW-FALL-TRIAGE | ready-for-research | none | Decide boundary closure vs promoted falling/reaction runtime work. |
| 4 | L14G-04-MCP-LEVEL14-SCENARIO-GATE | ready-for-implementation | none | Add checked MCP evidence for all four level-1-4 required flows. |
| 5 | L14G-05-GATE-CONSOLIDATION | blocked | Tasks 1-4 | Regenerate, review, and close remaining level-1-4 residuals. |

## Task Details

### Task 1 - L14G-01-LEVEL4-ASI-CATALOG-SOURCE

Status: `ready-for-implementation`

Output:

- Author missing SRD Surface records for `fighter_ability_score_improvement_l4`,
  `paladin_ability_score_improvement_l4`, and
  `warlock_ability_score_improvement_l4`, or document a precise reason if a
  record should remain absent.
- Ensure SRD class records retain level-4 ASI feature grants through the same
  source shape used for existing class feature grants.
- Add or update Unit claim rows so ASI remains a `selection-grant-container`
  closure rather than duplicated per-class runtime behavior.

Acceptance:

- The level-4 ASI rows derive from one generic feat-choice/advancement owner.
- The SRD inventory no longer reports those three ASI rows as no-matrix
  level-4 class-feature pressure.
- No runtime code dispatches on class-specific ASI authored identity.

### Task 2 - L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT

Status: `done`

Output:

- Compare every SRD class table's level-3 to level-4 progression facts:
  prepared spell counts, cantrip counts, spell-slot counts, Pact Magic counts,
  Weapon Mastery counts, class resources, and other table-owned deltas.
- Decide which deltas are already covered by existing character-creation,
  Character Sheet, or battle handoff owners and which need task rows.

Acceptance:

- The audit names source facts, not authored identity as runtime dispatch.
- Existing generic progression owners are reused where possible.
- Any new implementation task has a concrete owner and evidence target.

Result:

- Audit artifact: `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`.
- No new implementation follow-up task was discovered. Existing `L14G-01`
  remains the owner for missing Fighter, Paladin, and Warlock ASI source/catalog
  records; existing `L14G-03` remains the owner for Monk Slow Fall triage.

### Task 3 - L14G-03-MONK-SLOW-FALL-TRIAGE

Status: `ready-for-research`

Output:

- Read Monk Slow Fall RAW and the existing reaction/damage-reduction owners.
- Decide whether Slow Fall is a promoted battle-runtime reaction and damage
  reduction slice, a table movement/falling boundary closure, or a split.

Acceptance:

- The decision cites local RAW and `UBIQUITOUS_LANGUAGE.md`.
- If promoted, the plan identifies the QNT owner, runtime reducer owner, and
  focused parity witness before implementation starts.

### Task 4 - L14G-04-MCP-LEVEL14-SCENARIO-GATE

Status: `ready-for-implementation`

Output:

- Add MCP scenario evidence for a supported SRD level-4 character advancement
  path.
- Exercise returned level-4 choice/finalization holes, including ASI or another
  qualifying feat choice.
- Read back durable Character Sheet state after finalization.
- Hand off to battle when level-4 facts affect battle state, and record checked
  evidence in `plans/unit-profile-coverage/mcp-scenario-evidence.json`.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` shows level-1-4 MCP scenario evidence as `4/4`.
- The scenario uses returned hole ids and option ids rather than hard-coded
  authored identity in runtime behavior.
- Existing level 1, 1-2, and 1-3 MCP evidence remains valid.

### Task 5 - L14G-05-GATE-CONSOLIDATION

Status: `blocked`

Depends on:

- L14G-01-LEVEL4-ASI-CATALOG-SOURCE
- L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT
- L14G-03-MONK-SLOW-FALL-TRIAGE
- L14G-04-MCP-LEVEL14-SCENARIO-GATE

Output:

- Regenerate all generated coverage artifacts.
- Update this plan statuses.
- Summarize every remaining level-1-4 residual as pass, precise owner boundary,
  later-level-only, or concrete follow-up task.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` reports level-1-4 with no stale or hand-maintained
  blocker text.
- Any residual that prevents a pass is named by generated checker output.

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
