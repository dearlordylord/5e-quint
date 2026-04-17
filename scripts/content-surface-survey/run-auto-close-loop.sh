#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/.output/content-surface-closure"
LOG_FILE="$OUTPUT_DIR/auto-close-loop.log"
STATE_FILE="$OUTPUT_DIR/auto-close-loop.state.json"
LOCK_FILE="$OUTPUT_DIR/auto-close-loop.lock.json"
PID_FILE="$OUTPUT_DIR/auto-close-loop.pid"

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
  sid="$(session_pid)"
  if [[ -n "${sid:-}" ]] && session_live; then
    pkill -TERM -s "$sid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      if ! session_live; then
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

start() {
  clear_stale_lock
  if [[ -f "$LOCK_FILE" ]]; then
    pid="$(lock_pid)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "already running with pid $pid"
      exit 1
    fi
    rm -f "$LOCK_FILE"
  fi

  auto_kind="${AUTO_KIND:-magic_item}"

  args=(
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
  if [[ -n "$auto_kind" ]]; then
    args+=(--kind "$auto_kind")
  fi
  if [[ "${AUTO_RESET_STATE:-0}" == "1" ]]; then
    args+=(--reset-state)
  fi

  : > "$LOG_FILE"
  quoted_args="$(printf '%q ' "${args[@]}")"
  nohup setsid bash -lc "
    cd '$REPO_ROOT'
    exec env MAX_PARALLEL=1 \
      pnpm --filter @dnd/prototype-content-surface exec tsx \
      ../../scripts/content-surface-survey/auto-close-loop.ts \
      $quoted_args
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
