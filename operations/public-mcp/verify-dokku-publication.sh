#!/usr/bin/env bash
set -euo pipefail

readonly expected_scope="play-sessions"

if (( $# != 1 )); then
  echo "usage: $0 <deployment-attestation-output>" >&2
  exit 64
fi

output_file="$1"
[[ ! -e "$output_file" ]] || {
  echo "Refusing to replace deployment attestation: $output_file" >&2
  exit 73
}

directory="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$directory/../.." && pwd)"
# shellcheck source=dokku-environment.sh
source "$directory/dokku-environment.sh"
load_dokku_environment production
readonly expected_resource="$public_origin/mcp"
cd "$repository_root"

for command in curl jq pnpm ssh; do
  command -v "$command" >/dev/null || {
    echo "Required command is unavailable: $command" >&2
    exit 69
  }
done

read_config() {
  ssh "dokku@$dokku_host" config:get "$dokku_app" "$1"
}

environment="$(read_config DND_MCP_ENVIRONMENT)"
publication_mode="$(read_config DND_MCP_PUBLICATION_MODE)"
publisher_name="$(read_config DND_MCP_PUBLISHER_NAME)"
release="$(read_config DND_MCP_RELEASE)"
configured_public_origin="$(read_config DND_MCP_PUBLIC_ORIGIN)"
authorization_database_path="$(read_config DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH)"
authorization_secret="$(read_config DND_SAVED_SESSION_AUTHORIZATION_SECRET)"
challenge="$(read_config DND_OPENAI_APPS_CHALLENGE)"
readonly authorization_server="$public_origin/api/auth"
readonly issuer="$authorization_server"
readonly jwks_url="$authorization_server/jwks"

[[ "$environment" == production && "$publication_mode" == enabled ]] || {
  echo "$dokku_app is not in production publication mode" >&2
  exit 65
}
[[ -n "$publisher_name" && "$publisher_name" != "5e Quint developers" ]] || {
  echo "$dokku_app does not use a verified publisher name" >&2
  exit 65
}
[[ "$release" =~ ^[0-9a-f]{40}$ && "$configured_public_origin" == "$public_origin" ]] || {
  echo "$dokku_app has invalid release or public origin" >&2
  exit 65
}
[[ "$authorization_database_path" == /var/lib/dnd-oracle/saved-session-authorization.sqlite && ${#authorization_secret} -ge 32 && -n "$challenge" ]] || {
  echo "$dokku_app has incomplete saved-session authorization or domain-challenge configuration" >&2
  exit 65
}
[[ "$authorization_secret" != replace-with-* && "$authorization_secret" != *'<'* && "$authorization_secret" != *'>'* ]] || {
  echo "$dokku_app uses a saved-session authorization placeholder instead of a generated secret" >&2
  exit 65
}

protected_resource="$(curl --fail --silent --show-error "$public_origin/.well-known/oauth-protected-resource")"
jq -e \
  --arg resource "$expected_resource" \
  --arg authorization_server "$authorization_server" \
  --arg scope "$expected_scope" \
  '.resource == $resource and
   .authorization_servers == [$authorization_server] and
   (.scopes_supported | index($scope) != null)' \
  <<<"$protected_resource" >/dev/null

authorization_metadata=""
for metadata_url in \
  "$authorization_server/.well-known/oauth-authorization-server" \
  "$public_origin/.well-known/oauth-authorization-server/api/auth"; do
  if candidate="$(curl --fail --silent --show-error "$metadata_url" 2>/dev/null)"; then
    if jq -e --arg issuer "$issuer" '.issuer == $issuer' <<<"$candidate" >/dev/null; then
      authorization_metadata="$candidate"
      break
    fi
  fi
done
[[ -n "$authorization_metadata" ]] || {
  echo "Authorization server exposes no matching OAuth or OpenID metadata" >&2
  exit 65
}
jq -e \
  '(.authorization_endpoint | startswith("https://")) and
   (.token_endpoint | startswith("https://")) and
   (.code_challenge_methods_supported | index("S256") != null) and
   (.scopes_supported | index("play-sessions") != null) and
   ([.token_endpoint_auth_methods_supported[]] |
      any(. == "none" or . == "private_key_jwt" or
          . == "client_secret_post" or . == "client_secret_basic")) and
   ((.client_id_metadata_document_supported == true) or
    (.registration_endpoint | type == "string" and startswith("https://")))' \
  <<<"$authorization_metadata" >/dev/null

curl --fail --silent --show-error "$jwks_url" |
  jq -e '.keys | type == "array" and length > 0' >/dev/null
[[ "$(curl --fail --silent --show-error "$public_origin/.well-known/openai-apps-challenge")" == "$challenge" ]] || {
  echo "OpenAI domain challenge response does not exactly match configuration" >&2
  exit 65
}

DND_MCP_PUBLISHER_NAME="$publisher_name" \
  DND_MCP_PUBLICATION_MODE="$publication_mode" \
  DND_OPENAI_APPS_CHALLENGE="$challenge" \
  "$directory/smoke-origin.sh" "$public_origin" "$release" "$environment"

mkdir -p "$(dirname "$output_file")"
jq -n \
  --arg origin "$public_origin" \
  --arg publisher_name "$publisher_name" \
  --arg release "$release" \
  --arg verified_at "$(date --utc +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    status: "verifiedLiveProduction",
    environment: "production",
    origin: $origin,
    publisherName: $publisher_name,
    release: $release,
    domainChallenge: "servedExact",
    oauthDiscovery: "verified",
    publicSmoke: "passed",
    verifiedAt: $verified_at
  }' >"$output_file"

echo "Dokku publication verification passed; wrote $output_file without credentials."
