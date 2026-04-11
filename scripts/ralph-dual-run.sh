#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/ralph-dual-run.sh <plan.md> [options]

Runs a Ralph-style dual implementation loop:
  1. Parse the plan's ralph-task-index and matching ### Task N sections.
  2. Create an integration branch from the current main HEAD, unless --commit-to-base is set.
  3. For each task, create two disposable worktrees from the current integration HEAD.
  4. Run Claude in one and Codex in the other, scoped to that task only.
  5. Ask Codex to review both task diffs.
  6. Ask Codex, from the main worktree, to reconcile and commit that task only.
  7. Remove temporary worktrees, then continue with the next task.

Options:
  --base <ref>            Base ref to branch from. Default: master
  --output-branch <ref>   Integration branch to create.
                          Default: ralph/<run-id>/integration
  --commit-to-base        Commit reconciled results directly to --base instead
                          of an integration branch.
  --commit-to-master      Deprecated alias for --commit-to-base.
  --run-id <id>           Run identifier. Default: timestamp
  --test-command <cmd>    Verification command to tell agents to run.
                          Default: pnpm quality
  --task <n>              Run only Task n. May be repeated; tasks run in
                          the order provided.
  --keep-run              Keep .ralph/runs/<run-id> after failure/interrupt.
  --keep-worktrees        Leave temporary worktrees in place.
  --skip-decider          Stop each task after implementation and review.
  -h, --help              Show this help.

Environment:
  RALPH_CLAUDE_MODEL      Optional model passed to claude --model.
  RALPH_CODEX_MODEL       Optional model passed to codex exec --model.
EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[ralph-dual] %s\n' "$*"
}

quote_cmd() {
  printf '%q ' "$@"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$repo_root" ]] || die "must be run inside a git repository"
cd "$repo_root"

plan_file=""
base_ref="master"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
output_branch=""
commit_to_base=false
test_command="pnpm quality"
keep_run=false
keep_worktrees=false
skip_decider=false
selected_tasks=()
child_pids=()
task_branches=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -ge 2 ]] || die "--base requires a value"
      base_ref="$2"
      shift 2
      ;;
    --output-branch)
      [[ $# -ge 2 ]] || die "--output-branch requires a value"
      output_branch="$2"
      shift 2
      ;;
    --commit-to-base|--commit-to-master)
      commit_to_base=true
      shift
      ;;
    --run-id)
      [[ $# -ge 2 ]] || die "--run-id requires a value"
      run_id="$2"
      shift 2
      ;;
    --test-command)
      [[ $# -ge 2 ]] || die "--test-command requires a value"
      test_command="$2"
      shift 2
      ;;
    --task)
      [[ $# -ge 2 ]] || die "--task requires a value"
      selected_tasks+=("$2")
      shift 2
      ;;
    --keep-run)
      keep_run=true
      shift
      ;;
    --keep-worktrees)
      keep_worktrees=true
      shift
      ;;
    --skip-decider)
      skip_decider=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      [[ -z "$plan_file" ]] || die "only one plan file may be provided"
      plan_file="$1"
      shift
      ;;
  esac
done

[[ -n "$plan_file" ]] || {
  usage
  exit 2
}

require_cmd git
require_cmd claude
require_cmd codex
require_cmd node
require_cmd pnpm

[[ -f "$plan_file" ]] || die "plan file not found: $plan_file"
plan_file="$(realpath "$plan_file")"

if [[ -z "$output_branch" ]]; then
  output_branch="ralph/$run_id/integration"
fi

if [[ "$commit_to_base" == true ]]; then
  [[ "$output_branch" == "ralph/$run_id/integration" ]] || die "--output-branch cannot be combined with --commit-to-base"
  output_branch="$base_ref"
fi

git rev-parse --verify "$base_ref" >/dev/null || die "base ref not found: $base_ref"
base_sha="$(git rev-parse "$base_ref")"
head_sha="$(git rev-parse HEAD)"
current_branch="$(git branch --show-current)"

[[ "$head_sha" == "$base_sha" ]] || die "current HEAD ($head_sha) does not match $base_ref ($base_sha)"
git diff --quiet || die "main worktree has unstaged changes; commit or stash before running"
git diff --cached --quiet || die "main worktree has staged changes; commit or stash before running"

if [[ "$commit_to_base" == false ]]; then
  if git show-ref --verify --quiet "refs/heads/$output_branch"; then
    die "output branch already exists: $output_branch"
  fi
  log "creating/updating integration branch $output_branch from $base_ref ($base_sha)"
  git switch -C "$output_branch" "$base_sha"
else
  [[ "$current_branch" == "$base_ref" ]] || die "--commit-to-base requires the current branch to be $base_ref"
fi

run_root="$repo_root/.ralph/runs/$run_id"
worktree_root="$repo_root/.worktrees/ralph/$run_id"

mkdir -p "$run_root" "$worktree_root"
plan_snapshot="$run_root/plan.md"
task_index="$run_root/tasks.tsv"

write_task_index() {
  node - "$plan_snapshot" >"$task_index" <<'NODE'
const fs = require("fs")
const path = process.argv[2]
const text = fs.readFileSync(path, "utf8")
const indexMatch = text.match(/<!-- ralph-task-index\n([\s\S]*?)\n-->/)

if (!indexMatch) {
  throw new Error(`missing ralph-task-index block in ${path}`)
}

const index = JSON.parse(indexMatch[1])

if (index.schema !== "ralph-plan.v1" || !Array.isArray(index.tasks)) {
  throw new Error(`invalid ralph-task-index schema in ${path}`)
}

const lineStarts = [0]
for (let i = 0; i < text.length; i += 1) {
  if (text[i] === "\n") {
    lineStarts.push(i + 1)
  }
}

const lineNumber = (offset) => {
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (lineStarts[mid] <= offset) {
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return hi + 1
}

const headings = [...text.matchAll(/^### Task ([0-9]+)\b.*$/gm)].map((match) => ({
  number: Number(match[1]),
  offset: match.index,
}))
const headingByNumber = new Map(headings.map((heading, index) => [
  heading.number,
  {
    startLine: lineNumber(heading.offset),
    endLine: index + 1 < headings.length ? lineNumber(headings[index + 1].offset) - 1 : text.split("\n").length,
  },
]))

for (const task of index.tasks) {
  if (!Number.isInteger(task.number) || typeof task.id !== "string" || typeof task.status !== "string" || typeof task.title !== "string") {
    throw new Error(`invalid task metadata: ${JSON.stringify(task)}`)
  }
  const heading = headingByNumber.get(task.number)
  if (!heading) {
    throw new Error(`missing markdown heading for task ${task.number} (${task.id})`)
  }
  console.log([task.number, task.id, task.status, heading.startLine, heading.endLine, task.title].join("\t"))
}
NODE

  [[ -s "$task_index" ]] || die "no task headings found in plan snapshot: $plan_snapshot"
}

refresh_plan_snapshot() {
  cp "$plan_file" "$plan_snapshot"
  write_task_index
}

lookup_task_row() {
  local task_no="$1"
  awk -F $'\t' -v selected="$task_no" '
    $1 == selected {
      print
      found = 1
      exit
    }
    END {
      exit found ? 0 : 1
    }
  ' "$task_index"
}

refresh_plan_snapshot

task_numbers=()
if [[ ${#selected_tasks[@]} -gt 0 ]]; then
  for selected in "${selected_tasks[@]}"; do
    lookup_task_row "$selected" >/dev/null || die "selected task not found in plan: $selected"
    task_numbers+=("$selected")
  done
fi

declare -A processed_tasks=()

cleanup() {
  local status=$?
  local wt
  local pid
  local branch

  if [[ "$status" -ne 0 ]]; then
    for pid in "${child_pids[@]}"; do
      [[ -n "$pid" ]] || continue
      kill "$pid" >/dev/null 2>&1 || true
    done
    wait >/dev/null 2>&1 || true
  fi

  if [[ "$keep_worktrees" == false ]]; then
    for wt in "$worktree_root"/*/claude "$worktree_root"/*/codex; do
      [[ -d "$wt" ]] || continue
      git worktree remove --force "$wt" >/dev/null 2>&1 || true
    done
    find "$worktree_root" -type d -empty -delete >/dev/null 2>&1 || true
    rmdir "$worktree_root" >/dev/null 2>&1 || true
  fi

  if [[ "$keep_worktrees" == false ]]; then
    for branch in "${task_branches[@]}"; do
      git branch -D "$branch" >/dev/null 2>&1 || true
    done
  fi

  if [[ "$status" -ne 0 && "$keep_run" == false ]]; then
    rm -rf "$run_root"
  fi

  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

write_prompt() {
  local role="$1"
  local output_file="$2"
  local workspace="$3"
  local task_no="$4"
  local task_file="$5"
  local task_base_ref="$6"
  local task_base_sha="$7"

  cat >"$output_file" <<EOF
You are the $role agent in a Ralph-style fresh-context implementation run for this repository.

Before starting, run 'git log --oneline -1 master' and 'git log --oneline -1 HEAD'. Treat this as a branch-base check, not an exact-match requirement.
If HEAD is missing master's tip as an ancestor, run 'git rebase master'.
If HEAD is ahead of master because earlier reconciled task commits are already present on the integration branch, continue after confirming master is still the branch base.

Workspace: $workspace
Base ref: $task_base_ref
Base SHA: $task_base_sha
Plan file: $plan_snapshot
Current task file: $task_file
Current task: Task $task_no
Verification command: $test_command

Read AGENTS.md/CLAUDE.md first and follow the repo instructions. Important local constraints:
- Use pnpm, never npm.
- Edit only files inside the Workspace path above. Do not edit the main repo worktree at $repo_root or any sibling task worktree; the decider owns main-worktree changes.
- This repo owns the whole stack; change the right layer instead of adding workaround adapters.
- Do not duplicate state across layers.
- For any modeled D&D rule, read the relevant SRD text under .references/srd-5.2.1/ and check UBIQUITOUS_LANGUAGE.md before implementing.
- Treat battle MBT as scarce. Only run the appropriate MBT tier after changes require it.
- Before any MBT run, check for existing runners:
  ps aux | grep vitest | grep -v grep
  ps aux | grep quint_evaluator | grep -v grep
  If a prior quint_evaluator is alive, stop it with killall -9 quint_evaluator before starting. If a vitest/MBT process is alive, do not start another MBT run; wait for it or report the blocker.
- Run MBT with the repo background/timing protocol from AGENTS.md, never as a casual foreground exploratory command.
- Do not write to the memory system.

Task:
Implement Task $task_no only. Read the full plan for context, but do not start later tasks. Make focused code and documentation changes needed to satisfy Task $task_no success criteria. Run the verification command if it is appropriate for the task scope, or explain why a narrower repo-approved verification was used. Leave your changes in this worktree; committing is allowed but not required.

At the end, write a concise final status including:
- Files changed
- Verification commands run and their result
- Any unresolved risks
- Plan Impact:
  - Status: none | update-required
  - Affected tasks: task IDs and whether each should be unblocked, blocked, deferred, revised, added, or left unchanged
  - Observations: task discoveries that should affect future planning
  - Required plan edits: concrete edits the decider should make to the plan, or "none"
EOF
}

write_review_prompt() {
  local implementation="$1"
  local workspace="$2"
  local report="$3"
  local output_file="$4"
  local task_no="$5"
  local task_file="$6"
  local task_base_sha="$7"

  cat >"$output_file" <<EOF
You are reviewing the $implementation implementation for Task $task_no in this Ralph run.

Before starting, run 'git log --oneline -1 master' and 'git log --oneline -1 HEAD'. Treat this as a branch-base check, not an exact-match requirement.
If HEAD is missing master's tip as an ancestor, run 'git rebase master'.
If HEAD is ahead of master because earlier reconciled task commits are already present on the integration branch, continue after confirming master is still the branch base.

Workspace: $workspace
Base ref: $base_ref
Base SHA: $task_base_sha
Plan file: $plan_snapshot
Current task file: $task_file
Review report output path: $report

Review the implementation diff against $task_base_sha. Do not modify repository files. Focus on correctness, Task $task_no coverage, repo instruction violations, missing verification, duplicated state, and SRD/UBIQUITOUS_LANGUAGE traceability for modeled rules. Flag any changes that implement later tasks prematurely. If you decide verification requires MBT, first check for existing vitest/quint_evaluator processes per AGENTS.md and do not launch a second MBT run while one is alive.
Do not edit the main repo worktree at $repo_root or any sibling task worktree.

Your final answer is the review report. The harness saves it to the output path above. Write markdown with these sections:
- Verdict: accept | accept-with-fixes | reject
- Findings
- Missing verification
- Merge notes
- Plan Impact
EOF
}

write_decider_prompt() {
  local output_file="$1"
  local task_no="$2"
  local task_file="$3"
  local task_base_sha="$4"
  local claude_worktree="$5"
  local codex_worktree="$6"
  local task_root="$7"

  cat >"$output_file" <<EOF
You are the master merge/decider agent for Task $task_no in a Ralph-style dual implementation run.

Main worktree: $repo_root
Base ref: $base_ref
Base SHA: $task_base_sha
Output branch: $output_branch
Plan file: $plan_snapshot
Current task file: $task_file
Claude worktree: $claude_worktree
Codex worktree: $codex_worktree
Claude review: $task_root/claude-review.md
Codex review: $task_root/codex-review.md
Verification command: $test_command

Read AGENTS.md/CLAUDE.md first and follow the repo instructions. The two implementation worktrees are inputs, not final output. Inspect both Task $task_no diffs and both review reports. Apply the best final implementation for Task $task_no to the main worktree, combining useful parts when appropriate and rejecting broken or off-plan changes. Do not implement later tasks.

Requirements:
- Keep the main worktree on $output_branch; do not merge branches blindly.
- Preserve repo constraints: pnpm only, no redundant state, Quint parity, SRD traceability for modeled rules, scarce MBT usage.
- Before any MBT run, check for existing vitest and quint_evaluator processes per AGENTS.md. Kill stale quint_evaluator processes, and do not launch a second MBT while another vitest/MBT run is alive.
- Run appropriate verification after applying the final result, using "$test_command" unless a narrower repo-approved command is justified.
- Inspect both implementations and both reviews for Plan Impact. If any impact is update-required, update the plan file at $plan_file in the same commit. If no plan update is needed, say so explicitly in the final Plan Impact section.
- Commit the reconciled Task $task_no result to $output_branch in the main worktree after verification. Use a concise task-scoped commit message. Do not leave tracked changes staged or unstaged; the next task worktrees are created from the updated integration HEAD.
- For docs-only tasks, prefer the task-specific grep/search checks and git diff --check over broad formatters that churn unrelated Markdown. Do not run broad formatters unless the task explicitly requires formatting.
- Leave temporary worktree cleanup to the harness.
- Do not write to the memory system.

At the end, report:
- Which implementation(s) you used
- Files changed in the main worktree
- Verification commands run and results
- Any remaining risks
- Plan Impact:
  - Status: none | applied
  - Affected tasks: task IDs and final planning action for each
  - Plan edits: summary of updates made to $plan_file, or "none"
EOF
}

run_codex() {
  local workspace="$1"
  local prompt="$2"
  local log_file="$3"
  local output_file="$4"
  local -a args=(exec --dangerously-bypass-approvals-and-sandbox -C "$workspace" -o "$output_file")

  if [[ -n "${RALPH_CODEX_MODEL:-}" ]]; then
    args+=("--model" "$RALPH_CODEX_MODEL")
  fi

  log "codex: $(quote_cmd codex "${args[@]}" -)"
  codex "${args[@]}" - <"$prompt" 2>&1 | tee "$log_file"
}

run_claude() {
  local workspace="$1"
  local prompt="$2"
  local log_file="$3"
  local -a args=(--dangerously-skip-permissions --print --verbose --output-format stream-json)

  if [[ -n "${RALPH_CLAUDE_MODEL:-}" ]]; then
    args+=("--model" "$RALPH_CLAUDE_MODEL")
  fi

  log "claude: $(quote_cmd claude "${args[@]}") < $prompt"
  (cd "$workspace" && claude "${args[@]}" <"$prompt") 2>&1 | tee "$log_file"
}

save_diff() {
  local workspace="$1"
  local output_file="$2"
  local diff_base_sha="$3"
  git -C "$workspace" diff --binary "$diff_base_sha" >"$output_file"
}

bootstrap_worktree_install() {
  local workspace="$1"
  local path

  for path in \
    "node_modules" \
    "packages/core/node_modules" \
    "packages/mcp/node_modules"; do
    if [[ -e "$workspace/$path" || -L "$workspace/$path" ]]; then
      rm -rf "$workspace/$path"
    fi
    mkdir -p "$(dirname "$workspace/$path")"
    ln -s "$repo_root/$path" "$workspace/$path"
  done
}

log "base $base_ref is $base_sha"
log "output branch: $output_branch"
log "run state: $run_root"

next_ready_task_row() {
  while IFS=$'\t' read -r task_no task_id status task_start task_end task_title; do
    [[ -n "$task_no" ]] || continue
    [[ -z "${processed_tasks[$task_no]+x}" ]] || continue
    if [[ "$status" == "ready-for-research" || "$status" == "ready-for-implementation-after-light-research" ]]; then
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$task_no" "$task_id" "$status" "$task_start" "$task_end" "$task_title"
      return 0
    fi
  done <"$task_index"

  return 1
}

while true; do
  refresh_plan_snapshot
  if [[ ${#selected_tasks[@]} -gt 0 ]]; then
    task_row=""
    for task_no in "${task_numbers[@]}"; do
      [[ -z "${processed_tasks[$task_no]+x}" ]] || continue
      task_row="$(lookup_task_row "$task_no")" || die "selected task $task_no no longer exists in refreshed plan snapshot"
      break
    done
    [[ -n "$task_row" ]] || break
  else
    task_row="$(next_ready_task_row)" || break
  fi

  IFS=$'\t' read -r task_no task_id status task_start task_end task_title <<<"$task_row"
  processed_tasks["$task_no"]=1

  task_root="$run_root/task-$task_no"
  task_file="$task_root/task.md"
  claude_worktree="$worktree_root/task-$task_no/claude"
  codex_worktree="$worktree_root/task-$task_no/codex"
  claude_branch="ralph/$run_id/task-$task_no/claude"
  codex_branch="ralph/$run_id/task-$task_no/codex"
  task_base_ref="$output_branch"
  task_base_sha="$(git rev-parse HEAD)"
  task_branches+=("$claude_branch" "$codex_branch")

  mkdir -p "$task_root" "$worktree_root/task-$task_no"
  sed -n "${task_start},${task_end}p" "$plan_snapshot" >"$task_file"

  log "task $task_no: $task_title"
  log "task $task_no base is $task_base_sha"

  git worktree add -B "$claude_branch" "$claude_worktree" "$task_base_sha"
  git worktree add -B "$codex_branch" "$codex_worktree" "$task_base_sha"
  bootstrap_worktree_install "$claude_worktree"
  bootstrap_worktree_install "$codex_worktree"

  write_prompt "Claude implementer" "$task_root/claude-implementer.prompt.md" "$claude_worktree" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha"
  write_prompt "Codex implementer" "$task_root/codex-implementer.prompt.md" "$codex_worktree" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha"

  run_claude "$claude_worktree" "$task_root/claude-implementer.prompt.md" "$task_root/claude-implementer.log" &
  claude_pid=$!
  child_pids+=("$claude_pid")
  run_codex "$codex_worktree" "$task_root/codex-implementer.prompt.md" "$task_root/codex-implementer.log" "$task_root/codex-implementer.final.md" &
  codex_pid=$!
  child_pids+=("$codex_pid")

  claude_status=0
  codex_status=0
  wait "$claude_pid" || claude_status=$?
  wait "$codex_pid" || codex_status=$?
  child_pids=()

  printf '%s\n' "$claude_status" >"$task_root/claude-implementer.exit"
  printf '%s\n' "$codex_status" >"$task_root/codex-implementer.exit"

  save_diff "$claude_worktree" "$task_root/claude.diff" "$task_base_sha"
  save_diff "$codex_worktree" "$task_root/codex.diff" "$task_base_sha"

  write_review_prompt "Claude" "$claude_worktree" "$task_root/claude-review.md" "$task_root/claude-review.prompt.md" "$task_no" "$task_file" "$task_base_sha"
  write_review_prompt "Codex" "$codex_worktree" "$task_root/codex-review.md" "$task_root/codex-review.prompt.md" "$task_no" "$task_file" "$task_base_sha"

  run_codex "$claude_worktree" "$task_root/claude-review.prompt.md" "$task_root/claude-review.log" "$task_root/claude-review.md" &
  claude_review_pid=$!
  child_pids+=("$claude_review_pid")
  run_codex "$codex_worktree" "$task_root/codex-review.prompt.md" "$task_root/codex-review.log" "$task_root/codex-review.md" &
  codex_review_pid=$!
  child_pids+=("$codex_review_pid")

  claude_review_status=0
  codex_review_status=0
  wait "$claude_review_pid" || claude_review_status=$?
  wait "$codex_review_pid" || codex_review_status=$?
  child_pids=()

  printf '%s\n' "$claude_review_status" >"$task_root/claude-review.exit"
  printf '%s\n' "$codex_review_status" >"$task_root/codex-review.exit"

  save_diff "$claude_worktree" "$task_root/claude.after-review.diff" "$task_base_sha"
  save_diff "$codex_worktree" "$task_root/codex.after-review.diff" "$task_base_sha"

  if [[ "$skip_decider" == true ]]; then
    log "task $task_no: skipping decider by request"
    continue
  fi

  write_decider_prompt "$task_root/decider.prompt.md" "$task_no" "$task_file" "$task_base_sha" "$claude_worktree" "$codex_worktree" "$task_root"
  run_codex "$repo_root" "$task_root/decider.prompt.md" "$task_root/decider.log" "$task_root/decider.final.md"

  if ! grep -Eqi "Plan Impact|Plan impact" "$task_root/decider.final.md"; then
    die "task $task_no decider final report is missing a Plan Impact section"
  fi

  git diff --quiet || die "task $task_no decider left unstaged tracked changes; commit or clean them before continuing"
  git diff --cached --quiet || die "task $task_no decider left staged changes; commit or clean them before continuing"
  refresh_plan_snapshot

  if [[ "$keep_worktrees" == false ]]; then
    git worktree remove --force "$claude_worktree" >/dev/null 2>&1 || true
    git worktree remove --force "$codex_worktree" >/dev/null 2>&1 || true
    git branch -D "$claude_branch" >/dev/null 2>&1 || true
    git branch -D "$codex_branch" >/dev/null 2>&1 || true
    task_branches=("${task_branches[@]/$claude_branch}")
    task_branches=("${task_branches[@]/$codex_branch}")
    rmdir "$worktree_root/task-$task_no" >/dev/null 2>&1 || true
  fi

  log "task $task_no reconciled"
done

log "done. run state: $run_root"
