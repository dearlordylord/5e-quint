#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

exec scripts/ralph-run.sh plans/RALPH_FULL_LEVEL1_12_SUPPORT.md "$@"
