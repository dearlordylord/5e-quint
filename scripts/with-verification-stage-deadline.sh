#!/usr/bin/env bash
set -euo pipefail

(( $# >= 2 )) || { echo 'usage: with-verification-stage-deadline.sh <stage> <command> [args...]' >&2; exit 64; }
stage="$1"
shift
script_directory=$(cd -- "$(dirname -- "$0")" && pwd)
source "$script_directory/process-supervision.sh"
policy="$(node "$script_directory/verification-deadline-policy.mjs" --shell)" || exit $?
mapfile -t deadlines <<<"$policy"
execution_deadline=$(( $(date +%s%3N) + deadlines[2] ))
event_name="verification-stage:$stage"
supervision_require_owner "$event_name" || exit $?

pending_signal_status=0
handle_signal() {
  local status="$1" cleanup_status=0
  if (( pending_signal_status == 0 )); then
    pending_signal_status="$status"
  fi
  status="$pending_signal_status"
  supervision_defer_signal_if_publishing "$status" && return 0
  [[ "$supervision_cleanup_in_progress" == false ]] || return 0
  set +e
  supervision_cleanup_helper
  cleanup_status=$?
  (( cleanup_status == 137 )) && exit 137
  exit "$status"
}
trap 'handle_signal 129' HUP
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM
set +e
supervision_run_command "$event_name" "$execution_deadline" "$@"
status=$?
set -e
trap - HUP INT TERM
exit "$status"
