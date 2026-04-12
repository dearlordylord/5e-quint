#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/ralph-dual-run.sh <plan.md> [options]

Runs a Ralph-style fresh-context loop:
  1. Parse the plan's ralph-task-index and matching ### Task N sections.
  2. Create an integration branch from the current base HEAD, unless --commit-to-base is set.
  3. Refresh the live plan snapshot every iteration.
  4. Ask Codex to choose the next runnable task from the refreshed plan.
  5. For the chosen task, create two disposable worktrees from the current integration HEAD.
  6. Run Claude and Codex implementers in parallel, then parallel reviews, then a Codex decider.
  7. Let the decider either land the task or explicitly reject/update the plan.
  8. Keep looping until the chooser reports there is no next meaningful runnable task.

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
  printf '[ralph-dual] %s\n' "$*" >&2
}

note() {
  local phase="$1"
  local message="$2"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '%s\t%s\t%s\n' "$now" "$phase" "$message" | tee -a "$events_file" >/dev/null
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
keep_worktrees=false
skip_decider=false
selected_tasks=()
child_pids=()
task_branches=()
active_worktrees=()

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
  log "creating integration branch $output_branch from $base_ref ($base_sha)"
  git switch -C "$output_branch" "$base_sha"
else
  [[ "$current_branch" == "$base_ref" ]] || die "--commit-to-base requires the current branch to be $base_ref"
fi

run_root="$repo_root/.ralph/runs/$run_id"
worktree_root="$repo_root/.worktrees/ralph/$run_id"
iterations_root="$run_root/iterations"
mkdir -p "$run_root" "$worktree_root" "$iterations_root"

plan_snapshot="$run_root/plan.md"
task_index="$run_root/tasks.tsv"
events_file="$run_root/events.tsv"
history_file="$run_root/history.tsv"
state_file="$run_root/state.env"
last_error_file="$run_root/last-error.txt"

: >"$events_file"
printf 'iteration\ttask_no\ttask_id\tattempt\tresult\tcommit\tmessage\n' >"$history_file"

write_state() {
  {
    printf 'RUN_ID=%q\n' "$run_id"
    printf 'BASE_REF=%q\n' "$base_ref"
    printf 'BASE_SHA=%q\n' "$base_sha"
    printf 'OUTPUT_BRANCH=%q\n' "$output_branch"
    printf 'PLAN_FILE=%q\n' "$plan_file"
    printf 'PLAN_SNAPSHOT=%q\n' "$plan_snapshot"
    printf 'TASK_INDEX=%q\n' "$task_index"
  } >"$state_file"
}

write_state

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

task_status_is_runnable() {
  local status="$1"
  [[ "$status" == "ready-for-research" || "$status" == "ready-for-implementation-after-light-research" ]]
}

write_ready_tasks_file() {
  local output_file="$1"
  : >"$output_file"
  while IFS=$'\t' read -r task_no task_id status task_start task_end task_title; do
    [[ -n "$task_no" ]] || continue
    if task_status_is_runnable "$status"; then
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$task_no" "$task_id" "$status" "$task_start" "$task_end" "$task_title" >>"$output_file"
    fi
  done <"$task_index"
}

append_history() {
  local iteration="$1"
  local task_no="$2"
  local task_id="$3"
  local attempt="$4"
  local result="$5"
  local commit="$6"
  local message="$7"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$iteration" "$task_no" "$task_id" "$attempt" "$result" "$commit" "$message" >>"$history_file"
}

cleanup_active_worktrees() {
  local wt
  local branch

  if [[ "$keep_worktrees" == false ]]; then
    for wt in "${active_worktrees[@]}"; do
      [[ -n "$wt" ]] || continue
      if git worktree list --porcelain | grep -Fqx "worktree $wt"; then
        git worktree remove --force "$wt" >/dev/null 2>&1 || true
      fi
    done
    active_worktrees=()

    for branch in "${task_branches[@]}"; do
      [[ -n "$branch" ]] || continue
      git branch -D "$branch" >/dev/null 2>&1 || true
    done
    task_branches=()

    find "$worktree_root" -type d -empty -delete >/dev/null 2>&1 || true
    rmdir "$worktree_root" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  local status=$?
  local pid

  for pid in "${child_pids[@]}"; do
    [[ -n "$pid" ]] || continue
    kill "$pid" >/dev/null 2>&1 || true
  done
  wait >/dev/null 2>&1 || true

  cleanup_active_worktrees

  if [[ "$status" -eq 0 ]]; then
    note "run" "complete"
  else
    printf 'run exited with status %s\n' "$status" >"$last_error_file"
    note "run" "aborted status=$status"
  fi

  exit "$status"
}
trap cleanup EXIT
trap 'printf "interrupted\n" >"$last_error_file"; exit 130' INT
trap 'printf "terminated\n" >"$last_error_file"; exit 143' TERM

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
- Never run ./scripts/mbt-fuzz.sh, ./scripts/fuzz-all.sh, ./scripts/fuzz-overnight.sh, or any MBT command with MBT_DEV=1 or MBT_SAVE_TRACES=1 in a Ralph task run. Ralph verification must stay on Tier 1 / Tier 1b only unless the task explicitly requires a higher tier.
- Do not write to the memory system.
- Broad verification is diagnostic, not an automatic scope-expander. If lint/typecheck/test verification surfaces a confirmed unrelated baseline failure outside the touched ownership surface, stop broad verification immediately, record that baseline noise, and do not continue repo-wide cleanup inside this task. Only keep fixing failures that are caused by your task diff itself.

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
Treat unrelated repo-wide baseline failures as noise unless the reviewed diff clearly causes them. A task should not be rejected merely for not repairing pre-existing broad verification failures outside its touched ownership surface.

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
  local attempt_root="$7"

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
Claude implementer exit: $attempt_root/claude-implementer.exit
Codex implementer exit: $attempt_root/codex-implementer.exit
Claude review: $attempt_root/claude-review.md
Codex review: $attempt_root/codex-review.md
Claude review exit: $attempt_root/claude-review.exit
Codex review exit: $attempt_root/codex-review.exit
Verification command: $test_command

Read AGENTS.md/CLAUDE.md first and follow the repo instructions. The two implementation worktrees are inputs, not final output. Inspect both Task $task_no diffs and both review reports. Apply the best final implementation for Task $task_no to the main worktree, combining useful parts when appropriate and rejecting broken or off-plan changes. Do not implement later tasks.

Requirements:
- Keep the main worktree on $output_branch; do not merge branches blindly.
- Preserve repo constraints: pnpm only, no redundant state, Quint parity, SRD traceability for modeled rules, scarce MBT usage.
- Before any MBT run, check for existing vitest and quint_evaluator processes per AGENTS.md. Kill stale quint_evaluator processes, and do not launch a second MBT while another vitest/MBT run is alive.
- Never run ./scripts/mbt-fuzz.sh, ./scripts/fuzz-all.sh, ./scripts/fuzz-overnight.sh, or any MBT command with MBT_DEV=1 or MBT_SAVE_TRACES=1 in a Ralph task run. If verification needs MBT, stay on Tier 1 / Tier 1b unless the task explicitly requires a higher tier.
- Run appropriate verification after applying the final result, using "$test_command" unless a narrower repo-approved command is justified.
- If broader verification surfaces a confirmed unrelated baseline failure outside the touched ownership surface, stop broad verification at that point and record the baseline noise instead of continuing repo-wide cleanup.
- Inspect both implementations and both reviews for Plan Impact. If either implementation is rejected, the task description must be tightened with helpful rerun guidance before the decider finishes. If any impact is update-required, update the source plan file at $plan_file in the same commit. If no plan update is needed, say so explicitly in the final Plan Impact section.
- If the task is rejected, put it back into the appropriate runnable to-do status, commit the rejection/plan guidance, and leave the plan in a shape where the next Ralph iteration can pick it again without operator intervention.
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

write_chooser_prompt() {
  local output_file="$1"
  local ready_tasks_file="$2"
  local iteration="$3"

  cat >"$output_file" <<EOF
You are the Ralph queue chooser for iteration $iteration.

Main worktree: $repo_root
Current branch: $output_branch
Plan file: $plan_snapshot
Task index: $task_index
Ready task candidates: $ready_tasks_file
Run history: $history_file

Read the plan snapshot and the ready task candidate list. Pick the single best next runnable task for Ralph to execute now.

Rules:
- Choose exactly one runnable task from the candidate list when at least one meaningful runnable candidate exists.
- Prefer the task that best advances the plan now; you are not required to pick the numerically earliest task.
- Use the history file to avoid mindlessly repeating an unproductive attempt pattern, but do requeue the same task when the plan clearly intends a rerun.
- Output stop only when there is no meaningful runnable work left in the plan right now.
- Do not edit repository files.

Write exactly one of these two forms and nothing else:

Decision: run-task
Task: <number>\t<id>
Reason: <one concise sentence>

or

Decision: stop
Task: none
Reason: <one concise sentence>
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
  codex "${args[@]}" - <"$prompt" 2>&1 | tee "$log_file" >&2
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
  (cd "$workspace" && claude "${args[@]}" <"$prompt") 2>&1 | tee "$log_file" >&2
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

disable_fuzz_scripts_in_worktree() {
  local workspace="$1"
  local path

  for path in \
    "scripts/mbt-fuzz.sh" \
    "scripts/mbt-fuzz-timed.sh" \
    "scripts/fuzz-all.sh" \
    "scripts/fuzz-overnight.sh" \
    "scripts/escalate-fuzz.sh" \
    "scripts/measure-tier-timing.sh"; do
    [[ -f "$workspace/$path" ]] || continue
    cat >"$workspace/$path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "This script is disabled inside Ralph task worktrees." >&2
echo "Use Tier 1 / Tier 1b MBT or focused non-fuzz verification instead." >&2
exit 97
EOF
    chmod 0555 "$workspace/$path"
  done
}

kill_stray_mbt_processes() {
  local pid
  while read -r pid _rest; do
    [[ -n "$pid" ]] || continue
    kill "$pid" >/dev/null 2>&1 || true
  done < <(pgrep -af 'scripts/(mbt-fuzz|mbt-fuzz-timed|fuzz-all|fuzz-overnight|escalate-fuzz|measure-tier-timing)\.sh' || true)
  killall -9 quint_evaluator >/dev/null 2>&1 || true
}

cleanup_mbt_artifacts() {
  find "$repo_root/packages" -maxdepth 1 \
    \( -name 'mbt-failure-battle-*.log' \
    -o -name 'mbt-failures.jsonl' \
    -o -name 'mbt-timing.jsonl' \
    -o -name 'mbt-fuzz.log' \
    -o -name 'mbt-seed-blacklist.txt' \
    -o -name 'invariant-failures.jsonl' \
    -o -name 'invariant-fuzz.log' \
    -o -name 'escalate-fuzz.log' \) \
    -delete 2>/dev/null || true
  rm -rf "$repo_root/packages/fat-traces" 2>/dev/null || true
}

assert_clean_main_worktree() {
  git diff --quiet || return 1
  git diff --cached --quiet || return 1
}

parse_chooser_output() {
  local chooser_output="$1"
  node - "$chooser_output" <<'NODE'
const fs = require("fs")
const text = fs.readFileSync(process.argv[2], "utf8")
let decision = text.match(/^Decision:\s*(.+)$/m)?.[1]?.trim() ?? ""
let task = text.match(/^Task:\s*(.+)$/m)?.[1]?.trim() ?? ""
const reason = text.match(/^Reason:\s*(.+)$/m)?.[1]?.trim() ?? ""
if (!decision || !task || !reason) {
  throw new Error("chooser output missing Decision/Task/Reason lines")
}
if (decision === "run-task | stop") {
  decision = task === "none" ? "stop" : "run-task"
}
if (task === "<number>\\t<id> | none") {
  throw new Error("chooser returned the task template instead of a concrete selection")
}
process.stdout.write(`${decision}\t${task}\t${reason}`)
NODE
}

choose_next_task() {
  local iteration="$1"
  local chooser_root="$iterations_root/iteration-$iteration"
  local ready_tasks_file="$chooser_root/ready-tasks.tsv"
  local chooser_prompt="$chooser_root/chooser.prompt.md"
  local chooser_output="$chooser_root/chooser.final.md"
  local chooser_log="$chooser_root/chooser.log"
  mkdir -p "$chooser_root"

  refresh_plan_snapshot

  if [[ ${#selected_tasks[@]} -gt 0 ]]; then
    local selected
    for selected in "${selected_tasks[@]}"; do
      if lookup_task_row "$selected" >/dev/null 2>&1; then
        lookup_task_row "$selected"
        return 0
      fi
    done
    return 1
  fi

  write_ready_tasks_file "$ready_tasks_file"
  if [[ ! -s "$ready_tasks_file" ]]; then
    note "chooser" "no-runnable-tasks"
    return 1
  fi

  write_chooser_prompt "$chooser_prompt" "$ready_tasks_file" "$iteration"
  if ! run_codex "$repo_root" "$chooser_prompt" "$chooser_log" "$chooser_output"; then
    printf 'chooser failed for iteration %s\n' "$iteration" >"$last_error_file"
    note "chooser" "failed iteration=$iteration"
    return 2
  fi

  local chooser_decision chooser_task chooser_reason chooser_task_no chooser_task_id task_row
  IFS=$'\t' read -r chooser_decision chooser_task chooser_reason < <(parse_chooser_output "$chooser_output")
  note "chooser" "decision=$chooser_decision task=$chooser_task reason=$chooser_reason"

  if [[ "$chooser_decision" == "stop" ]]; then
    return 1
  fi

  [[ "$chooser_decision" == "run-task" ]] || {
    printf 'invalid chooser decision: %s\n' "$chooser_decision" >"$last_error_file"
    return 2
  }

  chooser_task_no="${chooser_task%%$'\t'*}"
  chooser_task_id="${chooser_task#*$'\t'}"
  [[ "$chooser_task_no" != "$chooser_task_id" ]] || chooser_task_id=""

  task_row="$(lookup_task_row "$chooser_task_no")" || {
    printf 'chooser selected nonexistent task: %s\n' "$chooser_task_no" >"$last_error_file"
    return 2
  }

  IFS=$'\t' read -r _task_no _task_id _status _task_start _task_end _task_title <<<"$task_row"
  task_status_is_runnable "$_status" || {
    printf 'chooser selected non-runnable task: %s (%s)\n' "$_task_no" "$_status" >"$last_error_file"
    return 2
  }
  if [[ -n "$chooser_task_id" && "$chooser_task_id" != "$_task_id" ]]; then
    printf 'chooser selected mismatched task id: expected %s got %s\n' "$_task_id" "$chooser_task_id" >"$last_error_file"
    return 2
  fi

  printf '%s\n' "$task_row"
}

run_task_attempt() {
  local iteration="$1"
  local task_no="$2"
  local task_id="$3"
  local status="$4"
  local task_start="$5"
  local task_end="$6"
  local task_title="$7"
  local attempt_no="$8"

  local task_root="$run_root/task-$task_no"
  local attempt_root="$task_root/attempt-$attempt_no"
  local task_file="$attempt_root/task.md"
  local claude_worktree="$worktree_root/task-$task_no-attempt-$attempt_no/claude"
  local codex_worktree="$worktree_root/task-$task_no-attempt-$attempt_no/codex"
  local claude_branch="ralph/$run_id/task-$task_no/attempt-$attempt_no/claude"
  local codex_branch="ralph/$run_id/task-$task_no/attempt-$attempt_no/codex"
  local task_base_ref="$output_branch"
  local task_base_sha
  task_base_sha="$(git rev-parse HEAD)"

  mkdir -p "$attempt_root" "$(dirname "$claude_worktree")"
  sed -n "${task_start},${task_end}p" "$plan_snapshot" >"$task_file"

  task_branches+=("$claude_branch" "$codex_branch")
  active_worktrees+=("$claude_worktree" "$codex_worktree")

  log "task $task_no attempt $attempt_no: $task_title"
  note "task" "start iteration=$iteration task=$task_no id=$task_id attempt=$attempt_no status=$status base=$task_base_sha"

  kill_stray_mbt_processes
  cleanup_mbt_artifacts

  git worktree add -B "$claude_branch" "$claude_worktree" "$task_base_sha"
  git worktree add -B "$codex_branch" "$codex_worktree" "$task_base_sha"
  bootstrap_worktree_install "$claude_worktree"
  bootstrap_worktree_install "$codex_worktree"
  disable_fuzz_scripts_in_worktree "$claude_worktree"
  disable_fuzz_scripts_in_worktree "$codex_worktree"

  write_prompt "Claude implementer" "$attempt_root/claude-implementer.prompt.md" "$claude_worktree" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha"
  write_prompt "Codex implementer" "$attempt_root/codex-implementer.prompt.md" "$codex_worktree" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha"

  run_claude "$claude_worktree" "$attempt_root/claude-implementer.prompt.md" "$attempt_root/claude-implementer.log" &
  local claude_pid=$!
  child_pids+=("$claude_pid")
  run_codex "$codex_worktree" "$attempt_root/codex-implementer.prompt.md" "$attempt_root/codex-implementer.log" "$attempt_root/codex-implementer.final.md" &
  local codex_pid=$!
  child_pids+=("$codex_pid")

  local claude_status=0
  local codex_status=0
  wait "$claude_pid" || claude_status=$?
  wait "$codex_pid" || codex_status=$?
  child_pids=()

  printf '%s\n' "$claude_status" >"$attempt_root/claude-implementer.exit"
  printf '%s\n' "$codex_status" >"$attempt_root/codex-implementer.exit"
  save_diff "$claude_worktree" "$attempt_root/claude.diff" "$task_base_sha"
  save_diff "$codex_worktree" "$attempt_root/codex.diff" "$task_base_sha"

  write_review_prompt "Claude" "$claude_worktree" "$attempt_root/claude-review.md" "$attempt_root/claude-review.prompt.md" "$task_no" "$task_file" "$task_base_sha"
  write_review_prompt "Codex" "$codex_worktree" "$attempt_root/codex-review.md" "$attempt_root/codex-review.prompt.md" "$task_no" "$task_file" "$task_base_sha"

  run_codex "$claude_worktree" "$attempt_root/claude-review.prompt.md" "$attempt_root/claude-review.log" "$attempt_root/claude-review.md" &
  local claude_review_pid=$!
  child_pids+=("$claude_review_pid")
  run_codex "$codex_worktree" "$attempt_root/codex-review.prompt.md" "$attempt_root/codex-review.log" "$attempt_root/codex-review.md" &
  local codex_review_pid=$!
  child_pids+=("$codex_review_pid")

  local claude_review_status=0
  local codex_review_status=0
  wait "$claude_review_pid" || claude_review_status=$?
  wait "$codex_review_pid" || codex_review_status=$?
  child_pids=()

  printf '%s\n' "$claude_review_status" >"$attempt_root/claude-review.exit"
  printf '%s\n' "$codex_review_status" >"$attempt_root/codex-review.exit"
  save_diff "$claude_worktree" "$attempt_root/claude.after-review.diff" "$task_base_sha"
  save_diff "$codex_worktree" "$attempt_root/codex.after-review.diff" "$task_base_sha"

  if [[ "$skip_decider" == true ]]; then
    note "task" "skip-decider task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "skipped" "-" "skip-decider"
    return 0
  fi

  write_decider_prompt "$attempt_root/decider.prompt.md" "$task_no" "$task_file" "$task_base_sha" "$claude_worktree" "$codex_worktree" "$attempt_root"
  if ! run_codex "$repo_root" "$attempt_root/decider.prompt.md" "$attempt_root/decider.log" "$attempt_root/decider.final.md"; then
    printf 'decider failed for task %s attempt %s\n' "$task_no" "$attempt_no" >"$last_error_file"
    note "task" "fatal-decider-failure task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-decider-failure" "-" "decider exited non-zero"
    return 2
  fi

  if ! grep -Eqi "Plan Impact|Plan impact" "$attempt_root/decider.final.md"; then
    printf 'task %s attempt %s missing Plan Impact section in decider final\n' "$task_no" "$attempt_no" >"$last_error_file"
    note "task" "fatal-missing-plan-impact task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-plan-impact" "-" "decider missing plan impact"
    return 2
  fi

  if ! assert_clean_main_worktree; then
    printf 'task %s attempt %s left main worktree dirty\n' "$task_no" "$attempt_no" >"$last_error_file"
    note "task" "fatal-dirty-main-worktree task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-dirty-main-worktree" "-" "decider left tracked changes"
    return 2
  fi

  refresh_plan_snapshot
  kill_stray_mbt_processes
  cleanup_mbt_artifacts

  local new_head
  new_head="$(git rev-parse HEAD)"
  note "task" "complete iteration=$iteration task=$task_no attempt=$attempt_no head=$new_head"
  append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "completed" "$new_head" "$task_title"

  if [[ "$keep_worktrees" == false ]]; then
    git worktree remove --force "$claude_worktree" >/dev/null 2>&1 || true
    git worktree remove --force "$codex_worktree" >/dev/null 2>&1 || true
    git branch -D "$claude_branch" >/dev/null 2>&1 || true
    git branch -D "$codex_branch" >/dev/null 2>&1 || true
    active_worktrees=("${active_worktrees[@]/$claude_worktree}")
    active_worktrees=("${active_worktrees[@]/$codex_worktree}")
    task_branches=("${task_branches[@]/$claude_branch}")
    task_branches=("${task_branches[@]/$codex_branch}")
    rmdir "$(dirname "$claude_worktree")" >/dev/null 2>&1 || true
  fi

  return 0
}

declare -A task_attempts=()
iteration=0

log "base $base_ref is $base_sha"
log "output branch: $output_branch"
log "run state: $run_root"
note "run" "start base=$base_ref sha=$base_sha output=$output_branch"

kill_stray_mbt_processes
cleanup_mbt_artifacts
refresh_plan_snapshot

while true; do
  if ! assert_clean_main_worktree; then
    printf 'main worktree became dirty outside the decider path\n' >"$last_error_file"
    note "run" "fatal-main-worktree-dirty"
    exit 1
  fi

  iteration=$((iteration + 1))
  task_row=""
  chooser_status=0
  task_row="$(choose_next_task "$iteration")" || chooser_status=$?

  if [[ "$chooser_status" -eq 1 ]]; then
    note "run" "no-next-task iteration=$iteration"
    break
  fi
  if [[ "$chooser_status" -eq 2 ]]; then
    note "run" "fatal-chooser iteration=$iteration"
    exit 1
  fi

  IFS=$'\t' read -r task_no task_id status task_start task_end task_title <<<"$task_row"
  task_attempts["$task_no"]=$(( ${task_attempts["$task_no"]:-0} + 1 ))
  attempt_no="${task_attempts[$task_no]}"

  task_result=0
  run_task_attempt "$iteration" "$task_no" "$task_id" "$status" "$task_start" "$task_end" "$task_title" "$attempt_no" || task_result=$?
  if [[ "$task_result" -eq 2 ]]; then
    note "run" "fatal-task-error iteration=$iteration task=$task_no attempt=$attempt_no"
    exit 1
  fi

  if [[ ${#selected_tasks[@]} -gt 0 ]]; then
    new_selected_tasks=()
    for selected in "${selected_tasks[@]}"; do
      if [[ "$selected" != "$task_no" ]]; then
        new_selected_tasks+=("$selected")
      fi
    done
    selected_tasks=("${new_selected_tasks[@]}")
    if [[ ${#selected_tasks[@]} -eq 0 ]]; then
      note "run" "selected-tasks-finished"
      break
    fi
  fi
done

log "done. run state: $run_root"
