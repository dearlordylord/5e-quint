#!/usr/bin/env bash
set -euo pipefail
if (( $# != 6 )); then
  echo "usage: $0 STATE_DIRECTORY PREPARED_KIT SOURCE_RELEASE TARGET_RELEASE ABSENT_BACKUP ABSENT_REPORT" >&2
  exit 64
fi
state_directory="$(realpath "$1")"
kit="$(realpath "$2")"
source_release="$3"
target_release="$4"
backup="$5"
report="$6"
[[ "$source_release" =~ ^[0-9a-f]{40}$ && "$target_release" =~ ^[0-9a-f]{40}$ ]] || exit 64
directory="$(cd "$(dirname "$0")" && pwd)"
barrier="$state_directory/migration-admission-closed"
exec 9>"$state_directory/migration.lock"
flock --nonblock 9 || { echo "Another offline conversion is active" >&2; exit 75; }
# The state mount is exclusively owned by the deployment. Include scaled and one-off writers.
writer_ids="$(docker ps --quiet --filter "volume=$state_directory")"
writers=()
if [[ -n "$writer_ids" ]]; then mapfile -t writers <<<"$writer_ids"; fi
[[ ! -e "$barrier" ]] || { echo "Existing conversion requires ad hoc investigation" >&2; exit 65; }
(umask 077; set -o noclobber; printf 'blocked\n' >"$barrier")
if (( ${#writers[@]} != 0 )); then
  docker stop --time -1 "${writers[@]}" >/dev/null
fi
[[ -z "$(docker ps --quiet --filter "volume=$state_directory")" ]] || {
  echo "State mount still has running writers; admission remains closed" >&2
  exit 75
}
node "$directory/convert.mjs" "$state_directory/play-sessions.sqlite" "$backup" "$report" "$kit" "$source_release" "$target_release"
(umask 077; printf '%s\n' "$target_release" >"$barrier")
echo "Converted. Writers remain stopped; deploy only $target_release."
