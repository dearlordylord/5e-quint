#!/usr/bin/env bash
# MBT Fuzzer — continuously explores Quint state space with random seeds.
#
# Usage:
#   ./scripts/mbt-fuzz.sh              # run until killed (Ctrl+C)
#   ./scripts/mbt-fuzz.sh 100          # run 100 seeds then stop
#   MBT_TRACES=100 ./scripts/mbt-fuzz.sh  # 100 traces per seed (default: 50)
#
# Output:
#   mbt-fuzz.log       — every seed attempted (append-only)
#   mbt-failures.jsonl — structured failure records (one JSON per line)
#
# Reproduce a failure:
#   QUINT_SEED=0xdeadbeef npx vitest run -t "replays Quint"

set -euo pipefail
cd "$(dirname "$0")/../app"

MAX_SEEDS="${1:-0}"  # 0 = infinite
TRACES="${MBT_TRACES:-50}"
STEPS="${MBT_STEPS:-30}"
LOG="../mbt-fuzz.log"
FAILURES="../mbt-failures.jsonl"
TMP="/tmp/mbt-fuzz-$$.out"
COUNT=0
FAIL_COUNT=0

cleanup() {
  rm -f "$TMP"
  echo ""
  echo "=== MBT Fuzz complete: $COUNT seeds explored, $FAIL_COUNT failures ==="
}
trap cleanup EXIT

echo "MBT Fuzzer started: traces=$TRACES steps=$STEPS max_seeds=${MAX_SEEDS:-∞}"
echo "Failures → $FAILURES"
echo ""

while true; do
  SEED="0x$(head -c4 /dev/urandom | od -An -tx4 | tr -d ' ')"
  TIMESTAMP=$(date -Iseconds)
  COUNT=$((COUNT + 1))

  echo -n "[$COUNT] $TIMESTAMP seed=$SEED ... "
  echo "$TIMESTAMP seed=$SEED" >> "$LOG"

  QUINT_SEED="$SEED" MBT_TRACES="$TRACES" MBT_STEPS="$STEPS" \
    npx vitest run -t "replays Quint" -- src/machine.mbt.test.ts 2>&1 > "$TMP" && STATUS=0 || STATUS=$?

  if [ "$STATUS" -eq 0 ]; then
    echo "PASS"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    # Extract structured error info
    ERROR_LINE=$(grep "StateMismatchError" "$TMP" | head -1 || true)
    TRACE_NUM=$(echo "$ERROR_LINE" | grep -oP 'trace \K\d+' || echo "?")
    STEP_NUM=$(echo "$ERROR_LINE" | grep -oP 'step \K\d+' || echo "?")
    ACTION=$(echo "$ERROR_LINE" | grep -oP 'action "\K[^"]+' || echo "?")

    # Find the first differing field
    EXPECTED=$(grep "^Expected:" "$TMP" | head -1 | sed 's/^Expected: //' || echo "{}")
    ACTUAL=$(grep "^Actual:" "$TMP" | head -1 | sed 's/^Actual: //' || echo "{}")

    echo "FAIL (trace $TRACE_NUM, step $STEP_NUM, action $ACTION)"

    # Write structured failure record
    cat >> "$FAILURES" <<JSONEOF
{"timestamp":"$TIMESTAMP","seed":"$SEED","trace":$TRACE_NUM,"step":$STEP_NUM,"action":"$ACTION","expected":$EXPECTED,"actual":$ACTUAL}
JSONEOF
  fi

  if [ "$MAX_SEEDS" -gt 0 ] && [ "$COUNT" -ge "$MAX_SEEDS" ]; then
    break
  fi
done
