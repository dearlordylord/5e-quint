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
mkdir -p "$release_directory"
exec 9>"$release_directory/operation.lock"
flock --nonblock 9 || { echo "Another $DND_MCP_ENVIRONMENT release operation is active" >&2; exit 75; }
release_history="$release_directory/release-history"
candidate_history="$release_directory/release-history.next"
operations_environment_directory="$DND_MCP_OPERATIONS_DIRECTORY/$DND_MCP_ENVIRONMENT"
has_current_release=false
retired_operations_release=""

parse_release_record() {
  local extra
  IFS='|' read -r parsed_image parsed_release parsed_storage_format parsed_operations_release extra <<<"$1"
  [[ "$parsed_image" == *@sha256:* && "$parsed_release" =~ ^[0-9a-f]{40}$ && "$parsed_storage_format" =~ ^[0-9]+$ && "$parsed_operations_release" =~ ^[0-9a-f]{40}[.][A-Za-z0-9]+$ && -z "$extra" ]]
}

if [[ -r "$release_history" ]]; then
  mapfile -t recorded_releases <"$release_history"
  (( ${#recorded_releases[@]} >= 1 && ${#recorded_releases[@]} <= 2 )) || {
    echo "Release history must contain the current and optional previous release" >&2
    exit 65
  }
  current_record="${recorded_releases[0]}"
  parse_release_record "$current_record" || {
    echo "Current release record is invalid" >&2
    exit 65
  }
  current_image="$parsed_image"
  current_release_id="$parsed_release"
  current_operations_release_id="$parsed_operations_release"
  current_operations_release="$operations_environment_directory/releases/$parsed_operations_release"
  [[ -d "$current_operations_release" ]] || {
    echo "Current release has no installed budget monitor" >&2
    exit 66
  }
  has_current_release=true
  if (( ${#recorded_releases[@]} == 2 )); then
    parse_release_record "${recorded_releases[1]}" || {
      echo "Previous release record is invalid" >&2
      exit 65
    }
    [[ "$parsed_operations_release" != "$current_operations_release_id" ]] || {
      echo "Current and previous releases must use different operations identities" >&2
      exit 65
    }
    retired_operations_release="$operations_environment_directory/releases/$parsed_operations_release"
    [[ -d "$retired_operations_release" ]] || {
      echo "Previous release has no installed budget monitor" >&2
      exit 66
    }
  fi
fi

restore_last_known_good() {
  local failure="$1"
  rm -f "$candidate_history" "$operations_environment_directory/current.next"
  if [[ "$has_current_release" == true ]]; then
    export DND_MCP_IMAGE="$current_image" DND_MCP_RELEASE="$current_release_id"
    docker compose --env-file "$environment_file" -f "$directory/compose.yaml" up --detach --wait mcp
    ln -sfn "$current_operations_release" "$operations_environment_directory/current.next"
    mv -Tf "$operations_environment_directory/current.next" "$operations_environment_directory/current"
    rm -r -- "$candidate_operations_directory"
    "$directory/smoke.sh" "$environment_file" "$current_release_id"
    echo "$failure; restored the last-known-good current release" >&2
  else
    docker compose --env-file "$environment_file" -f "$directory/compose.yaml" down
    rm -f "$operations_environment_directory/current" "$operations_environment_directory/current.next"
    rm -r -- "$candidate_operations_directory"
    systemctl disable --now "dnd-oracle-budget-$DND_MCP_ENVIRONMENT.timer" >/dev/null 2>&1 || true
    echo "$failure; removed the failed first-deployment candidate" >&2
  fi
}

mkdir -p "$operations_environment_directory/releases"
candidate_operations_directory="$(mktemp -d "$operations_environment_directory/releases/$DND_MCP_RELEASE.XXXXXXXX")"
DND_MCP_OPERATIONS_RELEASE_ID="${candidate_operations_directory##*/}"
export DND_MCP_OPERATIONS_RELEASE_ID
docker compose --env-file "$environment_file" -f "$directory/compose.yaml" pull
"$directory/deploy-ingress.sh" "$environment_file"
if ! docker compose --env-file "$environment_file" -f "$directory/compose.yaml" up --detach --wait; then
  restore_last_known_good "Candidate startup failed"
  exit 1
fi
if ! "$directory/smoke.sh" "$environment_file"; then
  restore_last_known_good "Deployment smoke failed"
  exit 1
fi
if ! storage_format="$(curl --fail --silent --show-error "https://$DND_MCP_DOMAIN/version" | jq -er '.storageFormatVersion')" || [[ ! "$storage_format" =~ ^[0-9]+$ ]]; then
  restore_last_known_good "Release metadata lookup failed"
  exit 1
fi
candidate_record="$DND_MCP_IMAGE|$DND_MCP_RELEASE|$storage_format|$DND_MCP_OPERATIONS_RELEASE_ID"
history_contents="$candidate_record"$'\n'
if [[ "$has_current_release" == true ]]; then
  history_contents+="$current_record"$'\n'
fi
if ! printf '%s' "$history_contents" >"$candidate_history"; then
  restore_last_known_good "Release history preparation failed"
  exit 1
fi
if ! "$directory/install-budget-monitor.sh" "$environment_file"; then
  restore_last_known_good "Budget monitor installation failed"
  exit 1
fi
if ! mv -f "$candidate_history" "$release_history"; then
  restore_last_known_good "Release history promotion failed"
  exit 1
fi
if [[ -n "$retired_operations_release" ]]; then
  if ! rm -r -- "$retired_operations_release"; then
    echo "Deployment committed, but retired operations cleanup failed: $retired_operations_release" >&2
  fi
fi
