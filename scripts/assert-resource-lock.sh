#!/usr/bin/env bash
set -euo pipefail

expected_kind="${1:-}"
if [[ "$expected_kind" != broad && "$expected_kind" != mbt ]]; then
  echo "usage: scripts/assert-resource-lock.sh <broad|mbt>" >&2
  exit 64
fi

if [[ "${DND_RESOURCE_LOCK_KIND:-}" != "$expected_kind" ]]; then
  echo "resource-lock body requires the $expected_kind lock" >&2
  exit 70
fi
