#!/usr/bin/env bash

set -euo pipefail

# Shared lifecycle for wrappers that own a bounded command.  The native helper
# is the sole process-tree owner: it is a Linux subreaper, tracks descendants
# by parent lineage, and signals them even after a child creates a new session
# or clears its environment.  The shell only owns the helper PID and waits for
# its completion before releasing any resource lock.

supervision_command_pid=""
supervision_event_name=""
supervision_deadline_milliseconds=""
supervision_cleanup_in_progress=false
supervision_command_reaped=false
supervision_command_wait_status=0
supervision_command_start_time=""
supervision_helper_directory=""
supervision_helper_path=""

supervision_process_stat_fields() {
  local pid="$1" stat rest
  local -a process_fields
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  [[ -r "/proc/$pid/stat" ]] || return 1
  stat="$(<"/proc/$pid/stat")"
  rest="${stat##*) }"
  read -r -a process_fields <<<"$rest"
  (( ${#process_fields[@]} > 19 )) || return 1
  printf '%s %s %s\n' \
    "${process_fields[0]}" "${process_fields[2]}" "${process_fields[19]}"
}

supervision_process_start_time() {
  local pid="$1" stat_fields
  stat_fields="$(supervision_process_stat_fields "$pid")" || return 1
  [[ "${stat_fields##* }" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "${stat_fields##* }"
}

supervision_process_identity_is_live() {
  local pid="$1" expected_start_time="$2" stat_fields process_state start_time
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  [[ "$expected_start_time" =~ ^[0-9]+$ ]] || return 1
  stat_fields="$(supervision_process_stat_fields "$pid")" || return 1
  process_state="${stat_fields%% *}"
  start_time="${stat_fields##* }"
  [[ "$process_state" != Z && "$process_state" != X ]] || return 1
  [[ "$start_time" == "$expected_start_time" ]]
}

supervision_owner_is_alive() {
  local owner_pid="${DND_RESOURCE_LOCK_OWNER_PID:-}"
  local owner_start_time="${DND_RESOURCE_LOCK_OWNER_START_TIME:-}"
  local current_parent
  [[ "$owner_pid" =~ ^[0-9]+$ ]] || return 1
  (( owner_pid > 1 )) || return 1
  [[ "$owner_start_time" =~ ^[0-9]+$ ]] || return 1
  current_parent="$(awk '/^PPid:/ { print $2 }' "/proc/$$/status" 2>/dev/null || true)"
  [[ "$current_parent" == "$owner_pid" ]] || return 1
  supervision_process_identity_is_live "$owner_pid" "$owner_start_time"
}

supervision_require_owner() {
  local owner_pid="${DND_RESOURCE_LOCK_OWNER_PID:-}"
  local owner_start_time="${DND_RESOURCE_LOCK_OWNER_START_TIME:-}"
  if [[ ! "$owner_pid" =~ ^[0-9]+$ ]] || (( owner_pid <= 1 )) ||
    [[ ! "$owner_start_time" =~ ^[0-9]+$ ]]; then
    printf '[%s] canceled: missing parent owner identity\n' "$1" >&2
    return 125
  fi
}

supervision_owned_processes_exist() {
  [[ -n "$supervision_command_pid" ]] || return 1
  supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time"
}

supervision_signal_owned_processes() {
  local signal="$1"
  supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time" || return 0
  kill -"$signal" "$supervision_command_pid" 2>/dev/null || true
}

supervision_terminate_owned_processes() {
  [[ -n "$supervision_command_pid" ]] || return 0
  supervision_signal_owned_processes TERM
  # The native supervisor is the only process that can discover and reap
  # descendants after a child creates a new session. Never SIGKILL it here:
  # killing that owner could reparent surviving descendants before this shell
  # releases a resource lock. The native supervisor owns its bounded
  # TERM-to-KILL escalation and exits only after its tree is settled.
  while supervision_owned_processes_exist; do
    sleep 0.02
  done
}

supervision_reap_command() {
  [[ -n "$supervision_command_pid" ]] || return 0
  if [[ "$supervision_command_reaped" == true ]]; then
    return "$supervision_command_wait_status"
  fi
  local wait_status=0
  wait "$supervision_command_pid" || wait_status=$?
  supervision_command_reaped=true
  supervision_command_wait_status=$wait_status
  return "$wait_status"
}

supervision_remove_helper() {
  if [[ -n "$supervision_helper_directory" ]]; then
    rm -rf -- "$supervision_helper_directory"
    supervision_helper_directory=""
    supervision_helper_path=""
  fi
}

supervision_cleanup_command() {
  [[ "$supervision_cleanup_in_progress" == false ]] || return 0
  supervision_cleanup_in_progress=true
  set +e
  supervision_terminate_owned_processes
  local cleanup_status=$?
  supervision_reap_command
  local reap_status=$?
  set -e
  supervision_remove_helper
  (( cleanup_status == 137 || reap_status == 137 )) && return 137
  return 0
}

supervision_reset_command() {
  supervision_command_pid=""
  supervision_deadline_milliseconds=""
  supervision_cleanup_in_progress=false
  supervision_command_reaped=false
  supervision_command_wait_status=0
  supervision_command_start_time=""
  supervision_remove_helper
}

supervision_compile_helper() {
  local script_directory="$1"
  supervision_helper_directory="$(mktemp -d "${TMPDIR:-/tmp}/dnd-process-supervisor.XXXXXX")" || {
    printf '[%s] could not allocate native supervisor directory\n' \
      "$supervision_event_name" >&2
    return 78
  }
  supervision_helper_path="$supervision_helper_directory/process-supervisor"
  if ! env -i PATH=/usr/bin:/bin LC_ALL=C LANG=C /usr/bin/cc \
    -std=c11 -O2 -Wall -Wextra -Werror \
    "$script_directory/raw-swarm/process-supervisor.c" \
    -o "$supervision_helper_path"; then
    printf '[%s] could not compile the native process supervisor\n' \
      "$supervision_event_name" >&2
    supervision_remove_helper
    return 78
  fi
}

supervision_start_command() {
  supervision_event_name="$1"
  supervision_deadline_milliseconds="$2"
  shift 2
  (( $# > 0 )) || {
    printf '[%s] missing owned command\n' "$supervision_event_name" >&2
    return 64
  }
  local script_directory
  script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
  supervision_compile_helper "$script_directory" || return $?
  supervision_command_reaped=false
  supervision_command_wait_status=0
  "$supervision_helper_path" --owner-pid "$$" --supervise-only "$@" &
  supervision_command_pid=$!
  supervision_command_start_time="$(
    supervision_process_start_time "$supervision_command_pid" 2>/dev/null || true
  )"
  supervision_cleanup_in_progress=false
}

supervision_run_command() {
  supervision_start_command "$@" || return $?
  local now_milliseconds command_status cleanup_status
  while supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time"; do
    if ! supervision_owner_is_alive; then
      printf '[%s] canceled: original parent owner exited\n' \
        "$supervision_event_name" >&2
      supervision_cleanup_command
      cleanup_status=$?
      supervision_reset_command
      (( cleanup_status == 137 )) && return 137
      return 125
    fi
    if [[ "$supervision_deadline_milliseconds" =~ ^[0-9]+$ ]]; then
      now_milliseconds="$(date +%s%3N)"
      if (( now_milliseconds >= supervision_deadline_milliseconds )); then
        printf '[%s] operation exceeded its execution deadline\n' \
          "$supervision_event_name" >&2
        supervision_cleanup_command
        cleanup_status=$?
        supervision_reset_command
        (( cleanup_status == 137 )) && return 137
        return 124
      fi
    fi
    sleep 0.1
  done
  set +e
  supervision_reap_command
  command_status=$?
  set -e
  supervision_cleanup_command
  cleanup_status=$?
  supervision_reset_command
  (( cleanup_status == 137 )) && return 137
  return "$command_status"
}
