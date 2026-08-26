#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <staging|production>" >&2
}

if (( $# != 1 )); then
  usage
  exit 64
fi

directory="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$directory/../.." && pwd)"
# shellcheck source=dokku-environment.sh
source "$directory/dokku-environment.sh"
if ! load_dokku_environment "$1"; then
  usage
  exit 64
fi
cd "$repository_root"

for command in curl find gh git jq pnpm ssh; do
  command -v "$command" >/dev/null || {
    echo "Required command is unavailable: $command" >&2
    exit 69
  }
done

[[ "$(git branch --show-current)" == master ]] || {
  echo "Dokku deployments must run from master" >&2
  exit 65
}
git diff --quiet && git diff --cached --quiet || {
  echo "Commit or restore tracked changes before deploying" >&2
  exit 65
}

release="$(git rev-parse --verify HEAD)"
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || {
  echo "HEAD is not a full Git release identity" >&2
  exit 65
}
git fetch origin master
[[ "$(git rev-parse origin/master)" == "$release" ]] || {
  echo "Deployments require HEAD to be the published origin/master release" >&2
  exit 65
}

ssh "dokku@$dokku_host" apps:exists "$dokku_app" >/dev/null
disabled_checks="$(ssh "dokku@$dokku_host" checks:report "$dokku_app" --checks-disabled-list)"
[[ ",$disabled_checks," == *,web,* ]] || {
  echo "$dokku_app must stop its old web process before starting a release" >&2
  exit 65
}
configured_storage_mount="$(ssh "dokku@$dokku_host" storage:report "$dokku_app" --storage-deploy-mounts)"
[[ "$configured_storage_mount" == "$expected_storage_mount" ]] || {
  echo "$dokku_app storage mount differs from $expected_storage_mount" >&2
  exit 65
}
configured_database_path="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_PLAY_SESSION_DATABASE_PATH)"
[[ "$configured_database_path" == /var/lib/dnd-oracle/play-sessions.sqlite ]] || {
  echo "$dokku_app does not store Play Sessions in its persistent mount" >&2
  exit 65
}
configured_public_origin="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_PUBLIC_ORIGIN)"
configured_authorization_database_path="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH)"
configured_authorization_secret="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_SAVED_SESSION_AUTHORIZATION_SECRET)"
[[ "$configured_public_origin" == "$public_origin" ]] || {
  echo "$dokku_app public origin differs from $public_origin" >&2
  exit 65
}
[[ "$configured_authorization_database_path" == /var/lib/dnd-oracle/saved-session-authorization.sqlite ]] || {
  echo "$dokku_app does not store saved-session authorization in its persistent mount" >&2
  exit 65
}
(( ${#configured_authorization_secret} >= 32 )) || {
  echo "$dokku_app has no valid saved-session authorization secret" >&2
  exit 65
}
[[ "$configured_authorization_secret" != replace-with-* && "$configured_authorization_secret" != *'<'* && "$configured_authorization_secret" != *'>'* ]] || {
  echo "$dokku_app uses a saved-session authorization placeholder instead of a generated secret" >&2
  exit 65
}
publisher_name="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_PUBLISHER_NAME)"
publication_mode="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_PUBLICATION_MODE)"
configured_environment="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_ENVIRONMENT)"
openai_apps_challenge="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OPENAI_APPS_CHALLENGE || true)"
[[ -n "$publisher_name" && "$publication_mode" =~ ^(disabled|enabled)$ && "$configured_environment" == "$deployment_environment" ]] || {
  echo "$dokku_app has invalid $deployment_environment smoke configuration" >&2
  exit 65
}
if [[ "$deployment_environment" == production ]]; then
  [[ "$publication_mode" == enabled && "$publisher_name" != "5e Quint developers" && -n "$openai_apps_challenge" ]] || {
    echo "Production requires publication mode, the verified publisher name, and the OpenAI domain challenge" >&2
    exit 65
  }
fi
previous_release="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_RELEASE)"
[[ "$previous_release" =~ ^[0-9a-f]{40}$ ]] || {
  echo "$dokku_app has no valid configured release to restore" >&2
  exit 65
}
available_memory_kib="$(ssh "root@$dokku_host" "awk '/^MemAvailable:/ { print \$2 }' /proc/meminfo")"
available_swap_kib="$(ssh "root@$dokku_host" "awk '/^SwapFree:/ { print \$2 }' /proc/meminfo")"
minimum_available_memory_kib=$((512 * 1024))
minimum_available_swap_kib=$((1024 * 1024))
(( available_memory_kib >= minimum_available_memory_kib )) || {
  echo "$dokku_host has less than 512 MiB available memory; refusing deployment" >&2
  exit 75
}
(( available_swap_kib >= minimum_available_swap_kib )) || {
  echo "$dokku_host has less than 1 GiB free swap; refusing deployment" >&2
  exit 75
}

workflow="public-mcp-image.yml"
gh workflow run "$workflow" --ref master -f "release=$release"
run_id=""
for ((attempt = 1; attempt <= 30; attempt += 1)); do
  run_id="$(
    gh run list \
      --workflow "$workflow" \
      --limit 20 \
      --json databaseId,createdAt,event,headSha \
      --jq \
      "map(select(.event == \"workflow_dispatch\" and .headSha == \"$release\")) | sort_by(.createdAt) | last | .databaseId // empty"
  )"
  [[ -z "$run_id" ]] || break
  sleep 2
done
[[ -n "$run_id" ]] || {
  echo "Unable to locate the off-host image build for $release" >&2
  exit 69
}
gh run watch "$run_id" --exit-status

artifact_directory="$(mktemp -d)"
trap 'rm -rf "$artifact_directory"' EXIT
gh run download "$run_id" --dir "$artifact_directory"
mapfile -t image_archives < <(
  find "$artifact_directory" -type f -name '*.tar' -print
)
(( ${#image_archives[@]} == 1 )) || {
  echo "The off-host image build must produce exactly one image archive" >&2
  exit 65
}
image_archive="${image_archives[0]}"
[[ -s "$image_archive" ]] || {
  echo "The off-host image archive is empty" >&2
  exit 65
}

previous_image="$(
  ssh "root@$dokku_host" \
    docker image inspect --format '{{.Id}}' "dokku/$dokku_app:latest"
)"
[[ "$previous_image" =~ ^sha256:[0-9a-f]{64}$ ]] || {
  echo "$dokku_app has no immutable image available for rollback" >&2
  exit 65
}
ssh "dokku@$dokku_host" config:set --no-restart "$dokku_app" "DND_MCP_RELEASE=$release" >/dev/null

if ! ssh "dokku@$dokku_host" \
  git:load-image \
  "$dokku_app" \
  "dnd-oracle:$release" \
  "5e Quint deployment" \
  "deployment@localhost" < "$image_archive"; then
  echo "Dokku image release failed; restoring $previous_release" >&2
  ssh "dokku@$dokku_host" config:set --no-restart "$dokku_app" "DND_MCP_RELEASE=$previous_release" >/dev/null
  ssh "dokku@$dokku_host" \
    git:from-image \
    "$dokku_app" \
    "$previous_image" \
    "5e Quint rollback" \
    "deployment@localhost" >/dev/null
  exit 1
fi

DND_MCP_PUBLISHER_NAME="$publisher_name" \
  DND_MCP_PUBLICATION_MODE="$publication_mode" \
  DND_OPENAI_APPS_CHALLENGE="$openai_apps_challenge" \
  "$directory/smoke-origin.sh" "$public_origin" "$release" "$configured_environment"

echo "Dokku $deployment_environment deployment passed for $release at $public_origin."
