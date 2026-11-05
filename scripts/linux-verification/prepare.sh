#!/usr/bin/env bash
set -euo pipefail

git config --global --add safe.directory /source-git
git init --quiet --separate-git-dir=/verification-git /workspace
mkdir -p /verification-git/objects/info
printf '/source-git/objects\n' > /verification-git/objects/info/alternates
git -C /workspace fetch --quiet --no-write-fetch-head /source-git \
  '+refs/heads/*:refs/remotes/source/*' '+refs/tags/*:refs/tags/*'
git -C /workspace update-ref HEAD "$DND_INPUT_REVISION"
git -C /workspace read-tree --empty
git -C /workspace update-index -z --index-info < /job/index-info
cp -a /input/. /workspace/
cd /workspace

if [[ -f mise.toml ]]; then mise trust mise.toml; fi

. scripts/resource-lock-owner.sh
# Download/install is itself a bounded broad job. Dependency mutation is private
# to this container; only its CAS download store is shared between managed jobs.
with_resource_lock_owner scripts/with-broad-workspace-lock.sh \
  pnpm install --frozen-lockfile --strict-peer-dependencies \
    --store-dir /pnpm-store --reporter append-only
node /runner/check-input.mjs dependency-installation

cd "$DND_INPUT_CWD"
# Re-establish a Linux owner for callers that arrived via the macOS owner helper.
if [[ "$DND_INPUT_HAS_WRAPPER" = true ]]; then
  with_resource_lock_owner "$@"
else
  "$@"
fi
