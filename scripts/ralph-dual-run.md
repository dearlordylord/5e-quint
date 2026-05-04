# Ralph Loop Harness

`scripts/ralph-dual-run.sh` runs a per-task fresh-context implementation harness for a plan file:

1. Parses the plan's `ralph-task-index` JSON block and uses `### Task N` headings only as body anchors.
2. Creates an integration branch from the current main `HEAD`.
3. Refreshes the live plan snapshot every iteration.
4. Asks Codex to choose the next runnable task from the refreshed plan instead of hard-coding earliest-runnable selection.
5. For the chosen task, creates disposable worktree(s) from the current integration branch `HEAD`.
6. Links the main workspace install into each task worktree so `pnpm` and package-local test commands resolve the same dependency graph as the main repo.
7. By default, runs Claude in one worktree with `claude --dangerously-skip-permissions --effort max`.
8. By default, runs Codex in the other with `codex exec --dangerously-bypass-approvals-and-sandbox`.
9. Each implementation is reviewed as soon as that implementer finishes, without waiting for the other implementer.
10. A rejecting or `accept-with-fixes` review is handed back to the same implementer for another round in the same worktree before the decider phase.
11. Runs a Codex decider from the main worktree to apply, verify, and either land the task or reject it while updating the plan for the next rerun.
12. With `--codex-only` or `--claude-only`, only one implementer pipeline runs; it still gets immediate review and the decider still acts as final gatekeeper.
13. Refreshes the plan snapshot again and repeats until the chooser says there is no meaningful runnable work left.

Runtime logs, prompts, review reports, chooser outputs, and diffs are written under ignored `.ralph/runs/<run-id>/`.
The supplied plan is copied to `.ralph/runs/<run-id>/plan.md` and agents read that snapshot. The snapshot is refreshed from the source plan file after every decider run, so a task can update future planning when it discovers new information. Unfiltered runs rescan the refreshed `ralph-task-index` after every task, so newly added runnable tasks and newly unblocked tasks are picked up automatically. Explicit `--task` selections still run in the requested order because the operator has deliberately selected them.

If `OPENROUTER_API_KEY` is not already exported in the shell, the harness loads it from repo-root `.env` before launching agents.

Ralph is quiet by default: Codex/Claude stdout and stderr are persisted to the
per-attempt log files instead of streamed through the supervisor terminal. This
keeps live run observation from copying full model transcripts into the
supervising context window. Set `RALPH_STREAM_LOGS=1` only for short diagnostic
runs where terminal streaming is explicitly worth the context cost.

Post-mortem inspection should start from `events.tsv`, `history.tsv`,
`*-implementer.final.md`, `*-review.md`, `decider.final.md`, and `git diff
--stat` over saved diffs. Open full `*.log` files or large `*.diff` files only
after narrowing to a concrete failure. In particular, standard Ralph fuzz-script
stub diffs are harness noise and should not be pasted into model context.

Important queue contract: unfiltered Ralph runs are phase-capable. A numbered task may update later tasks, unblock later tasks, add new later tasks, reorder the future queue, or turn itself back into a runnable state after a research/plan pass. After every decider refresh, the harness asks the chooser to pick again from the live runnable set, including reruns of the same numbered task when the plan clearly intends that.

The harness persists per-attempt history in `.ralph/runs/<run-id>/history.tsv` and gives that history to the chooser so the model can avoid blindly repeating unproductive attempts while still allowing intentional reruns. It also enforces a per-task attempt cap within a single Ralph run: by default a task may reach the decider at most 3 times.

On non-final attempts, the decider may classify the task as `retry-same-task` and leave it runnable. On the final allowed attempt, the decider must choose one of:

- `done`
- `blocked-needs-design`
- `deferred`

It may not leave the task runnable as `retry-same-task` or `needs-more-research` on that final attempt. This is the key protection against infinite "try again" loops: after enough failed implementation attempts, Ralph must either land the task or make it non-runnable so the chooser can advance to the next task.

Every rerun of the same numbered task gets its own attempt directory:

- `.ralph/runs/<run-id>/task-6/attempt-1/`
- `.ralph/runs/<run-id>/task-6/attempt-2/`

Each attempt keeps its own evidence instead of overwriting a prior attempt.

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

That makes fuzz / overnight validation impossible inside task worktrees even if an agent ignores prompt guidance. Reviewers and deciders should treat those standard stub diffs as harness noise rather than task-owned product changes.

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

The decider owns plan reconciliation. If either implementation or review reports plan impact, the decider must update the source plan file in the same task commit or explicitly explain why no plan update was needed. The harness treats a decider report without `Plan Impact` as a fatal harness error because the loop can no longer safely continue.

When a task lands by narrowing its original scope, the decider must preserve the
excluded still-desired work as executable plan tasks. It is not enough to write
that work "remains support-gated", "is deferred", or "belongs to a later
family" in prose. If the work should still happen, the decider must add or
revise concrete tasks in the Ralph Task Index, DAG table, and task-detail
sections, with dependencies/statuses that make the remaining surface visible to
future chooser runs. Prose may explain why the split is correct; tasks preserve
the queue.

Rejected tasks are not terminal. The decider should classify every task result with a `Task Disposition` section:

- `done`
- `retry-same-task`
- `needs-more-research`
- `blocked-needs-design`
- `deferred`

The plan status after the decider run is authoritative. Ralph refreshes `plans/ACTIVE_PLAN.md` and derives the effective disposition from the task's refreshed status:

- `done` -> `done`
- `retry-same-task` -> leave the task runnable
- `needs-more-research` -> `ready-for-research`
- `blocked-needs-design` -> `blocked`
- `deferred` -> `deferred`

The `Task Disposition` section is therefore diagnostic rather than control-critical. If the decider output omits it, uses unusual markdown, or even disagrees with the refreshed plan, Ralph continues from the refreshed plan status and records a warning instead of killing the loop.

`blocked` has a narrow meaning in this harness. It is only valid for:

- an unfinished task dependency, or
- an explicit owner/user design decision that Ralph cannot answer itself

If the next step is internal narrowing, family splitting, scoping refinement, or repo/source research that Ralph can perform on its own, the task must stay `ready-for-research`, not `blocked`.

`deferred` is even narrower. It is only valid when the owner/user has explicitly directed Ralph to park the task for now. It is not valid for "later in the queue", "next batch", or other scheduling-only reasons.

In addition, the decider must:

1. choose `retry-same-task` only when the task is still implementation-ready and the next attempt has a concrete implementable delta;
2. keep attempt-specific failure notes in run-local review/decider artifacts instead of `plans/ACTIVE_PLAN.md`;
3. for runnable rejections (`retry-same-task` / `needs-more-research`), add or update a concise attempt-agnostic `Retry Guidance:` subsection in the task body that tells the next implementer pass what to change;
4. edit the plan only when the rejection revealed a genuinely new durable planning fact.

When the decider leaves a task `blocked`, it must also record:

- `Blocker Type: dependency | owner-decision`
- `Blocker Detail: ...`

If a task ends `blocked` without one of those blocker types, Ralph treats that as invalid planning state and fails the task instead of silently accepting a fake blocker.

When the decider leaves a task `deferred`, it must also record:

- `Deferred Detail: ...`

That detail must name the explicit owner/user instruction that parked the task. If a task ends `deferred` without that explicit owner-directed detail, Ralph treats that as invalid planning state and fails the task instead of silently accepting a fake deferral.

On the final allowed attempt for a task in a Ralph run, `retry-same-task` and `needs-more-research` are forbidden. If the task still cannot land, the decider must mark it non-runnable (`blocked` or `deferred`) before finishing so the chooser can move on.

Before editing the plan, the decider must pass a new-information gate in its final report:

1. what new fact was learned;
2. why that fact was not already implied by the current plan text;
3. why that fact is durable enough to remain true after run-local artifacts are deleted.

The harness treats attempt-numbered rejection notes in `plans/ACTIVE_PLAN.md` as a fatal decider error. Durable requirements and attempt-agnostic `Retry Guidance:` belong in the plan. Attempt scar tissue does not.

This is the key difference between a normal task rejection and a fatal harness failure. Rejection is part of the loop. Fatal harness failure is loss of a trustworthy repo or plan state.

## Wrapping Up A Live Run

When an operator wants to stop a long Ralph loop, let the active task reach a
clean boundary first: accepted/committed, explicitly rejected with plan status
updated, or clearly failed. Then stop the harness before it launches the next
task. Do not interrupt an implementer/reviewer/decider in the middle of a normal
handoff unless the next commit would damage the plan or repo state.

If the decider is about to commit a result that narrows scope but drops
still-desired work into prose instead of executable tasks, interrupt the run,
repair the source plan in the launcher worktree, verify the plan/index
consistency, and commit the corrected closeout manually.

## Usage

```bash
scripts/ralph-dual-run.sh plans/some-plan.md
```

By default, the script checks out an integration branch named `ralph/<run-id>/integration` and commits reconciled task results there. `master` stays unchanged until you explicitly merge or rebase the integration branch.

Useful options:

```bash
scripts/ralph-dual-run.sh plans/some-plan.md \
  --task 3 \
  --codex-only \
  --implementation-runner opencode \
  --opencode-model ollama/qwen3.6:35b-a3b-64k \
  --codex-model gpt-5.3-codex-spark \
  --max-task-attempts 3 \
  --test-command "pnpm --filter @dnd/core test" \
  --output-branch "ralph/my-run/integration" \
  --run-id "my-run" \
  --keep-worktrees
```

`--codex-only` keeps the normal chooser and decider flow, but only the Codex implementer pipeline runs for each task. No Claude worktree is launched in that mode.

`--claude-only` is the symmetric mode: only the Claude implementer pipeline runs for each task, while the Codex decider remains the final gatekeeper. Ralph-launched Claude roles use `--effort max`.

`--implementation-runner opencode` swaps only the Codex-path implementer onto OpenCode. The Codex-path review, queue chooser, and final decider still run through Codex. This is most useful with `--codex-only` when you want a single OpenCode implementation candidate with Codex review/decider gates. For `ollama/*` OpenCode models, the harness pings the configured Ollama OpenAI-compatible `/models` endpoint before starting; the default is `http://host.docker.internal:11434/v1`.

`--max-task-attempts` bounds how many full decider-level attempts the same task may consume in one Ralph run. The final allowed attempt is special: the decider must either land the task or make it non-runnable in the plan. If it still tries to leave the task runnable, the harness treats that as a decider/harness contract failure.

Candidate execution is pipeline-based. In dual mode, Claude and Codex still run in parallel, but each candidate follows:

1. implement;
2. immediate review;
3. same-candidate handback if the review says `accept-with-fixes` or `reject`;
4. decider only after the active candidate pipelines settle.

This lets review start as soon as an implementer finishes.

The output branch must not already exist. This avoids silently resetting an existing run branch.

To commit reconciled results directly to `master`, pass:

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

For Codex, the equivalent command-line option is:

```bash
scripts/ralph-dual-run.sh plans/some-plan.md --codex-model gpt-5.3-codex-spark
```

For OpenCode-backed implementation:

```bash
RALPH_IMPLEMENTATION_RUNNER=opencode \
RALPH_OPENCODE_MODEL=ollama/qwen3.6:35b-a3b-64k \
RALPH_OPENCODE_OLLAMA_BASE_URL=http://host.docker.internal:11434/v1 \
scripts/ralph-dual-run.sh plans/some-plan.md --codex-only
```

Default verification is `pnpm quality`. Override it per plan with `--test-command` when the plan has a narrower repo-approved command.

The decider prompt also instructs agents to avoid broad formatters for docs-only tasks. Prefer the task-specific grep/search checks and `git diff --check` when a plan task changes only documentation.

Every implementer, reviewer, and decider prompt includes the repo MBT guard: check for existing `vitest` and `quint_evaluator` processes before any MBT run, kill stale `quint_evaluator` processes, and never launch a second MBT while one is alive.

Ralph task runs must never use the fuzz / overnight scripts (`./scripts/mbt-fuzz.sh`, `./scripts/fuzz-all.sh`, `./scripts/fuzz-overnight.sh`) and must never set `MBT_DEV=1` or `MBT_SAVE_TRACES=1`. If a task needs MBT verification, stay on Tier 1 / Tier 1b unless the task explicitly requires a higher tier.

Broad verification is diagnostic, not an automatic scope-expander. When lint/typecheck/test commands surface known pre-existing failures outside the touched ownership surface, agents should record that baseline noise and stop widening the task into repo-wide cleanup. Only failures caused by the task diff itself should be fixed inside that task; unrelated cleanup belongs in a separate task or sidecar investigation. Prompt behavior is intentionally strict here: once an agent confirms the failure is unrelated baseline noise, it should stop broad verification immediately instead of continuing to chase `pnpm quality`.

The decider must leave the main worktree with no tracked staged or unstaged changes after each task. This makes git the persistent state boundary between task rotations.

On integration-branch runs, Ralph treats a dirty tracked main worktree after a decider commit as recoverable once: it hard-resets to `HEAD`, re-checks cleanliness, and logs a warning if recovery succeeds. This prevents leftover post-commit task debris from killing an otherwise valid run. In `--commit-to-base` mode, that automatic recovery is disabled because the base branch may be operator-owned.

## Stop Conditions

The loop stops only when one of these is true:

1. the chooser reports there is no meaningful runnable work left in the plan;
2. the operator interrupts the run;
3. a fatal harness error occurs.

Fatal harness errors are narrow:

- the chooser fails or chooses an invalid/non-runnable task;
- the decider exits non-zero;
- the decider fails to include `Plan Impact`;
- the main worktree is left dirty outside a committed decider result;
- the plan snapshot cannot be parsed into a valid task index.

Task rejection is explicitly not a stop condition.

## Run State

Run state is preserved by default under `.ralph/runs/<run-id>/`:

- `plan.md` and `tasks.tsv` store the last refreshed plan snapshot;
- `events.tsv` records high-level run events;
- `history.tsv` records one row per task attempt;
- `iterations/iteration-N/` stores chooser prompts and outputs;
- `task-<n>/attempt-<m>/` stores implementer prompts, logs, diffs, reviews, and decider outputs.

Temporary worktrees and task branches are still cleaned up by default unless `--keep-worktrees` is set, but the run evidence remains so post-mortems are possible even after a fatal exit.
