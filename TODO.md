# TODO

## Pre-existing Test Failures

4 failures in `dndTest.qnt` (pre-date TA1 work):

1. **`contestWinner`** — Rust evaluator crash (`QNT516: Expected boolean`). Quint bug, not spec logic.
   - Repro: `quint test dndTest.qnt --match contestWinner`

2. **`test_invariants_5steps`** — `allInvariants` assertion fails during 5-step random walk.
   - Seed: `--seed=0x699200e806d74c66`

3. **`test_invariants_10steps`** — `allInvariants` assertion fails during 10-step random walk.
   - Seed: `--seed=0x300837cd71357d76`

4. **`test_invariants_20steps`** — `allInvariants` assertion fails during 20-step random walk.
   - Seed: `--seed=0xdee158525728a2f`

5. **`class-paladin.test.ts`** — 5 TypeScript errors: `conditions: string[]` not assignable to `readonly Condition[]`. Tests pass at runtime (vitest doesn't enforce strict types), but `tsc --noEmit` fails.
   - Lines: 107, 114, 119, 124, 152
   - Fix: add `as const` to the `conditions` arrays, or type them as `Condition[]`

### Root Cause (2–4)

Nondeterministic `step` action can produce action sequences that violate invariants (e.g., concentration not broken when it should be). Likely missing guards in MBT action wrappers — the step action allows arbitrary action combinations that real gameplay wouldn't permit. Will be addressed by TA3 (Combat Mode Separation) which restricts valid action sequences.
