# Active Plan

Status: closed. The level-1 battle-runtime frontier queue completed at SRDINV91D
(product readiness 367/367, deterministic admission 85/85, QNT proof 62/62,
selected-identity MBT 17/85). Per-task history lives in git.

## Active Ralph Queues

The recursive Ralph workflow has moved to the lane plans, each with its own
`ralph-task-index`:

- `plans/QNT_COVERAGE_PROGRAM.md` — top-level program rollup against ADR-0001.
- `plans/RALPH_LANE_A_QNT_GENERATOR_CLOSURE.md` — shared-algebra unit-feature
  semantic-core cleanup and readiness rows.
- `plans/RALPH_LANE_B_BATTLE_RUNTIME_QNT_CORES.md` — broad battle-runtime QNT
  semantic-core splits and readiness rows.
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md` — character levels 1–2 full-support
  closure backlog.

`scripts/ralph-run.sh` still defaults to this file. Pointing it at one of the
lane plans above is the current Ralph entrypoint; this file is intentionally
kept so the default does not error.

## Tooling

- `scripts/ralph-run.sh:2126` and `scripts/sync-active-plan-to-ralph.sh:21`
  reference this path as the default `--plan` / `--source`. Update those
  defaults when the next top-level queue lands here, or keep launching Ralph
  with an explicit `--plan plans/<lane>.md`.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": []
}
-->
