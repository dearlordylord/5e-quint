#!/usr/bin/env sh

# This file must be sourced by the shell that will remain the direct parent of
# the guarded wrapper. The function records that shell's identity before it
# spawns the wrapper, closing the child-subreaper adoption race.
establish_resource_lock_owner() {
  owner_pid="$$"
  if [ ! -r "/proc/$owner_pid/stat" ]; then
    echo "[resource-lock-owner] canceled: owner process is unavailable" >&2
    return 125
  fi
  owner_start_time="$(sed 's/^.*) //' "/proc/$owner_pid/stat" | awk '{ print $20 }')"
  case "$owner_start_time" in
    "" | *[!0-9]*)
      echo "[resource-lock-owner] canceled: owner identity is unreadable" >&2
      return 125
      ;;
  esac

  export DND_RESOURCE_LOCK_OWNER_PID="$owner_pid"
  export DND_RESOURCE_LOCK_OWNER_START_TIME="$owner_start_time"
}

with_resource_lock_owner() {
  if [ "$#" -eq 0 ]; then
    echo "usage: with_resource_lock_owner <wrapper> [args...]" >&2
    return 64
  fi

  establish_resource_lock_owner || return $?
  "$@"
}
