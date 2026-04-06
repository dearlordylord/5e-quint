#!/usr/bin/env bash
# Invariant Fuzzer — continuously runs Quint simulations checking battle invariants.
#
# Usage:
#   ./scripts/invariant-fuzz.sh              # run until killed (Ctrl+C)
#   ./scripts/invariant-fuzz.sh 100          # run 100 seeds then stop
#   FUZZ_SAMPLES=500 ./scripts/invariant-fuzz.sh   # 500 samples per seed (default: 100)
#   FUZZ_STEPS=40 ./scripts/invariant-fuzz.sh      # 40 steps per trace (default: 20)
#
# Output:
#   invariant-fuzz.log       — every seed attempted (append-only)
#   invariant-failures.jsonl — structured failure records (one JSON per line)
#
# Reproduce a failure:
#   npx quint run --seed=0xdeadbeef --invariant=allBattleInvariants \
#     --init=bInit --step=battleStep --main=battle battle.qnt

set -euo pipefail
cd "$(dirname "$0")/.."

MAX_SEEDS="${1:-0}"  # 0 = infinite
SAMPLES="${FUZZ_SAMPLES:-10}"
STEPS="${FUZZ_STEPS:-10}"
LOG="invariant-fuzz.log"
FAILURES="invariant-failures.jsonl"
TMP="/tmp/inv-fuzz-$$.out"
COUNT=0
FAIL_COUNT=0

cleanup() {
  rm -f "$TMP"
  echo ""
  echo "=== Invariant Fuzz complete: $COUNT seeds explored, $FAIL_COUNT failures ==="
}
trap cleanup EXIT

echo "Invariant Fuzzer started: samples=$SAMPLES steps=$STEPS max_seeds=${MAX_SEEDS:-∞}"
echo "Failures → $FAILURES"
echo ""

while true; do
  SEED="0x$(head -c4 /dev/urandom | od -An -tx4 | tr -d ' ')"
  TIMESTAMP=$(date -Iseconds)
  COUNT=$((COUNT + 1))

  echo -n "[$COUNT] $TIMESTAMP seed=$SEED ... "
  echo "$TIMESTAMP seed=$SEED" >> "$LOG"

  TIMEOUT="${FUZZ_TIMEOUT:-600}"
  timeout "$TIMEOUT" npx quint run \
    --seed="$SEED" \
    --invariant=allBattleInvariants \
    --init=bInit \
    --step=battleStep \
    --main=battle \
    --max-samples="$SAMPLES" \
    --max-steps="$STEPS" \
    --verbosity=1 \
    battle.qnt 2>&1 > "$TMP" && STATUS=0 || STATUS=$?

  if [ "$STATUS" -eq 124 ]; then
    echo "TIMEOUT (${TIMEOUT}s)"
    echo "$TIMESTAMP seed=$SEED TIMEOUT" >> "$LOG"
    killall -9 quint_evaluator 2>/dev/null || true
  elif [ "$STATUS" -eq 0 ]; then
    echo "PASS"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    # Quint outputs: "[violation] Found an issue (Xms at Y traces/second)."
    # and: "Use --seed=0xABC --backend=rust to reproduce."
    # Extract the reproduction seed (quint may remap the seed internally)
    REPRO_SEED=$(grep -oP -- '--seed=\K0x[0-9a-f]+' "$TMP" | head -1 || echo "$SEED")

    echo "FAIL (repro: --seed=$REPRO_SEED)"

    # Write structured failure record
    cat >> "$FAILURES" <<JSONEOF
{"timestamp":"$TIMESTAMP","seed":"$SEED","reproSeed":"$REPRO_SEED"}
JSONEOF

    # Save full output for debugging
    cp "$TMP" "invariant-failure-${REPRO_SEED}.log"
  fi

  if [ "$MAX_SEEDS" -gt 0 ] && [ "$COUNT" -ge "$MAX_SEEDS" ]; then
    break
  fi
done
