#!/usr/bin/env bash
set -euo pipefail

RAW_REVIEW_ROOT=$(git rev-parse --show-toplevel)
RAW_REVIEW_PROMPT=${1:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_TRANSCRIPT=${2:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_OUTPUT=${3:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_LOG=${4:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_INSTRUCTIONS=$(<"$RAW_REVIEW_PROMPT")
RAW_REVIEW_SCHEMA=$(mktemp)
RAW_REVIEW_AUDIT="${RAW_REVIEW_OUTPUT%.json}.audit.jsonl"
RAW_REVIEW_EVENTS="${RAW_REVIEW_LOG}.events.jsonl"
RAW_REVIEW_LEDGER="${RAW_REVIEW_OUTPUT%.json}.invocations.jsonl"
trap 'rm -f "$RAW_REVIEW_SCHEMA"' EXIT

mkdir -p "$(dirname "$RAW_REVIEW_OUTPUT")" "$(dirname "$RAW_REVIEW_LOG")"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/sdk-player/sdk-audit-cli.ts" \
  build "$RAW_REVIEW_TRANSCRIPT" "$RAW_REVIEW_AUDIT"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-schema.ts" "$RAW_REVIEW_SCHEMA"
RAW_REVIEW_TRANSCRIPT_BYTES=$(wc -c <"$RAW_REVIEW_TRANSCRIPT" | tr -d ' ')
RAW_REVIEW_TRANSCRIPT_SHA256=$(sha256sum "$RAW_REVIEW_TRANSCRIPT" | cut -d' ' -f1)
RAW_REVIEW_EXTRACT_COMMAND="pnpm exec tsx scripts/raw-swarm/sdk-player/sdk-audit-cli.ts extract $RAW_REVIEW_AUDIT scripts/raw-swarm/out/review-extract-UNIQUE.records.jsonl scripts/raw-swarm/out/review-extract-UNIQUE.provenance.json SEQUENCE [SEQUENCE ...]"
RAW_REVIEW_RENDERED=${RAW_REVIEW_INSTRUCTIONS//\{\{TRANSCRIPT_PATH\}\}/$RAW_REVIEW_TRANSCRIPT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_BYTES\}\}/$RAW_REVIEW_TRANSCRIPT_BYTES}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_SHA256\}\}/$RAW_REVIEW_TRANSCRIPT_SHA256}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{AUDIT_PATH\}\}/$RAW_REVIEW_AUDIT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{EXTRACT_COMMAND\}\}/$RAW_REVIEW_EXTRACT_COMMAND}
RAW_REVIEW_STARTED_AT=$(node -e 'process.stdout.write(new Date().toISOString())')
RAW_REVIEW_STARTED_MS=$(date +%s%3N)

set +e
codex exec \
  -C "$RAW_REVIEW_ROOT" \
  --sandbox danger-full-access \
  --ephemeral \
  --json \
  -m gpt-5.6-luna \
  -c 'model_reasoning_effort="max"' \
  --output-schema "$RAW_REVIEW_SCHEMA" \
  --output-last-message "$RAW_REVIEW_OUTPUT" \
  "$RAW_REVIEW_RENDERED" \
  >"$RAW_REVIEW_EVENTS" 2>"$RAW_REVIEW_LOG"
RAW_REVIEW_STATUS=$?
RAW_REVIEW_ELAPSED_MS=$(($(date +%s%3N) - RAW_REVIEW_STARTED_MS))
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/model-telemetry-cli.ts" \
  --phase postPlayReview \
  --events "$RAW_REVIEW_EVENTS" \
  --ledger "$RAW_REVIEW_LEDGER" \
  --model gpt-5.6-luna \
  --reasoning-effort max \
  --started-at "$RAW_REVIEW_STARTED_AT" \
  --elapsed-ms "$RAW_REVIEW_ELAPSED_MS" \
  --exit-status "$RAW_REVIEW_STATUS"
RAW_REVIEW_TELEMETRY_STATUS=$?
set -e
if [[ "$RAW_REVIEW_STATUS" -ne 0 ]]; then
  exit "$RAW_REVIEW_STATUS"
fi
exit "$RAW_REVIEW_TELEMETRY_STATUS"
