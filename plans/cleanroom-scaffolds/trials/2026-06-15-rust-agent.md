# 2026-06-15 Rust Cleanroom Harness Trial

## Setup

- Source repo: `/workspace/typescript/dnd`
- Cleanroom repo: `/workspace/typescript/dnd-cleanroom-rust-agent`
- Source commits exercised:
  - `cf2603aa0361b3156ed4d7d7d69097b63847b472` expanded active work to 74 drivers.
  - `e55bd1751eb87fcc45e8b4a65d341a7f2d8d03d2` made the work loop continuous.
- Cleanroom initial commit for the trial: `3aa2a90b3ccd53dc557f808d45f7db5b5baddb1e`
- Active assignment: `level-1-2-full`
- Queue shape: creation 5, sheet 7, handoff 1, battle 55, rules-core 6.
- Source inventory: 452 branch obligations, 15 sampled inputs.

## Static Source Checks Before Trial

- `pnpm cleanroom-branch-coverage:check` passed.
- `pnpm cleanroom-scaffold:check` passed.
- `pnpm cleanroom-harness:check` passed.
- `pnpm cleanroom-sync:check` passed.
- `git diff --check` passed.

## Trial Command

Spawned a cleanroom worker with only `/workspace/typescript/dnd-cleanroom-rust-agent`
as its requested working root. The worker was told to read `AGENTS.md`,
`BOOTSTRAP_QUERY.md`, and `tasks/WORK_LOOP.md`, use assignment
`level-1-2-full`, and continue until the selected assignment was exhausted, a
repo-level blocker appeared, verification failed, or the trial hit an explicit
45-minute cap.

## Observations

- The worker wrote `tasks/START_GATE.json` before implementation.
- The start gate selected:
  - task: `T001`
  - assignment: `level-1-2-full`
  - lane: `creation`
  - driver: `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- The worker created a Rust crate and implemented a first production slice plus
  a quarantined adapter.
- The worker wrote review and decider artifacts with two review rounds and no
  findings.
- The worker ran:
  - `cargo fmt --check`
  - `cargo test`
  - `cargo clippy --all-targets -- -D warnings`
- The validation report cursor advanced to:
  - last completed driver:
    `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
  - next queued driver:
    `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
  - next task id: `T002`

## Acceptance Result

The trial did not satisfy full acceptance.

Positive result: the cleanroom agent followed the expanded active assignment,
selected the first creation driver, produced task artifacts, ran review/decider
bookkeeping, and updated the cursor to T002.

Negative result: it did not actually start T002 because the trial prompt had an
explicit 45-minute cap. More importantly, source-side harness validation of
T001 failed after the worker reported success.

## Harness Validator Findings

Running:

```bash
node scripts/check-cleanroom-harness.cjs --task-root /workspace/typescript/dnd-cleanroom-rust-agent
```

found these harness-contract failures:

- target replay evidence used invented field names such as
  `targetProfileId`, `stateProjectionCheck`, and `comparatorId` instead of the
  accepted evidence schema;
- evidence was missing `generatedBy.tag = "target-harness"`;
- evidence runs were missing `evidenceKind`, `driverPath`, `branchFamily`, and
  `harnessTestPath`;
- target profile SHA did not match the canonical rendered profile SHA;
- validation report marked obligations covered without validator-accepted
  target replay evidence;
- adapter quarantine omitted required witness protocol names;
- production source imported the adapter module.

## Harness Changes Motivated

- Copy `scripts/check-cleanroom-harness.cjs` into rendered cleanroom repos.
- Copy `scripts/cleanroom-branch-coverage-check.cjs`, required by the harness
  validator.
- Make the copied validator self-contained by falling back to
  `git show HEAD:tasks/LEVEL_1_2_SCOPE.md` for the source-owned scope snapshot.
- Add `node scripts/check-cleanroom-harness.cjs` to the Rust target profile
  verification commands.
- Add `tasks/TARGET_REPLAY_EVIDENCE.example.json` with the exact accepted JSON
  shape.
- Update cleanroom docs to make the harness acceptance command and evidence
  example part of the task contract.

## Next Trial Requirement

Respawn the cleanroom from the updated source commit and rerun the cleanroom
worker. Acceptance requires that the worker either:

- completes T001 and passes `node scripts/check-cleanroom-harness.cjs`, then
  starts T002; or
- records a precise blocker before claiming T001 accepted.

## Rerun After Harness Fix

- Source commit: `50ba3d89fae0c9dc550e874b7995903f3d6a9d17`
- Cleanroom initial commit: `f363b80a732e7398622484184d0f35457cd63115`
- Rendered additions present in cleanroom repo:
  - `scripts/check-cleanroom-harness.cjs`
  - `scripts/cleanroom-branch-coverage-check.cjs`
  - `tasks/TARGET_REPLAY_EVIDENCE.example.json`
  - Rust verification command: `node scripts/check-cleanroom-harness.cjs`

The second cleanroom worker was told to stop only after T002 was accepted or
blocked, so the acceptance signal included a real loop from T001 into T002.

## Rerun Observations

- T001 selected the first creation driver:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`.
- T001 passed all target-profile commands, including
  `node scripts/check-cleanroom-harness.cjs`.
- The worker then started T002 rather than stopping after T001.
- T002 selected:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`.
- T002 passed:
  - `cargo fmt --check`
  - `cargo test`
  - `cargo clippy --all-targets -- -D warnings`
  - `node scripts/check-cleanroom-harness.cjs`
- The validation report cursor advanced to:
  - last completed driver:
    `cleanroom-input/qnt/character-creation-runtime/character-creation-cleric-druid-order-selected-identity.mbt.qnt`
  - next queued driver:
    `cleanroom-input/qnt/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
  - next task id: `T003`
- The worker stopped after T002 only because the rerun prompt explicitly set
  that stop point.

## Independent Rerun Validation

After the worker completed, the parent ran:

```bash
cd /workspace/typescript/dnd-cleanroom-rust-agent
node scripts/check-cleanroom-harness.cjs
```

Result:

```text
cleanroom harness acceptance passed.
```

Review-loop and decider artifacts for T002 contained two review rounds, all
required checklist passes, an accepted decider decision, and no findings.

## Final Rerun Result

The rerun satisfied the acceptance criteria for the harness process:

- the cleanroom repo was respawned from source-owned sync/render scripts;
- the harness files and copied corpus were present in the target repo;
- a cleanroom worker used the rendered bootstrap/work-loop instructions;
- the worker completed T001, ran the reviewer/decider loop, and passed the
  copied harness validator;
- the worker then continued to T002 and completed it under the same validator;
- the outcome was logged source-side for later analysis.
