#!/usr/bin/env bash
set -euo pipefail

exec "$(dirname -- "$0")/with-resource-lock.sh" mbt "$@"
