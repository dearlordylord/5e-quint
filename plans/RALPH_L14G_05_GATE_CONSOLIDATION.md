# Ralph Lane: Level 1-4 Gate Consolidation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-05-GATE-CONSOLIDATION",
      "status": "ready-for-implementation",
      "title": "Regenerate and close the level 1-4 ultra-golden gate"
    }
  ]
}
-->

## Lane Scope

This lane is serial. Run it only after the four parallel lanes have either
landed or recorded explicit owner-decision/dependency blockers:

- `plans/RALPH_L14G_01_ASI_CATALOG_SOURCE.md`
- `plans/RALPH_L14G_02_PROGRESSION_DELTA_AUDIT.md`
- `plans/RALPH_L14G_03_MONK_SLOW_FALL_TRIAGE.md`
- `plans/RALPH_L14G_04_MCP_LEVEL14_SCENARIO_GATE.md`

## Source Artifacts

- `plans/ACTIVE_PLAN.md`
- `plans/RALPH_L14G_01_ASI_CATALOG_SOURCE.md`
- `plans/RALPH_L14G_02_PROGRESSION_DELTA_AUDIT.md`
- `plans/RALPH_L14G_03_MONK_SLOW_FALL_TRIAGE.md`
- `plans/RALPH_L14G_04_MCP_LEVEL14_SCENARIO_GATE.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/ultra-golden-gate.json`

## Lane Rules

- Run the Ralph task-base check before implementation.
- Do not close residuals by editing generated Markdown by hand.
- Every remaining blocker must be either generated as pass, represented by a
  precise owner boundary, or split into a concrete follow-up task.

### Task 1 - L14G-05-GATE-CONSOLIDATION

Status: `ready-for-implementation`

Blocker Type: cleared

Dependencies landed:

- `L14G-01-LEVEL4-ASI-CATALOG-SOURCE`
- `L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT`
- `L14G-03-MONK-SLOW-FALL-TRIAGE`
- `L14G-03A-MONK-SLOW-FALL-RUNTIME`
- `L14G-04-MCP-LEVEL14-SCENARIO-GATE`

Expected size: about half a focused day after dependencies land.

Output:

- Regenerate all generated coverage artifacts.
- Inspect remaining level-1-4 support, QNT/generator, MBT/parity, and MCP
  blockers.
- Update `plans/ACTIVE_PLAN.md` and the per-lane files with final statuses.
- Split any remaining desired work into new Ralph-formatted lane files.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` has no stale hand-maintained blocker text.
- Any residual preventing a pass is named by generated checker output and has a
  concrete owner or follow-up task.
- The active plan and per-lane files agree on task statuses.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Plan Impact:

- This task is expected to update plan status.
