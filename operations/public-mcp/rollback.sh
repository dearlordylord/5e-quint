#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "usage: $0 <environment-file>" >&2
  exit 64
fi

directory="$(cd "$(dirname "$0")" && pwd)"
environment_file="$(realpath "$1")"
"$directory/verify-config.sh" "$environment_file"
set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a
release_directory="$DND_MCP_RELEASE_DIRECTORY"
exec 9>"$release_directory/operation.lock"
flock --nonblock 9 || { echo "Another $DND_MCP_ENVIRONMENT release operation is active" >&2; exit 75; }
release_history="$release_directory/release-history"
rollback_history="$release_directory/release-history.next"
operations_environment_directory="$DND_MCP_OPERATIONS_DIRECTORY/$DND_MCP_ENVIRONMENT"

parse_release_record() {
  local extra
  IFS='|' read -r parsed_image parsed_release parsed_storage_format parsed_operations_release extra <<<"$1"
  [[ "$parsed_image" == *@sha256:* && "$parsed_release" =~ ^[0-9a-f]{40}$ && "$parsed_storage_format" =~ ^[0-9]+$ && "$parsed_operations_release" =~ ^[0-9a-f]{40}[.][A-Za-z0-9]+$ && -z "$extra" ]]
}

[[ -r "$release_history" ]] || { echo "No release history is recorded" >&2; exit 66; }
mapfile -t recorded_releases <"$release_history"
(( ${#recorded_releases[@]} == 2 )) || { echo "No previous release is recorded" >&2; exit 66; }
current_record="${recorded_releases[0]}"
previous_record="${recorded_releases[1]}"
parse_release_record "$current_record" || { echo "Recorded current release is invalid" >&2; exit 65; }
current_image="$parsed_image"
current_release_id="$parsed_release"
current_storage_format="$parsed_storage_format"
current_operations_release_id="$parsed_operations_release"
parse_release_record "$previous_record" || { echo "Recorded previous release is invalid" >&2; exit 65; }
previous_image="$parsed_image"
previous_release_id="$parsed_release"
previous_storage_format="$parsed_storage_format"
previous_operations_release_id="$parsed_operations_release"
[[ "$previous_operations_release_id" != "$current_operations_release_id" ]] || {
  echo "Current and previous releases must use different operations identities" >&2
  exit 65
}
[[ "$previous_storage_format" == "$current_storage_format" ]] || {
  echo "Automatic rollback is blocked across storage format versions" >&2
  exit 65
}
current_operations_release="$operations_environment_directory/releases/$current_operations_release_id"
previous_operations_release="$operations_environment_directory/releases/$previous_operations_release_id"
[[ -d "$current_operations_release" && -d "$previous_operations_release" ]] || {
  echo "Recorded release has no installed budget monitor" >&2
  exit 66
}
printf '%s\n%s\n' "$previous_record" "$current_record" >"$rollback_history"
ln -sfn "$previous_operations_release" "$operations_environment_directory/current.next"

restore_current_release() {
  local failure="$1"
  rm -f "$rollback_history" "$operations_environment_directory/current.next"
  export DND_MCP_IMAGE="$current_image" DND_MCP_RELEASE="$current_release_id"
  docker compose --env-file "$environment_file" -f "$directory/compose.yaml" up --detach --wait mcp
  ln -sfn "$current_operations_release" "$operations_environment_directory/current.next"
  mv -Tf "$operations_environment_directory/current.next" "$operations_environment_directory/current"
  "$directory/smoke.sh" "$environment_file" "$current_release_id"
  echo "$failure; restored the pre-rollback current release" >&2
}

export DND_MCP_IMAGE="$previous_image" DND_MCP_RELEASE="$previous_release_id"
if ! docker compose --env-file "$environment_file" -f "$directory/compose.yaml" up --detach --wait mcp; then
  restore_current_release "Rollback candidate startup failed"
  exit 1
fi
if ! "$directory/smoke.sh" "$environment_file" "$previous_release_id"; then
  restore_current_release "Rollback smoke failed"
  exit 1
fi
if ! mv -Tf "$operations_environment_directory/current.next" "$operations_environment_directory/current"; then
  restore_current_release "Rollback monitor promotion failed"
  exit 1
fi
if ! mv -f "$rollback_history" "$release_history"; then
  restore_current_release "Rollback history promotion failed"
  exit 1
fi
