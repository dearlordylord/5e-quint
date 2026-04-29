#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/.output/content-surface-closure"
RUNNER_NAME="${AUTO_RUNNER_NAME:-primary}"
INTEGRATION_BRANCH="${AUTO_INTEGRATION_BRANCH:-auto-close-loop-integration}"
INTEGRATION_WORKTREE="${AUTO_INTEGRATION_WORKTREE:-$REPO_ROOT/.worktrees/auto-close-loop-integration}"

if [[ "$RUNNER_NAME" == "primary" ]]; then
  LOG_FILE="$OUTPUT_DIR/auto-close-loop.log"
  STATE_FILE="$OUTPUT_DIR/auto-close-loop.state.json"
  LOCK_FILE="$OUTPUT_DIR/auto-close-loop.lock.json"
  PID_FILE="$OUTPUT_DIR/auto-close-loop.pid"
  STOP_FILE="$OUTPUT_DIR/auto-close-loop.stop"
  WORKTREE_DIR="${AUTO_WORKTREE_PATH:-$REPO_ROOT/.worktrees/auto-close-loop}"
  WORKTREE_BRANCH="${AUTO_WORKTREE_BRANCH:-auto-close-loop}"
else
  LOG_FILE="$OUTPUT_DIR/auto-close-loop.$RUNNER_NAME.log"
  STATE_FILE="$OUTPUT_DIR/auto-close-loop.$RUNNER_NAME.state.json"
  LOCK_FILE="$OUTPUT_DIR/auto-close-loop.$RUNNER_NAME.lock.json"
  PID_FILE="$OUTPUT_DIR/auto-close-loop.$RUNNER_NAME.pid"
  STOP_FILE="$OUTPUT_DIR/auto-close-loop.$RUNNER_NAME.stop"
  WORKTREE_DIR="${AUTO_WORKTREE_PATH:-$REPO_ROOT/.worktrees/auto-close-loop-$RUNNER_NAME}"
  WORKTREE_BRANCH="${AUTO_WORKTREE_BRANCH:-auto-close-loop-$RUNNER_NAME}"
fi

mkdir -p "$OUTPUT_DIR"

lock_pid() {
  jq -r '.pid' "$LOCK_FILE" 2>/dev/null || true
}

lock_live() {
  if [[ ! -f "$LOCK_FILE" ]]; then
    return 1
  fi
  pid="$(lock_pid)"
  [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null
}

session_pid() {
  cat "$PID_FILE" 2>/dev/null || true
}

session_pids() {
  local sid
  sid="$(session_pid)"
  if [[ -z "${sid:-}" ]]; then
    return 0
  fi
  ps -s "$sid" -o pid= 2>/dev/null | awk '{print $1}'
}

session_live() {
  [[ -n "$(session_pids)" ]]
}

clear_stale_lock() {
  if [[ -f "$LOCK_FILE" ]] && ! lock_live && ! session_live; then
    rm -f "$LOCK_FILE"
  fi
  if [[ -f "$PID_FILE" ]] && ! session_live; then
    rm -f "$PID_FILE"
  fi
  if [[ -f "$STOP_FILE" ]] && ! session_live && ! lock_live; then
    rm -f "$STOP_FILE"
  fi
}

wait_for_cleanup() {
  for _ in $(seq 1 20); do
    clear_stale_lock
    if [[ ! -f "$LOCK_FILE" && ! -f "$PID_FILE" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

status() {
  clear_stale_lock
  if [[ -f "$LOCK_FILE" ]]; then
    cat "$LOCK_FILE"
  else
    echo "not running"
  fi
}

stop() {
  clear_stale_lock
  : > "$STOP_FILE"
  sid="$(session_pid)"
  if [[ -n "${sid:-}" ]] && session_live; then
    pkill -TERM -s "$sid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      clear_stale_lock
      if ! session_live && ! lock_live; then
        rm -f "$LOCK_FILE" "$PID_FILE"
        echo "stopped session $sid"
        exit 0
      fi
      sleep 1
    done
    pkill -KILL -s "$sid" 2>/dev/null || true
    rm -f "$LOCK_FILE" "$PID_FILE"
    echo "stopped session $sid"
    exit 0
  fi
  if [[ -f "$LOCK_FILE" ]]; then
    pid="$(lock_pid)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      rm -f "$LOCK_FILE"
      echo "stopped pid $pid"
      exit 0
    fi
  fi
  rm -f "$PID_FILE"
  echo "not running"
}

logs() {
  exec tail -n 80 -f "$LOG_FILE"
}

prepare_worktree() {
  prepare_integration_worktree
  mkdir -p "$(dirname "$WORKTREE_DIR")"
  if [[ ! -e "$WORKTREE_DIR/.git" ]]; then
    rm -rf "$WORKTREE_DIR"
    git -C "$REPO_ROOT" worktree add --force -B "$WORKTREE_BRANCH" "$WORKTREE_DIR" "$INTEGRATION_BRANCH"
  else
    git -C "$WORKTREE_DIR" rebase --abort >/dev/null 2>&1 || true
    git -C "$WORKTREE_DIR" cherry-pick --abort >/dev/null 2>&1 || true
    git -C "$WORKTREE_DIR" merge --abort >/dev/null 2>&1 || true
    current_branch="$(git -C "$WORKTREE_DIR" branch --show-current)"
    if [[ "$current_branch" != "$WORKTREE_BRANCH" ]]; then
      git -C "$WORKTREE_DIR" checkout "$WORKTREE_BRANCH" >/dev/null
    fi
    git -C "$WORKTREE_DIR" reset --hard HEAD >/dev/null
    git -C "$WORKTREE_DIR" clean -fd >/dev/null
    git -C "$WORKTREE_DIR" reset --hard "$INTEGRATION_BRANCH" >/dev/null
  fi
  seed_loop_inputs
}

prepare_integration_worktree() {
  mkdir -p "$(dirname "$INTEGRATION_WORKTREE")"
  if [[ ! -e "$INTEGRATION_WORKTREE/.git" ]]; then
    rm -rf "$INTEGRATION_WORKTREE"
    git -C "$REPO_ROOT" worktree add --force -B "$INTEGRATION_BRANCH" "$INTEGRATION_WORKTREE" master
  else
    git -C "$INTEGRATION_WORKTREE" rebase --abort >/dev/null 2>&1 || true
    git -C "$INTEGRATION_WORKTREE" cherry-pick --abort >/dev/null 2>&1 || true
    git -C "$INTEGRATION_WORKTREE" merge --abort >/dev/null 2>&1 || true
    current_branch="$(git -C "$INTEGRATION_WORKTREE" branch --show-current)"
    if [[ "$current_branch" != "$INTEGRATION_BRANCH" ]]; then
      git -C "$INTEGRATION_WORKTREE" checkout "$INTEGRATION_BRANCH" >/dev/null
    fi
    git -C "$INTEGRATION_WORKTREE" reset --hard HEAD >/dev/null
    git -C "$INTEGRATION_WORKTREE" clean -fd >/dev/null
  fi
}

seed_loop_inputs() {
  mkdir -p "$WORKTREE_DIR/scripts/content-surface-survey"
  ensure_symlink_target() {
    local target="$1"
    local link_path="$2"
    local parent_dir
    parent_dir="$(dirname "$link_path")"
    mkdir -p "$parent_dir"
    if [[ -L "$link_path" ]]; then
      local resolved
      resolved="$(readlink -f "$link_path" 2>/dev/null || true)"
      if [[ "$resolved" == "$target" ]]; then
        return 0
      fi
      rm -f "$link_path"
    elif [[ -e "$link_path" ]]; then
      rm -rf "$link_path"
    fi
    ln -s "$target" "$link_path"
  }

  if [[ -d "$REPO_ROOT/node_modules" ]]; then
    ensure_symlink_target "$REPO_ROOT/node_modules" "$WORKTREE_DIR/node_modules"
  fi
  if [[ -d "$REPO_ROOT/packages/surface/node_modules" ]]; then
    ensure_symlink_target \
      "$REPO_ROOT/packages/surface/node_modules" \
      "$WORKTREE_DIR/packages/surface/node_modules"
  fi
  if [[ -f "$REPO_ROOT/scripts/content-surface-survey/unit-queue.jsonl" ]]; then
    cp "$REPO_ROOT/scripts/content-surface-survey/unit-queue.jsonl" \
      "$WORKTREE_DIR/scripts/content-surface-survey/unit-queue.jsonl"
  else
    (cd "$WORKTREE_DIR" && \
      pnpm --filter @dnd/surface exec tsx \
      ../../scripts/content-surface-survey/unit-catalog.ts >/dev/null)
  fi
  rm -f \
    "$WORKTREE_DIR/scripts/content-surface-survey/run-survey.lock" \
    "$WORKTREE_DIR/.output/content-surface-closure/auto-close-loop.lock.json" \
    "$WORKTREE_DIR/.output/content-surface-closure/auto-close-loop.pid"
}

start() {
  clear_stale_lock
  if [[ -f "$LOCK_FILE" ]]; then
    if wait_for_cleanup; then
      clear_stale_lock
    fi
  fi
  if [[ -f "$LOCK_FILE" ]]; then
    pid="$(lock_pid)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "already running with pid $pid"
      exit 1
    fi
    rm -f "$LOCK_FILE"
  fi

  prepare_worktree
  rm -f "$STOP_FILE"

  auto_kind="${AUTO_KIND:-magic_item}"
  restart_delay="${AUTO_RESTART_DELAY_SECONDS:-5}"

  args=(
    --runner-id "$RUNNER_NAME"
    --source "${AUTO_SOURCE:-srd-5.2.1}"
    --backend "${AUTO_BACKEND:-codex}"
    --limit "${AUTO_LIMIT:-2}"
    --max-batches "${AUTO_MAX_BATCHES:-999}"
    --max-no-improve "${AUTO_MAX_NO_IMPROVE:-4}"
    --max-errors "${AUTO_MAX_ERRORS:-3}"
    --min-cluster-size "${AUTO_MIN_CLUSTER_SIZE:-2}"
    --batch-timeout-seconds "${AUTO_BATCH_TIMEOUT_SECONDS:-1800}"
    --sleep-seconds "${AUTO_SLEEP_SECONDS:-5}"
    --state-path "$STATE_FILE"
    --lock-path "$LOCK_FILE"
  )
  if [[ "${AUTO_COMMIT:-1}" == "1" ]]; then
    args+=(--auto-commit)
  fi
  if [[ -n "$auto_kind" ]]; then
    args+=(--kind "$auto_kind")
  fi
  if [[ "${AUTO_RESET_STATE:-0}" == "1" ]]; then
    args+=(--reset-state)
  fi

  : > "$LOG_FILE"
  quoted_args="$(printf '%q ' "${args[@]}")"
  nohup setsid bash -lc "
    cd '$WORKTREE_DIR'
    stop_file='$STOP_FILE'
    while true; do
      if [[ -f \"\$stop_file\" ]]; then
        exit 0
      fi
      env MAX_PARALLEL=1 AUTO_LOOP_REPO_ROOT='$WORKTREE_DIR' AUTO_LOOP_SHARED_ROOT='$REPO_ROOT' AUTO_LOOP_INTEGRATION_BRANCH='$INTEGRATION_BRANCH' AUTO_LOOP_INTEGRATION_WORKTREE='$INTEGRATION_WORKTREE' \
        pnpm --filter @dnd/surface exec tsx \
        ../../scripts/content-surface-survey/auto-close-loop.ts \
        $quoted_args
      status=\$?
      if [[ -f \"\$stop_file\" ]]; then
        exit 0
      fi
      printf '%s supervisor: worker exited with status %s; restarting in %ss\n' \"\$(date -Is)\" \"\$status\" '$restart_delay' >&2
      sleep '$restart_delay'
    done
  " >>"$LOG_FILE" 2>&1 < /dev/null &
  child_pid=$!
  echo "$child_pid" > "$PID_FILE"

  for _ in $(seq 1 20); do
    clear_stale_lock
    if [[ -f "$LOCK_FILE" ]]; then
      echo "started pid $(lock_pid)"
      exit 0
    fi
    if ! kill -0 "$child_pid" 2>/dev/null; then
      echo "auto-close-loop failed to start; recent log:" >&2
      tail -n 40 "$LOG_FILE" >&2 || true
      rm -f "$PID_FILE"
      exit 1
    fi
    sleep 1
  done

  echo "auto-close-loop did not establish lock within timeout; recent log:" >&2
  tail -n 40 "$LOG_FILE" >&2 || true
  exit 1
}

cmd="${1:-start}"
case "$cmd" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  logs) logs ;;
  restart)
    stop || true
    sleep 1
    start
    ;;
  *)
    echo "usage: $0 {start|stop|status|logs|restart}" >&2
    exit 64
    ;;
esac
