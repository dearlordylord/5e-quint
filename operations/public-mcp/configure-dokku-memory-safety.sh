#!/usr/bin/env bash
set -euo pipefail

directory="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=dokku-environment.sh
source "$directory/dokku-environment.sh"
load_dokku_environment staging

ssh "root@$dokku_host" bash -s -- dnd-oracle-staging dnd-oracle <<'REMOTE'
set -euo pipefail

swapfile=/swapfile
if ! swapon --show=NAME --noheadings | grep -qx "$swapfile"; then
  if [[ ! -e "$swapfile" ]]; then
    fallocate -l 2G "$swapfile"
    chmod 600 "$swapfile"
    mkswap "$swapfile" >/dev/null
  fi
  swapon "$swapfile"
fi
if ! grep -Eq '^[[:space:]]*/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]' /etc/fstab; then
  cp /etc/fstab /etc/fstab.before-dnd-oracle-swap
  printf '%s\n' '/swapfile none swap sw 0 0' >> /etc/fstab
fi
printf '%s\n' 'vm.swappiness=10' > /etc/sysctl.d/90-dnd-oracle-swap.conf
sysctl vm.swappiness=10 >/dev/null

for app in "$@"; do
  dokku apps:exists "$app" >/dev/null
  dokku checks:disable "$app" web >/dev/null
done

free -h
swapon --show
for app in "$@"; do
  dokku checks:report "$app"
done
REMOTE
