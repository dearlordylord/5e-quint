#!/usr/bin/env bash
set -euo pipefail

# DND_RESOURCE_GUARD_PROTOCOL: shared-heavy-v3

usage() {
  echo "usage: scripts/with-resource-lock.sh <broad|mbt> <command> [args...]" >&2
  exit 64
}

(( $# >= 2 )) || usage
lock_kind="$1"
shift
script_directory=$(cd -- "$(dirname -- "$0")" && pwd)
source "$script_directory/process-supervision.sh"

case "$lock_kind" in
  broad)
    event_name="broad-workspace-check"
    ;;
  mbt)
    event_name="mbt-proof-check"
    ;;
  *) usage ;;
esac

if [[ -n "${DND_RESOURCE_LOCK_KIND:-}" ]]; then
  echo "[$event_name] refusing nested resource lock inside $DND_RESOURCE_LOCK_KIND" >&2
  exit 70
fi

pending_signal_status=0
owner_pid="${DND_RESOURCE_LOCK_OWNER_PID:-}"
owner_start_time="${DND_RESOURCE_LOCK_OWNER_START_TIME:-}"

supervision_require_owner "$event_name" || exit $?

handle_signal() {
  local status="$1"
  if (( pending_signal_status == 0 )); then
    pending_signal_status="$status"
  fi
  status="$pending_signal_status"
  [[ "$supervision_cleanup_in_progress" == false ]] || return 0
  if [[ -n "$supervision_helper_pid" || -n "$supervision_helper_directory" ]]; then
    set +e
    supervision_cleanup_helper
    local cleanup_status=$?
    set -e
    (( cleanup_status == 137 )) && exit 137
    exit "$status"
  fi
  exit "$status"
}

trap 'handle_signal 129' HUP
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
(( pending_signal_status == 0 )) || exit "$pending_signal_status"

# Current checkouts coordinate through one neutral shared lock. The three
# retired filenames remain in the fixed acquisition order because linked
# worktrees can execute a wrapper from an older revision in the same Git common
# directory. They are cross-revision lock aliases, not supported Ralph state.
exec {shared_lock_fd}>"$git_common_dir/dnd-heavy-verification.lock"
exec {retired_heavy_lock_fd}>"$git_common_dir/ralph-heavy-verification.lock"
exec {retired_broad_lock_fd}>"$git_common_dir/ralph-broad-workspace-check.lock"
exec {retired_mbt_lock_fd}>"$git_common_dir/ralph-mbt.lock"

acquire_lock() {
  local lock_fd="$1"
  while ! flock --exclusive --nonblock "$lock_fd"; do
    supervision_owner_is_alive || {
      echo "[$event_name] canceled: original parent $owner_pid exited" >&2
      exit 125
    }
    (( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
    sleep 0.1
  done
  supervision_owner_is_alive || {
    echo "[$event_name] canceled: original parent $owner_pid exited" >&2
    exit 125
  }
}

# The holder record is diagnostic only: exclusion remains the flock descriptors
# above. A waiting command reads it to name what it waits for, and a reader that
# finds it absent or stale reports an unknown holder rather than blocking.
holder_record="$git_common_dir/dnd-heavy-verification.holder"

current_holder() {
  local record
  record="$(cat "$holder_record" 2>/dev/null || true)"
  if [[ -z "$record" ]]; then
    echo "unknown"
  else
    echo "$record"
  fi
}

record_holder() {
  printf '%s pid=%s event=%s command=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$" "$event_name" "${1##*/}" >"$holder_record" 2>/dev/null || true
}

release_holder() {
  local record
  record="$(cat "$holder_record" 2>/dev/null || true)"
  case "$record" in
    *"pid=$$ "*) : >"$holder_record" 2>/dev/null || true ;;
  esac
}

wait_started_at=$(date +%s%N)
echo "[$event_name] waiting: ${1##*/} at $(date -u +%Y-%m-%dT%H:%M:%SZ) holder: $(current_holder)" >&2
(( pending_signal_status == 0 )) || exit "$pending_signal_status"
acquire_lock "$shared_lock_fd"
acquire_lock "$retired_heavy_lock_fd"
acquire_lock "$retired_broad_lock_fd"
acquire_lock "$retired_mbt_lock_fd"

waited_milliseconds=$(( ( $(date +%s%N) - wait_started_at ) / 1000000 ))
record_holder "$1"
trap release_holder EXIT
echo "[$event_name] acquired: ${1##*/} at $(date -u +%Y-%m-%dT%H:%M:%SZ) after ${waited_milliseconds}ms" >&2
export DND_RESOURCE_LOCK_KIND="$lock_kind"

(( pending_signal_status == 0 )) || exit "$pending_signal_status"
set +e
supervision_run_command "$event_name" none "$@"
status=$?
set -e
trap - HUP INT TERM
exit "$status"
