#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "usage: $0 <environment-file>" >&2
  exit 64
fi

directory="$(cd "$(dirname "$0")" && pwd)"
environment_file="$(realpath "$1")"
set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a
[[ "$(caddy version)" == v2.10.2* ]] || { echo "Caddy 2.10.2 is required" >&2; exit 65; }
mkdir -p "$DND_MCP_CADDY_CONFIG_DIRECTORY"
destination="$DND_MCP_CADDY_CONFIG_DIRECTORY/$COMPOSE_PROJECT_NAME.caddy"
temporary="$destination.tmp"
sed -e "s/__DND_MCP_DOMAIN__/$DND_MCP_DOMAIN/g" \
  -e "s/__DND_MCP_LOOPBACK_PORT__/$DND_MCP_LOOPBACK_PORT/g" \
  "$directory/Caddyfile" >"$temporary"
mv "$temporary" "$destination"
caddy validate --config /etc/caddy/Caddyfile
caddy adapt --config /etc/caddy/Caddyfile --pretty | grep -Fq "$DND_MCP_DOMAIN"
caddy reload --config /etc/caddy/Caddyfile
