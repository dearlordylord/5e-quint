# TODO

## Pre-existing Test Failures

1. **`contestWinner`** — Rust evaluator crash (`QNT516: Expected boolean`). Quint bug, not spec logic.
   - Repro: `quint test dndTest.qnt --match contestWinner`

### Resolved

2–4. **`test_invariants_{5,10,20}steps`** — ✅ Fixed by TA3 (Combat Mode Separation). All pass with original seeds.

5. **`class-paladin.test.ts`** — ✅ Fixed. `as const` added to conditions arrays; `tsc --noEmit` clean.
