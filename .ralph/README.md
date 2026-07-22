# SRD level 1–12 Ralph lane

This directory exposes the repository's active entrypoint for running the
historical D&D Ralph harness against the canonical SRD level 1–12 delivery
plan. It does not contain Dalph architecture or duplicate the plan's task
graph.

Inspect the next runnable task without starting the harness:

```bash
node scripts/ralph-task-index.cjs \
  plans/RALPH_FULL_LEVEL1_12_SUPPORT.md --runnable-tsv
```

Run the lane and commit accepted tasks directly to `master`:

```bash
.ralph/run-srd-level1-12.sh --base master --commit-to-base
```

The canonical plan is
[`plans/RALPH_FULL_LEVEL1_12_SUPPORT.md`](../plans/RALPH_FULL_LEVEL1_12_SUPPORT.md).
Harness behavior and operating instructions are owned by
[`scripts/ralph-run.md`](../scripts/ralph-run.md). Runtime state such as runs,
logs, locks, PIDs, sessions, and worktrees remains ignored under `.ralph/`.
