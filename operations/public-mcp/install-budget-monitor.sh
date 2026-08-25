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

environment_directory="$DND_MCP_OPERATIONS_DIRECTORY/$DND_MCP_ENVIRONMENT"
[[ "${DND_MCP_OPERATIONS_RELEASE_ID:-}" =~ ^[0-9a-f]{40}[.][A-Za-z0-9]+$ ]] || {
  echo "DND_MCP_OPERATIONS_RELEASE_ID is invalid" >&2
  exit 65
}
release_directory="$environment_directory/releases/$DND_MCP_OPERATIONS_RELEASE_ID"
mkdir -p "$release_directory" "$DND_MCP_SYSTEMD_DIRECTORY"
for file in budget-monitor.sh budget-check.mjs budget-policy.json collect-budget-measurement.mjs; do
  cp "$directory/$file" "$release_directory/$file"
done
chmod 0755 "$release_directory/budget-monitor.sh"
install -m 0600 "$environment_file" "$release_directory/environment.env"
sed \
  -e "s|__DND_MCP_OPERATIONS_DIRECTORY__|$DND_MCP_OPERATIONS_DIRECTORY|g" \
  -e "s|__DND_MCP_ENVIRONMENT__|$DND_MCP_ENVIRONMENT|g" \
  "$directory/dnd-oracle-budget@.service" >"$DND_MCP_SYSTEMD_DIRECTORY/dnd-oracle-budget-$DND_MCP_ENVIRONMENT.service"
cp "$directory/dnd-oracle-budget@.timer" "$DND_MCP_SYSTEMD_DIRECTORY/dnd-oracle-budget-$DND_MCP_ENVIRONMENT.timer"
systemctl daemon-reload
ln -sfn "$release_directory" "$environment_directory/current.next"
mv -Tf "$environment_directory/current.next" "$environment_directory/current"
systemctl enable --now "dnd-oracle-budget-$DND_MCP_ENVIRONMENT.timer"
