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

for command in curl git jq pnpm ssh; do
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

if configured_remote="$(git remote get-url "$dokku_remote" 2>/dev/null)"; then
  [[ "$configured_remote" == "$dokku_remote_url" ]] || {
    echo "$dokku_remote points to $configured_remote, expected $dokku_remote_url" >&2
    exit 65
  }
else
  git remote add "$dokku_remote" "$dokku_remote_url"
fi

ssh "dokku@$dokku_host" apps:exists "$dokku_app" >/dev/null
configured_dockerfile="$(ssh "dokku@$dokku_host" builder-dockerfile:report "$dokku_app" --builder-dockerfile-computed-dockerfile-path)"
[[ "$configured_dockerfile" == "$expected_dockerfile" ]] || {
  echo "$dokku_app builds $configured_dockerfile, expected $expected_dockerfile" >&2
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
  oauth_resource="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OAUTH_RESOURCE_URL)"
  oauth_authorization_server="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OAUTH_AUTHORIZATION_SERVER)"
  oauth_issuer="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OAUTH_ISSUER)"
  oauth_jwks_url="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OAUTH_JWKS_URL)"
  [[ "$oauth_resource" == "$public_origin/mcp" && -n "$oauth_authorization_server" && -n "$oauth_issuer" && -n "$oauth_jwks_url" ]] || {
    echo "Production requires complete OAuth configuration for its exact MCP resource" >&2
    exit 65
  }
fi
previous_release="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_RELEASE)"
[[ "$previous_release" =~ ^[0-9a-f]{40}$ ]] || {
  echo "$dokku_app has no valid configured release to restore" >&2
  exit 65
}
ssh "dokku@$dokku_host" config:set --no-restart "$dokku_app" "DND_MCP_RELEASE=$release" >/dev/null

if ! git push "$dokku_remote" HEAD:master; then
  echo "Dokku push failed; restoring the configured release to $previous_release" >&2
  ssh "dokku@$dokku_host" config:set --no-restart "$dokku_app" "DND_MCP_RELEASE=$previous_release" >/dev/null
  exit 1
fi

DND_MCP_PUBLISHER_NAME="$publisher_name" \
  DND_MCP_PUBLICATION_MODE="$publication_mode" \
  DND_OPENAI_APPS_CHALLENGE="$openai_apps_challenge" \
  "$directory/smoke-origin.sh" "$public_origin" "$release" "$configured_environment"

echo "Dokku $deployment_environment deployment passed for $release at $public_origin."
