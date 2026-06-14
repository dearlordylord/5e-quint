# Cleanroom Rust Engine — Agent Rules

This repo is a cleanroom experiment. If a file is not in this repo, it is not
an allowed input. Do not read `/workspace/typescript/dnd`, any sibling
directory, or any prior cleanroom attempt.

## Goal

Implement a Rust character-creation and battle rules engine for D&D SRD 5.2.1
character levels 1-2, derived exclusively from the copied RAW/QNT/domain corpus
in `cleanroom-input/`.

## Allowed Inputs

- `cleanroom-input/raw/**` — SRD 5.2.1 rules text.
- `cleanroom-input/qnt/**` — Quint specs, MBT driver specs, and rule-core
  slices. Treat `.qnt` files as formal rule statements. Treat `.mbt.qnt`
  files and executable QNT tests as conformance specifications to be exercised
  through `quint-connect`.
- `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md` — canonical terminology.
  Use these terms in code, tests, and reports.
- `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md` — curated RAW-ambiguity
  decisions. Where it speaks, follow it.
- `cleanroom-input/MANIFEST.md` — the snapshot you are implementing against.
- Repo-local files: `tasks/**`, `engine/**`, this file, `README.md`.
- Generic Rust, Cargo, Quint, and `quint-connect` documentation.

## Forbidden Inputs

- Production TypeScript implementation code or tests, generated JS/TS bridge
  code, MBT traces, generated matrices.
- The source repo's plans, work logs, agent instructions, or any of its files
  not deliberately copied into `cleanroom-input/`.
- Previous cleanroom attempts.
- External D&D rules sources (books, wikis, forums, memory of them). If the
  copied corpus does not state a rule, it does not exist for this repo.

## Snapshot Declaration

`cleanroom-input/MANIFEST.md` records the source commit SHA of the corpus.
Every task report must state the manifest SHA it implemented against. Never
edit files under `cleanroom-input/` — the corpus is refreshed only by the
source repo's sync script, which rewrites the manifest.

## Operating Rules

- Do not ask the project owner clarifying questions during a run.
- If RAW, QNT, the Ubiquitous Language, and the curated assumptions together
  are insufficient to implement a behavior, record a blocker in
  `tasks/BLOCKERS.md` and move on. Do not guess, and do not fill gaps from
  memory of D&D rules.
- Cite sources: tests and rule-bearing code comments reference the exact
  corpus file (e.g. `cleanroom-input/raw/srd-5.2.1/Playing-the-Game.md`,
  heading or rule name) and/or the QNT module/definition they implement.
- When a task has an applicable `.mbt.qnt` file or executable QNT test, the
  Rust implementation must be verified through `quint-connect`. Hand-written
  Rust tests may supplement MBT, but must not replace it.
- The Quint CLI is allowed only when invoked by `quint-connect` during
  `cargo test`. Do not manually generate, import, or commit MBT traces or
  generated matrices.
- If no applicable executable QNT/MBT coverage exists for required behavior,
  record that limitation in `tasks/VALIDATION_REPORT.md` and use focused Rust
  tests for the gap.

## Verification

All three Rust commands must pass. `cargo test` includes any `quint-connect`
MBT/conformance tests in the Rust test suite:

```bash
cargo fmt --check
cargo test
cargo clippy --all-targets -- -D warnings
```

Do not run `pnpm`, TypeScript, or any source-repo command.

## MBT Conventions

- Implement a `quint_connect::Driver` for each executable QNT/MBT slice.
- Map QNT action names to Rust implementation calls with `switch!`.
- Expose comparable implementation state with `State::from_driver`.
- Use `#[quint_test]` for named QNT tests and `#[quint_run]` for simulation
  traces when the QNT module provides an init/step model.
- Use `Driver::config` when comparable state or nondeterministic choices are
  nested in the QNT model.
- Record exercised QNT/MBT files and reproduction seeds in
  `tasks/VALIDATION_REPORT.md`.

## Reporting

Every implementation task must update:

- tests for the behavior implemented;
- `tasks/VALIDATION_REPORT.md` — manifest SHA, allowed inputs used, behavior
  implemented, verification results, MBT/QNT coverage used, seeds or relevant
  reproduction data for failures, remaining gaps;
- `tasks/BLOCKERS.md` — only when an allowed input is insufficient; include
  the task, the missing fact, and the exact question the corpus cannot answer.

## Work Loop

The corpus is the backlog: each `.mbt.qnt` driver under `cleanroom-input/qnt/`
is a unit of work — "make this conformance pass." There are no hand-authored
per-driver task files. `tasks/LEVEL_1_2_SCOPE.md` records which drivers are in
scope for character levels 1–2, in dependency order.

Each iteration:

1. Pick the next in-scope driver that is not yet conformant (per
   `tasks/LEVEL_1_2_SCOPE.md` and `tasks/VALIDATION_REPORT.md`).
2. Implement it in `engine/`, deriving the rule from the RAW/QNT/domain inputs.
3. Make it conform through `quint-connect` under `cargo test`.
4. Record the outcome in `tasks/VALIDATION_REPORT.md`, or a blocker in
   `tasks/BLOCKERS.md` if an allowed input is insufficient.

Conventions — module layout, test style, citation style, driver style — were
established by the first vertical and are recorded in
`tasks/VALIDATION_REPORT.md`; follow them unless an iteration explicitly revises
one.
