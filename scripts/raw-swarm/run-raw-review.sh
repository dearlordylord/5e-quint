#!/usr/bin/env bash
set -euo pipefail

RAW_REVIEW_ROOT=$(realpath -- "$(git rev-parse --show-toplevel)")
RAW_REVIEW_PROMPT=${1:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_TRANSCRIPT=${2:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_OUTPUT=${3:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_LOG=${4:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_SCHEMA=$(mktemp)
RAW_REVIEW_AUDIT="${RAW_REVIEW_OUTPUT%.json}.audit.jsonl"
RAW_REVIEW_PACKET="${RAW_REVIEW_OUTPUT%.json}.packet.json"
RAW_REVIEW_EVENTS="${RAW_REVIEW_LOG}.events.jsonl"
RAW_REVIEW_LEDGER="${RAW_REVIEW_OUTPUT%.json}.invocations.jsonl"
trap 'rm -f "$RAW_REVIEW_SCHEMA"' EXIT

if ! git diff --quiet || ! git diff --cached --quiet; then
  printf '%s\n' 'Post-play review recording requires a clean Git worktree.' >&2
  exit 1
fi
RAW_REVIEW_CURRENT_GIT_SHA=$(git rev-parse HEAD)
if [[ -n "${RAW_REVIEW_IMPLEMENTATION_GIT_SHA:-}" ]]; then
  if [[ ! "$RAW_REVIEW_IMPLEMENTATION_GIT_SHA" =~ ^([0-9a-f]{40}|[0-9a-f]{64})$ ]]; then
    printf '%s\n' 'RAW_REVIEW_IMPLEMENTATION_GIT_SHA must be a lowercase 40- or 64-character Git SHA.' >&2
    exit 1
  fi
  if [[ "$RAW_REVIEW_IMPLEMENTATION_GIT_SHA" != "$RAW_REVIEW_CURRENT_GIT_SHA" ]]; then
    printf 'RAW_REVIEW_IMPLEMENTATION_GIT_SHA does not match the current clean Git revision: expected %s, current %s.\n' \
      "$RAW_REVIEW_IMPLEMENTATION_GIT_SHA" "$RAW_REVIEW_CURRENT_GIT_SHA" >&2
    exit 1
  fi
  RAW_REVIEW_INVOCATION_GIT_SHA=$RAW_REVIEW_IMPLEMENTATION_GIT_SHA
else
  RAW_REVIEW_INVOCATION_GIT_SHA=$RAW_REVIEW_CURRENT_GIT_SHA
fi
RAW_REVIEW_INSTRUCTIONS=$(<"$RAW_REVIEW_PROMPT")

mkdir -p "$(dirname "$RAW_REVIEW_OUTPUT")" "$(dirname "$RAW_REVIEW_LOG")"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/sdk-player/sdk-audit-cli.ts" \
  build "$RAW_REVIEW_TRANSCRIPT" "$RAW_REVIEW_AUDIT"
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/sdk-player/sdk-review-packet-cli.ts" \
  "$RAW_REVIEW_AUDIT" "$RAW_REVIEW_TRANSCRIPT" "$RAW_REVIEW_PACKET"
RAW_REVIEW_SCENARIO_ID=$(head -n 1 "$RAW_REVIEW_AUDIT" | jq -er '.scenarioId')
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-schema.ts" "$RAW_REVIEW_SCHEMA"
RAW_REVIEW_TRANSCRIPT_BYTES=$(wc -c <"$RAW_REVIEW_TRANSCRIPT" | tr -d ' ')
RAW_REVIEW_TRANSCRIPT_SHA256=$(sha256sum "$RAW_REVIEW_TRANSCRIPT" | cut -d' ' -f1)
RAW_REVIEW_PACKET_BYTES=$(wc -c <"$RAW_REVIEW_PACKET" | tr -d ' ')
RAW_REVIEW_PACKET_SHA256=$(sha256sum "$RAW_REVIEW_PACKET" | cut -d' ' -f1)
RAW_REVIEW_EXTRACT_COMMAND="pnpm exec tsx scripts/raw-swarm/sdk-player/sdk-audit-cli.ts extract $RAW_REVIEW_AUDIT scripts/raw-swarm/out/review-extract-UNIQUE.records.jsonl scripts/raw-swarm/out/review-extract-UNIQUE.provenance.json SEQUENCE [SEQUENCE ...]"
if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" ]]; then
  if [[ "$RAW_REVIEW_CONTEXT_PATH" = /* ]]; then
    RAW_REVIEW_CONTEXT_CANDIDATE=$RAW_REVIEW_CONTEXT_PATH
  else
    RAW_REVIEW_CONTEXT_CANDIDATE=$RAW_REVIEW_ROOT/$RAW_REVIEW_CONTEXT_PATH
  fi
  if [[ ! -f "$RAW_REVIEW_CONTEXT_CANDIDATE" ]]; then
    printf 'RAW_REVIEW_CONTEXT_PATH is not a readable file: %s\n' "$RAW_REVIEW_CONTEXT_PATH" >&2
    exit 1
  fi
  if ! RAW_REVIEW_CONTEXT_PATH=$(realpath -- "$RAW_REVIEW_CONTEXT_CANDIDATE"); then
    printf 'RAW_REVIEW_CONTEXT_PATH could not be canonicalized: %s\n' "$RAW_REVIEW_CONTEXT_CANDIDATE" >&2
    exit 1
  fi
  case "$RAW_REVIEW_CONTEXT_PATH" in
    "$RAW_REVIEW_ROOT"/*) ;;
    *)
      printf 'RAW_REVIEW_CONTEXT_PATH escapes the repository root: %s\n' "$RAW_REVIEW_CONTEXT_CANDIDATE" >&2
      exit 1
      ;;
  esac
  RAW_REVIEW_CONTEXT_BYTES=$(wc -c <"$RAW_REVIEW_CONTEXT_PATH" | tr -d ' ')
  RAW_REVIEW_CONTEXT_SHA256=$(sha256sum "$RAW_REVIEW_CONTEXT_PATH" | cut -d' ' -f1)
else
  RAW_REVIEW_CAPABILITY_CONTEXT=$(pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/capability-projection-cli.ts" review)
fi
RAW_REVIEW_RENDERED=${RAW_REVIEW_INSTRUCTIONS//\{\{TRANSCRIPT_PATH\}\}/$RAW_REVIEW_TRANSCRIPT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_BYTES\}\}/$RAW_REVIEW_TRANSCRIPT_BYTES}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_SHA256\}\}/$RAW_REVIEW_TRANSCRIPT_SHA256}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{AUDIT_PATH\}\}/$RAW_REVIEW_AUDIT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_PATH\}\}/$RAW_REVIEW_PACKET}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_BYTES\}\}/$RAW_REVIEW_PACKET_BYTES}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_SHA256\}\}/$RAW_REVIEW_PACKET_SHA256}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{EXTRACT_COMMAND\}\}/$RAW_REVIEW_EXTRACT_COMMAND}
RAW_REVIEW_STARTED_AT=$(node -e 'process.stdout.write(new Date().toISOString())')
RAW_REVIEW_STARTED_MS=$(date +%s%3N)

set +e
{
  printf '%s\n\n<SDK_REVIEW_PACKET path="%s" bytes="%s" sha256="%s">\n' \
    "$RAW_REVIEW_RENDERED" "$RAW_REVIEW_PACKET" "$RAW_REVIEW_PACKET_BYTES" "$RAW_REVIEW_PACKET_SHA256"
  if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" ]]; then
    printf '<RAW_SWARM_CAPABILITY_CONTEXT role="review" path="%s" bytes="%s" sha256="%s">\n' \
      "$RAW_REVIEW_CONTEXT_PATH" "$RAW_REVIEW_CONTEXT_BYTES" "$RAW_REVIEW_CONTEXT_SHA256"
    cat "$RAW_REVIEW_CONTEXT_PATH"
    printf '</RAW_SWARM_CAPABILITY_CONTEXT>\n'
  else
    printf '<RAW_SWARM_CAPABILITY_CONTEXT role="review">\n%s</RAW_SWARM_CAPABILITY_CONTEXT>\n' "$RAW_REVIEW_CAPABILITY_CONTEXT"
  fi
  cat "$RAW_REVIEW_PACKET"
  printf '</SDK_REVIEW_PACKET>\n'
} | codex exec \
  -C "$RAW_REVIEW_ROOT" \
  --sandbox danger-full-access \
  --ephemeral \
  --json \
  -m gpt-5.6-luna \
  -c 'model_reasoning_effort="max"' \
  --output-schema "$RAW_REVIEW_SCHEMA" \
  --output-last-message "$RAW_REVIEW_OUTPUT" \
  - \
  >"$RAW_REVIEW_EVENTS" 2>"$RAW_REVIEW_LOG"
RAW_REVIEW_STATUS=$?
RAW_REVIEW_ELAPSED_MS=$(($(date +%s%3N) - RAW_REVIEW_STARTED_MS))
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/model-telemetry-cli.ts" \
  --phase postPlayReview \
  --scenario-id "$RAW_REVIEW_SCENARIO_ID" \
  --git-sha "$RAW_REVIEW_INVOCATION_GIT_SHA" \
  --events "$RAW_REVIEW_EVENTS" \
  --ledger "$RAW_REVIEW_LEDGER" \
  --model gpt-5.6-luna \
  --reasoning-effort max \
  --stage-plan-reason 'The admitted run reached its independent post-play review stage.' \
  --started-at "$RAW_REVIEW_STARTED_AT" \
  --elapsed-ms "$RAW_REVIEW_ELAPSED_MS" \
  --shell-status "$RAW_REVIEW_STATUS"
RAW_REVIEW_TELEMETRY_STATUS=$?
RAW_REVIEW_OUTPUT_STATUS=0
if [[ "$RAW_REVIEW_STATUS" -eq 0 ]]; then
  pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-output-validation.ts" \
    "$RAW_REVIEW_OUTPUT" "$RAW_REVIEW_AUDIT" "$RAW_REVIEW_PACKET" || RAW_REVIEW_OUTPUT_STATUS=$?
fi
RAW_REVIEW_POLICY_STATUS=0
if [[ "$RAW_REVIEW_STATUS" -eq 0 && "$RAW_REVIEW_OUTPUT_STATUS" -eq 0 ]]; then
  pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-invocation-policy.ts" \
    "$RAW_REVIEW_EVENTS" || RAW_REVIEW_POLICY_STATUS=$?
fi
set -e
if [[ "$RAW_REVIEW_STATUS" -ne 0 ]]; then
  exit "$RAW_REVIEW_STATUS"
fi
if [[ "$RAW_REVIEW_OUTPUT_STATUS" -ne 0 ]]; then
  exit "$RAW_REVIEW_OUTPUT_STATUS"
fi
if [[ "$RAW_REVIEW_POLICY_STATUS" -ne 0 ]]; then
  exit "$RAW_REVIEW_POLICY_STATUS"
fi
exit "$RAW_REVIEW_TELEMETRY_STATUS"
