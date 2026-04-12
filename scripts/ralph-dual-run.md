# Dual Ralph Harness

`scripts/ralph-dual-run.sh` runs a per-task fresh-context implementation harness for a plan file:

1. Parses the plan's `ralph-task-index` JSON block and uses `### Task N` headings only as body anchors.
2. Creates an integration branch from the current main `HEAD`.
3. For each task, creates two disposable worktrees from the current integration branch `HEAD`.
4. Links the main workspace install into each task worktree so `pnpm` and package-local test commands resolve the same dependency graph as the main repo.
5. Runs Claude in one worktree with `claude --dangerously-skip-permissions`.
6. Runs Codex in the other with `codex exec --dangerously-bypass-approvals-and-sandbox`.
7. Reviews both task diffs with Codex.
8. Runs a Codex decider from the main worktree to apply, verify, reconcile any plan impact, and commit the reconciled Task N result to the integration branch.
9. Refreshes the plan snapshot and task index from the updated plan file.
10. Removes the task worktrees, then rescans the refreshed task index for the next task whose status is `ready-for-research` or `ready-for-implementation-after-light-research`.

Runtime logs, prompts, review reports, and diffs are written under ignored `.ralph/runs/<run-id>/task-<n>/`.
The supplied plan is copied to `.ralph/runs/<run-id>/plan.md` and agents read that snapshot. The snapshot is refreshed from the source plan file after every decider run, so a task can update future planning when it discovers new information. Unfiltered runs rescan the refreshed `ralph-task-index` after every task, so newly added runnable tasks and newly unblocked tasks are picked up automatically. Explicit `--task` selections still run in the requested order because the operator has deliberately selected them.

Important queue contract: unfiltered Ralph runs are phase-capable. A numbered task may update later tasks, unblock later tasks, add new later tasks, reorder the future queue, or turn itself back into a runnable state after a research/plan pass. After every decider refresh, the harness rescans the whole queue from the top and picks the earliest runnable task number, even if that same task number ran earlier in the run. This preserves the intended behavior where a task can do research first and implementation second without inventing an extra task number.

To keep that model safe, the harness caps each numbered task at three attempts per run. If a task keeps re-queueing itself and stays runnable past that cap, the harness fails loudly so the operator fixes the plan transition instead of spinning forever. Explicit `--task` selections remain single-pass in the order requested.

Important: during a live run, the "source plan file" is the plan on the Ralph launcher worktree / integration branch, not `master`. If you add or reorder tasks while Ralph is running, committing the change on `master` is not enough for the active run. Sync the plan onto the live Ralph launcher branch too:

```bash
scripts/sync-active-plan-to-ralph.sh --message "plan: sync active plan"
```

In Ralph context, "add a task" should mean all of:

1. update and commit `plans/ACTIVE_PLAN.md` on `master`;
2. sync that plan into the active Ralph launcher worktree and commit it there;
3. verify the files are identical before saying the live run will pick it up.

Task worktrees reuse the main repo install by symlinking `node_modules`, `packages/core/node_modules`, and `packages/mcp/node_modules` into each disposable worktree. This keeps per-task verification fast and avoids a redundant `pnpm install` for every task rotation.

The harness also kills stray fuzz / overnight MBT processes and removes generated MBT artifact files under `packages/` before the run starts, before each task begins, and after each task ends. Ralph task runs are not allowed to leave `mbt-failure-battle-*.log`, `mbt-failures.jsonl`, `mbt-timing.jsonl`, `mbt-fuzz.log`, `mbt-seed-blacklist.txt`, or `packages/fat-traces/` behind.

In addition, every temporary Ralph task worktree has these scripts replaced with hard-fail stubs before agents start:

- `scripts/mbt-fuzz.sh`
- `scripts/mbt-fuzz-timed.sh`
- `scripts/fuzz-all.sh`
- `scripts/fuzz-overnight.sh`
- `scripts/escalate-fuzz.sh`
- `scripts/measure-tier-timing.sh`

That makes fuzz / overnight validation impossible inside task worktrees even if an agent ignores prompt guidance.

## Plan Format

Plans must include a machine-readable task index:

```md
<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "MCP0-A",
      "status": "ready-for-implementation-after-light-research",
      "title": "Dead-Creature Condition Mutation Bug"
    }
  ]
}
-->
```

Each indexed task must also have a matching markdown body headed by `### Task N`. The harness uses the JSON block for task order, stable ID, status, and title, then extracts the task body from the matching heading. Keep the JSON block synchronized when a task is added, renamed, reordered, or changes status.

## Plan Impact

Ralph treats the plan as bidirectional: the plan scopes the task, and the task may update the plan.

Every implementer, reviewer, and decider prompt requires a `Plan Impact` section. Use `none` when the task does not affect future work. Use `update-required` or `applied` when a discovery changes task status, dependencies, ordering, blockers, acceptance criteria, verification, or creates a follow-up task.

The decider owns plan reconciliation. If either implementation or review reports plan impact, the decider must update the source plan file in the same task commit or explicitly explain why no plan update was needed. The harness fails the task if the decider final report omits `Plan Impact`.

## Usage

```bash
scripts/ralph-dual-run.sh plans/some-plan.md
```

By default, the script checks out an integration branch named `ralph/<run-id>/integration` and commits reconciled task results there. `master` stays unchanged until you explicitly merge or rebase the integration branch.

Useful options:

```bash
scripts/ralph-dual-run.sh plans/some-plan.md \
  --task 3 \
  --test-command "pnpm --filter @dnd/core test" \
  --output-branch "ralph/my-run/integration" \
  --run-id "my-run" \
  --keep-worktrees
```

The output branch must not already exist. This avoids silently resetting an existing run branch.

To use the older behavior and commit reconciled results directly to `master`, pass:

```bash
scripts/ralph-dual-run.sh plans/some-plan.md --commit-to-master
```

The script refuses to start unless the main worktree is clean and `HEAD` matches `master` (or the `--base` ref) at run start. Each implementer and reviewer prompt also includes the repo-specific branch-base check:

```bash
git log --oneline -1 master
git log --oneline -1 HEAD
```

Agents treat this as an ancestor check, not an exact-match requirement. Earlier tasks may already have advanced the integration branch beyond `master`, which is expected. Only when `master` is no longer in the current branch history should the worktree be considered stale.

If a worktree is stale, the agent is instructed to run:

```bash
git rebase master
```

## Environment

Set these when you want to force a model:

```bash
RALPH_CLAUDE_MODEL=opus RALPH_CODEX_MODEL=gpt-5.4 scripts/ralph-dual-run.sh plans/some-plan.md
```

Default verification is `pnpm quality`. Override it per plan with `--test-command` when the plan has a narrower repo-approved command.

The decider prompt also instructs agents to avoid broad formatters for docs-only tasks. Prefer the task-specific grep/search checks and `git diff --check` when a plan task changes only documentation.

Every implementer, reviewer, and decider prompt includes the repo MBT guard: check for existing `vitest` and `quint_evaluator` processes before any MBT run, kill stale `quint_evaluator` processes, and never launch a second MBT while one is alive.

Ralph task runs must never use the fuzz / overnight scripts (`./scripts/mbt-fuzz.sh`, `./scripts/fuzz-all.sh`, `./scripts/fuzz-overnight.sh`) and must never set `MBT_DEV=1` or `MBT_SAVE_TRACES=1`. If a task needs MBT verification, stay on Tier 1 / Tier 1b unless the task explicitly requires a higher tier.

The decider must leave the main worktree with no tracked staged or unstaged changes after each task. This makes git the persistent state boundary between task rotations.

On interrupt or failure, the harness removes temporary worktrees, task branches, and `.ralph/runs/<run-id>` by default. Use `--keep-run` and/or `--keep-worktrees` when you want to preserve diagnostics.
