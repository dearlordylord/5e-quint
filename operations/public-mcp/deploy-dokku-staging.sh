#!/usr/bin/env bash
set -euo pipefail

readonly dokku_host="49.13.172.86"
readonly dokku_app="dnd-oracle"
readonly dokku_remote="dokku-oracle"
readonly dokku_remote_url="dokku@$dokku_host:$dokku_app"
readonly public_origin="https://dnd-oracle.apps.loskutoff.com"
readonly expected_dockerfile="operations/public-mcp/Dockerfile"
readonly expected_storage_mount="-v /var/lib/dokku/data/storage/dnd-oracle:/var/lib/dnd-oracle"

if (( $# > 0 )); then
  if [[ "$1" == "--help" && $# == 1 ]]; then
    echo "usage: pnpm deploy:mcp:dokku-staging"
    echo "Deploys clean master to the dnd-oracle Dokku staging app and runs the public smoke."
    exit 0
  fi
  echo "usage: pnpm deploy:mcp:dokku-staging" >&2
  exit 64
fi

directory="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$directory/../.." && pwd)"
cd "$repository_root"

for command in curl git jq pnpm ssh; do
  command -v "$command" >/dev/null || {
    echo "Required command is unavailable: $command" >&2
    exit 69
  }
done

[[ "$(git branch --show-current)" == master ]] || {
  echo "Dokku staging deployments must run from master" >&2
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
publisher_name="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_PUBLISHER_NAME)"
publication_mode="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_PUBLICATION_MODE)"
configured_environment="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_MCP_ENVIRONMENT)"
openai_apps_challenge="$(ssh "dokku@$dokku_host" config:get "$dokku_app" DND_OPENAI_APPS_CHALLENGE || true)"
[[ -n "$publisher_name" && "$publication_mode" =~ ^(disabled|enabled)$ && "$configured_environment" == staging ]] || {
  echo "$dokku_app has invalid public smoke configuration" >&2
  exit 65
}
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

echo "Dokku staging deployment passed for $release at $public_origin."
