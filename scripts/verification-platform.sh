#!/usr/bin/env sh
set -eu

case "$(uname -s)" in
  Linux) exec "$@" ;;
  Darwin)
    repository_root="$(git rev-parse --show-toplevel)"
    exec node "$repository_root/scripts/linux-verification/run.mjs" --owner-pid "$PPID" "$@"
    ;;
  *) echo "Verification requires Linux or macOS with Docker." >&2; exit 78 ;;
esac
