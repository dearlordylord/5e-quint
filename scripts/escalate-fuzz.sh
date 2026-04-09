#!/usr/bin/env bash
# Escalating MBT fuzzer — starts at STEPS_START and doubles each time
# CLEAN_THRESHOLD clean seeds pass without timeout/failure.
# Stops when a timeout is hit (found the ceiling) or MAX_STEPS is reached.
#
# Usage:
#   ./scripts/escalate-fuzz.sh
#   STEPS_START=10 CLEAN_THRESHOLD=20 ./scripts/escalate-fuzz.sh
#
# Output: escalate-fuzz.log (append-only), plus mbt-fuzz.log / mbt-timing.jsonl from mbt-fuzz.sh

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT_ROOT="${FUZZ_OUTPUT_ROOT:-$PROJECT_ROOT}"
cd "$PROJECT_ROOT"

STEPS="${STEPS_START:-10}"
MAX_STEPS="${MAX_STEPS:-10000}"
CLEAN_THRESHOLD="${CLEAN_THRESHOLD:-20}"
SAMPLES="${MBT_MAX_SAMPLES:-10}"
TIMEOUT="${MBT_TIMEOUT:-180}"
LOG="$OUTPUT_ROOT/escalate-fuzz.log"

cleanup() {
  pkill -f "mbt-fuzz.sh" 2>/dev/null || true
  pkill -f "vitest run" 2>/dev/null || true
  killall -9 quint_evaluator 2>/dev/null || true
  echo "[escalate] stopped at steps=$STEPS" | tee -a "$LOG"
}
trap cleanup EXIT INT TERM

echo "=== Escalating MBT fuzzer started: samples=$SAMPLES threshold=$CLEAN_THRESHOLD ===" | tee -a "$LOG"

while [ "$STEPS" -le "$MAX_STEPS" ]; do
  echo "" | tee -a "$LOG"
  echo "[escalate] $(date -Iseconds) — starting level: steps=$STEPS samples=$SAMPLES" | tee -a "$LOG"

  TMP_LOG="/tmp/escalate-level-steps${STEPS}.log"
  CLEAN=0
  TIMEOUTS=0
  INTENTIONAL_KILL=0

  MBT_MAX_SAMPLES="$SAMPLES" MBT_STEPS="$STEPS" MBT_TIMEOUT="$TIMEOUT" FUZZ_OUTPUT_ROOT="$OUTPUT_ROOT" \
    ./scripts/mbt-fuzz.sh 2>&1 | tee "$TMP_LOG" &
  FUZZ_PID=$!

  kill_fuzz() {
    INTENTIONAL_KILL=1
    kill "$FUZZ_PID" 2>/dev/null || true
    wait "$FUZZ_PID" 2>/dev/null || true
    pkill -f "vitest run" 2>/dev/null || true
    killall -9 quint_evaluator 2>/dev/null || true
  }

  while kill -0 "$FUZZ_PID" 2>/dev/null; do
    sleep 5

    NEW_CLEAN=$(grep -c "PASS" "$TMP_LOG" 2>/dev/null) || NEW_CLEAN=0
    NEW_TIMEOUTS=$(grep -c "TIMEOUT" "$TMP_LOG" 2>/dev/null) || NEW_TIMEOUTS=0

    if [ "$NEW_TIMEOUTS" -gt "$TIMEOUTS" ]; then
      TIMEOUTS="$NEW_TIMEOUTS"
      echo "[escalate] TIMEOUT detected at steps=$STEPS — this is the ceiling" | tee -a "$LOG"
      kill_fuzz
      echo "[escalate] Ceiling found: steps=$STEPS triggers timeouts. Last clean level: $(( STEPS / 2 ))." | tee -a "$LOG"
      echo "=== DONE ===" | tee -a "$LOG"
      exit 0
    fi

    if [ "$NEW_CLEAN" -ge "$CLEAN_THRESHOLD" ] && [ "$NEW_CLEAN" -gt "$CLEAN" ]; then
      CLEAN="$NEW_CLEAN"
      echo "[escalate] $CLEAN/$CLEAN_THRESHOLD clean seeds at steps=$STEPS" | tee -a "$LOG"

      if [ "$CLEAN" -ge "$CLEAN_THRESHOLD" ]; then
        echo "[escalate] Threshold reached — escalating from $STEPS to $(( STEPS * 2 ))" | tee -a "$LOG"
        kill_fuzz
        STEPS=$(( STEPS * 2 ))
        break
      fi
    fi
  done

  if [ "$INTENTIONAL_KILL" -eq 0 ] && ! kill -0 "$FUZZ_PID" 2>/dev/null; then
    wait "$FUZZ_PID" 2>/dev/null || true
    echo "[escalate] fuzz process exited unexpectedly at steps=$STEPS" | tee -a "$LOG"
    exit 1
  fi

  rm -f "$TMP_LOG"
done

echo "[escalate] Reached MAX_STEPS=$MAX_STEPS with no timeouts — spec is clean." | tee -a "$LOG"
