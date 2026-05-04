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
  5. For the chosen task, create disposable worktree(s) from the current integration HEAD.
  6. By default, run Claude and Codex implementers in parallel, then parallel reviews, then a Codex decider.
     With --codex-only or --claude-only, run only one implementer pipeline and let the Codex decider act as the gatekeeper.
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
  --max-task-attempts <n> Maximum decider-attempts per task in one Ralph run
                          before the harness stops instead of rerunning it.
                          Default: 3
  --task <n>              Run only Task n. May be repeated; tasks run in
                          the order provided.
  --keep-worktrees        Leave temporary worktrees in place.
  --codex-only            Run only the Codex implementer path; skip Claude
                          implementation and review.
  --claude-only           Run only the Claude implementer path; skip Codex
                          implementation and review.
  --codex-model <model>   Model passed to codex exec --model. Overrides
                          RALPH_CODEX_MODEL.
  --implementation-runner <codex|opencode>
                          Runner for the Codex implementer path only.
                          Reviews, chooser, and decider always use Codex.
                          Default: codex
  --opencode-model <model>
                          Model passed to opencode run --model when
                          --implementation-runner opencode is used. Overrides
                          RALPH_OPENCODE_MODEL.
                          Default: ollama/qwen3.6:35b-a3b-64k
  --opencode-ollama-base-url <url>
                          Ollama OpenAI-compatible base URL to ping for
                          ollama/* OpenCode models. Overrides
                          RALPH_OPENCODE_OLLAMA_BASE_URL.
                          Default: http://host.docker.internal:11434/v1
  --skip-decider          Stop each task after implementation and review.
  -h, --help              Show this help.

Environment:
  RALPH_CLAUDE_MODEL      Optional model passed to claude --model.
  RALPH_CODEX_MODEL       Optional model passed to codex exec --model.
  RALPH_IMPLEMENTATION_RUNNER
                          codex or opencode for the Codex implementer path.
  RALPH_OPENCODE_MODEL    Optional model passed to opencode run --model.
  RALPH_OPENCODE_OLLAMA_BASE_URL
                          Ollama base URL pinged before OpenCode runs when
                          the model uses the ollama/ provider.
                          Ollama-backed OpenCode implementers get 5
                          implement/review rounds; other implementers get 3.
  RALPH_STREAM_LOGS       Set to 1 to stream full model logs to the terminal.
                          Default is quiet: persist logs to files only.
EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[ralph-dual] %s\n' "$*" >&2
}

contains_attempt_specific_plan_notes() {
  local path="$1"
  rg -n '^[[:space:]-]*Attempt [0-9]+' "$path" >/dev/null 2>&1
}

# Retry guidance is durable, attempt-agnostic task steering for the next rerun.
task_body_has_retry_guidance() {
  local path="$1"
  local start_line="$2"
  local end_line="$3"
  sed -n "${start_line},${end_line}p" "$path" | rg -q '^[[:space:]]*(Retry Guidance:|### Retry Guidance\b)'
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

load_openrouter_key_from_dotenv() {
  local dotenv_path="$repo_root/.env"
  local loaded_key=""

  [[ -n "${OPENROUTER_API_KEY:-}" ]] && return 0
  [[ -f "$dotenv_path" ]] || return 0

  loaded_key="$({
    set -a
    # shellcheck disable=SC1090
    source "$dotenv_path" >/dev/null 2>&1
    printf '%s' "${OPENROUTER_API_KEY:-}"
  })"

  if [[ -n "$loaded_key" ]]; then
    export OPENROUTER_API_KEY="$loaded_key"
    log "loaded OPENROUTER_API_KEY from .env"
  fi
}

ping_opencode_ollama_model() {
  local provider="${opencode_model%%/*}"
  local model_id="${opencode_model#*/}"
  local models_json

  [[ "$provider" == "ollama" ]] || return 0
  [[ "$model_id" != "$opencode_model" && -n "$model_id" ]] || die "ollama OpenCode model must use provider/model form"

  log "pinging Ollama for OpenCode model $model_id at $opencode_ollama_base_url"
  models_json="$(curl -fsS --max-time 5 "$opencode_ollama_base_url/models")"
  node - "$model_id" "$models_json" <<'NODE'
const fs = require("fs")
const modelId = process.argv[2]
const body = process.argv[3] ?? fs.readFileSync(0, "utf8")
const parsed = JSON.parse(body)
const models = Array.isArray(parsed.data) ? parsed.data : []
if (!models.some((model) => model?.id === modelId)) {
  throw new Error(`OpenCode Ollama model not found: ${modelId}`)
}
NODE
}

is_opencode_ollama_model() {
  [[ "$opencode_model" == ollama/* ]]
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
max_task_attempts=3
keep_worktrees=false
skip_decider=false
codex_only=false
claude_only=false
codex_model="${RALPH_CODEX_MODEL:-}"
implementation_runner="${RALPH_IMPLEMENTATION_RUNNER:-codex}"
opencode_model="${RALPH_OPENCODE_MODEL:-ollama/qwen3.6:35b-a3b-64k}"
opencode_ollama_base_url="${RALPH_OPENCODE_OLLAMA_BASE_URL:-http://host.docker.internal:11434/v1}"
candidate_round_limit=3
selected_tasks=()
child_pids=()
task_branches=()
active_worktrees=()

collect_descendant_pids() {
  local root_pid="$1"
  local child_pid

  pgrep -P "$root_pid" 2>/dev/null || true
  while read -r child_pid; do
    [[ -n "$child_pid" ]] || continue
    collect_descendant_pids "$child_pid"
  done < <(pgrep -P "$root_pid" 2>/dev/null || true)
}

kill_process_group() {
  local pgid="$1"

  [[ -n "$pgid" ]] || return 0
  kill -TERM -- "-$pgid" >/dev/null 2>&1 || true
  sleep 1
  kill -0 -- "-$pgid" >/dev/null 2>&1 && kill -KILL -- "-$pgid" >/dev/null 2>&1 || true
}

kill_process_tree() {
  local root_pid="$1"
  local descendants=""

  [[ -n "$root_pid" ]] || return 0
  kill -0 "$root_pid" >/dev/null 2>&1 || return 0

  descendants="$(collect_descendant_pids "$root_pid")"
  if [[ -n "$descendants" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue
      kill "$pid" >/dev/null 2>&1 || true
    done <<<"$descendants"
  fi
  kill "$root_pid" >/dev/null 2>&1 || true
  sleep 1
  if [[ -n "$descendants" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue
      kill -0 "$pid" >/dev/null 2>&1 && kill -9 "$pid" >/dev/null 2>&1 || true
    done <<<"$descendants"
  fi
  kill -0 "$root_pid" >/dev/null 2>&1 && kill -9 "$root_pid" >/dev/null 2>&1 || true
}

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
    --max-task-attempts)
      [[ $# -ge 2 ]] || die "--max-task-attempts requires a value"
      [[ "$2" =~ ^[1-9][0-9]*$ ]] || die "--max-task-attempts must be a positive integer"
      max_task_attempts="$2"
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
    --codex-only)
      codex_only=true
      shift
      ;;
    --claude-only)
      claude_only=true
      shift
      ;;
    --codex-model)
      [[ $# -ge 2 ]] || die "--codex-model requires a value"
      codex_model="$2"
      shift 2
      ;;
    --implementation-runner)
      [[ $# -ge 2 ]] || die "--implementation-runner requires a value"
      implementation_runner="$2"
      shift 2
      ;;
    --opencode-model)
      [[ $# -ge 2 ]] || die "--opencode-model requires a value"
      opencode_model="$2"
      shift 2
      ;;
    --opencode-ollama-base-url)
      [[ $# -ge 2 ]] || die "--opencode-ollama-base-url requires a value"
      opencode_ollama_base_url="$2"
      shift 2
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

load_openrouter_key_from_dotenv

if [[ "$codex_only" == true && "$claude_only" == true ]]; then
  die "--codex-only and --claude-only are mutually exclusive"
fi

case "$implementation_runner" in
  codex|opencode)
    ;;
  *)
    die "--implementation-runner must be codex or opencode"
    ;;
esac

if [[ "$implementation_runner" == "opencode" ]]; then
  require_cmd opencode
  require_cmd curl
  ping_opencode_ollama_model
fi

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
    printf 'MAX_TASK_ATTEMPTS=%q\n' "$max_task_attempts"
    printf 'IMPLEMENTATION_RUNNER=%q\n' "$implementation_runner"
    printf 'OPENCODE_MODEL=%q\n' "$opencode_model"
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

set_task_status_in_plan() {
  local task_no="$1"
  local task_id="$2"
  local new_status="$3"
  local target_file="$4"

  node - "$target_file" "$task_no" "$task_id" "$new_status" <<'NODE'
const fs = require("fs")
const [path, taskNoRaw, taskId, newStatus] = process.argv.slice(2)
const taskNo = Number(taskNoRaw)
let text = fs.readFileSync(path, "utf8")

text = text.replace(/<!-- ralph-task-index\n([\s\S]*?)\n-->/, (full, jsonBlock) => {
  const index = JSON.parse(jsonBlock)
  const task = index.tasks.find((entry) => entry.number === taskNo && entry.id === taskId)
  if (!task) {
    throw new Error(`task ${taskNo}/${taskId} missing from ralph-task-index`)
  }
  task.status = newStatus
  return `<!-- ralph-task-index\n${JSON.stringify(index, null, 2)}\n-->`
})

const heading = new RegExp(`(### Task ${taskNo}[^\\n]*\\n\\nStatus: \\\`)([^\\\`]+)(\\\`)`)
if (!heading.test(text)) {
  throw new Error(`task heading/status missing for task ${taskNo}`)
}
text = text.replace(heading, `$1${newStatus}$3`)

const lines = text.split("\n")
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  if (!line.startsWith("|")) continue
  const cells = line.split("|")
  if (cells.length < 5) continue
  const order = cells[1]?.trim()
  const titleCell = cells[2]?.trim()
  if (order === String(taskNo) && titleCell.startsWith(`${taskId} -`)) {
    cells[3] = ` ${newStatus} `
    lines[i] = cells.join("|")
    break
  }
}
text = lines.join("\n")

fs.writeFileSync(path, text)
NODE
}

auto_unblock_blocked_tasks() {
  local target_file="$1"

  local promoted_tasks
  promoted_tasks="$(node - "$target_file" <<'NODE'
const fs = require("fs")

const path = process.argv[2]
const text = fs.readFileSync(path, "utf8")

const canonicalDep = (value) => {
  return value
    .trim()
    .replace(/\s+/g, " ")
}

const indexMatch = text.match(/<!-- ralph-task-index\n([\s\S]*?)\n-->/)
if (!indexMatch) {
  throw new Error(`missing ralph-task-index block in ${path}`)
}

const index = JSON.parse(indexMatch[1])
if (index.schema !== "ralph-plan.v1" || !Array.isArray(index.tasks)) {
  throw new Error(`invalid ralph-task-index schema in ${path}`)
}

const statusById = new Map()
for (const task of index.tasks) {
  if (typeof task?.id !== "string" || typeof task?.number !== "number") {
    continue
  }
  task.id = task.id.trim()
  statusById.set(task.id, String(task.status ?? "").trim())
}

const dependsByNumber = new Map()
const rowIndexByNumber = new Map()

const lines = text.split("\n")
let inDagSection = false

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  const trimmed = line.trim()

  if (trimmed.startsWith("## DAG / Queue Order")) {
    inDagSection = true
    continue
  }

  if (inDagSection && trimmed.startsWith("## Task Details")) {
    inDagSection = false
    continue
  }

  if (!inDagSection) {
    continue
  }

  if (!line.startsWith("|")) {
    continue
  }

  const cells = line.split("|")
  if (cells.length < 6) {
    continue
  }

  const number = Number(cells[1]?.trim())
  if (!Number.isInteger(number)) {
    continue
  }

  const titleCell = String(cells[2] ?? "").trim()
  const statusCell = String(cells[3] ?? "").trim()
  const dependsCell = String(cells[4] ?? "").trim()
  const taskId = titleCell.split(" - ")[0]?.trim()

  if (!taskId) {
    continue
  }

  const depends = canonicalDep(dependsCell)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((dep) => {
      const normalized = dep.toLowerCase()
      return normalized !== "none" && normalized !== "completed baseline"
    })

  if (statusCell && statusById.get(taskId) === "blocked" && depends.length > 0) {
    dependsByNumber.set(number, depends)
    rowIndexByNumber.set(number, i)
  }
}

const promoted = []

for (const [number, deps] of dependsByNumber.entries()) {
  const task = index.tasks.find((entry) => entry.number === number)
  if (!task) {
    continue
  }

  const allSatisfied = deps.every((dep) => statusById.get(dep) === "done")
  if (!allSatisfied) {
    continue
  }

  if (task.status === "blocked") {
    task.status = "ready-for-research"
    statusById.set(task.id, "ready-for-research")
    promoted.push(task)
  }
}

if (promoted.length === 0) {
  process.exit(0)
}

for (const task of promoted) {
  const rowIndex = rowIndexByNumber.get(task.number)
  if (typeof rowIndex !== "number") {
    throw new Error(`missing DAG row index for #${task.number}`)
  }

  const rowCells = lines[rowIndex].split("|")
  rowCells[3] = ` ${task.status} `
  lines[rowIndex] = rowCells.join("|")
}

let updatedText = lines.join("\n")
for (const task of promoted) {
  const headingPattern = new RegExp("(^### Task " + task.number + "[^\\n]*\\n\\nStatus: `)([^`]+)(`)", "m")
  const headingReplacement = `$1${task.status}$3`

  const replaced = updatedText.replace(headingPattern, headingReplacement)
  if (replaced === updatedText) {
    throw new Error(`missing task heading for #${task.number}`)
  }
  updatedText = replaced
}

updatedText = updatedText.replace(/<!-- ralph-task-index\n[\s\S]*?\n-->/, `<!-- ralph-task-index\n${JSON.stringify(index, null, 2)}\n-->`)

fs.writeFileSync(path, updatedText)
for (const task of promoted) {
  const safe = `${task.number}|${task.id}`
  console.log(safe)
}
NODE
  )"

  if [[ -n "$promoted_tasks" ]]; then
    note "plan" "auto-unblocked-from-dependencies tasks=$(echo "$promoted_tasks" | tr '\n' ',')"
  fi
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
    kill_process_tree "$pid"
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
- Ralph task worktrees replace the shared fuzz / overnight verification scripts with hard-fail stubs. Those tracked script diffs are harness noise, not task-owned product changes. Do not treat those stubbed script files as part of your implementation.
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
Ralph task worktrees replace the shared fuzz / overnight verification scripts with hard-fail stubs before implementers start. Treat diffs to \`scripts/mbt-fuzz*.sh\`, \`scripts/fuzz-*.sh\`, \`scripts/escalate-fuzz.sh\`, and \`scripts/measure-tier-timing.sh\` as harness-injected noise unless the implementation made additional edits beyond the standard stub content.

Your final answer is the review report. The harness saves it to the output path above. Write markdown with these sections:
- Verdict: accept | accept-with-fixes | reject
- Findings
- Missing verification
- Merge notes
- Plan Impact
EOF
}

write_candidate_prompt() {
  local role="$1"
  local output_file="$2"
  local workspace="$3"
  local task_no="$4"
  local task_file="$5"
  local task_base_ref="$6"
  local task_base_sha="$7"
  local feedback_file="${8:-}"
  local round_label="${9:-1}"
  local runner="${10:-codex}"

  write_prompt "$role" "$output_file" "$workspace" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha"
  if [[ "$runner" == "opencode" ]]; then
    cat >>"$output_file" <<EOF

OpenCode local-model guardrails:
- The task body below is the primary scope. Use the full plan only for dependency/context checks.
- Do not switch to another plan task, support-profile cleanup, phase-manifest cleanup, or broad architecture work unless the task body below explicitly requires it.
- If a planning/todo tool rejects your schema, stop using that tool and continue with shell reads/edits.
- Do not spawn Explore Agents, subagents, background agents, or delegated agents. Do the repository reads and edits directly in this process.
- Start by making the smallest task-relevant product diff, then iterate with verification. Do not spend the whole run planning.
- If the task is too large to complete, leave a focused partial diff only when it is correct and useful; otherwise report Plan Impact: update-required with concrete narrowing guidance.

Task $task_no body:

$(cat "$task_file")
EOF
  fi
  if [[ -n "$feedback_file" && -f "$feedback_file" ]]; then
    cat >>"$output_file" <<EOF

Revision round: $round_label

You are rerunning the same task in the same Ralph attempt after reviewer feedback.
Address the findings below before you finish. Keep the work scoped to Task $task_no and update the existing worktree rather than starting a fresh design.

Reviewer feedback file: $feedback_file

EOF
    cat "$feedback_file" >>"$output_file"
  fi
}

parse_review_verdict() {
  local report="$1"
  node - "$report" <<'NODE'
const fs = require("fs")
const text = fs.readFileSync(process.argv[2], "utf8")
const sameLine = text.match(/^##?\s*Verdict:\s*(.+)$/im)
const nextLine = text.match(/^##?\s*Verdict\s*$\n+^\s*([A-Za-z-]+)\s*$/im)
const raw = sameLine?.[1] ?? nextLine?.[1]
if (!raw) {
  throw new Error("review report missing Verdict section")
}
const verdict = raw.trim().replace(/`/g, "").toLowerCase()
if (!["accept", "accept-with-fixes", "reject"].includes(verdict)) {
  throw new Error(`invalid review verdict: ${verdict}`)
}
process.stdout.write(verdict)
NODE
}

write_decider_prompt() {
  local output_file="$1"
  local task_no="$2"
  local task_file="$3"
  local task_base_sha="$4"
  local claude_worktree="$5"
  local codex_worktree="$6"
  local attempt_root="$7"
  local mode_label="${8:-dual}"
  local attempt_no="${9:-1}"
  local final_attempt="${10:-false}"

  cat >"$output_file" <<EOF
You are the master merge/decider agent for Task $task_no in a Ralph-style dual implementation run.

Main worktree: $repo_root
Base ref: $base_ref
Base SHA: $task_base_sha
Output branch: $output_branch
Plan file: $plan_snapshot
Current task file: $task_file
Run mode: $mode_label
Claude worktree: $claude_worktree
Codex worktree: $codex_worktree
Claude implementer exit: $attempt_root/claude-implementer.exit
Codex implementer exit: $attempt_root/codex-implementer.exit
Codex implementer runner: $implementation_runner
Claude review: $attempt_root/claude-review.md
Codex review: $attempt_root/codex-review.md
Claude review exit: $attempt_root/claude-review.exit
Codex review exit: $attempt_root/codex-review.exit
Verification command: $test_command
Attempt number for this task in this Ralph run: $attempt_no
Final allowed attempt in this Ralph run: $final_attempt

Read AGENTS.md/CLAUDE.md first and follow the repo instructions. The implementation worktree inputs are not final output. Inspect the available Task $task_no diff(s) and review report(s). In a single-candidate mode ('codex-only' or 'claude-only'), the other candidate's paths are placeholders and you should evaluate the live candidate directly against the task brief. Apply the best final implementation for Task $task_no to the main worktree, combining useful parts when appropriate and rejecting broken or off-plan changes. Do not implement later tasks.

Requirements:
- Keep the main worktree on $output_branch; do not merge branches blindly.
- Preserve repo constraints: pnpm only, no redundant state, Quint parity, SRD traceability for modeled rules, scarce MBT usage.
- Before any MBT run, check for existing vitest and quint_evaluator processes per AGENTS.md. Kill stale quint_evaluator processes, and do not launch a second MBT while another vitest/MBT run is alive.
- Never run ./scripts/mbt-fuzz.sh, ./scripts/fuzz-all.sh, ./scripts/fuzz-overnight.sh, or any MBT command with MBT_DEV=1 or MBT_SAVE_TRACES=1 in a Ralph task run. If verification needs MBT, stay on Tier 1 / Tier 1b unless the task explicitly requires a higher tier.
- Ralph task worktrees replace the shared fuzz / overnight verification scripts with hard-fail stubs before implementers start. Treat those script diffs as harness noise, not task-owned changes, unless a candidate went beyond the standard stub content.
- Run appropriate verification after applying the final result, using "$test_command" unless a narrower repo-approved command is justified.
- If broader verification surfaces a confirmed unrelated baseline failure outside the touched ownership surface, stop broad verification at that point and record the baseline noise instead of continuing repo-wide cleanup.
- Inspect both implementations and both reviews for Plan Impact. Update the source plan file at $plan_file only when you learned a genuinely new durable planning fact. Do not add attempt-numbered notes or parser-error reminders to the plan. Keep attempt-specific rejection detail in the decider final and review artifacts instead. If no durable plan update is needed, say so explicitly in the final Plan Impact section.
- Preserve task surface as executable tasks, not only status prose. If you accept a task by narrowing or splitting its original scope, any excluded still-desired work must be added or revised as concrete follow-up tasks in $plan_file before you commit. A note that work "remains support-gated", "is deferred", or "belongs to a later family" is not sufficient unless the corresponding Ralph Task Index, DAG table, and task-detail entries already keep that work visible and dependency-ordered.
- Before editing $plan_file, answer a New Information Gate in the decider final:
  - What new fact was learned?
  - Why was it not already implied by the current plan text?
  - Why is it durable enough to remain correct after run-local artifacts are deleted?
- If the task stays runnable (
  - retry-same-task
  - needs-more-research
  ), add or update a concise `Retry Guidance:` section in the current task body in $plan_file. Keep it attempt-agnostic, actionable, and focused on what the next implementer round should change.
- If the task is rejected, put it back into the appropriate runnable to-do status. Only edit the plan when the New Information Gate is satisfied, except for required attempt-agnostic `Retry Guidance:` updates on runnable reruns.
- Every decider result must classify the task disposition as exactly one of:
  - done
  - retry-same-task
  - needs-more-research
  - blocked-needs-design
  - deferred
- Use retry-same-task only when the task is still implementation-ready right now and the next attempt has a concrete implementable delta.
- Use needs-more-research when Ralph can make progress without the user but the task still needs narrowing, decomposition, or research before implementation.
- Use blocked-needs-design only when the next step genuinely requires either:
  - an unfinished task dependency, or
  - an explicit owner/user design decision that Ralph cannot answer itself.
- Do not use blocked-needs-design for internal bucket-splitting, scoping refinement, family narrowing, or repo research that Ralph can perform on its own. Those cases must stay needs-more-research.
- Use deferred only when the owner/user has explicitly directed Ralph to park the task for now. Do not use deferred for queue ordering, later-batch parking, or "we should do this later" scheduling.
- If Final allowed attempt in this Ralph run is true, you must not use 'retry-same-task' or 'needs-more-research'. On the final allowed attempt, either land the task as 'done' or update the plan so the task becomes non-runnable ('blocked' or 'deferred') before you finish.
- Commit the reconciled Task $task_no result to $output_branch in the main worktree after verification. Use a concise task-scoped commit message. Do not leave tracked changes staged or unstaged; the next task worktrees are created from the updated integration HEAD.
- For docs-only tasks, prefer the task-specific grep/search checks and git diff --check over broad formatters that churn unrelated Markdown. Do not run broad formatters unless the task explicitly requires formatting.
- Leave temporary worktree cleanup to the harness.
- Do not write to the memory system.

At the end, report:
- Which implementation(s) you used
- Files changed in the main worktree
- Verification commands run and results
- Any remaining risks
- Task Disposition:
  - Status: done | retry-same-task | needs-more-research | blocked-needs-design | deferred
  - Why this disposition is correct now
- If Status is blocked-needs-design, also include:
  - Blocker Type: dependency | owner-decision
  - Blocker Detail: the blocking task ID(s) or the exact owner question
- If Status is deferred, also include:
  - Deferred Detail: the explicit owner/user instruction that parks the task
- New Information Gate:
  - What new fact was learned?
  - Why it was not already implied by the plan
  - Why it is durable enough for $plan_file, or "not applicable"
- Plan Impact:
  - Status: none | applied
  - Affected tasks: task IDs and final planning action for each
  - Plan edits: summary of updates made to $plan_file, or "none"
EOF
}

run_candidate_pipeline() {
  local candidate_name="$1"
  local runner="$2"
  local workspace="$3"
  local attempt_root="$4"
  local task_no="$5"
  local task_file="$6"
  local task_base_ref="$7"
  local task_base_sha="$8"

  local slug="${candidate_name,,}"
  local round=1
  local previous_review=""
  local verdict="reject"
  local implementer_role="$candidate_name implementer"
  local round_limit="$candidate_round_limit"
  if [[ "$runner" == "opencode" ]]; then
    implementer_role="$candidate_name implementer (running on OpenCode)"
    if is_opencode_ollama_model; then
      round_limit=5
    fi
  fi

  while (( round <= round_limit )); do
    local round_prefix="$attempt_root/$slug-round-$round"
    local implementer_prompt="$round_prefix-implementer.prompt.md"
    local implementer_log="$round_prefix-implementer.log"
    local implementer_exit="$round_prefix-implementer.exit"
    local implementer_final="$round_prefix-implementer.final.md"
    local review_prompt="$round_prefix-review.prompt.md"
    local review_log="$round_prefix-review.log"
    local review_report="$round_prefix-review.md"
    local review_exit="$round_prefix-review.exit"
    local diff_file="$round_prefix.diff"
    local after_review_diff="$round_prefix.after-review.diff"

    note "task" "candidate-start task=$task_no candidate=$slug round=$round"
    write_candidate_prompt "$implementer_role" "$implementer_prompt" "$workspace" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha" "$previous_review" "$round" "$runner"

    local implementer_status=0
    if [[ "$runner" == "claude" ]]; then
      run_claude "$workspace" "$implementer_prompt" "$implementer_log" || implementer_status=$?
    elif [[ "$runner" == "opencode" ]]; then
      run_opencode "$workspace" "$implementer_prompt" "$implementer_log" "$implementer_final" || implementer_status=$?
    else
      run_codex "$workspace" "$implementer_prompt" "$implementer_log" "$implementer_final" || implementer_status=$?
    fi
    printf '%s\n' "$implementer_status" >"$implementer_exit"
    save_diff "$workspace" "$diff_file" "$task_base_sha"
    note "task" "candidate-implemented task=$task_no candidate=$slug round=$round status=$implementer_status"

    write_review_prompt "$candidate_name" "$workspace" "$review_report" "$review_prompt" "$task_no" "$task_file" "$task_base_sha"
    local review_status=0
    run_codex "$workspace" "$review_prompt" "$review_log" "$review_report" || review_status=$?
    printf '%s\n' "$review_status" >"$review_exit"
    save_diff "$workspace" "$after_review_diff" "$task_base_sha"
    verdict="$(parse_review_verdict "$review_report")"
    note "task" "candidate-reviewed task=$task_no candidate=$slug round=$round verdict=$verdict status=$review_status"

    if [[ "$verdict" == "accept" ]]; then
      break
    fi
    if (( round >= round_limit )); then
      break
    fi

    previous_review="$review_report"
    note "task" "candidate-handoff task=$task_no candidate=$slug round=$round next_round=$((round + 1)) verdict=$verdict"
    ((round++))
  done

  cp -f "$attempt_root/$slug-round-$round-implementer.prompt.md" "$attempt_root/$slug-implementer.prompt.md"
  cp -f "$attempt_root/$slug-round-$round-implementer.log" "$attempt_root/$slug-implementer.log"
  cp -f "$attempt_root/$slug-round-$round-implementer.exit" "$attempt_root/$slug-implementer.exit"
  cp -f "$attempt_root/$slug-round-$round.diff" "$attempt_root/$slug.diff"
  cp -f "$attempt_root/$slug-round-$round-review.prompt.md" "$attempt_root/$slug-review.prompt.md"
  cp -f "$attempt_root/$slug-round-$round-review.log" "$attempt_root/$slug-review.log"
  cp -f "$attempt_root/$slug-round-$round-review.md" "$attempt_root/$slug-review.md"
  cp -f "$attempt_root/$slug-round-$round-review.exit" "$attempt_root/$slug-review.exit"
  cp -f "$attempt_root/$slug-round-$round.after-review.diff" "$attempt_root/$slug.after-review.diff"
  if [[ "$runner" != "claude" && -f "$attempt_root/$slug-round-$round-implementer.final.md" ]]; then
    cp -f "$attempt_root/$slug-round-$round-implementer.final.md" "$attempt_root/$slug-implementer.final.md"
  fi
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
- Current plan status is authoritative. If a task is present in the ready-task candidate list, it is runnable now even if an earlier attempt on the same task number already completed.
- If the same task number appears in history and is still runnable now, treat that as an intentional research->implementation or revised-task rerun, not as a reason to stop.
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
  local status=0
  local -a args=(exec --ephemeral --dangerously-bypass-approvals-and-sandbox -C "$workspace" -o "$output_file")

  if [[ -n "$codex_model" ]]; then
    args+=("--model" "$codex_model")
  fi

  log "codex: $(quote_cmd codex "${args[@]}" -)"
  set +e
  if [[ "${RALPH_STREAM_LOGS:-0}" == "1" ]]; then
    codex "${args[@]}" - <"$prompt" 2>&1 | tee "$log_file" >&2
    status=${PIPESTATUS[0]}
  else
    codex "${args[@]}" - <"$prompt" >"$log_file" 2>&1
    status=$?
  fi
  set -e

  if [[ "$status" -ne 0 ]]; then
    log "codex exited $status; full log: $log_file"
  else
    log "codex completed; final: $output_file log: $log_file"
  fi
  return "$status"
}

run_opencode() {
  local workspace="$1"
  local prompt="$2"
  local log_file="$3"
  local output_file="$4"
  local status=0
  local message
  local -a args=(run --dir "$workspace" --model "$opencode_model" --dangerously-skip-permissions)

  message="$(<"$prompt")"

  log "opencode: $(quote_cmd opencode "${args[@]}") < $prompt"
  set +e
  if [[ "${RALPH_STREAM_LOGS:-0}" == "1" ]]; then
    opencode "${args[@]}" "$message" 2>&1 | tee "$log_file" "$output_file" >&2
    status=${PIPESTATUS[0]}
  else
    opencode "${args[@]}" "$message" >"$output_file" 2>"$log_file"
    status=$?
  fi
  set -e

  if [[ "$status" -ne 0 ]]; then
    log "opencode exited $status; full log: $log_file"
  else
    log "opencode completed; final: $output_file log: $log_file"
  fi
  return "$status"
}

run_claude() {
  local workspace="$1"
  local prompt="$2"
  local log_file="$3"
  local status=0
  local session_pid=""
  local session_pgid=""
  local -a args=(--dangerously-skip-permissions --print --verbose --output-format stream-json --effort max)

  if [[ -n "${RALPH_CLAUDE_MODEL:-}" ]]; then
    args+=("--model" "$RALPH_CLAUDE_MODEL")
  fi

  log "claude: $(quote_cmd claude "${args[@]}") < $prompt"
  (
    cd "$workspace"
    exec setsid claude "${args[@]}" <"$prompt" >"$log_file" 2>&1
  ) &
  session_pid=$!
  session_pgid="$(ps -o pgid= -p "$session_pid" | tr -d '[:space:]')"
  set +e
  wait "$session_pid"
  status=$?
  set -e
  kill_process_group "${session_pgid:-$session_pid}"
  return "$status"
}

save_diff() {
  local workspace="$1"
  local output_file="$2"
  local diff_base_sha="$3"
  git -C "$workspace" diff --binary "$diff_base_sha" >"$output_file"
}

bootstrap_worktree_install() {
  local workspace="$1"
  local install_source_root=""
  local path

  install_source_root="$(find_worktree_install_source)"
  [[ -n "$install_source_root" ]] || die "could not find a worktree with node_modules to bootstrap $workspace"

  for path in \
    "node_modules" \
    "packages/core/node_modules" \
    "packages/mcp/node_modules"; do
    if [[ -e "$workspace/$path" || -L "$workspace/$path" ]]; then
      rm -rf "$workspace/$path"
    fi
    mkdir -p "$(dirname "$workspace/$path")"
    ln -s "$install_source_root/$path" "$workspace/$path"
  done
}

worktree_has_install() {
  local root="$1"
  [[ -d "$root/node_modules" ]] &&
    [[ -d "$root/packages/core/node_modules" ]] &&
    [[ -d "$root/packages/mcp/node_modules" ]]
}

find_worktree_install_source() {
  local path=""

  if worktree_has_install "$repo_root"; then
    printf '%s\n' "$repo_root"
    return 0
  fi

  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    if worktree_has_install "$path"; then
      printf '%s\n' "$path"
      return 0
    fi
  done < <(git worktree list --porcelain | awk '/^worktree / {print substr($0, 10)}')

  return 1
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

recover_dirty_main_worktree_after_decider() {
  if [[ "$commit_to_base" == true ]]; then
    return 1
  fi

  git reset --hard HEAD >/dev/null 2>&1 || return 1
  assert_clean_main_worktree
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

parse_decider_disposition() {
  local report="$1"
  node - "$report" <<'NODE'
const fs = require("fs")
const text = fs.readFileSync(process.argv[2], "utf8")
const clean = (s) => s.replace(/[`*_]/g, "").trim().toLowerCase()
const allowed = new Set(["done", "retry-same-task", "needs-more-research", "blocked-needs-design", "deferred"])

const lines = text.split(/\r?\n/)
let inDispositionSection = false
let raw = ""

for (const line of lines) {
  const normalized = clean(line)
  if (!inDispositionSection && /^#{0,6}\s*task disposition:?$/.test(normalized)) {
    inDispositionSection = true
    continue
  }
  if (!inDispositionSection && /^task disposition:\s*(.+)$/.test(normalized)) {
    raw = normalized.replace(/^task disposition:\s*/, "")
    break
  }
  if (inDispositionSection) {
    if (/^#{1,6}\s+/.test(line) || /^\*\*[^*]+\*\*$/.test(line.trim())) {
      break
    }
    const statusMatch = normalized.match(/^[-*]?\s*status:\s*(.+)$/)
    if (statusMatch) {
      raw = statusMatch[1]
      break
    }
  }
}

if (!raw) {
  const globalStatus = clean(text).match(/status:\s*(done|retry-same-task|needs-more-research|blocked-needs-design|deferred)/)
  raw = globalStatus?.[1] ?? ""
}

raw = clean(raw)
if (!allowed.has(raw)) {
  throw new Error("missing Task Disposition status")
}
process.stdout.write(raw)
NODE
}

parse_decider_blocker_type() {
  local report="$1"
  node - "$report" <<'NODE'
const fs = require("fs")
const text = fs.readFileSync(process.argv[2], "utf8")
const clean = (s) => s.replace(/[`*_]/g, "").trim().toLowerCase()
const lines = text.split(/\r?\n/)
let inBlockerSection = false
let raw = ""

for (const line of lines) {
  const normalized = clean(line)
  if (!inBlockerSection && /^#{0,6}\s*blocker type:?$/.test(normalized)) {
    inBlockerSection = true
    continue
  }
  if (!inBlockerSection && /^blocker type:\s*(.+)$/.test(normalized)) {
    raw = normalized.replace(/^blocker type:\s*/, "")
    break
  }
  if (inBlockerSection) {
    if (/^#{1,6}\s+/.test(line) || /^\*\*[^*]+\*\*$/.test(line.trim())) {
      break
    }
    const statusMatch = normalized.match(/^[-*]?\s*status:\s*(.+)$/)
    if (statusMatch) {
      raw = statusMatch[1]
      break
    }
  }
}

raw = clean(raw)
if (raw === "dependency" || raw === "owner-decision") {
  process.stdout.write(raw)
}
NODE
}

parse_decider_deferred_detail() {
  local report_file="$1"
  node - "$report_file" <<'NODE'
const fs = require("fs")
const reportPath = process.argv[2]
const text = fs.readFileSync(reportPath, "utf8")
function clean(s) {
  return s.replace(/\r/g, "").replace(/[`*_]/g, "")
}
const normalized = clean(text)
const sameLine = normalized.match(/deferred detail:\s*(.+)/i)
if (sameLine && sameLine[1].trim()) {
  console.log(sameLine[1].trim())
  process.exit(0)
}
const lines = normalized.split("\n")
for (let i = 0; i < lines.length; i++) {
  if (/^\s*deferred detail\s*:?\s*$/i.test(lines[i])) {
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim().replace(/^[-:]\s*/, "")
      if (!candidate) continue
      console.log(candidate)
      process.exit(0)
    }
  }
}
process.exit(1)
NODE
}

disposition_from_task_status() {
  local status="$1"
  case "$status" in
    done)
      printf 'done\n'
      ;;
    blocked)
      printf 'blocked-needs-design\n'
      ;;
    deferred)
      printf 'deferred\n'
      ;;
    ready-for-research)
      printf 'needs-more-research\n'
      ;;
    ready-for-implementation-after-light-research)
      printf 'retry-same-task\n'
      ;;
    *)
      return 1
      ;;
  esac
}

choose_next_task() {
  local iteration="$1"
  local chooser_root="$iterations_root/iteration-$iteration"
  local ready_tasks_file="$chooser_root/ready-tasks.tsv"
  local chooser_prompt="$chooser_root/chooser.prompt.md"
  local chooser_output="$chooser_root/chooser.final.md"
  local chooser_log="$chooser_root/chooser.log"
  local ready_count
  mkdir -p "$chooser_root"

  refresh_plan_snapshot
  auto_unblock_blocked_tasks "$plan_file"
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
  ready_count="$(wc -l <"$ready_tasks_file" | tr -d '[:space:]')"
  if [[ "$ready_count" == "1" ]]; then
    local only_task
    only_task="$(cat "$ready_tasks_file")"
    note "chooser" "single-runnable-task task=$only_task"
    printf '%s\n' "$only_task"
    return 0
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
    printf 'chooser returned stop even though %s runnable task(s) exist\n' "$ready_count" >"$last_error_file"
    return 2
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
  local final_attempt="${9:-false}"

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

  if [[ "$codex_only" == true ]]; then
    task_branches+=("$codex_branch")
    active_worktrees+=("$codex_worktree")
  elif [[ "$claude_only" == true ]]; then
    task_branches+=("$claude_branch")
    active_worktrees+=("$claude_worktree")
  else
    task_branches+=("$claude_branch" "$codex_branch")
    active_worktrees+=("$claude_worktree" "$codex_worktree")
  fi

  log "task $task_no attempt $attempt_no: $task_title"
  note "task" "start iteration=$iteration task=$task_no id=$task_id attempt=$attempt_no status=$status base=$task_base_sha"

  kill_stray_mbt_processes
  cleanup_mbt_artifacts

  if [[ "$codex_only" != true ]]; then
    git worktree add -B "$claude_branch" "$claude_worktree" "$task_base_sha"
  fi
  if [[ "$claude_only" != true ]]; then
    git worktree add -B "$codex_branch" "$codex_worktree" "$task_base_sha"
  fi
  if [[ "$codex_only" != true ]]; then
    bootstrap_worktree_install "$claude_worktree"
  fi
  if [[ "$claude_only" != true ]]; then
    bootstrap_worktree_install "$codex_worktree"
  fi
  if [[ "$codex_only" != true ]]; then
    disable_fuzz_scripts_in_worktree "$claude_worktree"
  fi
  if [[ "$claude_only" != true ]]; then
    disable_fuzz_scripts_in_worktree "$codex_worktree"
  fi

  if [[ "$codex_only" != true && "$claude_only" != true ]]; then
    : >"$attempt_root/claude-implementer.log"
    : >"$attempt_root/claude-implementer.exit"
    : >"$attempt_root/claude.diff"
    : >"$attempt_root/claude-review.log"
    : >"$attempt_root/claude-review.md"
    : >"$attempt_root/claude-review.exit"
    : >"$attempt_root/claude.after-review.diff"
    : >"$attempt_root/codex-implementer.log"
    : >"$attempt_root/codex-implementer.exit"
    : >"$attempt_root/codex.diff"
    : >"$attempt_root/codex-review.log"
    : >"$attempt_root/codex-review.md"
    : >"$attempt_root/codex-review.exit"
    : >"$attempt_root/codex.after-review.diff"
  elif [[ "$codex_only" == true ]]; then
    printf 'codex-only\n' >"$attempt_root/claude-implementer.exit"
    : >"$attempt_root/claude-implementer.log"
    : >"$attempt_root/claude.diff"
    : >"$attempt_root/claude-review.log"
    : >"$attempt_root/claude-review.md"
    printf 'codex-only\n' >"$attempt_root/claude-review.exit"
    : >"$attempt_root/claude.after-review.diff"
  else
    printf 'claude-only\n' >"$attempt_root/codex-implementer.exit"
    : >"$attempt_root/codex-implementer.log"
    : >"$attempt_root/codex.diff"
    : >"$attempt_root/codex-review.log"
    : >"$attempt_root/codex-review.md"
    printf 'claude-only\n' >"$attempt_root/codex-review.exit"
    : >"$attempt_root/codex.after-review.diff"
  fi

  local claude_pid=""
  if [[ "$codex_only" != true ]]; then
    run_candidate_pipeline "Claude" "claude" "$claude_worktree" "$attempt_root" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha" &
    claude_pid=$!
    child_pids+=("$claude_pid")
  fi
  local codex_pid=""
  if [[ "$claude_only" != true ]]; then
    run_candidate_pipeline "Codex" "$implementation_runner" "$codex_worktree" "$attempt_root" "$task_no" "$task_file" "$task_base_ref" "$task_base_sha" &
    codex_pid=$!
    child_pids+=("$codex_pid")
  fi

  local claude_status=0
  local codex_status=0
  if [[ "$codex_only" != true ]]; then
    wait "$claude_pid" || claude_status=$?
  fi
  if [[ "$claude_only" != true ]]; then
    wait "$codex_pid" || codex_status=$?
  fi
  child_pids=()

  if [[ "$codex_only" != true && "$claude_status" -ne 0 ]]; then
    printf 'candidate pipeline failed for task %s attempt %s: claude\n' "$task_no" "$attempt_no" >"$last_error_file"
    note "task" "fatal-candidate-pipeline task=$task_no attempt=$attempt_no candidate=claude"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-candidate-pipeline" "-" "claude pipeline failed"
    return 2
  fi
  if [[ "$claude_only" != true && "$codex_status" -ne 0 ]]; then
    printf 'candidate pipeline failed for task %s attempt %s: codex\n' "$task_no" "$attempt_no" >"$last_error_file"
    note "task" "fatal-candidate-pipeline task=$task_no attempt=$attempt_no candidate=codex"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-candidate-pipeline" "-" "codex pipeline failed"
    return 2
  fi

  if [[ "$skip_decider" == true ]]; then
    note "task" "skip-decider task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "skipped" "-" "skip-decider"
    return 0
  fi

  local mode_label="dual"
  if [[ "$codex_only" == true ]]; then
    mode_label="codex-only"
  elif [[ "$claude_only" == true ]]; then
    mode_label="claude-only"
  fi
  write_decider_prompt "$attempt_root/decider.prompt.md" "$task_no" "$task_file" "$task_base_sha" "$claude_worktree" "$codex_worktree" "$attempt_root" "$mode_label" "$attempt_no" "$final_attempt"
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

  local decider_disposition=""
  if ! decider_disposition="$(parse_decider_disposition "$attempt_root/decider.final.md")"; then
    decider_disposition=""
    note "task" "warning-missing-task-disposition task=$task_no attempt=$attempt_no"
  fi
  local decider_blocker_type=""
  if [[ "$decider_disposition" == "blocked-needs-design" ]]; then
    decider_blocker_type="$(parse_decider_blocker_type "$attempt_root/decider.final.md" || true)"
  fi
  local decider_deferred_detail=""
  if [[ "$decider_disposition" == "deferred" ]]; then
    decider_deferred_detail="$(parse_decider_deferred_detail "$attempt_root/decider.final.md" || true)"
  fi

  if ! assert_clean_main_worktree; then
    if recover_dirty_main_worktree_after_decider; then
      note "task" "warning-recovered-dirty-main-worktree task=$task_no attempt=$attempt_no"
    else
      printf 'task %s attempt %s left main worktree dirty\n' "$task_no" "$attempt_no" >"$last_error_file"
      note "task" "fatal-dirty-main-worktree task=$task_no attempt=$attempt_no"
      append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-dirty-main-worktree" "-" "decider left tracked changes"
      return 2
    fi
  fi

  if contains_attempt_specific_plan_notes "$plan_file"; then
    printf 'task %s attempt %s introduced attempt-specific notes into %s\n' "$task_no" "$attempt_no" "$plan_file" >"$last_error_file"
    note "task" "fatal-attempt-specific-plan-notes task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-attempt-specific-plan-notes" "-" "decider wrote attempt-specific plan notes"
    return 2
  fi

  refresh_plan_snapshot
  local refreshed_task_row=""
  refreshed_task_row="$(lookup_task_row "$task_no" || true)"
  if [[ -z "$refreshed_task_row" ]]; then
    printf 'task %s disappeared from refreshed plan after decider\n' "$task_no" >"$last_error_file"
    note "task" "fatal-missing-task-after-decider task=$task_no attempt=$attempt_no"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-task-after-decider" "-" "task missing from refreshed plan"
    return 2
  fi
  local refreshed_task_status=""
  IFS=$'\t' read -r _ref_task_no _ref_task_id refreshed_task_status _ref_task_start _ref_task_end _ref_task_title <<<"$refreshed_task_row"
  local authoritative_disposition=""
  if ! authoritative_disposition="$(disposition_from_task_status "$refreshed_task_status")"; then
    printf 'task %s attempt %s ended with unknown refreshed plan status %s\n' "$task_no" "$attempt_no" "$refreshed_task_status" >"$last_error_file"
    note "task" "fatal-unknown-task-status task=$task_no attempt=$attempt_no status=$refreshed_task_status"
    append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-unknown-task-status" "-" "unknown refreshed plan status after decider"
    return 2
  fi

  if [[ "$decider_disposition" == "done" && "$authoritative_disposition" != "done" ]]; then
    if set_task_status_in_plan "$task_no" "$task_id" "done" "$plan_file"; then
      note "task" "warning-autorepaired-task-done-status task=$task_no attempt=$attempt_no previous_status=$refreshed_task_status"
      refresh_plan_snapshot
      refreshed_task_row="$(lookup_task_row "$task_no" || true)"
      if [[ -z "$refreshed_task_row" ]]; then
        printf 'task %s disappeared from refreshed plan after done-status autorepair\n' "$task_no" >"$last_error_file"
        note "task" "fatal-missing-task-after-autorepair task=$task_no attempt=$attempt_no"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-task-after-autorepair" "-" "task missing after done autorepair"
        return 2
      fi
      IFS=$'\t' read -r _ref_task_no _ref_task_id refreshed_task_status _ref_task_start _ref_task_end _ref_task_title <<<"$refreshed_task_row"
      if ! authoritative_disposition="$(disposition_from_task_status "$refreshed_task_status")"; then
        printf 'task %s attempt %s ended with unknown refreshed plan status %s after autorepair\n' "$task_no" "$attempt_no" "$refreshed_task_status" >"$last_error_file"
        note "task" "fatal-unknown-task-status task=$task_no attempt=$attempt_no status=$refreshed_task_status"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-unknown-task-status" "-" "unknown refreshed plan status after done autorepair"
        return 2
      fi
    fi
  fi

  if [[ -z "$decider_disposition" ]]; then
    note "task" "inferred-task-disposition task=$task_no attempt=$attempt_no disposition=$authoritative_disposition status=$refreshed_task_status"
  elif [[ "$decider_disposition" != "$authoritative_disposition" ]]; then
    note "task" "warning-disposition-mismatch task=$task_no attempt=$attempt_no parsed=$decider_disposition authoritative=$authoritative_disposition status=$refreshed_task_status"
  fi

  decider_disposition="$authoritative_disposition"
  case "$decider_disposition" in
    done)
      ;;
    retry-same-task)
      if [[ "$final_attempt" == "true" ]]; then
        printf 'task %s attempt %s used retry-same-task on the final allowed attempt\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-final-attempt-rerun task=$task_no attempt=$attempt_no"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-final-attempt-rerun" "-" "final attempt left task runnable"
        return 2
      fi
      if ! task_body_has_retry_guidance "$plan_snapshot" "$_ref_task_start" "$_ref_task_end"; then
        printf 'task %s attempt %s left task runnable without Retry Guidance in the task body\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-missing-retry-guidance task=$task_no attempt=$attempt_no disposition=$decider_disposition"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-retry-guidance" "-" "runnable task missing retry guidance"
        return 2
      fi
      ;;
    needs-more-research)
      if [[ "$final_attempt" == "true" ]]; then
        printf 'task %s attempt %s used needs-more-research on the final allowed attempt\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-final-attempt-rerun task=$task_no attempt=$attempt_no disposition=$decider_disposition"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-final-attempt-rerun" "-" "final attempt left task research-runnable"
        return 2
      fi
      if ! task_body_has_retry_guidance "$plan_snapshot" "$_ref_task_start" "$_ref_task_end"; then
        printf 'task %s attempt %s left task runnable without Retry Guidance in the task body\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-missing-retry-guidance task=$task_no attempt=$attempt_no disposition=$decider_disposition"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-retry-guidance" "-" "runnable task missing retry guidance"
        return 2
      fi
      ;;
    blocked-needs-design)
      if [[ "$decider_blocker_type" != "dependency" && "$decider_blocker_type" != "owner-decision" ]]; then
        printf 'task %s attempt %s left the task blocked without a valid Blocker Type\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-missing-blocker-type task=$task_no attempt=$attempt_no"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-blocker-type" "-" "blocked status without dependency or owner-decision"
        return 2
      fi
      ;;
    deferred)
      if [[ -z "$decider_deferred_detail" ]]; then
        printf 'task %s attempt %s deferred the task without explicit owner-directed detail\n' "$task_no" "$attempt_no" >"$last_error_file"
        note "task" "fatal-missing-deferred-detail task=$task_no attempt=$attempt_no"
        append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-missing-deferred-detail" "-" "deferred status without owner-directed detail"
        return 2
      fi
      ;;
    *)
      printf 'task %s attempt %s had unknown disposition: %s\n' "$task_no" "$attempt_no" "$decider_disposition" >"$last_error_file"
      note "task" "fatal-unknown-disposition task=$task_no attempt=$attempt_no disposition=$decider_disposition"
      append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "fatal-unknown-disposition" "-" "unknown task disposition"
      return 2
      ;;
  esac
  kill_stray_mbt_processes
  cleanup_mbt_artifacts

  local new_head
  new_head="$(git rev-parse HEAD)"
  note "task" "complete iteration=$iteration task=$task_no attempt=$attempt_no head=$new_head"
  append_history "$iteration" "$task_no" "$task_id" "$attempt_no" "completed" "$new_head" "$task_title"

  if [[ "$keep_worktrees" == false ]]; then
    if [[ "$codex_only" != true ]]; then
      git worktree remove --force "$claude_worktree" >/dev/null 2>&1 || true
    fi
    if [[ "$claude_only" != true ]]; then
      git worktree remove --force "$codex_worktree" >/dev/null 2>&1 || true
    fi
    if [[ "$codex_only" != true ]]; then
      git branch -D "$claude_branch" >/dev/null 2>&1 || true
    fi
    if [[ "$claude_only" != true ]]; then
      git branch -D "$codex_branch" >/dev/null 2>&1 || true
    fi
    if [[ "$codex_only" != true ]]; then
      active_worktrees=("${active_worktrees[@]/$claude_worktree}")
    fi
    if [[ "$claude_only" != true ]]; then
      active_worktrees=("${active_worktrees[@]/$codex_worktree}")
    fi
    if [[ "$codex_only" != true ]]; then
      task_branches=("${task_branches[@]/$claude_branch}")
    fi
    if [[ "$claude_only" != true ]]; then
      task_branches=("${task_branches[@]/$codex_branch}")
    fi
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
  if (( ${task_attempts["$task_no"]:-0} >= max_task_attempts )); then
    printf 'task %s (%s) hit the per-run attempt limit (%s) without landing; refusing to rerun indefinitely\n' \
      "$task_no" "$task_id" "$max_task_attempts" >"$last_error_file"
    note "run" "fatal-task-attempt-limit iteration=$iteration task=$task_no id=$task_id limit=$max_task_attempts"
    append_history "$iteration" "$task_no" "$task_id" "${task_attempts["$task_no"]}" "fatal-task-attempt-limit" "-" "attempt limit reached"
    exit 1
  fi
  task_attempts["$task_no"]=$(( ${task_attempts["$task_no"]:-0} + 1 ))
  attempt_no="${task_attempts[$task_no]}"
  final_attempt=false
  if (( attempt_no >= max_task_attempts )); then
    final_attempt=true
  fi

  task_result=0
  run_task_attempt "$iteration" "$task_no" "$task_id" "$status" "$task_start" "$task_end" "$task_title" "$attempt_no" "$final_attempt" || task_result=$?
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
