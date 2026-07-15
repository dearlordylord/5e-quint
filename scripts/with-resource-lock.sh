#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: scripts/with-resource-lock.sh <broad|mbt> <command> [args...]" >&2
  exit 64
}

(( $# >= 2 )) || usage
lock_kind="$1"
shift

case "$lock_kind" in
  broad)
    lock_name="ralph-broad-workspace-check.lock"
    event_name="broad-workspace-check"
    ;;
  mbt)
    lock_name="ralph-mbt.lock"
    event_name="mbt-proof-check"
    ;;
  *) usage ;;
esac

if [[ -n "${DND_RESOURCE_LOCK_KIND:-}" ]]; then
  echo "[$event_name] refusing nested resource lock inside $DND_RESOURCE_LOCK_KIND" >&2
  exit 70
fi

command_pid=""
acquisition_pid=""
pending_signal_status=0
cleanup_in_progress=false

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
  pending_signal_status="$status"
  [[ "$cleanup_in_progress" == false ]] || return 0
  if [[ -n "$acquisition_pid" ]]; then
    cleanup_in_progress=true
    kill -TERM "$acquisition_pid" 2>/dev/null || true
    wait "$acquisition_pid" 2>/dev/null || true
    exit "$status"
  fi
  if [[ -n "$command_pid" ]]; then
    cleanup_in_progress=true
    set +e
    terminate_group
    local cleanup_status=$?
    set -e
    (( cleanup_status == 137 )) && exit 137
    exit "$status"
  fi
}

trap 'handle_signal 129' HUP
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
(( pending_signal_status == 0 )) || exit "$pending_signal_status"
lock_file="$git_common_dir/$lock_name"

exec {lock_fd}>"$lock_file"
echo "[$event_name] waiting: ${1##*/}" >&2
(( pending_signal_status == 0 )) || exit "$pending_signal_status"
flock --exclusive "$lock_fd" &
acquisition_pid=$!
(( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
set +e
wait "$acquisition_pid"
acquisition_status=$?
set -e
acquisition_pid=""
(( acquisition_status == 0 )) || exit "$acquisition_status"

echo "[$event_name] acquired: ${1##*/}" >&2
export DND_RESOURCE_LOCK_KIND="$lock_kind"

(( pending_signal_status == 0 )) || exit "$pending_signal_status"
setsid -- "$@" &
command_pid=$!
(( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"

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
