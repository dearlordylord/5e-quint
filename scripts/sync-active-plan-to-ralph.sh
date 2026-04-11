#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/sync-active-plan-to-ralph.sh [--target /path/to/ralph-launcher] [--source /path/to/ACTIVE_PLAN.md] [--message "plan: sync active plan"]

Behavior:
  - Copies the source ACTIVE_PLAN.md into the active Ralph launcher worktree.
  - Commits the synced plan on the launcher's current branch.
  - Auto-detects the launcher worktree from a live `scripts/ralph-dual-run.sh` process when --target is omitted.

Notes:
  - This script syncs the live Ralph branch only. Commit the source plan on master first if
    you want the change to persist outside the current run.
  - Ralph only picks up tasks that exist on the branch/worktree it is actively running in.
EOF
}

SOURCE_PLAN="${PWD}/plans/ACTIVE_PLAN.md"
TARGET_WORKTREE=""
COMMIT_MESSAGE="plan: sync active plan"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_WORKTREE="${2:?missing value for --target}"
      shift 2
      ;;
    --source)
      SOURCE_PLAN="${2:?missing value for --source}"
      shift 2
      ;;
    --message)
      COMMIT_MESSAGE="${2:?missing value for --message}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$SOURCE_PLAN" ]]; then
  echo "Source plan not found: $SOURCE_PLAN" >&2
  exit 1
fi

detect_target_worktree() {
  local -a pids=()
  local pid cwd
  mapfile -t pids < <(ps -eo pid=,args= | awk '/scripts\/ralph-dual-run\.sh/ && $0 !~ /awk/ {print $1}')
  if [[ ${#pids[@]} -eq 0 ]]; then
    echo "No live Ralph harness process found; pass --target explicitly." >&2
    return 1
  fi

  local -A cwd_set=()
  for pid in "${pids[@]}"; do
    if [[ -L "/proc/${pid}/cwd" ]]; then
      cwd="$(readlink -f "/proc/${pid}/cwd")"
      cwd_set["$cwd"]=1
    fi
  done

  if [[ ${#cwd_set[@]} -eq 0 ]]; then
    echo "Could not resolve launcher worktree from live Ralph process." >&2
    return 1
  fi

  if [[ ${#cwd_set[@]} -gt 1 ]]; then
    echo "Multiple Ralph launcher worktrees detected; pass --target explicitly:" >&2
    printf '  %s\n' "${!cwd_set[@]}" >&2
    return 1
  fi

  printf '%s\n' "${!cwd_set[@]}"
}

if [[ -z "$TARGET_WORKTREE" ]]; then
  TARGET_WORKTREE="$(detect_target_worktree)"
fi

TARGET_WORKTREE="$(readlink -f "$TARGET_WORKTREE")"
TARGET_PLAN="${TARGET_WORKTREE}/plans/ACTIVE_PLAN.md"

if [[ ! -d "$TARGET_WORKTREE/.git" && ! -f "$TARGET_WORKTREE/.git" ]]; then
  echo "Target is not a git worktree: $TARGET_WORKTREE" >&2
  exit 1
fi

if [[ ! -f "$TARGET_PLAN" ]]; then
  echo "Target plan not found: $TARGET_PLAN" >&2
  exit 1
fi

TARGET_BRANCH="$(git -C "$TARGET_WORKTREE" branch --show-current)"
if [[ -z "$TARGET_BRANCH" || "$TARGET_BRANCH" != ralph/*/integration ]]; then
  echo "Target branch does not look like a live Ralph integration branch: ${TARGET_BRANCH:-<detached>}" >&2
  exit 1
fi

if cmp -s "$SOURCE_PLAN" "$TARGET_PLAN"; then
  echo "Active Ralph plan already matches source plan."
  echo "target=$TARGET_WORKTREE"
  echo "branch=$TARGET_BRANCH"
  exit 0
fi

cp "$SOURCE_PLAN" "$TARGET_PLAN"
git -C "$TARGET_WORKTREE" add plans/ACTIVE_PLAN.md
git -C "$TARGET_WORKTREE" commit -m "$COMMIT_MESSAGE" >/dev/null

echo "Synced active Ralph plan."
echo "target=$TARGET_WORKTREE"
echo "branch=$TARGET_BRANCH"
echo "commit=$(git -C "$TARGET_WORKTREE" rev-parse --short HEAD)"
