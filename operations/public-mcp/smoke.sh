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

directory="$(cd "$(dirname "$0")" && pwd)"
"$directory/smoke-origin.sh" "$origin" "$expected_release" "$DND_MCP_ENVIRONMENT"
echo "Public MCP smoke passed for $DND_MCP_ENVIRONMENT at $origin."
