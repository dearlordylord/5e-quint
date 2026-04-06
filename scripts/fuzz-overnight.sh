#!/usr/bin/env bash
# Overnight fuzzer — tier benchmark first, then continuous fuzzing with timing.
#
# Usage:
#   ./scripts/fuzz-overnight.sh              # run until killed
#   ./scripts/fuzz-overnight.sh 100          # 100 MBT seeds, then stop
#
# Output files:
#   tier-timing.jsonl           — tier benchmark results (first ~30 min)
#   mbt-fuzz.log                — MBT seed log with timing
#   mbt-failures.jsonl          — MBT failure records
#   mbt-timing.jsonl            — per-seed timing for stats
#   invariant-fuzz.log          — invariant seed log
#   invariant-failures.jsonl    — invariant failure records

set -euo pipefail
cd "$(dirname "$0")/.."

MAX_SEEDS="${1:-0}"

PIDS=()

cleanup() {
  echo ""
  echo "=== Shutting down overnight fuzzer... ==="
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait "${PIDS[@]}" 2>/dev/null || true
  killall -9 quint_evaluator 2>/dev/null || true
  echo "=== Done ==="
}
trap cleanup INT TERM EXIT

echo "=== Overnight Fuzzer $(date -Iseconds) ==="
echo ""

# Phase 1: Tier timing benchmark (10 seeds per tier)
echo "Phase 1: Tier timing benchmark..."
./scripts/measure-tier-timing.sh 10 2>&1 | tee tier-benchmark.log
echo ""

# Phase 2: Continuous fuzzing
echo "Phase 2: Continuous fuzzing (max_seeds=${MAX_SEEDS:-∞})"
echo ""

# MBT fuzzer (creature + battle alternating) with timing
./scripts/mbt-fuzz-timed.sh "$MAX_SEEDS" &
PIDS+=($!)

# Invariant fuzzer
./scripts/invariant-fuzz.sh "$MAX_SEEDS" &
PIDS+=($!)

wait "${PIDS[@]}"
