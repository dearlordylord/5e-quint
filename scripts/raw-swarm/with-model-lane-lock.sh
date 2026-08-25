#!/usr/bin/env bash
set -euo pipefail

if (( $# < 2 )); then
  printf '%s\n' 'usage: scripts/raw-swarm/with-model-lane-lock.sh <trial|campaign> <command> [args...]' >&2
  exit 64
fi
if [[ -n "${DND_RESOURCE_LOCK_KIND:-}" || -n "${DND_RAW_SWARM_MODEL_LANE:-}" ]]; then
  printf '%s\n' 'Raw Swarm model execution refuses a nested resource lock.' >&2
  exit 70
fi

profile=$1
shift
script_directory=$(cd -- "$(dirname -- "$0")" && pwd)
classification_path="$script_directory/lane-classification.cjs"
operation_budget_seconds=$(node -e '
const { MODEL_BACKED_PROFILE_BUDGET_SECONDS } = require(process.argv[1]);
const budget = MODEL_BACKED_PROFILE_BUDGET_SECONDS[process.argv[2]];
if (budget === undefined) process.exit(64);
process.stdout.write(String(budget));
' "$classification_path" "$profile" 2>/dev/null || true)
if [[ ! "$operation_budget_seconds" =~ ^[0-9]+$ ]]; then
  printf 'Unknown Raw Swarm model profile: %s\n' "$profile" >&2
  exit 64
fi

operation_deadline_milliseconds=$(( $(date +%s%3N) + operation_budget_seconds * 1000 ))
if [[ "$profile" == campaign ]]; then
  campaign_deadline=${RAW_SWARM_OPERATION_DEADLINE_UTC:-}
  if [[ ! "$campaign_deadline" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$ ]]; then
    printf '%s\n' 'RAW_SWARM_OPERATION_DEADLINE_UTC must be a future UTC timestamp.' >&2
    exit 64
  fi
  campaign_deadline_milliseconds=$(date -u -d "$campaign_deadline" +%s%3N 2>/dev/null || true)
  if [[ ! "$campaign_deadline_milliseconds" =~ ^[0-9]+$ ]] ||
    (( campaign_deadline_milliseconds <= $(date +%s%3N) )); then
    printf '%s\n' 'RAW_SWARM_OPERATION_DEADLINE_UTC must be a future UTC timestamp.' >&2
    exit 64
  fi
  if (( campaign_deadline_milliseconds < operation_deadline_milliseconds )); then
    operation_deadline_milliseconds=$campaign_deadline_milliseconds
  fi
fi

owner_pid=${DND_RESOURCE_LOCK_OWNER_PID:-}
owner_start_time=${DND_RESOURCE_LOCK_OWNER_START_TIME:-}
if [[ ! "$owner_pid" =~ ^[0-9]+$ || ! "$owner_start_time" =~ ^[0-9]+$ ]]; then
  printf '%s\n' 'Raw Swarm model execution requires a recorded parent owner.' >&2
  exit 125
fi

owner_is_alive() {
  local current_parent owner_stat owner_rest
  local -a owner_fields
  current_parent=$(awk '/^PPid:/ { print $2 }' "/proc/$$/status" 2>/dev/null || true)
  [[ "$current_parent" == "$owner_pid" ]] || return 1
  [[ -r "/proc/$owner_pid/stat" ]] || return 1
  owner_stat=$(<"/proc/$owner_pid/stat")
  owner_rest=${owner_stat##*) }
  read -r -a owner_fields <<<"$owner_rest"
  (( ${#owner_fields[@]} > 19 )) || return 1
  [[ "${owner_fields[0]}" != Z && "${owner_fields[0]}" != X ]] || return 1
  [[ "${owner_fields[19]}" == "$owner_start_time" ]]
}

command_pid=""
pending_signal_status=0
cleanup_in_progress=false
lane_fd=""

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
  printf '%s\n' "[raw-swarm-model] EMERGENCY: process group $command_pid ignored SIGTERM; sending SIGKILL" >&2
  kill -KILL -- "-$command_pid" 2>/dev/null || true
  for _ in {1..100}; do
    group_exists || return 137
    sleep 0.02
  done
  printf '%s\n' "[raw-swarm-model] process group $command_pid survived SIGKILL" >&2
  return 137
}

reap_command() {
  [[ -n "$command_pid" ]] || return 0
  set +e
  wait "$command_pid"
  local wait_status=$?
  set -e
  return "$wait_status"
}

release_lane() {
  if [[ -n "$lane_fd" ]]; then
    exec {lane_fd}>&-
    lane_fd=""
  fi
}

abort_for_lost_owner() {
  printf '%s\n' '[raw-swarm-model] canceled: recorded parent owner exited' >&2
  cleanup_in_progress=true
  set +e
  terminate_group
  local cleanup_status=$?
  reap_command
  local reap_status=$?
  set -e
  release_lane
  (( cleanup_status == 137 || reap_status == 137 )) && exit 137
  exit 125
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
    reap_command
    local reap_status=$?
    set -e
    release_lane
    (( cleanup_status == 137 || reap_status == 137 )) && exit 137
    exit "$status"
  fi
  release_lane
  exit "$status"
}

trap 'handle_signal 129' HUP
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

git_common_dir=$(git rev-parse --path-format=absolute --git-common-dir)
model_lane_owner_pid=$$
model_lane_owner_start_time=$(sed 's/^.*) //' "/proc/$model_lane_owner_pid/stat" | awk '{ print $20 }')
if [[ ! "$model_lane_owner_start_time" =~ ^[0-9]+$ ]]; then
  printf '%s\n' 'Raw Swarm model execution could not record its lane owner.' >&2
  exit 125
fi
while true; do
  now_milliseconds=$(date +%s%3N)
  if (( now_milliseconds >= operation_deadline_milliseconds )); then
    printf '%s\n' 'Raw Swarm model operation exceeded its execution deadline while acquiring a lane.' >&2
    exit 124
  fi
  for lane in 1 2 3; do
    lock_path="$git_common_dir/raw-swarm-model-lane-$lane.lock"
    exec {lane_fd}>"$lock_path"
    if flock --exclusive --nonblock "$lane_fd"; then
      owner_is_alive || exit 125
      now_milliseconds=$(date +%s%3N)
      if (( now_milliseconds >= operation_deadline_milliseconds )); then
        printf '%s\n' 'Raw Swarm model operation exceeded its execution deadline while acquiring a lane.' >&2
        exit 124
      fi
      remaining_milliseconds=$((operation_deadline_milliseconds - now_milliseconds))
      remaining_seconds=$((remaining_milliseconds / 1000))
      remaining_millis=$((remaining_milliseconds % 1000))
      timeout_duration="${remaining_seconds}.$(printf '%03d' "$remaining_millis")s"
      export DND_RAW_SWARM_MODEL_LANE=$lane
      export DND_RAW_SWARM_MODEL_LANE_GUARD=v1
      export DND_RAW_SWARM_MODEL_LANE_LOCK_PATH=$lock_path
      export DND_RAW_SWARM_MODEL_LANE_FD=$lane_fd
      export DND_RAW_SWARM_MODEL_LANE_OWNER_PID=$model_lane_owner_pid
      export DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME=$model_lane_owner_start_time
      printf '[raw-swarm-model] acquired lane %s: %s\n' "$lane" "${1##*/}" >&2
      setsid -- timeout --signal=TERM --kill-after=30s "$timeout_duration" "$@" &
      command_pid=$!
      (( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
      while [[ -r "/proc/$command_pid/stat" ]]; do
        command_state=$(ps -o stat= -p "$command_pid" 2>/dev/null || true)
        [[ -z "$command_state" || "$command_state" == Z* ]] && break
        owner_is_alive || abort_for_lost_owner
        (( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
        sleep 0.1
      done
      set +e
      wait "$command_pid"
      command_status=$?
      set -e
      cleanup_in_progress=true
      set +e
      terminate_group
      cleanup_status=$?
      set -e
      release_lane
      trap - HUP INT TERM
      (( cleanup_status == 137 )) && exit 137
      exit "$command_status"
    fi
    exec {lane_fd}>&-
    lane_fd=""
  done
  owner_is_alive || exit 125
  sleep 0.2
done
