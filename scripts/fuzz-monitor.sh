#!/usr/bin/env bash
# Fuzz monitor — checks for zombies and new failures.
# Designed to be called by a cron job during overnight fuzzing.
#
# Output: prints a status summary to stdout (cron prompt picks this up).

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Fuzz Monitor $(date -Iseconds) ==="

# 1. Kill zombie evaluators
ZOMBIES=$(ps aux | grep quint_evaluator | grep -v grep | wc -l)
ZOMBIES="${ZOMBIES// /}"
if [ "$ZOMBIES" -gt 2 ]; then
  echo "ZOMBIE ALERT: $ZOMBIES quint_evaluator processes found. Killing excess."
  killall -9 quint_evaluator 2>/dev/null || true
else
  echo "Evaluators: $ZOMBIES (OK)"
fi

# 2. Check if fuzzer is still running
FUZZ_PROCS=$(ps aux | grep -E 'mbt-fuzz|invariant-fuzz|fuzz-all|fuzz-overnight' | grep -v grep | wc -l)
FUZZ_PROCS="${FUZZ_PROCS// /}"
if [ "$FUZZ_PROCS" -eq 0 ]; then
  echo "WARNING: No fuzzer process found! May have crashed."
else
  echo "Fuzzer processes: $FUZZ_PROCS (running)"
fi

# 3. Count failures since last check
MBT_FAILS=0
INV_FAILS=0
[ -f mbt-failures.jsonl ] && MBT_FAILS=$(wc -l < mbt-failures.jsonl)
[ -f invariant-failures.jsonl ] && INV_FAILS=$(wc -l < invariant-failures.jsonl)

echo "MBT failures: $MBT_FAILS"
echo "Invariant failures: $INV_FAILS"

# 4. Analyze MBT failure patterns
if [ "$MBT_FAILS" -gt 0 ]; then
  echo ""
  echo "--- MBT Failure Analysis ---"

  # Group by kind
  echo "By kind:"
  jq -r '.kind' mbt-failures.jsonl 2>/dev/null | sort | uniq -c | sort -rn || echo "  (could not parse)"

  # Group by field
  echo "By divergent field:"
  jq -r '.field' mbt-failures.jsonl 2>/dev/null | sort | uniq -c | sort -rn || echo "  (could not parse)"

  # Show last 3 failures
  echo "Latest failures:"
  tail -3 mbt-failures.jsonl
fi

# 5. Analyze invariant failure patterns
if [ "$INV_FAILS" -gt 0 ]; then
  echo ""
  echo "--- Invariant Failure Analysis ---"
  tail -3 invariant-failures.jsonl

  # Check if same invariant keeps failing
  for LOG_FILE in invariant-failure-*.log; do
    [ -f "$LOG_FILE" ] || continue
    INV_NAME=$(grep -oP 'invariant \K\w+' "$LOG_FILE" | head -1 || echo "unknown")
    echo "  $LOG_FILE: invariant=$INV_NAME"
  done
fi

# 6. Timing stats (if timing data exists)
if [ -f mbt-timing.jsonl ]; then
  echo ""
  echo "--- Timing Stats ---"
  TOTAL_SEEDS=$(wc -l < mbt-timing.jsonl)
  echo "Total seeds timed: $TOTAL_SEEDS"

  echo "Creature MBT (last 20):"
  grep '"creature"' mbt-timing.jsonl | tail -20 | jq -r '.elapsed_s' 2>/dev/null | awk '{sum+=$1; n++; if($1>max)max=$1; if(n==1||$1<min)min=$1} END{if(n>0) printf "  n=%d min=%ds avg=%ds max=%ds\n",n,min,sum/n,max}' || echo "  (no data)"

  echo "Battle MBT (last 20):"
  grep '"battle"' mbt-timing.jsonl | tail -20 | jq -r '.elapsed_s' 2>/dev/null | awk '{sum+=$1; n++; if($1>max)max=$1; if(n==1||$1<min)min=$1} END{if(n>0) printf "  n=%d min=%ds avg=%ds max=%ds\n",n,min,sum/n,max}' || echo "  (no data)"
fi

# 7. Auto-fix analysis
echo ""
echo "--- Auto-fix Candidates ---"
if [ "$MBT_FAILS" -eq 0 ] && [ "$INV_FAILS" -eq 0 ]; then
  echo "No failures — nothing to fix."
elif [ "$MBT_FAILS" -gt 0 ]; then
  # Check if ALL failures are on the same field — likely a single bug
  UNIQUE_FIELDS=$(jq -r '.field' mbt-failures.jsonl 2>/dev/null | sort -u | wc -l || echo 0)
  UNIQUE_ACTIONS=$(jq -r '.error' mbt-failures.jsonl 2>/dev/null | grep -oP 'action: \K\w+' | sort -u | wc -l || echo 0)

  if [ "$UNIQUE_FIELDS" -eq 1 ]; then
    THE_FIELD=$(jq -r '.field' mbt-failures.jsonl 2>/dev/null | head -1)
    echo "ALL $MBT_FAILS MBT failures on field '$THE_FIELD' — likely a single bug."
    echo "RECOMMENDATION: Debug one seed manually, fix should resolve all."
    echo "  Repro: QUINT_SEED=$(jq -r '.seed' mbt-failures.jsonl | head -1) MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=5 npx vitest run -t 'replays Quint'"
  else
    echo "MBT failures across $UNIQUE_FIELDS fields — multiple bugs or cascading issue."
    echo "RECOMMENDATION: Defer to manual triage. Seeds saved in mbt-failure-*.log files."
  fi
fi
