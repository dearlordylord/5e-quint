#!/usr/bin/env bash
# Combined fuzzer — runs MBT parity and invariant fuzzing in parallel.
#
# Usage:
#   ./scripts/fuzz-all.sh              # run until killed (Ctrl+C)
#   ./scripts/fuzz-all.sh 100          # run 100 seeds per fuzzer then stop
#
# Forwards Ctrl+C to both subprocesses and waits for clean shutdown.
# Output files:
#   mbt-fuzz.log / mbt-failures.jsonl           — MBT parity fuzzer
#   invariant-fuzz.log / invariant-failures.jsonl — invariant fuzzer

set -euo pipefail
cd "$(dirname "$0")/.."

MAX_SEEDS="${1:-0}"

PIDS=()

cleanup() {
  echo ""
  echo "=== Shutting down fuzzers... ==="
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait "${PIDS[@]}" 2>/dev/null || true
  echo "=== All fuzzers stopped ==="
}
trap cleanup INT TERM EXIT

echo "Starting combined fuzzer (max_seeds=${MAX_SEEDS:-∞})"
echo "  Battle MBT  → mbt-failures.jsonl"
echo "  Invariants  → invariant-failures.jsonl"
echo ""
echo "WARNING: Running both fuzzers needs ~12GB+ RAM."
echo "On constrained containers (<16GB), run them separately."
echo ""

# Battle MBT parity fuzzer (default: battle, not creature)
MBT_TEST="${MBT_TEST:-battle}" ./scripts/mbt-fuzz.sh "$MAX_SEEDS" &
PIDS+=($!)

# Invariant fuzzer
./scripts/invariant-fuzz.sh "$MAX_SEEDS" &
PIDS+=($!)

# Wait for both — if either exits, keep the other running
wait "${PIDS[@]}"
