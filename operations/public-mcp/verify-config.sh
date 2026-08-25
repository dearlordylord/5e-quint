#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "usage: $0 <environment-file>" >&2
  exit 64
fi

environment_file="$1"
set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a

case "${DND_MCP_ENVIRONMENT:-}" in
  staging | production) ;;
  *) echo "DND_MCP_ENVIRONMENT must be staging or production" >&2; exit 65 ;;
esac

required=(COMPOSE_PROJECT_NAME DND_MCP_DOMAIN DND_MCP_PUBLISHER_NAME DND_MCP_LOOPBACK_PORT DND_MCP_CADDY_CONFIG_DIRECTORY DND_MCP_OPERATIONS_DIRECTORY DND_MCP_SYSTEMD_DIRECTORY DND_MCP_IMAGE DND_MCP_RELEASE DND_MCP_STATE_DIRECTORY DND_MCP_RELEASE_DIRECTORY DND_MCP_METRICS_TOKEN DND_MCP_BUDGET_ALERT_RECIPIENT DND_MCP_FIXED_HOST_MONTHLY_USD DND_MCP_PUBLICATION_MODE)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "$name is required" >&2; exit 65; }
done

[[ "$DND_MCP_STATE_DIRECTORY" == /* ]] || {
  echo "DND_MCP_STATE_DIRECTORY must be absolute" >&2
  exit 65
}
[[ "$DND_MCP_STATE_DIRECTORY" == *"/$DND_MCP_ENVIRONMENT" ]] || {
  echo "DND_MCP_STATE_DIRECTORY must end in /$DND_MCP_ENVIRONMENT" >&2
  exit 65
}
[[ "$DND_MCP_RELEASE_DIRECTORY" == /* && "$DND_MCP_RELEASE_DIRECTORY" == *"/$DND_MCP_ENVIRONMENT" ]] || {
  echo "DND_MCP_RELEASE_DIRECTORY must be absolute and end in /$DND_MCP_ENVIRONMENT" >&2
  exit 65
}
for path_name in DND_MCP_CADDY_CONFIG_DIRECTORY DND_MCP_OPERATIONS_DIRECTORY DND_MCP_SYSTEMD_DIRECTORY; do
  [[ "${!path_name}" == /* ]] || { echo "$path_name must be absolute" >&2; exit 65; }
  [[ "${!path_name}" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo "$path_name contains unsupported characters" >&2; exit 65; }
done
[[ "$COMPOSE_PROJECT_NAME" == *"-$DND_MCP_ENVIRONMENT" ]] || {
  echo "COMPOSE_PROJECT_NAME must end in -$DND_MCP_ENVIRONMENT" >&2
  exit 65
}
[[ "$DND_MCP_IMAGE" == *@sha256:* ]] || {
  echo "DND_MCP_IMAGE must use an immutable sha256 digest" >&2
  exit 65
}
[[ "$DND_MCP_RELEASE" =~ ^[0-9a-f]{40}$ ]] || {
  echo "DND_MCP_RELEASE must be the 40-character Git commit baked into the image" >&2
  exit 65
}
[[ "$DND_MCP_DOMAIN" != *example.test ]] || {
  echo "DND_MCP_DOMAIN must be a deployed host, not example.test" >&2
  exit 65
}
[[ "$DND_MCP_DOMAIN" =~ ^[a-z0-9.-]+$ ]] || { echo "DND_MCP_DOMAIN is invalid" >&2; exit 65; }
[[ "$DND_MCP_PUBLISHER_NAME" == *[![:space:]]* ]] || {
  echo "DND_MCP_PUBLISHER_NAME must contain a non-whitespace character" >&2
  exit 65
}
[[ "$DND_MCP_PUBLISHER_NAME" =~ ^[^[:space:]](.*[^[:space:]])?$ ]] || {
  echo "DND_MCP_PUBLISHER_NAME must not have surrounding whitespace" >&2
  exit 65
}
[[ "$DND_MCP_PUBLISHER_NAME" != replace-with-* && "$DND_MCP_PUBLISHER_NAME" != *'<'* && "$DND_MCP_PUBLISHER_NAME" != *'>'* ]] || {
  echo "DND_MCP_PUBLISHER_NAME must be the exact verified publisher identity" >&2
  exit 65
}
[[ "$DND_MCP_LOOPBACK_PORT" =~ ^[0-9]+$ ]] && (( DND_MCP_LOOPBACK_PORT > 1024 && DND_MCP_LOOPBACK_PORT < 65536 )) || {
  echo "DND_MCP_LOOPBACK_PORT must be between 1025 and 65535" >&2
  exit 65
}
[[ -d "$DND_MCP_STATE_DIRECTORY" && "$(stat -c %u "$DND_MCP_STATE_DIRECTORY")" == 1000 ]] || {
  echo "DND_MCP_STATE_DIRECTORY must exist and be owned by container UID 1000" >&2
  exit 65
}
[[ "$DND_MCP_FIXED_HOST_MONTHLY_USD" =~ ^[0-9]+([.][0-9]+)?$ ]] || {
  echo "DND_MCP_FIXED_HOST_MONTHLY_USD must be a non-negative number" >&2
  exit 65
}
[[ "$DND_MCP_BUDGET_ALERT_RECIPIENT" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || {
  echo "DND_MCP_BUDGET_ALERT_RECIPIENT must be an email address" >&2
  exit 65
}

case "$DND_MCP_PUBLICATION_MODE" in
  disabled) ;;
  enabled)
    [[ "$DND_MCP_PUBLISHER_NAME" != "5e Quint developers" ]] || { echo "publication requires the verified publisher identity" >&2; exit 65; }
    [[ -n "${DND_OPENAI_APPS_CHALLENGE:-}" ]] || { echo "publication requires DND_OPENAI_APPS_CHALLENGE" >&2; exit 65; }
    oauth=(DND_OAUTH_RESOURCE_URL DND_OAUTH_AUTHORIZATION_SERVER DND_OAUTH_ISSUER DND_OAUTH_JWKS_URL)
    for name in "${oauth[@]}"; do
      [[ -n "${!name:-}" ]] || { echo "publication requires $name" >&2; exit 65; }
    done
    ;;
  *) echo "DND_MCP_PUBLICATION_MODE must be disabled or enabled" >&2; exit 65 ;;
esac

if [[ -n "${DND_OAUTH_RESOURCE_URL:-}" ]]; then
  [[ "$DND_OAUTH_RESOURCE_URL" == "https://$DND_MCP_DOMAIN/mcp" ]] || {
    echo "DND_OAUTH_RESOURCE_URL must be the environment's exact HTTPS /mcp URL" >&2
    exit 65
  }
fi

docker compose --env-file "$environment_file" -f "$(dirname "$0")/compose.yaml" config --quiet
echo "Public MCP configuration is valid for $DND_MCP_ENVIRONMENT."
