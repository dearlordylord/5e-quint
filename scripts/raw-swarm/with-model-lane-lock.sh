#!/usr/bin/env bash
set -euo pipefail

if (( $# == 0 )); then
  printf '%s\n' 'usage: scripts/raw-swarm/with-model-lane-lock.sh <command> [args...]' >&2
  exit 64
fi
if [[ -n "${DND_RESOURCE_LOCK_KIND:-}" || -n "${DND_RAW_SWARM_MODEL_LANE:-}" ]]; then
  printf '%s\n' 'Raw Swarm model execution refuses a nested resource lock.' >&2
  exit 70
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

git_common_dir=$(git rev-parse --path-format=absolute --git-common-dir)
while true; do
  for lane in 1 2 3; do
    lock_path="$git_common_dir/raw-swarm-model-lane-$lane.lock"
    exec {lane_fd}>"$lock_path"
    if flock --exclusive --nonblock "$lane_fd"; then
      owner_is_alive || exit 125
      export DND_RAW_SWARM_MODEL_LANE=$lane
      printf '[raw-swarm-model] acquired lane %s: %s\n' "$lane" "${1##*/}" >&2
      exec "$@"
    fi
    exec {lane_fd}>&-
  done
  owner_is_alive || exit 125
  sleep 0.2
done
