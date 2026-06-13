# Cleanroom Rust Experiment

## Purpose

Run a true cleanroom experiment for the D&D rules engine. The experiment tests
whether fresh agents can implement a Rust character-creation and battle rules
engine for character levels 1-2 from allowed formal/domain inputs only, without
reading the production TypeScript implementation.

## Claim

Given only SRD/RAW text, Ubiquitous Language, curated assumptions when needed,
and copied active QNT specs/slices in an isolated repo, a fresh agent should be
able to produce a Rust engine for level 1-2 character creation and battle
behavior, with tests derived from those same allowed inputs.

Success means the copied RAW/QNT/domain corpus is sufficient implementation
guidance. Failure and blockers are research data.

## Prior Invalid Attempt

The previous in-repo cleanroom Rust experiment was invalidated because the Ralph
task context exposed production TypeScript paths, agents read root repo
instructions, and repo-wide `pnpm quality` surfaced production TypeScript
details. It was removed in:

- `f2558d361 Remove invalid cleanroom Rust experiment`

Do not reuse that work as cleanroom evidence.

## Restart Decision (2026-06-12)

Owner decision in principle: the current sibling repo at
`/workspace/typescript/dnd-cleanroom-rust` (bootstrapped 2026-05-27) will be
deleted and re-bootstrapped rather than extended. Its QNT input snapshot is
stale — copied 2026-05-27 with no recorded source commit — and must not grow
further. Do not start new task lanes in it.

Requirements for the next bootstrap, in addition to the workflow below:

- **SHA-pinned corpus.** `cleanroom-input/MANIFEST.md` must record the source
  repo commit SHA, per-file inventory, and copy date. Refreshes are a one-way,
  allowlist-enforced sync script run from the source repo, each recording the
  new SHA. Cleanroom tasks declare which snapshot they implement against.
- **Executed conformance lane.** The rerun's parity layer is
  `O2-NONTS-PARITY-LANE` in `plans/QNT_GENERATOR_READINESS_BACKLOG.md`: a
  native Rust quint-connect harness replaying the copied `.mbt.qnt` drivers
  against the cleanroom engine, replacing hand-transcribed `// Source:`
  citation parity. Admitting the quint CLI as a cleanroom verification
  dependency is part of that lane. If the rerun keeps the phased design, the
  first manual vertical may still precede the MBT lane.

## Rerun Bootstrap (2026-06-13)

The 2026-05-27 repo was deleted and the rerun bootstrapped per the Restart
Decision:

- **Sync script:** `scripts/sync-cleanroom-input.cjs` (run from this repo's
  root) is the only way to populate or refresh `cleanroom-input/`. It enforces
  the Allowed Inputs allowlist, refuses to run while allowlisted sources have
  uncommitted changes, and writes `cleanroom-input/MANIFEST.md` with the source
  commit SHA, copy date, and per-file sha256 inventory.
- **Curated assumptions:** `plans/CLEANROOM_ASSUMPTIONS.md` is the curated
  cleanroom assumptions source (synced to
  `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`). It carries each
  assumption and rules basis only; implementation-change records are stripped.
  Keep it in sync with owner curation of `ASSUMPTIONS.md`.
- **Kickoff:** the cleanroom repo's `README.md` and `tasks/T001-FIRST-VERTICAL.md`
  describe how to launch the first manual vertical with a fresh agent.

## Cleanroom Boundary

The experiment must run in a separate Git repo, not in this repo. The intended
sibling path is:

- `/workspace/typescript/dnd-cleanroom-rust`

Fresh cleanroom agents must not read:

- `/workspace/typescript/dnd`
- production TypeScript runtime code
- production TypeScript tests
- generated JS/TS bridge code
- prior Ralph logs from this repo
- previous invalid cleanroom Rust output
- root repo `AGENTS.md` or `CLAUDE.md`
- repo plans/work logs unless manually copied into the allowed cleanroom input
- MBT traces or generated matrices for the first run

If an input was not deliberately copied into the cleanroom repo, agents must not
use it.

## Allowed Inputs

Copy only these inputs into the cleanroom repo:

- full SRD 5.2.1 RAW markdown
- full `UBIQUITOUS_LANGUAGE.md`
- active QNT specs/slices:
  - `packages/battle-runtime/*.qnt`
  - `packages/character-creation-runtime/*.qnt`
  - `packages/character-sheet-runtime/*.qnt`
  - `packages/character-battle-runtime/*.qnt`
  - `packages/shared-algebras/proofs/rule-core/**/*.qnt`
- curated cleanroom assumptions only if needed
- a small cleanroom-local manifest and instructions file

Do not blindly copy full `ASSUMPTIONS.md`; it may contain local implementation
concerns. If assumptions are needed, curate a cleanroom assumptions file that
contains only RAW ambiguity decisions and domain semantics needed by QNT.

Generic Rust/Cargo documentation is allowed. External D&D rules sources are not.

## Operating Rules

- QNT and RAW are both required.
- Agents must not ask the project owner clarifying questions during the run.
- If QNT/RAW/Ubiquitous Language are insufficient, agents must record blockers
  instead of guessing from project memory.
- First run must not include MBT traces or generated matrices.
- Output must include Rust engine, tests, and a validation report.

## Bootstrap Workflow

1. Create the separate repo.
2. Copy only allowlisted inputs into `cleanroom-input/`.
3. Add a strict cleanroom `AGENTS.md`.
4. Add a minimal Rust crate skeleton.
5. Run one manual first vertical with a fresh implementer agent.
6. Run a separate reviewer/tester agent against the same allowed corpus.
7. Stabilize:
   - module layout
   - test style
   - validation report format
   - blocker report format
   - verification commands
   - citation style for RAW/QNT
8. Only then add a Ralph-like harness in the cleanroom repo.
9. Start with one Ralph lane, audit forbidden-path reads, then scale.

## Recommended First Vertical

Start with a low-risk character-creation or character-sheet projection slice,
not heavy battle timing:

- one level-1 SRD class/species/background combination
- implemented in Rust from RAW/QNT
- tests cite copied RAW/QNT inputs
- validation report documents what was implemented and what was blocked

## Ralph-Like Later Requirements

Before Ralph loops, the cleanroom repo needs:

- repo-local `AGENTS.md`
- task file format
- stable Rust-only verification:
  - `cargo fmt --check`
  - `cargo test`
  - `cargo clippy --all-targets -- -D warnings`
- reviewer/tester loop that is also cleanroom-safe
- recursive tail task that creates more tasks only from cleanroom-local observed
  gaps/blockers
- no references back to production TypeScript or original repo paths
