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
source "$script_directory/../process-supervision.sh"
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

supervision_require_owner raw-swarm-model || exit $?
pending_signal_status=0
lane_fd=""

release_lane() {
  if [[ -n "$lane_fd" ]]; then
    exec {lane_fd}>&-
    lane_fd=""
  fi
}

handle_signal() {
  local status="$1"
  if (( pending_signal_status == 0 )); then
    pending_signal_status="$status"
  fi
  status="$pending_signal_status"
  [[ "$supervision_cleanup_in_progress" == false ]] || return 0
  if [[ -n "$supervision_command_pid" || -n "$supervision_marker" ]]; then
    set +e
    supervision_cleanup_command
    local cleanup_status=$?
    set -e
    release_lane
    (( cleanup_status == 137 )) && exit 137
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
      supervision_owner_is_alive || exit 125
      now_milliseconds=$(date +%s%3N)
      if (( now_milliseconds >= operation_deadline_milliseconds )); then
        printf '%s\n' 'Raw Swarm model operation exceeded its execution deadline while acquiring a lane.' >&2
        exit 124
      fi
      export DND_RAW_SWARM_MODEL_LANE=$lane
      export DND_RAW_SWARM_MODEL_LANE_GUARD=v1
      export DND_RAW_SWARM_MODEL_LANE_LOCK_PATH=$lock_path
      export DND_RAW_SWARM_MODEL_LANE_FD=$lane_fd
      export DND_RAW_SWARM_MODEL_LANE_OWNER_PID=$model_lane_owner_pid
      export DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME=$model_lane_owner_start_time
      printf '[raw-swarm-model] acquired lane %s: %s\n' "$lane" "${1##*/}" >&2
      (( pending_signal_status == 0 )) || handle_signal "$pending_signal_status"
      set +e
      supervision_run_command raw-swarm-model "$operation_deadline_milliseconds" "$@"
      command_status=$?
      set -e
      release_lane
      trap - HUP INT TERM
      exit "$command_status"
    fi
    exec {lane_fd}>&-
    lane_fd=""
  done
  supervision_owner_is_alive || exit 125
  sleep 0.2
done
