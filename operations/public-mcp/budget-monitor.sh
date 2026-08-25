#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "usage: $0 <environment-file>" >&2
  exit 64
fi
directory="$(cd "$(dirname "$0")" && pwd)"
set -a
# shellcheck disable=SC1090
source "$1"
set +a
node "$directory/collect-budget-measurement.mjs"
measurement="$DND_MCP_RELEASE_DIRECTORY/measurements.json"
set +e
alert="$(node "$directory/budget-check.mjs" "$directory/budget-policy.json" "$measurement" "$DND_MCP_BUDGET_ALERT_RECIPIENT")"
status=$?
set -e
if (( status == 2 )); then
  [[ "$DND_MCP_BUDGET_ALERT_RECIPIENT" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || {
    echo "Budget alert recipient must be an email address" >&2
    exit 65
  }
  alert_digest="$(printf '%s' "$alert" | sha256sum | cut -d' ' -f1)"
  digest_path="$DND_MCP_RELEASE_DIRECTORY/budget-alert-digest"
  previous_digest="$(<"$digest_path" 2>/dev/null || true)"
  if [[ "$alert_digest" != "$previous_digest" ]]; then
    {
      printf 'To: %s\n' "$DND_MCP_BUDGET_ALERT_RECIPIENT"
      printf 'Subject: DND Oracle budget alert (%s)\n' "$DND_MCP_ENVIRONMENT"
      printf 'Content-Type: application/json\n\n%s\n' "$alert"
    } | /usr/sbin/sendmail -t
    printf '%s\n' "$alert_digest" >"$digest_path"
  fi
elif (( status != 0 )); then
  exit "$status"
else
  rm -f "$DND_MCP_RELEASE_DIRECTORY/budget-alert-digest"
fi
