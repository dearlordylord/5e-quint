# MBT Performance: Findings, Changes, and Recommendations

> Research conducted 2026-04-04/05. All measurements on the battle.qnt spec
> with 4 creatures, 17 actions in `battleStep`, original master nondet ranges.

## TL;DR

Battle MBT is **inherently slow** (~4 minutes for 10 samples × 5 steps) because the Rust evaluator
is slow with the battle spec's large state (4 creatures × 25+ fields). The only viable optimization
is caching the 15s parse/typecheck overhead, which brings single-sample dev runs to **~2s**.

---

## Performance Breakdown

| Component | Time | Cacheable? |
|-----------|------|------------|
| Vitest startup/transform | ~2s | No (vitest internal) |
| Quint parse + typecheck | ~15s | **Yes** — compile-battle-spec.cjs |
| Rust evaluator (battle simulation) | ~30-60s per sample | No |
| TS trace replay | ~0.3s | No (already fast) |

The evaluator's per-sample cost is the dominant factor for multi-sample runs.
`quint run` reports misleading timing (~577ms) when using creature-module defaults (`init`/`step`)
instead of battle-module (`bInit`/`battleStep`).

---

## Findings

### Finding 1: Nondet range sizes do NOT affect MBT performance

The Rust evaluator samples randomly from nondet ranges. Whether a range is `1.to(5)` or `1.to(20)`,
the evaluator picks one random value in constant time. Range cardinality is irrelevant to simulation speed.

**Tested:** Shrank all ranges in battle.qnt (HP, damage, AC, damage types, conditions, slots, etc.).
Zero measurable difference in evaluator timing.

**Implication:** The original master ranges are optimal. Do not shrink ranges for performance.
The PLAN_AUDIT.md P1 note about "constraining to SRD-realistic ranges" is about **coverage quality**
(avoiding impossible combinations like L1 spell doing 39 damage), not performance.

### Finding 2: Number of actions in `battleStep` does NOT affect performance

**Tested:** Trimmed `battleStep` from 17 actions to 7.
**Result:** 39s vs 41s — within noise.

The evaluator's cost is dominated by state evaluation (reading/writing 100+ fields across 4 creatures),
not by guard checking. Each step evaluates the full state regardless of how many actions are offered.

### Finding 3: The Rust evaluator is genuinely slow with battle state

`quint run battle.qnt --backend rust --init bInit --step battleStep --max-samples 10 --max-steps 5`
takes **~4 minutes** (1125s user time at 484% CPU). This is the evaluator processing complex
record types (4 creatures × CreatureState + TurnState + SpellSlotState + MonsterResources + ...).

This is NOT the parse/typecheck overhead — it's the actual simulation. Not fixable from our side.

### Finding 4: 15s parse/typecheck overhead is cacheable

Quint's NodeJS pipeline (load → parsePhase1-4 → typecheck → resolve) takes ~15s for
creature.qnt (6079 lines) + battle.qnt (2500 lines). This runs on **every** `quint run`
invocation with no caching.

**Solution:** `scripts/compile-battle-spec.cjs` captures the compiled evaluator input once.
`@firfi/quint-connect`'s `compiledInput` option feeds it directly to the evaluator on subsequent runs.

### Finding 5: The Rust evaluator has a `nthreads=1` deadlock bug (v0.5.0)

When `nthreads=1` and `nruns>1`, the evaluator completes the first sample then deadlocks.
`quint run` avoids this by setting `nthreads = Math.min(maxSamples, os.cpus().length)`.

**Fix applied** in quint-connect: `nthreads = Math.max(2, Math.min(maxSamples, cpus().length))`.

### Finding 6: json-bigint serialization must be preserved end-to-end

The Rust evaluator is extremely sensitive to how its JSON input is serialized. Quint uses
`json-bigint` to serialize the evaluator input — this produces integers as plain JSON numbers,
but with BigInt precision internally. When this output is:

- **Written directly to stdin** (in-process `proc.stdin.write(str)`): **Works. ~130ms per sample.**
- **Saved to file, then read back and written**: **Hangs or takes minutes.**

Root cause: Node.js `readFile()` + `JSON.parse()` silently converts BigInt integers to IEEE 754
float64. Even though `JSON.stringify()` produces the same decimal digits, the byte representation
after the round-trip may differ subtly (e.g., trailing precision, exponential notation for large IDs).
The Rust evaluator's JSON parser handles these differently.

**Solution implemented:** `scripts/compile-battle-spec.cjs` uses Quint's JS API to compile
in-process and serializes with `json-bigint.stringify()`. The cache file contains the raw
json-bigint output. `quint-connect` reads it as a raw string (no `JSON.parse`!) and writes
directly to `proc.stdin.write()`. This preserves byte-identical output to what `quint run`
would produce internally.

**CRITICAL:** Never parse the cache file with `JSON.parse()` and re-stringify it. The round-trip
through standard JSON destroys the BigInt precision that the evaluator depends on.

### Finding 7: Zombie evaluator processes

When a test runner or `timeout` kills the `quint` process, the child `quint_evaluator` process
survives and continues consuming 100% CPU. Multiple zombies can accumulate and starve the system.

**Fix applied** in quint-connect: `detached: true` + `process.kill(-proc.pid, "SIGKILL")` to
kill the entire process group.

**Manual cleanup:** `killall -9 quint_evaluator`

---

## Changes Made

### quint-connect (`/workspace/typescript/quint-connect`)

**File: `src/cli/quint.ts`**

| Change | Purpose |
|--------|---------|
| `compiledInput` option on `RunOptions` | Path to pre-compiled evaluator input JSON |
| `runFromCompiledInput()` function | Reads cache as raw string, patches runtime params via regex, writes to evaluator stdin |
| `runEvaluatorDirect()` function | Spawns evaluator, writes input string directly to stdin (no file round-trip) |
| `getRustEvaluatorPath()` function | Finds `~/.quint/rust-evaluator-v*/quint_evaluator` |
| BigInt handling | `JSON.parse` reviver (int→bigint) + `#bigint` ITF encoding for trace output |
| `spawn("quint", ...)` instead of `spawn("npx", ["@informalsystems/quint", ...])` | Saves ~3s npx resolution |
| `detached: true` + process group kill | Prevents zombie evaluator processes |
| `nthreads = Math.max(2, ...)` | Workaround for evaluator deadlock bug |
| No `maxSamples` guard — cache works for all sample counts | Uses `runEvaluatorDirect` (direct stdin write) |

### dnd project

**`scripts/compile-battle-spec.cjs`** — Pre-compilation script:
- Captures evaluator stdin via `tee` wrapper (see Finding 6 for why)
- SHA-256 hash-based cache staleness detection
- Auto-skips when cache is fresh
- Run after editing `battle.qnt` or `creature.qnt`

**`app/src/battle.mbt.test.ts`**:
- Passes `compiledInput` path to `run()`
- Warns when cache is stale (hash mismatch)

**`.quint-cache/`** — Cached compiled spec (gitignored):
- `battle-compiled.json` — 7MB evaluator input
- `battle-compiled.hash` — SHA-256 of spec files

**`.gitignore`** — Added `.quint-cache/`

---

## What NOT to Try (Dead Ends)

### Do NOT shrink nondet ranges for performance

Range sizes have zero effect on the Rust evaluator's speed. The evaluator samples randomly
in constant time regardless of range cardinality. Shrinking ranges only reduces coverage
(fewer edge cases tested) with no performance benefit.

### Do NOT reduce actions in `battleStep` for performance

The number of actions in the `any { }` block has negligible impact on per-step cost.
The bottleneck is state evaluation (reading/writing the full creature state), not guard checking.

### Do NOT read the cache file with JSON.parse()

The cache file is produced by `json-bigint.stringify()`. Reading it with `JSON.parse()` and
re-writing destroys BigInt precision and causes the evaluator to hang (Finding 6). Always
read as a raw string and write directly to `proc.stdin.write()`.

### Do NOT rely on `quint run`'s reported timing

`quint run` reports "X ms at Y traces/second" which measures only the time between sending
the input to the evaluator and receiving the result. It does NOT include:
- 15s parse/typecheck overhead
- Evaluator's input deserialization time
- When using default `init`/`step` (creature module), the timing reflects creature-module
  performance, NOT battle-module performance

---

## Recommended Usage

### Dev workflow (fast feedback)

```bash
# One-time: compile the spec cache (~60s)
node scripts/compile-battle-spec.cjs

# Fast MBT run (~2s): 1 trace, 1 sample, configurable steps
MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=10 npx vitest run src/battle.mbt.test.ts
```

### After editing battle.qnt or creature.qnt

```bash
# Recompile cache (auto-detects staleness)
node scripts/compile-battle-spec.cjs

# Test warns if you forget:
# "[battle MBT] WARNING: compiled spec cache is STALE. Run: node scripts/compile-battle-spec.cjs"
```

### Multi-sample (MBT_DEV)

```bash
# With cache (~2-5 min depending on trace complexity):
MBT_DEV=1 npx vitest run src/battle.mbt.test.ts

# Without cache (~4+ min — adds 15s parse/typecheck overhead):
# (automatically falls back to quint run when no cache exists)
```

**Note:** Multi-sample runs are slow regardless of caching because the Rust evaluator takes
~30-60s per sample for the battle spec. The cache saves only the 15s parse/typecheck overhead.
For dev feedback, use `MBT_MAX_SAMPLES=1` which completes in ~3s.

### Zombie cleanup

```bash
# If evaluator processes accumulate (check with: ps aux | grep quint_evaluator)
killall -9 quint_evaluator
```

---

## Quint Version Notes

- **Working evaluator:** v0.5.0 (in `~/.quint/rust-evaluator-v0.5.0/`)
- **Quint CLI:** v0.31.0 (compile script uses its JS API)
- **v0.6.0 evaluator is a REGRESSION:** tested 2026-04-05 with both mismatched and matched
  version pairs. v0.6.0 takes 42s+ for the same single-sample run that v0.5.0 completes in <1s.
  - Tested: quint 0.31.0 compile + v0.6.0 evaluator → slow (rules out version mismatch)
  - Tested: quint 0.32.0 compile + v0.6.0 evaluator (matched pair) → **still slow**
  - Conclusion: genuine v0.6.0 evaluator regression, not a format mismatch
  - The v0.6.0 binary is functionally correct (produces valid traces) but ~40x slower
  - Likely cause: internal simulation algorithm change (parallelization refactor, lazy eval changes)
- If both v0.5.0 and v0.6.0 exist in `~/.quint/`, **delete v0.6.0** — quint-connect picks
  the latest alphabetically. Or set `QUINT_EVALUATOR_VERSION=v0.5.0` env var.
- **Do not upgrade quint CLI to 0.32.0** — it auto-downloads v0.6.0 evaluator on `--backend rust`.
- Worth filing as a Quint issue with reproduction steps (battle.qnt spec, 1 sample, 5 steps,
  v0.5.0 <1s vs v0.6.0 42s).

## Quint GitHub Research (2026-04-05)

- **No known `nthreads=1` deadlock** in issues — our bug may be unreported
- **No spec caching** exists or is planned — our `compiledInput` approach is novel
- **json-bigint round-trip fidelity** is untracked — worth filing as an issue
- **Lazy `any` evaluation** shipped ([#1582](https://github.com/informalsystems/quint/pull/1582)) —
  the evaluator no longer wastes time evaluating all `any` branches before picking one
- **Parallelization** shipped ([#1637](https://github.com/informalsystems/quint/issues/1637)) —
  multi-threaded simulation when `nthreads > 1`

## Future Work

1. **File Quint issue: evaluator v0.6.0 performance regression** — battle spec 1 sample
   takes <1s on v0.5.0 but 42s+ on v0.6.0. Tested with matched (0.32.0+v0.6.0) and
   mismatched (0.31.0+v0.6.0) pairs — both slow. Include `battle.qnt` + `creature.qnt` as repro.
2. **File Quint issue: json-bigint round-trip sensitivity** — the evaluator should not
   hang when receiving standard JSON numbers instead of json-bigint-produced numbers
3. **File Quint issue: `nthreads=1` deadlock** (if still present in v0.6.0)
4. **Publish quint-connect** with `compiledInput` option (patch version, non-breaking)
5. **Investigate evaluator `run <file>` command** — may bypass stdin pipe issues entirely
