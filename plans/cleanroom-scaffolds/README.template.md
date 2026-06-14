# Cleanroom Rust Engine

Cleanroom experiment: implement a Rust D&D SRD 5.2.1 rules engine for
character levels 1-2 from the copied formal/domain corpus only
(`cleanroom-input/`), without reading the production implementation. Success
means the corpus is sufficient implementation guidance; failures and blockers
are research data.

All agent rules live in `AGENTS.md`. The corpus snapshot and its source commit
SHA live in `cleanroom-input/MANIFEST.md`.

## Layout

- `cleanroom-input/` — the only rules corpus (RAW, QNT, domain). Read-only;
  populated by the source repo's sync script.
- `engine/` — the Rust engine crate and its tests.
- `tasks/` — task specs, `VALIDATION_REPORT.md`, `BLOCKERS.md`.

## Owner kickoff

1. Launch a fresh agent with this directory as its only working root —
   ideally with file access restricted to this repo.
2. Prompt: "Read `AGENTS.md` and `tasks/WORK_LOOP.md`, then implement the next
   in-scope driver from `tasks/LEVEL_1_2_SCOPE.md` following the Work Loop."
3. After the run, have a second fresh agent review against the same corpus
   (same prompt shape, reviewing instead of implementing).
4. Audit the run for forbidden-path reads before trusting it as cleanroom
   evidence.

## Verification

The Rust test suite is also the conformance lane: tasks with applicable
`.mbt.qnt` or executable QNT tests must wire them through `quint-connect`.
Quint must be installed and available in `PATH` for those tests.
Use `#[quint_test]` for named QNT tests and `#[quint_run]` for simulation
traces.

```bash
cargo fmt --check
cargo test
cargo clippy --all-targets -- -D warnings
```

Use `QUINT_SEED=<seed>` to reproduce a failing `quint-connect` run and
`QUINT_VERBOSE=1` or `QUINT_VERBOSE=2` when trace details are needed.
