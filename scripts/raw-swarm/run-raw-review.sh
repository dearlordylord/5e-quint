#!/usr/bin/env bash
set -euo pipefail

RAW_REVIEW_ROOT=$(git rev-parse --show-toplevel)
RAW_REVIEW_PROMPT=${1:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_TRANSCRIPT=${2:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_OUTPUT=${3:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_LOG=${4:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_SCHEMA=$(mktemp)
trap 'rm -f "$RAW_REVIEW_SCHEMA"' EXIT

mkdir -p "$(dirname "$RAW_REVIEW_OUTPUT")" "$(dirname "$RAW_REVIEW_LOG")"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-preflight.ts" "$RAW_REVIEW_TRANSCRIPT"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-schema.ts" "$RAW_REVIEW_SCHEMA"

codex exec \
  -C "$RAW_REVIEW_ROOT" \
  --sandbox danger-full-access \
  -m gpt-5.6-sol \
  -c 'model_reasoning_effort="high"' \
  --output-schema "$RAW_REVIEW_SCHEMA" \
  --output-last-message "$RAW_REVIEW_OUTPUT" \
  "$(<"$RAW_REVIEW_PROMPT")" \
  >"$RAW_REVIEW_LOG" 2>&1
