#!/usr/bin/env bash
set -euo pipefail

if (( $# < 1 || $# > 2 )); then
  echo "usage: $0 <environment-file> [expected-release]" >&2
  exit 64
fi

environment_file="$1"
set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a
expected_release="${2:-$DND_MCP_RELEASE}"
origin="https://$DND_MCP_DOMAIN"

curl --fail --silent --show-error "$origin/health" | jq -e '.status == "ok"' >/dev/null
curl --fail --silent --show-error "$origin/version" | jq -e --arg release "$expected_release" --arg publisher "$DND_MCP_PUBLISHER_NAME" '.release == $release and .publisher == $publisher' >/dev/null
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
echo "Public MCP smoke passed for $DND_MCP_ENVIRONMENT at $origin."
