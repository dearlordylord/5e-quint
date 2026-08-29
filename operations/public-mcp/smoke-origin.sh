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
[[ "$(curl --fail --silent --show-error --head --write-out '%{content_type}' --output /dev/null "$origin/plugin-demo.mp4")" == "video/mp4" ]]
if [[ -n "${DND_OPENAI_APPS_CHALLENGE:-}" ]]; then
  [[ "$(curl --fail --silent --show-error "$origin/.well-known/openai-apps-challenge")" == "$DND_OPENAI_APPS_CHALLENGE" ]]
fi
curl --fail --silent --show-error "$origin/.well-known/oauth-protected-resource" |
  jq -e --arg resource "$origin/mcp" --arg authorization_server "$origin/api/auth" \
    '.resource == $resource and .authorization_servers == [$authorization_server]' >/dev/null
authorization_metadata="$(curl --fail --silent --show-error "$origin/api/auth/.well-known/oauth-authorization-server")"
jq -e --arg issuer "$origin/api/auth" \
  '.issuer == $issuer and (.code_challenge_methods_supported | index("S256") != null)' \
  <<<"$authorization_metadata" >/dev/null
curl --fail --silent --show-error "$origin/api/auth/jwks" |
  jq -e '.keys | type == "array" and length > 0' >/dev/null

DND_MCP_STAGING_URL="$origin/mcp" pnpm --filter @dnd/mcp verify:staging
if [[ "$expected_environment" == staging ]]; then
  DND_MCP_SAVED_SESSION_URL="$origin/mcp" \
    pnpm --filter @dnd/mcp smoke:saved-session-authorization
fi
