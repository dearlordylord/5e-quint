# Dual Ralph Harness

`scripts/ralph-dual-run.sh` runs a per-task fresh-context implementation harness for a plan file:

1. Parses the plan's `ralph-task-index` JSON block and uses `### Task N` headings only as body anchors.
2. Creates an integration branch from the current main `HEAD`.
3. For each task, creates two disposable worktrees from the current integration branch `HEAD`.
4. Runs Claude in one worktree with `claude --dangerously-skip-permissions`.
5. Runs Codex in the other with `codex exec --dangerously-bypass-approvals-and-sandbox`.
6. Reviews both task diffs with Codex.
7. Runs a Codex decider from the main worktree to apply, verify, reconcile any plan impact, and commit the reconciled Task N result to the integration branch.
8. Refreshes the plan snapshot and task index from the updated plan file.
9. Removes the task worktrees, then starts the next initially indexed task whose refreshed status is `ready-for-research` or `ready-for-implementation-after-light-research`.

Runtime logs, prompts, review reports, and diffs are written under ignored `.ralph/runs/<run-id>/task-<n>/`.
The supplied plan is copied to `.ralph/runs/<run-id>/plan.md` and agents read that snapshot. The snapshot is refreshed from the source plan file after every decider run, so a task can update future planning when it discovers new information. Unfiltered runs skip tasks whose refreshed `ralph-task-index` status is no longer ready. Explicit `--task` selections still run in the requested order because the operator has deliberately selected them.

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

The script refuses to start unless the main worktree is clean and `HEAD` matches `master` (or the `--base` ref). Each implementer and reviewer prompt also includes the repo-specific stale-worktree check:

```bash
git log --oneline -1 master
```

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

The decider must leave the main worktree with no tracked staged or unstaged changes after each task. This makes git the persistent state boundary between task rotations.

On interrupt or failure, the harness removes temporary worktrees, task branches, and `.ralph/runs/<run-id>` by default. Use `--keep-run` and/or `--keep-worktrees` when you want to preserve diagnostics.
