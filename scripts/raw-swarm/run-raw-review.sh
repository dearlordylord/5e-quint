#!/usr/bin/env bash
set -euo pipefail

if [[ ! "${RAW_SWARM_EXPECTED_GIT_SHA:-}" =~ ^[0-9a-f]{40}$ ||
  "${DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD:-}" != "v1:${RAW_SWARM_EXPECTED_GIT_SHA}" ||
  ! "${DND_RAW_SWARM_MODEL_LANE:-}" =~ ^[123]$ ||
  "${DND_RAW_SWARM_MODEL_LANE_GUARD:-}" != "v1" ]]; then
  printf '%s\n' 'Raw Swarm model-backed entrypoints must be launched through the public model wrapper.' >&2
  exit 64
fi
if ! node "$(dirname -- "$0")/model-lane-capability.cjs" --assert; then
  printf '%s\n' 'Raw Swarm model-backed entrypoints must be launched through the public model wrapper.' >&2
  exit 64
fi

RAW_REVIEW_ROOT=$(realpath -- "$(git rev-parse --show-toplevel)")
RAW_REVIEW_PROMPT=${1:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_TRANSCRIPT=${2:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_OUTPUT=${3:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_LOG=${4:?Usage: run-raw-review.sh <prompt.txt> <transcript.jsonl> <review.json> <agent.log>}
RAW_REVIEW_SCHEMA=$(mktemp)
RAW_REVIEW_REQUEST=$(mktemp)
RAW_REVIEW_AUDIT="${RAW_REVIEW_OUTPUT%.json}.audit.jsonl"
RAW_REVIEW_PACKET="${RAW_REVIEW_OUTPUT%.json}.packet.json"
RAW_REVIEW_EVENTS="${RAW_REVIEW_LOG}.events.jsonl"
RAW_REVIEW_LEDGER="${RAW_REVIEW_OUTPUT%.json}.invocations.jsonl"
RAW_REVIEW_CONTEXT_DELIVERY="${RAW_REVIEW_OUTPUT%.json}.context-delivery.json"
trap 'rm -f "$RAW_REVIEW_SCHEMA" "$RAW_REVIEW_REQUEST"' EXIT

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
RAW_REVIEW_EXECUTION_MANIFEST=$(realpath -- "$(dirname "$RAW_REVIEW_TRANSCRIPT")/../execution.json")
RAW_REVIEW_EXECUTION_ID=$(jq -er '.executionId' "$RAW_REVIEW_EXECUTION_MANIFEST")
RAW_REVIEW_EVIDENCE_SET_ID=$(jq -er '.evidenceSetId' "$RAW_REVIEW_EXECUTION_MANIFEST")
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-schema.ts" "$RAW_REVIEW_SCHEMA"
RAW_REVIEW_TRANSCRIPT_BYTES=$(wc -c <"$RAW_REVIEW_TRANSCRIPT" | tr -d ' ')
RAW_REVIEW_TRANSCRIPT_SHA256=$(sha256sum "$RAW_REVIEW_TRANSCRIPT" | cut -d' ' -f1)
RAW_REVIEW_PACKET_BYTES=$(wc -c <"$RAW_REVIEW_PACKET" | tr -d ' ')
RAW_REVIEW_PACKET_SHA256=$(sha256sum "$RAW_REVIEW_PACKET" | cut -d' ' -f1)
RAW_REVIEW_EXTRACT_COMMAND="pnpm exec tsx scripts/raw-swarm/sdk-player/sdk-audit-cli.ts extract $RAW_REVIEW_AUDIT scripts/raw-swarm/out/review-extract-UNIQUE.records.jsonl scripts/raw-swarm/out/review-extract-UNIQUE.provenance.json SEQUENCE [SEQUENCE ...]"
if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" ]]; then
  if [[ -z "${RAW_REVIEW_CONTEXT_ROLE:-}" || -z "${RAW_REVIEW_CONTEXT_PROFILE:-}" ]]; then
    printf '%s\n' 'RAW_REVIEW_CONTEXT_ROLE and RAW_REVIEW_CONTEXT_PROFILE are required with RAW_REVIEW_CONTEXT_PATH.' >&2
    exit 1
  fi
  case "$RAW_REVIEW_CONTEXT_ROLE" in
    postPlayReview) ;;
    *)
      printf 'Unsupported RAW_REVIEW_CONTEXT_ROLE: %s\n' "$RAW_REVIEW_CONTEXT_ROLE" >&2
      exit 1
      ;;
  esac
  case "$RAW_REVIEW_CONTEXT_PROFILE" in
    documentDeclarationSet|boundedCapabilityProjection) ;;
    *)
      printf 'Unsupported RAW_REVIEW_CONTEXT_PROFILE: %s\n' "$RAW_REVIEW_CONTEXT_PROFILE" >&2
      exit 1
      ;;
  esac
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
  RAW_REVIEW_CONTEXT_REPOSITORY_PATH=$(realpath --relative-to="$RAW_REVIEW_ROOT" "$RAW_REVIEW_CONTEXT_PATH")
  if [[ -e "$RAW_REVIEW_CONTEXT_DELIVERY" ]]; then
    printf 'Refusing to overwrite immutable context-delivery evidence: %s\n' "$RAW_REVIEW_CONTEXT_DELIVERY" >&2
    exit 1
  fi
  (
    set -o noclobber
    jq -n \
      --arg profile "$RAW_REVIEW_CONTEXT_PROFILE" \
      --arg role "$RAW_REVIEW_CONTEXT_ROLE" \
      --arg path "$RAW_REVIEW_CONTEXT_REPOSITORY_PATH" \
      --arg sha256 "$RAW_REVIEW_CONTEXT_SHA256" \
      --argjson byteLength "$RAW_REVIEW_CONTEXT_BYTES" \
      '{schemaVersion: 1, profile: $profile, role: $role, path: $path, byteLength: $byteLength, sha256: $sha256}' \
      >"$RAW_REVIEW_CONTEXT_DELIVERY"
  )
else
  if [[ -n "${RAW_REVIEW_CONTEXT_ROLE:-}" || -n "${RAW_REVIEW_CONTEXT_PROFILE:-}" ]]; then
    printf '%s\n' 'RAW_REVIEW_CONTEXT_ROLE and RAW_REVIEW_CONTEXT_PROFILE require RAW_REVIEW_CONTEXT_PATH.' >&2
    exit 1
  fi
  RAW_REVIEW_CAPABILITY_CONTEXT=$(pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/capability-projection-cli.ts" review)
fi
if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" && "$RAW_REVIEW_CONTEXT_PROFILE" == "documentDeclarationSet" ]]; then
  RAW_REVIEW_ACCESS_POLICY='This is the historical documentDeclarationSet profile. The packet remains inline, while the large declaration authority is available only through the exact immutable path described below. You must perform at least one strictly validated direct read/search command against that path before returning. Use only `cat`, `head`, `tail`, `sed` with a numeric print range, `sha256sum`, `wc`, `od`, or `rg` for that path; do not use any other tool, command, path, write, pipeline, redirection, shell expansion, or repository access. First-party command output may be client-truncated, so review only visible output and do not claim complete authority ingestion. The separate extractor command shown later remains prohibited and is not one of these permitted context reads.'
  RAW_REVIEW_CONTEXT_DESCRIPTION='The launcher supplies the exact immutable document-declaration authority for this historical review immediately before the packet. Use only the declared path and its strict read/search boundary; do not replace it with repository-wide documentation or another declaration source.'
else
  RAW_REVIEW_ACCESS_POLICY='This is the bounded capability-projection profile. The packet and the bounded role context are inline and are the complete review authorities for this turn. Do not read files or use commands or tools; any command or tool call invalidates the controlled measurement.'
  RAW_REVIEW_CONTEXT_DESCRIPTION='The launcher supplies one bounded, versioned Raw Swarm capability projection for the review role immediately before the packet. Use it to distinguish runtime/rules, public-SDK, experiment-boundary, and evidence responsibilities; do not replace it with repository-wide documentation or declarations.'
fi
RAW_REVIEW_RENDERED=${RAW_REVIEW_INSTRUCTIONS//\{\{TRANSCRIPT_PATH\}\}/$RAW_REVIEW_TRANSCRIPT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_BYTES\}\}/$RAW_REVIEW_TRANSCRIPT_BYTES}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{TRANSCRIPT_SHA256\}\}/$RAW_REVIEW_TRANSCRIPT_SHA256}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{AUDIT_PATH\}\}/$RAW_REVIEW_AUDIT}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_PATH\}\}/$RAW_REVIEW_PACKET}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_BYTES\}\}/$RAW_REVIEW_PACKET_BYTES}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{PACKET_SHA256\}\}/$RAW_REVIEW_PACKET_SHA256}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{EXTRACT_COMMAND\}\}/$RAW_REVIEW_EXTRACT_COMMAND}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{POST_PLAY_REVIEW_ACCESS_POLICY\}\}/$RAW_REVIEW_ACCESS_POLICY}
RAW_REVIEW_RENDERED=${RAW_REVIEW_RENDERED//\{\{POST_PLAY_REVIEW_CONTEXT_DESCRIPTION\}\}/$RAW_REVIEW_CONTEXT_DESCRIPTION}
if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" && "$RAW_REVIEW_CONTEXT_PROFILE" == "documentDeclarationSet" ]]; then
  RAW_REVIEW_CONTEXT_PATH_JSON=$(jq -Rn --arg path "$RAW_REVIEW_CONTEXT_PATH" '$path')
  RAW_REVIEW_RENDERED+=$'\n\nThis historical document-declaration review keeps the large context authority out of the initial request. Its immutable authority is the exact path identified by this JSON string:\n'
  RAW_REVIEW_RENDERED+="- $RAW_REVIEW_CONTEXT_PATH_JSON (${RAW_REVIEW_CONTEXT_BYTES} bytes, SHA-256 $RAW_REVIEW_CONTEXT_SHA256)"
  RAW_REVIEW_RENDERED+=$'\nThe only permitted context access is at least one direct read/search command against that exact path, using the strict read-only operations `cat`, `head`, `tail`, `sed` with a numeric print range, `sha256sum`, `wc`, `od`, or `rg`. The retained first-party telemetry may contain client-truncated command output, so review only the output actually visible to you and do not claim that the entire authority was ingested. Do not read the transcript, packet path, repository, parent directories, hidden files, or any other path. Do not write files, execute another command, use a pipeline, redirection, shell expansion, or another tool.\n'
fi
{
  printf '%s\n\n<SDK_REVIEW_PACKET path="%s" bytes="%s" sha256="%s">\n' \
    "$RAW_REVIEW_RENDERED" "$RAW_REVIEW_PACKET" "$RAW_REVIEW_PACKET_BYTES" "$RAW_REVIEW_PACKET_SHA256"
  if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" ]]; then
    if [[ "$RAW_REVIEW_CONTEXT_PROFILE" == "documentDeclarationSet" ]]; then
      printf '<RAW_SWARM_CAPABILITY_CONTEXT role="%s" profile="%s" delivery="commandRead" path="%s" bytes="%s" sha256="%s">\n' \
        "$RAW_REVIEW_CONTEXT_ROLE" "$RAW_REVIEW_CONTEXT_PROFILE" "$RAW_REVIEW_CONTEXT_PATH" "$RAW_REVIEW_CONTEXT_BYTES" "$RAW_REVIEW_CONTEXT_SHA256"
      printf 'The immutable context authority is available only at the exact declared path above. Use at least one strictly validated direct read/search command against that path; retained output may be client-truncated.\n'
    else
      printf '<RAW_SWARM_CAPABILITY_CONTEXT role="%s" profile="%s" path="%s" bytes="%s" sha256="%s">\n' \
        "$RAW_REVIEW_CONTEXT_ROLE" "$RAW_REVIEW_CONTEXT_PROFILE" "$RAW_REVIEW_CONTEXT_PATH" "$RAW_REVIEW_CONTEXT_BYTES" "$RAW_REVIEW_CONTEXT_SHA256"
      cat "$RAW_REVIEW_CONTEXT_PATH"
    fi
  else
    printf '<RAW_SWARM_CAPABILITY_CONTEXT role="review">\n%s</RAW_SWARM_CAPABILITY_CONTEXT>\n' "$RAW_REVIEW_CAPABILITY_CONTEXT"
  fi
  if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" ]]; then
    printf '</RAW_SWARM_CAPABILITY_CONTEXT>\n'
  fi
  cat "$RAW_REVIEW_PACKET"
  printf '</SDK_REVIEW_PACKET>\n'
} >"$RAW_REVIEW_REQUEST"
RAW_REVIEW_INITIAL_INPUT_CHARS=$(wc -m <"$RAW_REVIEW_REQUEST" | tr -d ' ')
if [[ "$RAW_REVIEW_INITIAL_INPUT_CHARS" -gt 1048576 ]]; then
  printf 'Reviewer initial input exceeds Codex character limit: %s > 1048576.\n' \
    "$RAW_REVIEW_INITIAL_INPUT_CHARS" >&2
  exit 1
fi

case "${RAW_REVIEW_CONTEXT_PROFILE:-}" in
  boundedCapabilityProjection) RAW_REVIEW_REASONING_EFFORT=medium ;;
  documentDeclarationSet|"") RAW_REVIEW_REASONING_EFFORT=max ;;
  *)
    printf 'Unsupported RAW_REVIEW_CONTEXT_PROFILE: %s\n' "$RAW_REVIEW_CONTEXT_PROFILE" >&2
    exit 1
    ;;
esac

set +e
pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/model-telemetry-cli.ts" \
  run \
  --root "$RAW_REVIEW_ROOT" \
  --input "$RAW_REVIEW_REQUEST" \
  --output "$RAW_REVIEW_OUTPUT" \
  --schema "$RAW_REVIEW_SCHEMA" \
  --events "$RAW_REVIEW_EVENTS" \
  --log "$RAW_REVIEW_LOG" \
  --ledger "$RAW_REVIEW_LEDGER" \
  --phase postPlayReview \
  --scenario-id "$RAW_REVIEW_SCENARIO_ID" \
  --execution-id "$RAW_REVIEW_EXECUTION_ID" \
  --evidence-set-id "$RAW_REVIEW_EVIDENCE_SET_ID" \
  --git-sha "$RAW_REVIEW_INVOCATION_GIT_SHA" \
  --model gpt-5.6-luna \
  --reasoning-effort "$RAW_REVIEW_REASONING_EFFORT" \
  --stage-plan-reason 'The Execution reached its independent post-play review stage.'
RAW_REVIEW_STATUS=$?
RAW_REVIEW_OUTPUT_STATUS=0
if [[ "$RAW_REVIEW_STATUS" -eq 0 ]]; then
  pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-output-validation.ts" \
    "$RAW_REVIEW_OUTPUT" "$RAW_REVIEW_AUDIT" "$RAW_REVIEW_PACKET" || RAW_REVIEW_OUTPUT_STATUS=$?
fi
RAW_REVIEW_POLICY_STATUS=0
if [[ "$RAW_REVIEW_STATUS" -eq 0 && "$RAW_REVIEW_OUTPUT_STATUS" -eq 0 ]]; then
  if [[ -n "${RAW_REVIEW_CONTEXT_PATH:-}" && "$RAW_REVIEW_CONTEXT_PROFILE" == "documentDeclarationSet" ]]; then
    pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-invocation-policy.ts" \
      "$RAW_REVIEW_EVENTS" \
      --profile "$RAW_REVIEW_CONTEXT_PROFILE" \
      --context-path "$RAW_REVIEW_CONTEXT_PATH" \
      --context-byte-length "$RAW_REVIEW_CONTEXT_BYTES" \
      --context-sha256 "$RAW_REVIEW_CONTEXT_SHA256" || RAW_REVIEW_POLICY_STATUS=$?
  else
    pnpm exec tsx "$RAW_REVIEW_ROOT/scripts/raw-swarm/review-invocation-policy.ts" \
      "$RAW_REVIEW_EVENTS" || RAW_REVIEW_POLICY_STATUS=$?
  fi
fi
RAW_REVIEW_EFFECTIVE_STATUS=$RAW_REVIEW_STATUS
if [[ "$RAW_REVIEW_EFFECTIVE_STATUS" -eq 0 && "$RAW_REVIEW_OUTPUT_STATUS" -ne 0 ]]; then
  RAW_REVIEW_EFFECTIVE_STATUS=$RAW_REVIEW_OUTPUT_STATUS
fi
if [[ "$RAW_REVIEW_EFFECTIVE_STATUS" -eq 0 && "$RAW_REVIEW_POLICY_STATUS" -ne 0 ]]; then
  RAW_REVIEW_EFFECTIVE_STATUS=$RAW_REVIEW_POLICY_STATUS
fi
set -e
exit "$RAW_REVIEW_EFFECTIVE_STATUS"
