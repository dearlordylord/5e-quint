#!/usr/bin/env bash
set -euo pipefail

workspace="${1:-}"
[[ -n "$workspace" ]] || {
  printf 'usage: %s <workspace>\n' "$0" >&2
  exit 2
}

workspace="$(cd "$workspace" && pwd -P)"
[[ -f "$workspace/pnpm-lock.yaml" ]] || {
  printf 'Ralph workspace has no pnpm-lock.yaml: %s\n' "$workspace" >&2
  exit 1
}
[[ -f "$workspace/pnpm-workspace.yaml" ]] || {
  printf 'Ralph workspace has no pnpm-workspace.yaml: %s\n' "$workspace" >&2
  exit 1
}

# A shared node_modules tree is unsafe for concurrent worktrees: pnpm rewrites
# workspace-package links during install, so one lane can silently make another
# lane import its sources. Remove only inherited symlinks; pnpm owns any real
# install directories and repairs them in place.
if [[ -L "$workspace/node_modules" ]]; then
  unlink "$workspace/node_modules"
fi
if [[ -d "$workspace/packages" ]]; then
  find "$workspace/packages" -mindepth 2 -maxdepth 2 -type l -name node_modules -delete
fi

(
  cd "$workspace"
  CI=true HUSKY=0 pnpm install --offline --frozen-lockfile
)

[[ -d "$workspace/node_modules" && ! -L "$workspace/node_modules" ]] || {
  printf 'Ralph workspace install is not isolated: %s/node_modules\n' "$workspace" >&2
  exit 1
}

linked_package_installs="$(
  find "$workspace/packages" -mindepth 2 -maxdepth 2 -type l -name node_modules -print 2>/dev/null || true
)"
[[ -z "$linked_package_installs" ]] || {
  printf 'Ralph workspace contains linked package installs:\n%s\n' "$linked_package_installs" >&2
  exit 1
}
