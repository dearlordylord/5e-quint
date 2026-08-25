#!/usr/bin/env bash

# Shared process lifecycle for wrappers that own a bounded command.  The
# process group handles ordinary descendants; the inherited marker closes the
# gap when a descendant creates a new session before the owner can clean up.

supervision_command_pid=""
supervision_event_name=""
supervision_deadline_milliseconds=""
supervision_marker=""
supervision_marker_pids_snapshot=""
supervision_cleanup_in_progress=false
supervision_command_reaped=false
supervision_command_wait_status=0
supervision_command_start_time=""

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

supervision_process_group() {
  local pid="$1" stat_fields process_group
  stat_fields="$(supervision_process_stat_fields "$pid")" || return 1
  process_group="${stat_fields#* }"
  printf '%s\n' "${process_group%% *}"
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

supervision_group_exists() {
  supervision_command_group_is_owned
}

supervision_command_group_is_owned() {
  local process_group
  [[ -n "$supervision_command_pid" ]] || return 1
  supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time" || return 1
  process_group="$(supervision_process_group "$supervision_command_pid" || true)"
  [[ "$process_group" == "$supervision_command_pid" ]] || return 1
  kill -0 -- "-$supervision_command_pid" 2>/dev/null
}

supervision_pid_is_in_command_group() {
  local pid="$1" start_time="$2" process_group
  supervision_process_identity_is_live "$pid" "$start_time" || return 1
  process_group="$(supervision_process_group "$pid" || true)"
  [[ "$process_group" == "$supervision_command_pid" ]]
}

supervision_marker_process_pids() {
  local environment_path pid start_time
  [[ -n "$supervision_marker" ]] || return 0
  while read -r environment_path; do
    pid="${environment_path#/proc/}"
    pid="${pid%/environ}"
    [[ "$pid" != "$$" ]] || continue
    start_time="$(supervision_process_start_time "$pid" 2>/dev/null || true)"
    [[ "$start_time" =~ ^[0-9]+$ ]] || continue
    supervision_process_identity_is_live "$pid" "$start_time" || continue
    printf '%s %s\n' "$pid" "$start_time"
  done < <(
    grep -z -F -x -l -- \
      "DND_PROCESS_SUPERVISION_MARKER=$supervision_marker" \
      /proc/[0-9]*/environ 2>/dev/null || true
  )
}

supervision_capture_marker_pids() {
  supervision_marker_pids_snapshot="$(supervision_marker_process_pids)"
}

supervision_marker_snapshot_exists() {
  local pid start_time
  while read -r pid start_time; do
    supervision_process_identity_is_live "$pid" "$start_time" && return 0
  done <<<"$supervision_marker_pids_snapshot"
  return 1
}

supervision_owned_processes_exist() {
  supervision_group_exists && return 0
  supervision_marker_snapshot_exists
}

supervision_signal_owned_group() {
  local signal="$1" process_group
  [[ -n "$supervision_command_pid" ]] || return 1
  supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time" || return 1
  process_group="$(supervision_process_group "$supervision_command_pid" || true)"
  [[ "$process_group" == "$supervision_command_pid" ]] || return 1
  supervision_process_identity_is_live \
    "$supervision_command_pid" "$supervision_command_start_time" || return 1
  kill -"$signal" -- "-$supervision_command_pid" 2>/dev/null
}

supervision_signal_owned_pid() {
  local signal="$1" pid="$2" start_time="$3"
  supervision_process_identity_is_live "$pid" "$start_time" || return 0
  kill -"$signal" "$pid" 2>/dev/null || true
}

supervision_signal_owned_processes() {
  local signal="$1" pid start_time group_signal_sent=false
  supervision_capture_marker_pids
  if supervision_signal_owned_group "$signal"; then
    group_signal_sent=true
  fi
  while read -r pid start_time; do
    supervision_process_identity_is_live "$pid" "$start_time" || continue
    if [[ "$group_signal_sent" == true ]] &&
      supervision_pid_is_in_command_group "$pid" "$start_time"; then
      continue
    fi
    supervision_signal_owned_pid "$signal" "$pid" "$start_time"
  done <<<"$supervision_marker_pids_snapshot"
}

supervision_wait_for_settlement() {
  local attempts="$1"
  while (( attempts > 0 )); do
    supervision_owned_processes_exist || break
    if [[ -n "$supervision_command_pid" ]] &&
      ! supervision_process_identity_is_live \
        "$supervision_command_pid" "$supervision_command_start_time"; then
      supervision_reap_command || true
    fi
    attempts=$((attempts - 1))
    sleep 0.02
  done
  # A descendant may have detached between the first snapshot and the group
  # leader's exit. One final marker read closes that hand-off without walking
  # every process on every 20ms poll.
  supervision_group_exists && return 1
  supervision_capture_marker_pids
  supervision_marker_snapshot_exists && return 1
  return 0
}

supervision_terminate_owned_processes() {
  [[ -n "$supervision_command_pid" || -n "$supervision_marker" ]] || return 0
  supervision_signal_owned_processes TERM
  if supervision_wait_for_settlement 100; then
    return 0
  fi
  printf '[%s] EMERGENCY: owned process set ignored SIGTERM; sending SIGKILL\n' \
    "$supervision_event_name" >&2
  supervision_signal_owned_processes KILL
  if ! supervision_wait_for_settlement 100; then
    printf '[%s] owned process set survived SIGKILL\n' \
      "$supervision_event_name" >&2
  fi
  return 137
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

supervision_cleanup_command() {
  [[ "$supervision_cleanup_in_progress" == false ]] || return 0
  supervision_cleanup_in_progress=true
  set +e
  supervision_terminate_owned_processes
  local cleanup_status=$?
  supervision_reap_command
  local reap_status=$?
  set -e
  (( cleanup_status == 137 || reap_status == 137 )) && return 137
  return 0
}

supervision_reset_command() {
  supervision_command_pid=""
  supervision_marker=""
  supervision_marker_pids_snapshot=""
  supervision_deadline_milliseconds=""
  supervision_cleanup_in_progress=false
  supervision_command_reaped=false
  supervision_command_wait_status=0
  supervision_command_start_time=""
}

supervision_start_command() {
  supervision_event_name="$1"
  supervision_deadline_milliseconds="$2"
  shift 2
  (( $# > 0 )) || {
    printf '[%s] missing owned command\n' "$supervision_event_name" >&2
    return 64
  }
  supervision_marker="dnd-supervision-$$-$(date +%s%N)-$RANDOM"
  supervision_command_reaped=false
  supervision_command_wait_status=0
  export DND_PROCESS_SUPERVISION_MARKER="$supervision_marker"
  setsid -- "$@" & supervision_command_pid=$!
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
