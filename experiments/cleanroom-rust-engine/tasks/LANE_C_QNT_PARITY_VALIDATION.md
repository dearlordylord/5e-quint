# Lane C - QNT Parity And Experiment Validation

Goal: build validation pressure around the cleanroom Rust engine and collect
research data when cleanroom generation fails.

Primary inputs:

- `input/cleanroom-input-manifest.json`
- `input/plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md`
- `input/plans/rules-kernel-coverage/generator-readiness.jsonl`
- QNT MBT/proof files copied into `input/**`

Write scope:

- `engine/tests/*`
- `tasks/CLEANROOM_RESEARCH_LOG.md`
- `tasks/CLEANROOM_VALIDATION_REPORT.md`

Tasks:

1. Inventory copied QNT obligations and create a Rust test checklist.
2. Add tests that compare simple pure semantic-core examples against Rust
   behavior.
3. Run `cargo test` and record failures with the QNT/RAW source file that
   motivated each expected behavior.
4. If an implementation lane is blocked, reduce the blocker to a minimal
   missing contract and record it in the research log.
