#!/usr/bin/env bash
# Tier timing benchmark — measures elapsed time for each MBT tier across N seeds.
# Results written to tier-timing.jsonl for updating CLAUDE.md tier estimates.
#
# Usage:
#   ./scripts/measure-tier-timing.sh          # 10 seeds per tier (default)
#   ./scripts/measure-tier-timing.sh 30       # 30 seeds per tier

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$PROJECT_ROOT"

N="${1:-10}"
OUTPUT="$PROJECT_ROOT/tier-timing.jsonl"
TMP="/tmp/tier-timing-$$.out"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

echo "Tier timing benchmark: $N seeds per tier"
echo "Output → $OUTPUT"
echo ""

# Ensure compiled cache (must run from project root)
node scripts/compile-battle-spec.cjs 2>&1

# Switch to packages/core/ for vitest (MBT tests live in core)
cd packages/core

run_tier() {
  local TIER="$1"
  local LABEL="$2"
  shift 2
  local ENV_VARS=("$@")

  echo "=== Tier $TIER ($LABEL) ==="

  local TIMES=()
  local PASSES=0
  local FAILS=0
  local TIMEOUTS=0

  for i in $(seq 1 "$N"); do
    local SEED
    SEED="0x$(head -c4 /dev/urandom | od -An -tx4 | tr -d ' ')"

    # Kill zombies
    killall -9 quint_evaluator 2>/dev/null || true

    local START_SEC
    START_SEC=$(date +%s)

    # Run with env vars and 120s timeout
    local STATUS=0
    timeout 120 env QUINT_SEED="$SEED" "${ENV_VARS[@]}" \
      npx vitest run -t "replays Quint" -- src/battle-projection.mbt.test.ts 2>&1 > "$TMP" || STATUS=$?

    local END_SEC
    END_SEC=$(date +%s)
    local ELAPSED=$(( END_SEC - START_SEC ))

    if [ "$STATUS" -eq 124 ]; then
      echo "  [$i/$N] seed=$SEED TIMEOUT (${ELAPSED}s)"
      TIMEOUTS=$((TIMEOUTS + 1))
      RESULT="timeout"
    elif [ "$STATUS" -eq 0 ]; then
      echo "  [$i/$N] seed=$SEED PASS (${ELAPSED}s)"
      PASSES=$((PASSES + 1))
      RESULT="pass"
    else
      echo "  [$i/$N] seed=$SEED FAIL (${ELAPSED}s)"
      FAILS=$((FAILS + 1))
      RESULT="fail"
    fi

    TIMES+=("$ELAPSED")
    echo "{\"tier\":\"$TIER\",\"label\":\"$LABEL\",\"seed\":\"$SEED\",\"elapsed_s\":$ELAPSED,\"result\":\"$RESULT\"}" >> "$OUTPUT"
  done

  # Compute stats
  local SORTED
  SORTED=$(printf '%s\n' "${TIMES[@]}" | sort -n)
  local MIN
  MIN=$(echo "$SORTED" | head -1)
  local MAX
  MAX=$(echo "$SORTED" | tail -1)
  local MEDIAN
  MEDIAN=$(echo "$SORTED" | awk "NR==$(( (N+1)/2 ))")
  local SUM=0
  for t in "${TIMES[@]}"; do SUM=$((SUM + t)); done
  local AVG=$((SUM / N))

  echo "  Summary: min=${MIN}s median=${MEDIAN}s avg=${AVG}s max=${MAX}s pass=$PASSES fail=$FAILS timeout=$TIMEOUTS"
  echo "{\"tier\":\"$TIER\",\"label\":\"$LABEL\",\"n\":$N,\"min_s\":$MIN,\"median_s\":$MEDIAN,\"avg_s\":$AVG,\"max_s\":$MAX,\"passes\":$PASSES,\"fails\":$FAILS,\"timeouts\":$TIMEOUTS}" >> "$OUTPUT"
  echo ""
}

# Tier 1: Battle dev (compiled cache, minimal)
run_tier "1" "battle-dev" MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3

# Tier 1 at 5 steps
run_tier "1-5step" "battle-dev-5step" MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=5

# Tier 2: Pre-commit
run_tier "2" "pre-commit" MBT_DEV=1

echo "=== Done. Raw data in $OUTPUT (project root) ==="
