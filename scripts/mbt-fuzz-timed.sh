#!/usr/bin/env bash
# MBT Fuzzer with timing — runs creature + battle MBT alternating, records elapsed time per seed.
#
# Usage:
#   ./scripts/mbt-fuzz-timed.sh              # run until killed
#   ./scripts/mbt-fuzz-timed.sh 100          # run 100 seeds then stop
#
# Output:
#   mbt-fuzz.log            — every seed attempted with elapsed time
#   mbt-failures.jsonl      — structured failure records
#   mbt-timing.jsonl        — per-seed timing data for tier analysis

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT_ROOT="${FUZZ_OUTPUT_ROOT:-$PROJECT_ROOT}"
case "$OUTPUT_ROOT" in
  "$PROJECT_ROOT/packages"|"$PROJECT_ROOT/packages/"*)
    echo "Refusing to write fuzz artifacts under $OUTPUT_ROOT" >&2
    exit 1
    ;;
esac
cd "$PROJECT_ROOT/packages/v0"

MAX_SEEDS="${1:-0}"
CREATURE_TRACES="${MBT_TRACES:-50}"
CREATURE_STEPS="${MBT_STEPS:-30}"
BATTLE_TRACES="${BATTLE_MBT_TRACES:-1}"
BATTLE_STEPS="${BATTLE_MBT_STEPS:-5}"
BATTLE_SAMPLES="${BATTLE_MBT_SAMPLES:-3}"
LOG="$OUTPUT_ROOT/mbt-fuzz.log"
FAILURES="$OUTPUT_ROOT/mbt-failures.jsonl"
TIMING="$OUTPUT_ROOT/mbt-timing.jsonl"
TMP="/tmp/mbt-fuzz-$$.out"
COUNT=0
FAIL_COUNT=0

cleanup() {
  rm -f "$TMP"
  echo ""
  echo "=== MBT Fuzz complete: $COUNT seeds explored, $FAIL_COUNT failures ==="
}
trap cleanup EXIT

echo "MBT Fuzzer (timed) started"
echo "  Creature: traces=$CREATURE_TRACES steps=$CREATURE_STEPS"
echo "  Battle:   traces=$BATTLE_TRACES steps=$BATTLE_STEPS samples=$BATTLE_SAMPLES"
echo "  Failures → $FAILURES"
echo "  Timing   → $TIMING"
echo ""

run_seed() {
  local KIND="$1"  # "creature" or "battle"
  local SEED="$2"
  local TIMESTAMP="$3"

  local START_SEC
  START_SEC=$(date +%s)

  if [ "$KIND" = "creature" ]; then
    QUINT_SEED="$SEED" MBT_TRACES="$CREATURE_TRACES" MBT_STEPS="$CREATURE_STEPS" \
      npx vitest run -t "replays Quint" -- src/creature.mbt.test.ts 2>&1 > "$TMP" && STATUS=0 || STATUS=$?
  else
    QUINT_SEED="$SEED" MBT_TRACES="$BATTLE_TRACES" MBT_MAX_SAMPLES="$BATTLE_SAMPLES" MBT_STEPS="$BATTLE_STEPS" \
      npx vitest run -t "replays Quint" -- src/battle-projection.mbt.test.ts 2>&1 > "$TMP" && STATUS=0 || STATUS=$?
  fi

  local END_SEC
  END_SEC=$(date +%s)
  local ELAPSED=$(( END_SEC - START_SEC ))

  # Record timing
  echo "{\"timestamp\":\"$TIMESTAMP\",\"seed\":\"$SEED\",\"kind\":\"$KIND\",\"elapsed_s\":$ELAPSED,\"status\":\"$([ $STATUS -eq 0 ] && echo pass || echo fail)\"}" >> "$TIMING"

  if [ "$STATUS" -eq 0 ]; then
    echo "PASS (${ELAPSED}s)"
    echo "$TIMESTAMP seed=$SEED kind=$KIND elapsed=${ELAPSED}s PASS" >> "$LOG"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "FAIL (${ELAPSED}s)"
    echo "$TIMESTAMP seed=$SEED kind=$KIND elapsed=${ELAPSED}s FAIL" >> "$LOG"

    # Extract error details from vitest output
    local ERROR_MSG
    ERROR_MSG=$(grep -E 'StateMismatch|TraceReplay|AssertionError|Error:' "$TMP" | head -3 || true)
    local DIFF_FIELD
    DIFF_FIELD=$(grep -oP 'field "\K[^"]+' "$TMP" | head -1 || echo "unknown")

    # Save full output for later analysis
    cp "$TMP" "$OUTPUT_ROOT/mbt-failure-${KIND}-${SEED}.log"

    cat >> "$FAILURES" <<JSONEOF
{"timestamp":"$TIMESTAMP","seed":"$SEED","kind":"$KIND","elapsed_s":$ELAPSED,"field":"$DIFF_FIELD","error":"$(echo "$ERROR_MSG" | tr '\n' ' ' | sed 's/"/\\"/g' | head -c 500)"}
JSONEOF
  fi

  return $STATUS
}

while true; do
  SEED="0x$(head -c4 /dev/urandom | od -An -tx4 | tr -d ' ')"
  TIMESTAMP=$(date -Iseconds)
  COUNT=$((COUNT + 1))

  # Kill any zombie evaluators before each run
  killall -9 quint_evaluator 2>/dev/null || true

  # Alternate creature and battle MBT
  if (( COUNT % 3 == 0 )); then
    KIND="battle"
  else
    KIND="creature"
  fi

  echo -n "[$COUNT] $TIMESTAMP seed=$SEED ($KIND) ... "
  run_seed "$KIND" "$SEED" "$TIMESTAMP" || true

  if [ "$MAX_SEEDS" -gt 0 ] && [ "$COUNT" -ge "$MAX_SEEDS" ]; then
    break
  fi
done
