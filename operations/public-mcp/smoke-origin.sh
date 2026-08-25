#!/usr/bin/env bash
set -euo pipefail

if (( $# != 3 )); then
  echo "usage: $0 <public-origin> <expected-release> <expected-environment>" >&2
  exit 64
fi

origin="$1"
expected_release="$2"
expected_environment="$3"

curl --fail --silent --show-error "$origin/health" | jq -e '.status == "ok"' >/dev/null
curl --fail --silent --show-error "$origin/version" | jq -e --arg release "$expected_release" --arg environment "$expected_environment" --arg publisher "$DND_MCP_PUBLISHER_NAME" '.release == $release and .environment == $environment and .publisher == $publisher' >/dev/null
for publisher_path in / /support /privacy /terms; do
  curl --fail --silent --show-error "$origin$publisher_path" >/dev/null
done
if [[ -n "${DND_OPENAI_APPS_CHALLENGE:-}" ]]; then
  [[ "$(curl --fail --silent --show-error "$origin/.well-known/openai-apps-challenge")" == "$DND_OPENAI_APPS_CHALLENGE" ]]
fi
if [[ "$DND_MCP_PUBLICATION_MODE" == enabled ]]; then
  curl --fail --silent --show-error "$origin/.well-known/oauth-protected-resource" | jq -e --arg resource "$origin/mcp" '.resource == $resource' >/dev/null
fi

DND_MCP_STAGING_URL="$origin/mcp" pnpm --filter @dnd/mcp verify:staging
