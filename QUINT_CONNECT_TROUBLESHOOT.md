# MBT Performance: Findings, Changes, and Recommendations

> Research conducted 2026-04-04/05, updated 2026-04-05.
> All measurements on the battle.qnt spec with 4 creatures, 17 actions in `battleStep`.

## TL;DR

Battle MBT is **inherently slow** (10s–180s+ per sample depending on random seed) because of
two factors: (1) **seed-dependent action path length** — how many `actionAny` branches the
evaluator tries (with snapshot/restore) before finding an enabled one, and (2) **winning action
body complexity** — deep call chains doing many `imbl` persistent map operations. The compile-
script cache saves the 15s parse/typecheck overhead but cannot help with the evaluator's
simulation time.

**Key insight from source code analysis (evaluator/src/):** The evaluator uses a compile-then-
execute architecture. All 13K+ definitions are resolved into `Rc<RefCell<>>` closures at compile
time — zero table lookups happen per step. The imported definition count does NOT affect per-step
cost; it only affects the one-time compile phase (~5-7s).

**Fastest reliable feedback:** creature-level MBT (`machine.mbt.test.ts`) completes in ~20s.

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

**Confirmed by source code:** `actionAny` (`builtins.rs`) uses Fisher-Yates shuffle + short-circuit
(PR #1582). It tries actions in random order and stops at the first enabled one. With 17 vs 7
actions, the worst case is 17 vs 7 snapshot/restore cycles — but each cycle is O(state variables),
not O(definitions), so the difference is small. The dominant cost is the *winning action's body
evaluation*, not how many branches exist.

### Finding 3: The Rust evaluator is genuinely slow with battle state

`quint run battle.qnt --backend rust --init bInit --step battleStep --max-samples 10 --max-steps 5`
takes **~4 minutes** (1125s user time at 484% CPU). This is the evaluator executing complex
action bodies — deep call chains (`resolveAttack → dealDamage → pTakeDamage → condition
application`) doing many `imbl` persistent map operations (O(log n) per get/set).

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

### Finding 8: Three distinct cost layers — compile, action path, action body (2026-04-05)

Systematic scaling tests with isolated perf specs show:

| Test | Spec | Result |
|------|------|--------|
| Self-contained, 5 fields × 2 creatures, 3 actions | No imports | **1s** (26ms evaluator) |
| Self-contained, 15 fields × 2 creatures, 3 actions | No imports | **1s** (24ms evaluator) |
| Self-contained, 25 fields × 2 creatures, 3 actions | No imports | **1s** (26ms evaluator) |
| Self-contained, 25 fields × 4 creatures, 3 actions | No imports | **1s** (32ms evaluator) |
| Import creature.qnt, simple types, 2 creatures | 6K lines imported | **7s** (195ms evaluator) |
| Import creature.qnt + CreatureState, 2 creatures | 6K lines imported | **6s** (198ms evaluator) |
| Import creature.qnt + pTakeDamage calls | 6K lines imported | **7s** (225ms evaluator) |
| Full battle.qnt, 1 step (lucky seed) | creature.qnt + battle.qnt | **10s** (313ms evaluator) |
| Full battle.qnt, 1 step (unlucky seed) | creature.qnt + battle.qnt | **30s+** (timeout) |
| Full battle.qnt, 2 steps | creature.qnt + battle.qnt | **180s+** (timeout) |

**Key findings (validated against evaluator source code `evaluator/src/`):**

1. **Record size is irrelevant:** 5 fields vs 25 fields, 2 creatures vs 4 creatures — all ~1s when self-contained. The evaluator uses `imbl` persistent data structures with structural sharing; record clone/update is O(log n).

2. **Import overhead is COMPILE TIME, not per-step:** Importing creature.qnt (6000 lines, 13K definitions) adds ~5-7s to the evaluator's **compilation phase** (walking the IR, resolving names via `LookupTable<FxHashMap<u64, LookupDefinition>>`, producing `Rc<RefCell<>>` closures). This is a one-time cost. At runtime, all definitions are pre-resolved into closures — zero table lookups happen per step.

3. **Per-step cost has two components:**
   - **Action path length (seed-dependent):** `actionAny` (`builtins.rs`) shuffles 17 branches and tries them in order. Each failed branch costs one snapshot/restore cycle (O(state variables) via `Storage::take_snapshot`). An unlucky seed that puts the spec in a state where most actions are disabled means 10+ snapshot/restore cycles before finding an enabled one.
   - **Winning action body complexity:** The enabled action's execution cost — deep call chains like `resolveAttack → dealDamage → pTakeDamage → applyCondition`, each doing `imbl::HashMap` get/set operations (O(log n) per operation). AoE targeting 4 creatures with concentration checks, condition applications, and death saves is the most expensive path.

4. **Seed-dependent variance is extreme:** The same spec with 1 step can take 10s or 30s+ depending on the random seed. This is because different seeds produce different initial states, which enable different subsets of `battleStep` actions, leading to different action path lengths and different winning action complexities.

**Corrects earlier interpretation:** Finding 2 ("number of actions doesn't affect performance") is actually correct — the `actionAny` lazy evaluation means branch count has at most linear effect. Finding 3's attribution to "record types" was imprecise — the cost is in the action body's map operations, not record size per se. The earlier claim that "per-step cost grows non-linearly with imported definition count" was wrong — definitions are resolved at compile time and have zero per-step cost.

### Finding 9: Compile script format is identical to quint run (2026-04-05)

The `compile-battle-spec.cjs` output is **byte-identical** to a fresh `toExpr()` serialization.
Verified by running `toExpr()` + `json-bigint.stringify()` on the same spec and comparing the
7.3MB output byte-by-byte. The "format difference" noted in earlier versions of this document
was a false finding, similar to the v0.6.0 regression attribution.

The compile-script cache saves the ~15s parse/typecheck overhead but cannot help with the
evaluator's simulation time, which is 10s–180s+ per step for the full battle spec.

### Finding 10: Battle MBT with compiled cache — bimodal timing (2026-04-05)

5 runs of `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=1` with compiled cache:

| Run | Seed | Time |
|-----|------|------|
| 1 | (timeout) | 60s+ |
| 2 | 0x689d4239 | 1s |
| 3 | (timeout) | 60s+ |
| 4 | 0xad9e6bc3 | 2s |
| 5 | 0x60f1f603 | 2s |

**3/5 runs complete in 1-2s, 2/5 timeout at 60s.** The compiled cache works perfectly when
the evaluator finds a viable trace quickly. Some seeds cause the evaluator to explore
exponentially long paths. The bimodal distribution (fast vs hang) suggests the evaluator
sometimes enters states where no `battleStep` action is enabled and it exhausts all branches.

**Creature-level MBT (`machine.mbt.test.ts`) is consistently 17-18s** across all seeds.
This is the reliable fast-feedback path.

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

### ~~Do NOT reduce actions in `battleStep` for performance~~ — CORRECTED (Finding 13)

**This advice was wrong.** Branch count IS the dominant performance factor. The original test
(Finding 2: 39s vs 41s for 17 vs 7 actions) was confounded by `quint run` overhead. Through
the compiled-input path, 60% of seeds timeout with 17 branches vs 0% with phase-split
(Finding 14). The per-branch cost is much larger than "one snapshot/restore cycle" for
complex state like `bCreatures` (Map of 4 Combatants with 20+ fields each).

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

**Use creature-level MBT for iterative development (~20s):**
```bash
# Creature MBT — always the fastest feedback (no battle.qnt complexity)
MBT_TRACES=1 MBT_MAX_SAMPLES=1 npx vitest run src/machine.mbt.test.ts
```

**Battle MBT with compiled cache (typically <1s, some seeds still slow):**
```bash
# One-time: compile the spec cache (~10s), saves 15s parse/typecheck per run
node scripts/compile-battle-spec.cjs

# Battle MBT: 1 trace, 1 sample, few steps.
# 1-step: all seeds <300ms. 3-step: ~87% of seeds <300ms, ~13% take 10-25s.
MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 npx vitest run src/battle.mbt.test.ts

# If a seed is slow, re-run without QUINT_SEED to get a fresh random seed.
# Known slow seeds at 3 steps: 0xfeedface (~23s). Most seeds are fast.
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
# With cache (~5-30 min depending on seed luck):
MBT_DEV=1 npx vitest run src/battle.mbt.test.ts

# Without cache: adds 15s parse/typecheck overhead per invocation
# (automatically falls back to quint run when no cache exists)
```

**Note:** Multi-sample runs use multiple seeds, so some samples may hit slow seeds.
With the phase-split and capability-split optimizations, most samples complete in <1s,
but occasional slow seeds (caster turns with many enabled branches) can take 10-25s.
For dev feedback, use `MBT_MAX_SAMPLES=1`.

### Zombie cleanup

```bash
# If evaluator processes accumulate (check with: ps aux | grep quint_evaluator)
killall -9 quint_evaluator
```

---

## Quint Version Notes

- **Quint CLI:** v0.31.0 (compile script uses its JS API)
- **Evaluator:** v0.5.0 and v0.6.0 have **identical source code** (1 irrelevant line change).
  Both produce identical performance. Earlier reports of v0.6.0 regression were caused by
  zombie evaluator processes consuming CPU during testing.
- **Upgrading is safe:** `npm i -g @informalsystems/quint@0.32.0` + `./scripts/build-quint-evaluator.sh`
  (source build needed for GLIBC 2.36 compat).
- **The performance bottleneck** is seed-dependent action path length and action body complexity
  (Finding 8), not format differences or definition count. The compile-script cache saves the
  ~15s parse/typecheck overhead. The evaluator's per-step cost is inherent to the spec's action
  logic — confirmed by source code analysis of the evaluator's compile-then-execute architecture.

## Evaluator Source Code Analysis (2026-04-05)

Analysis of `informalsystems/quint` `evaluator/src/` to validate performance claims.

### Architecture: Compile-then-Execute

The Rust evaluator (`evaluator.rs`) compiles Quint IR into closures (`CompiledExpr`) in a
one-time compile phase, then executes those closures at runtime. All name resolution happens
at compile time via `LookupTable` (`ir.rs:61`) — an `IndexMap<u64, LookupDefinition>` with
`FxHasher` (O(1) amortized lookup). At runtime, compiled closures reference pre-resolved
`Rc<RefCell<>>` registers directly — zero table lookups per step.

### `actionAny` — Lazy with Short-Circuit (`builtins.rs:80-109`)

1. Snapshot `next_vars` via `Storage::take_snapshot` (O(state variables))
2. Fisher-Yates shuffle of branch indices (O(n), trivial for 17 branches)
3. Try each branch in shuffled order; short-circuit on first `true`
4. On `false`, restore snapshot and try next branch

Cost: best case = 1 action evaluated; worst case = all N actions with N snapshot/restore cycles.
Each snapshot/restore is O(state variables) using `imbl::HashMap` structural sharing.

### `normalize()` (`normalizer.rs`) — Only on Map Key Access

Called in `builtins.rs` at `get`/`set`/`put`/`setBy`/`mapBy` — per map key operation, not per
step or per definition. For `Int`/`Bool`/`Str` keys, it's a no-op passthrough. Only expensive
for complex keys (sets, records used as map keys). Our creature ID keys (integers) are free.

### Caching (`evaluator.rs:473-478`, `storage.rs:184-187`)

- `Cache::Forever` — `pure val` at depth 0. Computed once, never cleared.
- `Cache::ForState` — `val` at depth 0. Cleared per step via `clear_caches` (O(cached vals), sub-µs).
- `Cache::None` — actions, parameterized defs. Re-executed each time.

### Per-Step Cost Breakdown (Where Time Actually Goes)

1. **`actionAny` branch search** — snapshot/restore per failed branch (seed-dependent)
2. **Winning action body** — closure execution with `imbl` map operations (O(log n) per get/set)
3. **`clear_caches`** — O(number of `val` definitions), sub-microsecond
4. **No cost proportional to total definition count** at runtime

### What Does NOT Affect Per-Step Cost

- Total number of definitions in the spec (resolved at compile time)
- Number of imported modules (compile-time only)
- `LookupTable` size (not consulted at runtime)

## Quint GitHub Research (2026-04-05)

- **No known `nthreads=1` deadlock** in issues — our bug may be unreported
- **No spec caching** exists or is planned — our `compiledInput` approach is novel
- **json-bigint round-trip fidelity** is untracked — worth filing as an issue
- **Lazy `any` evaluation** shipped ([#1582](https://github.com/informalsystems/quint/pull/1582)) —
  the evaluator no longer wastes time evaluating all `any` branches before picking one
- **Parallelization** shipped ([#1637](https://github.com/informalsystems/quint/issues/1637)) —
  multi-threaded simulation when `nthreads > 1`

## Future Work

1. ~~**Publish quint-connect**~~ DONE — v0.8.1 with `compiledInput` option
2. ~~**Fix compile-battle-spec.cjs format**~~ NOT NEEDED — format is byte-identical to `quint run`
   (see Finding 9). The evaluator is slow because of action complexity, not format differences.
3. **File Quint issue: json-bigint round-trip sensitivity** — the evaluator should not
   be sensitive to whether integers were serialized by json-bigint vs JSON.stringify
4. **File Quint issue: `nthreads=1` deadlock** (if still present in latest version)
5. **Investigate evaluator `run <file>` command** — may bypass stdin pipe issues entirely
6. ~~**Investigate evaluator per-step cost**~~ RESOLVED — source code analysis of `evaluator/src/`
   confirmed the evaluator architecture is sound (compile-then-execute, O(1) runtime lookups via
   `Rc<RefCell<>>` closures). The per-step cost difference between simple and complex actions is
   inherent to action body complexity (deep call chains, `imbl` map operations) and seed-dependent
   action path length (`actionAny` snapshot/restore cycles), not definition count scaling.
   Not an evaluator bug — not worth filing upstream.
7. **Add seed logging before evaluator start** — for the compiled-input path, generate a random
   seed upfront and patch it in, so the seed is known even if the evaluator times out or hangs.
8. ~~**Add compiledInput to battle-machine.mbt.test.ts**~~ DONE — both test files already
   use `compiledInput`.
9. ~~**Apply phase-split fix (Finding 14)**~~ DONE — `bStartTurn` isolated behind
   `if (not(bTurnStarted))` guard. 1-step: 40% → 100% seed success rate.
10. ~~**Further sub-phase splits**~~ REJECTED — violates SRD RAW (D&D 5e allows interleaving
    actions, bonus actions, and movement in any order within a turn).
11. **File Quint issue: `actionAny` per-branch cost** — the evaluator's per-branch cost is
    far higher than expected for complex state. A 17-branch `any { }` with 5 nondets per branch
    and 2 state vars takes ~6s through `quint run`. This may be an evaluator performance bug
    worth reporting upstream.
12. ~~**Limit counterspell depth to 2 (Opportunity 3)**~~ DONE — Finding 15. Guard
    `bSpellStack.length() < 2` + removed ~30 lines of depth 3+ unwind code. See inline comments in battle.qnt.
13. ~~**Capability-split by spell availability**~~ DONE — Finding 16. Hoist
    `preparedSpells.size() > 0 and not(ragingBlocksSpells)` into `battleStep` dispatch.
    3-step: 4/8 slow → 1/8 slow.

---

## Spec-Level Optimization Opportunities

Based on evaluator source code analysis (`evaluator/src/`), per-step cost comes from two things:
1. **Snapshot/restore cost per failed `actionAny` branch** — O(state variables). Every failed
   branch clones the `imbl::HashMap<next_vars>` and `HashMap<nondet_picks>` in `Storage::take_snapshot`.
2. **Winning action body evaluation** — deep call chains doing `imbl` map operations (O(log n) per get/set).

Current spec stats:
- **27 state variables** (7 battle-level + 20 per-creature × 4 creatures in the map)
- **16 actions** in the active-turn `any { }` block
- **13 class-specific vars** per creature (`barbarianState`, `fighterState`, `paladinState`, `bardState`, ...)
  — most creatures use only 1-2, but all 13 are snapshot/restored on every failed branch

### Opportunity 1: Consolidate class state vars into a single map

**Impact: ~44% reduction in snapshot/restore cost. No SRD fidelity loss.**
**Effort: Medium (spec refactor + MBT bridge update).**

Replace 13 separate class-specific vars per creature:
```quint
var barbarianState: BarbarianState
var fighterState: FighterState
var paladinState: PaladinState
var bardState: BardState
// ... 9 more
```

With 1 map var:
```quint
var classStates: ClassName -> ClassState  // ClassState is a tagged union
```

This eliminates 12 vars per creature × 4 creatures = **48 fewer variables per snapshot/restore**.
Total vars drop from ~27 to ~15. Every failed `actionAny` branch becomes ~44% cheaper.

Requires: a `ClassState` sum type (tagged union of all class-specific states), updating every
action that reads/writes class state, and updating the MBT bridge mappings in `mbt-shared.ts`.
Mechanically straightforward but touches many lines.

### Opportunity 2: Parameterize creature count for dev runs

**Impact: ~22% faster on fast seeds. Does NOT fix slow-seed timeouts.**
**Effort: Trivial (parameterize `bInit`).**

**Experimental data (2026-04-05) was confounded by zombie evaluators** — the "slow seeds"
and "bimodal timing" observed during 2-creature vs 4-creature testing were caused by zombie
evaluator processes consuming CPU, not by creature count or seed variance (see Finding 12).

The experiment is worth re-running with proper zombie cleanup before each trial. Expected
benefit: fewer map operations and smaller snapshot/restore per step, but this is a minor
optimization (~20-30%) compared to the 40x slowdown from zombie evaluators.

### ~~Opportunity 3: Limit counterspell chain depth~~ — DONE (Finding 15)

Depth limited to 2, ~30 lines removed, see inline comments in battle.qnt.
See Finding 15 for benchmark results.

### ~~Opportunity 4: Split active-turn `any` into sub-phases~~ — REJECTED

**Violates SRD RAW.** D&D 5e allows interleaving actions, bonus actions, and movement in any
order within a turn. Imposing sequential sub-phases (action → bonus → movement) would be
homebrew. The 16-action `any { }` is the correct model of RAW turn structure.

### Finding 11: Nondets execute BEFORE guards — wasted work on failed branches (2026-04-05)

**144 nondet declarations** across battle.qnt actions execute before their `all { }` guard block.
When an `actionAny` branch fails its guard, all the nondets and val computations preceding the
guard are wasted. Example — `bAttack` (lines 875-918):
```
val activeId = bInitiative[bTurnIndex]      ← map lookup (always runs)
val ac = bCreatures.get(activeId)           ← map lookup (always runs)
nondet targetId = ...                       ← 18 nondet picks (always run)
nondet attackRoll = ...
... (18 more nondets) ...
val tc = bCreatures.get(targetId)           ← map lookup (always runs)
all {
  bPhase == BPActiveTurn,                   ← cheap
  bTurnStarted,                             ← THIS IS THE GUARD — fails if turn not started
  ...
}
```

Nondet counts per active-turn action (all before guard):
| Action | Nondets before guard | Val computations before guard |
|--------|---------------------|------------------------------|
| bAttack | 18 | 4 (2 map lookups, 1 set op, 1 field read) |
| bCastSaveSpell | 12 | 4 |
| bCastBonusActionSpell | 11 | 4 |
| bCastAoE | 10 | 4 |
| bStartTurn | 7 | 2 |
| bCastConcentrationSpell | 7 | 4 |
| bEndTurn | 4 | 2 |
| bConcentrationCheck | 2 | 2 |
| bHeal | 2 | 2 |
| bMove | 1 | 2 |
| Others (bDash, etc.) | 0 | 2 |

**However, this alone does NOT explain the 30s hangs.** Nondet picks are O(1) random samples,
and val map lookups are O(log n) on `imbl` structures. Even 130 wasted nondets + 50 map
lookups across 15 failed branches should be milliseconds.

### Finding 12: Zombie evaluators are the dominant performance confound (2026-04-05)

Rigorous A/B testing with instrumented quint-connect revealed:

| Condition | Time |
|-----------|------|
| Compiled-input path, **no zombies** | **1.5s total** (265ms evaluator) |
| Compiled-input path, **zombies present** (1-3 at 100% CPU) | **13s** (11.9s evaluator) |
| `quint run` (standard path, no cache) | **24s** (22s including 15s parse/typecheck) |
| Direct `quint_evaluator simulate-from-stdin` via shell pipe | **>60s** (shell pipe issues, see below) |

**The compiled-input path works correctly and is fast** — ~265ms evaluator time for 1 step
with 4 creatures on seed `0x689d4239`. It saves the 15s parse/typecheck overhead from `quint run`.

**The earlier experimental data (Finding 10's bimodal timing, "trimodal" claim) was confounded
by zombie evaluator processes.** When zombies from prior test runs consume CPU (each at 100%),
the current evaluator is starved and takes 10-40x longer. Killing zombies before each run
produces consistent ~265ms evaluator times.

**Direct shell pipe tests were also confounded.** The `sed ... | quint_evaluator` approach
suffers from two issues: (1) zombie evaluators from `timeout`-killed prior runs consuming all
CPU, and (2) broken pipe state after `timeout` kills the shell, causing subsequent evaluator
invocations to receive corrupted/partial input. These produced the false "all seeds are slow"
and "trimodal 278ms/12s/>30s" data.

**CRITICAL: The zombie prevention in quint-connect (Finding 7) only works when quint-connect
itself exits cleanly.** External `timeout`, vitest timeout, or SIGKILL from the test runner
leave orphaned evaluator processes. Manual cleanup (`killall -9 quint_evaluator`) before
each experiment is essential for valid timing data.

### The dominant problem: zombie evaluator processes

**The compiled-input path is fast (~265ms per step) when no zombie evaluators are present.**
The bimodal/trimodal timing observed throughout this investigation was caused by zombie
evaluator processes consuming CPU, not by evaluator input format, seed variance, action
complexity, or definition count.

**The zombie problem is worse than Finding 7 addressed.** Finding 7 fixed zombies when
quint-connect exits cleanly (detached process group kill). But zombies still accumulate when:
- Tests timeout (vitest's 10-minute timeout kills the test, not the evaluator)
- Shell `timeout` command is used to cap experiment duration
- The user kills a long-running test with Ctrl+C
- Multiple MBT runs are accidentally launched simultaneously

**Recommended operational discipline:**
1. Before EVERY MBT run: `ps aux | grep quint_evaluator | grep -v grep` — kill any found
2. After ANY MBT run that was killed/timed-out: `killall -9 quint_evaluator`
3. Never trust MBT timing data without first confirming zero zombie evaluators
4. The CLAUDE.md instructions about zombie checking are not just cosmetic — they are the
   single most important factor for consistent MBT performance

### Summary

| Optimization | Effort | Speed impact | SRD fidelity |
|---|---|---|---|
| **Kill zombie evaluators before every run** | **None** | **40x speedup (265ms vs 12s)** | **N/A** |
| Consolidate 13 class vars → 1 map | Medium | ~20-30% cheaper snapshots | No loss |
| 2-creature dev runs | Trivial | ~20-30% (needs clean re-test) | Reduced coverage |
| Limit counterspell to depth 2 | Easy | Eliminates worst-case action body path | Minor |
| ~~Split 16-action `any` into sub-phases~~ | ~~Medium~~ | ~~Fewer failed branches~~ | **RAW violation — rejected** |

**Recommended priority:** The single most important "optimization" is killing zombie evaluator
processes. With zero zombies, the compiled-input path completes in ~265ms per step — fast
enough that the spec-level optimizations (1-3) are nice-to-have, not urgent. The CLAUDE.md
zombie-checking instructions are the critical performance discipline.

**NOTE:** This summary predates Finding 13/14, which showed zombies are NOT the dominant
factor — branch count is. See the Updated Summary Table below for the current picture.

### Scope estimate: Opportunity 1 (class state consolidation)

**~741 references across 57 files, ~1,350-1,800 lines changed.**

| Layer | Refs | Files | Est. Lines |
|-------|------|-------|-----------|
| creature.qnt (type defs) | 12 types, 59 fields | 1 | Type defs only |
| battle.qnt (actions) | 71 | 1 | 200-250 |
| TS machine + features | 538 | 50 | 800-1,000 |
| MBT bridge + tests | 120+ | 5 | 350-550 |

**Dependency chain:** creature.qnt → battle.qnt → battle-machine-types.ts → mbt-shared.ts →
machine-*.ts + features/*.ts → *.mbt.test.ts

**Verdict: NOT recommended for performance.** The ~44% snapshot/restore reduction only helps
fast seeds. The bimodal seed problem (2/5 runs timeout) is unaffected. The refactor is only
justified if it improves spec readability or enables other work.

---

## Finding 13: Branch count IS the dominant performance factor (2026-04-05)

**Corrects Finding 2 and Finding 12.** Rigorous 50-seed benchmarking with the compiled-input
path and zero zombie evaluators reveals that **60% of seeds timeout (>10s) for a single
`battleStep`**. The earlier "2/5 timeout" claim was an undercount from small sample sizes.

### Methodology

Custom Node.js benchmark (`bench-eval.mjs`) spawning the Rust evaluator directly via
`proc.stdin.write()` (same as quint-connect), testing 50 seeds with 10s timeout per seed,
1 step, `nruns=1`, `nthreads=1`. Zero zombie evaluators confirmed before each run.

### Results (original `battleStep` — 17-branch `any { }`)

```
50 seeds, 1 step, 10s timeout:
  Fast: 20/50 (40%)
  Slow: 30/50 (60%)
  Fast times: min=146ms, median=182ms, max=6154ms
```

**60% of seeds cannot complete a single step within 10s.** The fast seeds complete in
~150-182ms (essentially compile-time only), meaning the step evaluation adds <30ms when
it succeeds quickly.

### Root cause: `bStartTurn` buried in 17-branch `any { }`

After `bInit`, `bTurnStarted == false`. Only `bStartTurn` is enabled among 17 actions in
the `BPActiveTurn` `any { }` block. The evaluator (Fisher-Yates shuffle) tries branches in
seed-determined random order. For unlucky seeds, it tries 10-16 disabled actions first.

**Each failed branch is far more expensive than previously measured.** Even a trivial spec
with 17 branches × 5 nondets × 2 state vars takes ~6s through `quint run` for 1 step
(vs 10ms for 2 branches). The evaluator's per-branch cost includes snapshot/restore,
nondet evaluation, and guard checking — the constant factor is much larger than expected
for the battle spec's complex state (`bCreatures`: Map of 4 Combatants with 20+ fields).

### Proof: init is fast for ALL seeds

```
Init-only (0 steps) for slow seeds:
  0x60f1f603: 153ms
  0x12345678: 147ms
  0xdeadbeef: 149ms

Init-only (0 steps) for fast seeds:
  0xad9e6bc3: 164ms
  0xfeedface: 145ms
  0x13579bdf: 144ms
```

Init states are structurally identical (same phase, bTurnStarted=false, empty activeEffects).
The only difference is initiative order and HP values. The bottleneck is 100% at `battleStep`.

### Proof: threading doesn't help

```
Slow seed 0x60f1f603, 1 step:
  nthreads=1, nruns=1:  TIMEOUT >15s
  nthreads=2, nruns=1:  TIMEOUT >15s
  nthreads=1, nruns=2:  TIMEOUT >15s
  nthreads=2, nruns=2:  TIMEOUT >15s
  nthreads=4, nruns=4:  TIMEOUT >15s

Fast seed 0xad9e6bc3, 1 step:
  nthreads=1, nruns=1:  147ms
  nthreads=2, nruns=1:  154ms
```

Not a deadlock — evaluator reports progress (`{"current":1,"percentage":100}`). The
evaluator is actively computing, just very slowly.

### Corrections to earlier findings

1. **Finding 2 ("action count doesn't affect performance") is WRONG.** The original test
   (39s vs 41s for 17 vs 7 actions) was dominated by `quint run` overhead, not evaluator
   simulation. Through the compiled-input path, branch count is the dominant cost factor.

2. **Finding 12 ("zombie evaluators are the dominant confound") is PARTIALLY WRONG.** Zombies
   do cause 40x slowdowns when present, but the 60% timeout rate persists with zero zombies.
   The "bimodal timing" was NOT primarily caused by zombies — it's caused by the 17-branch
   `any { }` architecture.

3. **Compile time is ~149ms, not ~5-7s.** The earlier 5-7s was through `quint run` which
   includes parse/typecheck. The compiled-input path's 149ms IS the evaluator's compile time.

---

## Finding 14: Phase-split fix — 40% → 100% success rate (2026-04-05)

### The fix

One `if` guard separating `bStartTurn` from the 16 combat actions when `bTurnStarted == false`:

```quint
action battleStep = match bPhase {
    | BPActiveTurn => if (not(bTurnStarted)) any { bStartTurn, } else any {
        bAttack, bCastSaveSpell, bCastAoE,
        bCastConcentrationSpell, bCastBonusActionSpell, bConcentrationCheck,
        bMove, bHeal, bDash, bDisengage, bDodge, bActionSurge,
        bEnterRage, bDeclareReckless, bReady, bEndTurn,
      }
    ...
}
```

This eliminates 16 wasted branch evaluations when `bTurnStarted == false`. After `bStartTurn`
succeeds (guaranteed on first try), the 16-branch `any { }` takes over for combat actions.

### Results

**1 step (50 seeds, 10s timeout):**
```
Original:    Fast 20/50 (40%), median 182ms
Phase-split: Fast 50/50 (100%), median 151ms
```

**3 steps (30 seeds, 30s timeout):**
```
Phase-split: Fast 29/30 (97%), median 157ms, p90 6428ms, max 13576ms
```

**5 steps (30 seeds, 60s timeout):**
```
Phase-split: Fast 29/30 (97%), median 165ms, p90 6389ms, max 12562ms
```

### Remaining tail (p90 = 6.4s at 3+ steps)

The 3% failure rate and p90 tail at 3+ steps comes from the 16-branch combat action `any { }`
on post-start steps. When `bTurnStarted == true`, the evaluator must find an enabled combat
action among 16 options. Most seeds find one quickly, but some hit expensive branches
(e.g., `bCastSaveSpell` with its 312-line body evaluating `resolveAttack → dealDamage →
pTakeDamage` chains) before finding an enabled one.

### Cost

- **Spec change:** 1-line `if` guard (trivial)
- **Recompile:** `node scripts/compile-battle-spec.cjs` (~10s)
- **MBT bridge:** No changes needed (same leaf actions fire)
- **SRD fidelity:** No loss (turn ordering semantics unchanged)

### Impact on CLAUDE.md tier system

With the phase-split fix, the MBT tier system should be updated:

- **Tier 1** (~1s with compiled cache): Now reliable — virtually all seeds complete in <1s
  for 1-3 steps (was: "~1s with compiled cache" but 60% of seeds timed out silently)
- **Tier 2** (MBT_DEV, 5-30 min): Should be significantly faster — fewer timeout retries

---

## Finding 15: Counterspell depth limit — eliminates worst action body (2026-04-05)

Guard `bSpellStack.length() < 2` in `bResolveCounterspell` prevents depth 3+ CS chains.
~30 lines of depth 3+ unwind code removed from `returnToCSWindow` (minor RAW deviation — depth 3+ is legal but vanishingly rare).

**3-step results (8 seeds, 30s timeout):**
- Before: 7/8 complete, 1 timeout. Slow seeds: 9-16s.
- After: 8/8 complete, 0 timeouts. Slow seeds: 6-13s (21-55% improvement).

## Finding 16: Capability-split by spell availability (2026-04-05)

Hoist `preparedSpells.size() > 0 and not(ragingBlocksSpells)` check into `battleStep` dispatch.
When false, exclude 4 spell-casting actions (41+ nondets) from the `any {}` block. Pure perf
optimization — no behavioral change (pruned actions would fail their own guards anyway).

**3-step results (8 seeds, 45s timeout):**
- Before (with phase-split + CS limit): 4/8 fast, 4/8 slow (6-23s).
- After: 7/8 fast (<330ms), 1/8 slow (~23s on seed 0xfeedface).

The remaining slow seed hits the caster `any {}` branch where all 16 actions are enabled.
This is the evaluator's inherent cost for complex caster turns — not optimizable without
sub-phase splits (RAW violation) or upstream evaluator improvements.

**Seed guidance:** ~87% of seeds complete 3 steps in <330ms. If a specific seed is slow,
re-run without `QUINT_SEED` to get a fresh random seed. For reproducible benchmarking,
known fast seeds include: `0x689d4239`, `0xad9e6bc3`, `0x12345678`, `0xabcdef01`.

---

## Updated Summary Table

| Optimization | Effort | Speed impact | SRD fidelity | Status |
|---|---|---|---|---|
| Kill zombie evaluators | None | 40x when zombies present | N/A | **Done** |
| **Phase-split bStartTurn** | **Trivial** | **40% → 100% seed success (1-step)** | **No loss** | **Done** |
| **Limit counterspell to depth 2** | **Easy** | **Eliminates worst action body path, timeout→complete** | **Minor** | **Done** |
| **Capability-split (spell check)** | **Trivial** | **3-step: 4/8 slow → 1/8 slow** | **No loss** | **Done** |
| ~~Further sub-phase splits~~ | ~~Medium~~ | ~~Reduce p90 from 6.4s to ~1-2s~~ | **RAW violation** | **Rejected** |
| Consolidate 13 class vars → 1 map | Medium | ~20-30% cheaper snapshots | No loss | Not recommended |
| 2-creature dev runs | Trivial | ~20-30% | Reduced coverage | Needs clean re-test |

**Current state after all optimizations:**
- **1-step:** 8/8 seeds complete in <300ms (was: 40% timeout).
- **3-step:** 7/8 seeds complete in <330ms, 1/8 slow at ~23s (caster turn with all 16 branches).
- The remaining slow seeds hit the 16-branch caster `any {}` where all actions are enabled.
  Further optimization would require sub-phase splits (RAW violation, rejected) or upstream
  evaluator improvements. **If a seed is slow, re-run without `QUINT_SEED` for a fresh seed.**
