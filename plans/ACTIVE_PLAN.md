# Active Plan

Status: closed for the default empty task index; the next QNT deepening lane is
ready for explicit launch. The level-1 battle-runtime frontier queue completed
at SRDINV91D (product readiness 367/367, deterministic admission 85/85, QNT
proof 62/62, selected-identity MBT 17/85). Per-task history lives in git.

## Active Ralph Queues

The next runnable QNT deepening lane is:

- `plans/RALPH_LANE_C_QNT_DEEPENING.md` — focused QNT witness deepening plus the
  next manual Rust dry-run vertical after generator readiness closure.

The current durable planning entrypoints are:

- `plans/QNT_COVERAGE_PROGRAM.md` — top-level program rollup against ADR-0001.
- `plans/QNT_GENERATOR_READINESS_BACKLOG.md` — parked, non-runnable QNT
  generator readiness tasks from drained lanes.
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md` — character levels 1–2 full-support
  closure backlog.

`scripts/ralph-run.sh` still defaults to this file. Pointing it at one of the
future lane plans is the Ralph entrypoint; this file is intentionally kept so
the default does not error.

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
