# Ralph L5 Post-Lane Generated Coverage Finalization

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-FINAL-GENERATED-COVERAGE-REFRESH",
      "status": "blocked",
      "title": "Refresh generated level 5 coverage after lanes merge"
    }
  ]
}
-->

## Scope

This plan owns the single aggregate generated coverage refresh for level 5 after
the four level-5 Ralph lanes have landed:

- `plans/RALPH_L5_LANE_A_CLASS_FEATURES.md`
- `plans/RALPH_L5_LANE_B_SPELL3_AUTHORED_CLOSURE.md`
- `plans/RALPH_L5_LANE_C_SPELL3_MISSING_AUTHORED_1.md`
- `plans/RALPH_L5_LANE_D_SPELL3_MISSING_AUTHORED_2.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

Do not run this plan in parallel with lanes A-D. The unit-profile coverage
outputs are aggregate artifacts, so they need one owner after lane merges.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/RALPH_L5_LANE_A_CLASS_FEATURES.md`
- `plans/RALPH_L5_LANE_B_SPELL3_AUTHORED_CLOSURE.md`
- `plans/RALPH_L5_LANE_C_SPELL3_MISSING_AUTHORED_1.md`
- `plans/RALPH_L5_LANE_D_SPELL3_MISSING_AUTHORED_2.md`

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L5-FINAL-GENERATED-COVERAGE-REFRESH - Refresh generated level 5 coverage after lanes merge | blocked | none | Owner must unblock only after lane A-D integration work has landed. |

## Task Details

### Task 1 - L5-FINAL-GENERATED-COVERAGE-REFRESH

Status: `blocked`

Blocker Type: owner-decision
Blocker Detail: owner/operator must confirm lanes A-D are merged into the
target branch before unblocking this aggregate refresh.

Depends on:

- Lane A-D integration work merged into the target branch.

Output:

- Confirm the target branch contains completed lane A-D integration work.
- Run the aggregate generated coverage refresh once:
  `pnpm unit-profile-coverage:check --write`.
- Review generated inventory, matrix, report, and audit deltas as aggregate
  output. Do not hand-resolve generated conflicts; rerun the checker from the
  merged source/evidence state.
- If the checker exposes a semantic source/evidence inconsistency, stop and
  route a concrete follow-up back to the owning lane or Unit task. Do not make
  semantic source/evidence fixes in this generated-only finalization task.

Acceptance:

- `pnpm unit-profile-coverage:check` passes after the write refresh.
- Generated coverage artifacts reflect the merged level-5 lane outputs.
- No unit support semantics or source/evidence records change in this task.

Verification:

- RAW and ubiquitous-language check: this task is generated-only. If a semantic
  source/evidence fix appears necessary, stop and route it to an owning lane
  task with local SRD, `UBIQUITOUS_LANGUAGE.md`, and `ASSUMPTIONS.md` context.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
