#!/usr/bin/env bash
# MBT Fuzzer — continuously explores Quint state space with random seeds.
# Runs battle MBT by default (battle-projection.mbt.test.ts).
# Default: Tier 2 (10 samples × 5 steps). Needs ~2GB+ free RAM.
# Skips seeds automatically when available memory < 1.5GB.
#
# Usage:
#   ./scripts/mbt-fuzz.sh              # run until killed (Ctrl+C)
#   ./scripts/mbt-fuzz.sh 100          # run 100 seeds then stop
#   MBT_MAX_SAMPLES=3 ./scripts/mbt-fuzz.sh   # Tier 1 (low-memory containers)
#   MBT_TEST=creature ./scripts/mbt-fuzz.sh   # creature MBT instead
#
# Output:
#   mbt-fuzz.log       — every seed attempted with timing (append-only)
#   mbt-failures.jsonl — structured failure records (one JSON per line)
#   mbt-timing.jsonl   — per-seed timing data
#
# Reproduce a failure:
#   QUINT_SEED=0xdeadbeef MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=5 \
#     npx vitest run -t "replays Quint" -- src/battle-projection.mbt.test.ts

set -euo pipefail
cd "$(dirname "$0")/../app"

MAX_SEEDS="${1:-0}"  # 0 = infinite
TRACES="${MBT_TRACES:-1}"
SAMPLES="${MBT_MAX_SAMPLES:-10}"
STEPS="${MBT_STEPS:-5}"
TIMEOUT="${MBT_TIMEOUT:-180}"
TEST_KIND="${MBT_TEST:-battle}"  # "battle" or "creature"
LOG="../mbt-fuzz.log"
FAILURES="../mbt-failures.jsonl"
TIMING="../mbt-timing.jsonl"
TMP="/tmp/mbt-fuzz-$$.out"
COUNT=0
FAIL_COUNT=0

if [ "$TEST_KIND" = "battle" ]; then
  TEST_FILE="src/battle-projection.mbt.test.ts"
else
  TEST_FILE="src/creature.mbt.test.ts"
fi

cleanup() {
  rm -f "$TMP"
  echo ""
  echo "=== MBT Fuzz complete: $COUNT seeds explored, $FAIL_COUNT failures ==="
}
trap cleanup EXIT

echo "MBT Fuzzer started: kind=$TEST_KIND traces=$TRACES samples=$SAMPLES steps=$STEPS timeout=${TIMEOUT}s"
echo "  Test file: $TEST_FILE"
echo "  Failures → $FAILURES"
echo "  Timing   → $TIMING"
echo ""

while true; do
  SEED="0x$(head -c4 /dev/urandom | od -An -tx4 | tr -d ' ')"
  TIMESTAMP=$(date -Iseconds)
  COUNT=$((COUNT + 1))

  # Kill any zombie evaluators before each run
  killall -9 quint_evaluator 2>/dev/null || true

  # Check available memory — skip if too low (evaluator needs ~2GB for 10 samples)
  AVAIL_MB=$(awk '/MemAvailable/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 9999)
  if [ "$AVAIL_MB" -lt 1500 ]; then
    echo "[$COUNT] $TIMESTAMP seed=$SEED ... SKIP (low memory: ${AVAIL_MB}MB available)"
    echo "$TIMESTAMP seed=$SEED kind=$TEST_KIND elapsed=0s SKIP low_memory=${AVAIL_MB}MB" >> "$LOG"
    sleep 5  # wait for memory to free up
    continue
  fi

  echo -n "[$COUNT] $TIMESTAMP seed=$SEED ... "

  START_SEC=$(date +%s)
  timeout "$TIMEOUT" env QUINT_SEED="$SEED" MBT_TRACES="$TRACES" MBT_MAX_SAMPLES="$SAMPLES" MBT_STEPS="$STEPS" \
    npx vitest run -t "replays Quint" -- "$TEST_FILE" 2>&1 > "$TMP" && STATUS=0 || STATUS=$?
  END_SEC=$(date +%s)
  ELAPSED=$(( END_SEC - START_SEC ))

  # Record timing
  echo "{\"timestamp\":\"$TIMESTAMP\",\"seed\":\"$SEED\",\"kind\":\"$TEST_KIND\",\"elapsed_s\":$ELAPSED,\"status\":\"$([ $STATUS -eq 0 ] && echo pass || [ $STATUS -eq 124 ] && echo timeout || echo fail)\"}" >> "$TIMING"

  if [ "$STATUS" -eq 124 ]; then
    echo "TIMEOUT (${ELAPSED}s)"
    echo "$TIMESTAMP seed=$SEED kind=$TEST_KIND elapsed=${ELAPSED}s TIMEOUT" >> "$LOG"
    killall -9 quint_evaluator 2>/dev/null || true
  elif [ "$STATUS" -eq 0 ]; then
    echo "PASS (${ELAPSED}s)"
    echo "$TIMESTAMP seed=$SEED kind=$TEST_KIND elapsed=${ELAPSED}s PASS" >> "$LOG"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))

    # Extract error info — vitest outputs AssertionError with diff, or
    # TraceReplayError/StateMismatchError from quint-connect
    ERROR_LINE=$(grep -E 'StateMismatch|TraceReplay|AssertionError|Error:' "$TMP" | head -1 || true)
    DIFF_FIELD=$(grep -oP 'field "\K[^"]+' "$TMP" | head -1 || true)
    ACTION=$(grep -oP 'action "\K[^"]+' "$TMP" | head -1 || \
             grep -oP 'action: \K\w+' "$TMP" | head -1 || true)
    STEP_NUM=$(grep -oP 'step \K\d+' "$TMP" | head -1 || true)

    echo "FAIL (${ELAPSED}s, seed=$SEED, action=${ACTION:-?}, field=${DIFF_FIELD:-?})"
    [ -n "$ERROR_LINE" ] && echo "  error: $(echo "$ERROR_LINE" | cut -c1-200)"
    echo "$TIMESTAMP seed=$SEED kind=$TEST_KIND elapsed=${ELAPSED}s FAIL action=${ACTION:-?} field=${DIFF_FIELD:-?}" >> "$LOG"

    # Save full output for debugging
    cp "$TMP" "../mbt-failure-${TEST_KIND}-${SEED}.log"
    echo "  saved: mbt-failure-${TEST_KIND}-${SEED}.log"

    # Write structured failure record — use jq-safe escaping
    ERROR_SHORT=$(echo "$ERROR_LINE" | tr '\n' ' ' | cut -c1-500 | sed 's/"/\\"/g')
    cat >> "$FAILURES" <<JSONEOF
{"timestamp":"$TIMESTAMP","seed":"$SEED","kind":"$TEST_KIND","elapsed_s":$ELAPSED,"step":"${STEP_NUM:-?}","action":"${ACTION:-?}","field":"${DIFF_FIELD:-?}","error":"$ERROR_SHORT"}
JSONEOF
  fi

  if [ "$MAX_SEEDS" -gt 0 ] && [ "$COUNT" -ge "$MAX_SEEDS" ]; then
    break
  fi
done
