#!/usr/bin/env bash
# Orchestrate the content-surface coverage survey. Processes units in
# `unit-queue.jsonl` via `worker.sh`, running N in parallel. Resumable:
# skips units already in the dataset.
#
# Usage:
#   run-survey.sh --tier 0                run just tier 0
#   run-survey.sh --tier 1                run just tier 1
#   run-survey.sh --tier 2                run full SRD spells
#   run-survey.sh --tier 3                run PHB-only sample
#   run-survey.sh --tier all              run all tiers
#   run-survey.sh --tier 2 --limit 10     run first 10 unprocessed units in tier 2
#   run-survey.sh --slug bless            run one queue item by slug
#   run-survey.sh --slug bless --force    rerun one item even if already recorded
#   run-survey.sh --dry-run               don't invoke Claude; use mock mode
#                                          (requires MOCK_ENCODING_SRC env)
#
# Env:
#   MAX_PARALLEL       default 5
#   SURVEY_BACKEND     "claude" (default) or "codex"
#   CLAUDE_MODEL       forwarded to worker (default sonnet)
#   CLAUDE_CMD         override claude CLI binary
#   CODEX_MODEL        forwarded to worker (default: codex default)
#   CODEX_CMD          override codex CLI binary

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TIER="all"
DRY_RUN=0
LIMIT=""
SLUG=""
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tier) TIER="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --slug) SLUG="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      grep -E "^# " "$0" | sed 's/^# \{0,1\}//' ; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 64 ;;
  esac
done

MAX_PARALLEL="${MAX_PARALLEL:-5}"
QUEUE="$SCRIPT_DIR/unit-queue.jsonl"
DATASET_SRD="$SCRIPT_DIR/survey-results-srd.jsonl"
DATASET_PHB="$REPO_ROOT/.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl"

[[ -f "$QUEUE" ]] || { echo "missing $QUEUE — run unit-catalog.ts first" >&2; exit 66; }

export REPO_ROOT
export SCRIPTS_DIR="$SCRIPT_DIR"
export FORCE

if [[ -n "$LIMIT" && ! "$LIMIT" =~ ^[1-9][0-9]*$ ]]; then
  echo "invalid --limit '$LIMIT' (expected positive integer)" >&2
  exit 64
fi

echo "run-survey: tier=$TIER parallel=$MAX_PARALLEL dry_run=$DRY_RUN limit=${LIMIT:-all} slug=${SLUG:-all} force=$FORCE"

already_processed() {
  local slug="$1"
  { [[ -f "$DATASET_SRD" ]] && grep -q "\"unit_slug\":\"$slug\"" "$DATASET_SRD"; } ||
  { [[ -f "$DATASET_PHB" ]] && grep -q "\"unit_slug\":\"$slug\"" "$DATASET_PHB"; }
}

count=0
skipped=0
while IFS= read -r row; do
  [[ -z "$row" ]] && continue
  row_tier=$(jq -r .tier <<<"$row")
  if [[ "$TIER" != "all" && "$row_tier" != "$TIER" ]]; then continue; fi
  slug=$(jq -r .slug <<<"$row")
  if [[ -n "$SLUG" && "$slug" != "$SLUG" ]]; then continue; fi
  if [[ "$FORCE" != "1" ]] && already_processed "$slug"; then
    skipped=$((skipped+1))
    continue
  fi
  if [[ -n "$LIMIT" && $count -ge $LIMIT ]]; then
    break
  fi

  # throttle
  while [[ $(jobs -rp | wc -l) -ge $MAX_PARALLEL ]]; do
    sleep 0.2
  done

  count=$((count+1))
  echo "[$count] dispatch $slug (tier=$row_tier)"
  (
    if [[ "$DRY_RUN" == "1" ]]; then
      # dry-run: mock against the unit's existing prototype encoding if
      # one exists; otherwise skip with a refused verdict.
      src="$REPO_ROOT/packages/prototype-content-surface/content/$slug.json"
      if [[ -f "$src" ]]; then
        MOCK_ENCODING_SRC="$src" bash "$SCRIPT_DIR/worker.sh" "$row"
      else
        echo "[$count] dry-run: no existing encoding for $slug, skipping" >&2
      fi
    else
      bash "$SCRIPT_DIR/worker.sh" "$row"
    fi
  ) &
done < "$QUEUE"
wait

if [[ -n "$SLUG" && "$count" -eq 0 && "$skipped" -eq 0 ]]; then
  echo "run-survey: slug '$SLUG' not found in queue after filters" >&2
  exit 65
fi

echo "run-survey: dispatched $count units, skipped $skipped already-processed"
echo "SRD dataset: $DATASET_SRD"
echo "PHB dataset: $DATASET_PHB"
