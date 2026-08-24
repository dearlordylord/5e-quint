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

command_pid=""
pending_signal_status=0
cleanup_in_progress=false
owner_pid="${DND_RESOURCE_LOCK_OWNER_PID:-}"
owner_start_time="${DND_RESOURCE_LOCK_OWNER_START_TIME:-}"

if [[ ! "$owner_pid" =~ ^[0-9]+$ ]] || (( owner_pid <= 1 )) ||
  [[ ! "$owner_start_time" =~ ^[0-9]+$ ]]; then
  echo "[$event_name] canceled: missing parent owner identity" >&2
  exit 125
fi

owner_is_alive() {
  local current_parent owner_stat owner_rest
  local -a owner_fields
  current_parent="$(awk '/^PPid:/ { print $2 }' "/proc/$$/status" 2>/dev/null || true)"
  [[ "$current_parent" == "$owner_pid" ]] || return 1
  [[ -r "/proc/$owner_pid/stat" ]] || return 1
  owner_stat="$(<"/proc/$owner_pid/stat")"
  owner_rest="${owner_stat##*) }"
  read -r -a owner_fields <<<"$owner_rest"
  (( ${#owner_fields[@]} > 19 )) || return 1
  [[ "${owner_fields[0]}" != Z && "${owner_fields[0]}" != X ]] || return 1
  [[ "${owner_fields[19]}" == "$owner_start_time" ]]
}

abort_for_lost_owner() {
  echo "[$event_name] canceled: original parent $owner_pid exited" >&2
  exit 125
}

group_exists() {
  [[ -n "$command_pid" ]] && kill -0 -- "-$command_pid" 2>/dev/null
}

terminate_group() {
  group_exists || return 0
  kill -TERM -- "-$command_pid" 2>/dev/null || true
  for _ in {1..100}; do
    group_exists || return 0
    sleep 0.02
  done
  echo "[$event_name] EMERGENCY: process group $command_pid ignored SIGTERM; sending SIGKILL" >&2
  kill -KILL -- "-$command_pid" 2>/dev/null || true
  for _ in {1..100}; do
    group_exists || return 137
    sleep 0.02
  done
  echo "[$event_name] process group $command_pid survived SIGKILL" >&2
  return 137
}

handle_signal() {
  local status="$1"
  if (( pending_signal_status == 0 )); then
    pending_signal_status="$status"
  fi
  status="$pending_signal_status"
  [[ "$cleanup_in_progress" == false ]] || return 0
  if [[ -n "$command_pid" ]]; then
    cleanup_in_progress=true
    set +e
    terminate_group
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
    owner_is_alive || abort_for_lost_owner
    (( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
    sleep 0.1
  done
  owner_is_alive || abort_for_lost_owner
}

echo "[$event_name] waiting: ${1##*/}" >&2
(( pending_signal_status == 0 )) || exit "$pending_signal_status"
acquire_lock "$shared_lock_fd"
acquire_lock "$retired_heavy_lock_fd"
acquire_lock "$retired_broad_lock_fd"
acquire_lock "$retired_mbt_lock_fd"

echo "[$event_name] acquired: ${1##*/}" >&2
export DND_RESOURCE_LOCK_KIND="$lock_kind"

(( pending_signal_status == 0 )) || exit "$pending_signal_status"
setsid -- "$@" &
command_pid=$!
(( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"

while [[ -r "/proc/$command_pid/stat" ]]; do
  command_state="$(ps -o stat= -p "$command_pid" 2>/dev/null || true)"
  [[ -z "$command_state" || "$command_state" == Z* ]] && break
  if ! owner_is_alive; then
    cleanup_in_progress=true
    set +e
    terminate_group
    cleanup_status=$?
    set -e
    (( cleanup_status == 137 )) && exit 137
    abort_for_lost_owner
  fi
  sleep 0.1
done

set +e
wait "$command_pid"
status=$?
set -e

cleanup_in_progress=true
set +e
terminate_group
cleanup_status=$?
set -e
(( cleanup_status == 137 )) && exit 137
trap - HUP INT TERM
exit "$status"
