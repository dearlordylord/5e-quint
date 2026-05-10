# MBT Benchmark Methodology

Portable, reproducible methodology for measuring MBT tier timing across nightly runs. Results feed back into `CLAUDE.md` tier estimates.

## What Each Fuzzer Tests

| Fuzzer | What it proves | Value | Script |
|--------|---------------|-------|--------|
| **Battle MBT** | Quint spec ↔ runtime parity — the TS implementation matches the spec, field-by-field, step-by-step | **High — this is the primary overnight target** | `mbt-fuzz.sh` (default) → `battle-projection.mbt.test.ts` |
| **Creature MBT** | Quint spec ↔ runtime parity for single-creature mechanics only (no battle interactions) | Medium — subset of battle MBT | `MBT_TEST=creature mbt-fuzz.sh` → `creature.mbt.test.ts` |
| **Invariant fuzzer** | Quint spec internal consistency — do all 13 battle invariants hold under random exploration | Lower — tests spec against itself, no TS involvement | `invariant-fuzz.sh` → `npx quint run` directly |

**Priority for overnight runs: battle MBT first.** It's the only fuzzer that validates the TS implementation against the spec. Invariant fuzzer is supplementary — run it if resources allow, but never instead of battle MBT.

## Goals

1. **Measure wall-clock time** for each MBT tier at various step counts
2. **Identify slow-seed frequency** — what % of seeds exceed 2× median
3. **Track performance trends** across spec changes (line count, combatant count, action count)
4. **Provide actionable tier estimates** for CLAUDE.md that reflect real-world timing

## Environment Fingerprint

Every benchmark run records these for reproducibility:

| Field | How to capture |
|-------|---------------|
| Date | `date -Iseconds` |
| Spec size | `wc -l creature.qnt battle.qnt` |
| Combatant count in bInit | `grep -c 'addCombatant' battle.qnt` (or manual) |
| Action count in battleStep | count `any { }` branches in `battleStep` |
| Cache state | `node scripts/compile-battle-spec.cjs` output (fresh/recompiled) |
| Concurrent processes | `ps aux \| grep -c quint_evaluator` before run |
| Platform | `uname -a`, container/VM type |

## Measurement Protocol

### Pre-run checklist

1. Kill zombie evaluators: `killall -9 quint_evaluator 2>/dev/null`
2. Verify no other MBT/vitest processes: `ps aux | grep -E 'vitest|quint_evaluator' | grep -v grep`
3. Compile cache: `node scripts/compile-battle-spec.cjs` — must say "Cache is fresh" or "Compiled"
4. Verify cache: `ls -la .quint-cache/battle-compiled.json`

### Per-seed measurement

**Wall-clock only.** We measure `date +%s` before and after each `npx vitest run` invocation. This captures the full user-visible cost: vitest startup, transform, quint evaluator launch, trace generation, state comparison, teardown.

We do NOT attempt to isolate evaluator-only time because:
- The evaluator is a subprocess spawned by quint-connect; its lifecycle is not separately observable without modifying quint-connect internals
- Vitest startup/transform cost is a fixed overhead (~5–8s) that's part of the real developer experience
- The CLAUDE.md tiers describe wall-clock expectations, not evaluator-only time

### Tier definitions

| Tier | Config | Purpose | Expected use |
|------|--------|---------|--------------|
| **1** | `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3` (battle) | Iterative dev | After each code change |
| **1-5step** | `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=5` (battle) | Extended dev | Slightly deeper exploration |
| **1b** | `MBT_TRACES=1 MBT_MAX_SAMPLES=1` (creature, default steps) | Creature-only | Creature-level changes |
| **2** | `MBT_DEV=1` (battle) | Pre-commit | 10 samples × 5 steps |
| **3** | `MBT_TRACES=1 MBT_MAX_SAMPLES=50 MBT_STEPS=10` (battle) | Full validation | CI / overnight |

### Sample size

**Minimum 10 seeds per tier** for a nightly benchmark. Seeds are random (`/dev/urandom`). The script records every seed so outliers can be reproduced.

### Timeout

120s per seed. Seeds exceeding this are recorded as `timeout` with elapsed = 120s. This is generous — any seed taking >60s is "slow" for tier 1.

## Output Format

### Raw data: `tier-timing.jsonl`

One JSON line per seed:
```json
{"tier":"1","label":"battle-dev","seed":"0xbb754cab","elapsed_s":19,"result":"pass"}
```

Summary line after each tier (n seeds):
```json
{"tier":"1","label":"battle-dev","n":10,"min_s":12,"median_s":14,"avg_s":14,"max_s":19,"passes":10,"fails":0,"timeouts":0}
```

### Derived metrics

From raw data, compute:
- **p50 / p90 / p99** — for CLAUDE.md, use p90 as the "expected" time (most seeds finish faster)
- **slow-seed %** — seeds > 2× median. CLAUDE.md currently estimates ~13% at 3+ steps
- **timeout %** — seeds hitting 120s cap
- **fail %** — seeds that fail (MBT mismatch, not timeout)

## Benchmark Script

`scripts/measure-tier-timing.sh [N]` — runs N seeds per tier (default 10).

Run: `./scripts/measure-tier-timing.sh 10`

For overnight with more data: `./scripts/measure-tier-timing.sh 30`

## Analysis

### Decomposing wall-clock time

Total wall-clock = vitest overhead + evaluator startup + trace generation + state comparison

To estimate evaluator-only time, subtract vitest overhead (measure with a no-op test).
To estimate per-step cost, compare 3-step vs 5-step tier at same seed (not currently supported — seeds are random per tier).

**TODO:** Add a mode that runs the same seed at 3 and 5 steps to measure marginal per-step cost.

### Cross-night comparison

When comparing across nights:
1. Verify spec size hasn't changed (or note the delta)
2. Verify same platform/container
3. Compare medians, not means (outliers skew means)
4. Note any new actions added to `battleStep` (more branches = potentially slower)

## Results

### 2026-04-05 (Night 1 — baseline)

**Platform:** Linux 6.17.8-orbstack, container  
**Spec:** creature.qnt ~6K lines, battle.qnt ~2K lines, 4 combatants in bInit  
**Cache:** Pre-compiled (fresh)

#### Tier 1 (battle-dev, 3 steps, 1 trace, 1 sample)

| Metric | Value |
|--------|-------|
| n | 10 |
| min | 12s |
| median | 14s |
| avg | 14s |
| max | 19s |
| slow seeds (>2× median) | 0/10 (0%) |
| timeouts | 0 |
| fails | 0 |

**CLAUDE.md claimed ~1s.** Actual is 12–19s. The ~1s figure likely referred to evaluator-only time with a hot cache, not wall-clock including vitest startup. **CLAUDE.md needs updating to reflect wall-clock reality.**

Estimated breakdown:
- Vitest startup + transform: ~5–8s (observed from test suite load times)
- Evaluator + trace gen: ~6–11s
- State comparison: <1s

#### Tier 1-5step (battle-dev, 5 steps, 1 trace, 1 sample)

| Metric | Value |
|--------|-------|
| n | 10 |
| min | 13s |
| median | 14s |
| avg | 14s |
| max | 17s |
| slow seeds (>2× median) | 0/10 (0%) |
| timeouts | 0 |
| fails | 0 |

**Nearly identical to 3-step.** Confirms vitest overhead (~8–10s) dominates; the evaluator's marginal per-step cost is <1s. For practical purposes, Tier 1 at 3 or 5 steps is the same wall-clock time.

#### Tier 2 (pre-commit, MBT_DEV=1 = 10 samples × 5 steps)

| Metric | Value |
|--------|-------|
| n | 10 |
| min | 21s |
| median | 25s |
| avg | 25s |
| max | 35s |
| slow seeds (>2× median) | 0/10 (0%) |
| timeouts | 0 |
| fails | 1 (OOM SIGKILL) |

**~1.8× Tier 1**, not the "1–10+ min" claimed in CLAUDE.md. The 10-sample overhead adds ~10s on top of vitest startup. One seed hit container memory limits (SIGKILL). The CLAUDE.md claim of frequent timeouts at 10 min may be from an older spec version or different container config.

#### Summary: CLAUDE.md tier updates needed

| Tier | CLAUDE.md claimed | Measured (p90) | Recommended update |
|------|-------------------|----------------|--------------------|
| 1 | ~1s with compiled cache | ~17s | "~15s wall-clock (vitest overhead dominates)" |
| 1b | ~20s | not measured this night | keep as-is, measure next night |
| 2 | 1–10+ min, often times out | ~30s | "~25–35s, occasional OOM on constrained containers" |

## Updating CLAUDE.md

After each benchmark night, update the tier table in CLAUDE.md with:
- p90 wall-clock time as the headline number
- Note vitest overhead separately so readers can estimate evaluator-only cost
- Update slow-seed % if significantly different from 13%

## Invariant Fuzzer Timing

The invariant fuzzer (`scripts/invariant-fuzz.sh`) uses `npx quint run` directly (no vitest).

**Night 1 data (5 samples × 5 steps, 120s timeout, solo — no concurrent MBT):**

| Metric | Value |
|--------|-------|
| Total seeds | 288 |
| Completed | 148 (51%) |
| Timeouts (>120s) | 140 (49%) |
| Invariant violations | 0 |

**Slow-seed rate is ~49%** at 5×5 with 120s timeout. At 10×10 without timeout, individual seeds can take 20+ minutes (CPU-bound, not memory). The CLAUDE.md "~13% slow seeds" estimate was for battle MBT Tier 1, not the invariant fuzzer.

**Memory constraint:** Cannot run invariant fuzzer + battle MBT concurrently on 16GB containers — OOM kills the evaluator. Run them separately. On hosts with 96GB+, concurrent execution should work.

## Creature MBT Timing

**Night 1 data (50 traces × 30 steps):**

| Metric | Value |
|--------|-------|
| Total seeds | 82 |
| min | 15s |
| avg | 16s |
| max | 26s |
| Failures | 0 |
| Slow seeds (>60s) | 0 |

Note: Night 1 ran creature MBT instead of battle MBT by mistake. Battle MBT is the higher-value fuzzer. Future nights should run battle MBT (`MBT_TEST=battle`, the default).

## Known Issues

1. **Vitest overhead dominates short tiers.** Tier 1 spends ~50% of wall-clock on vitest startup/transform. A persistent vitest watcher (`--watch`) would eliminate this but isn't compatible with `QUINT_SEED` per-run.
2. **Same-seed cross-tier comparison not yet implemented.** Need to run identical seeds at different step counts to isolate per-step cost.
3. **No CPU/memory profiling.** Wall-clock is affected by other processes. For high-fidelity measurement, would need `perf` or similar.
4. **16GB container too small for concurrent fuzzing.** Battle MBT (vitest + evaluator) + invariant fuzzer (evaluator) exceeds 16GB. Run separately or use a larger host.
5. **Night 1 ran creature MBT instead of battle MBT.** Fixed in `mbt-fuzz.sh` — now defaults to battle MBT (`battle-projection.mbt.test.ts`).
