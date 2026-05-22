# MBT Rust Migration Lane A - Generator Readiness DRY Run

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "MBTRUST-A-SOURCE-OF-TRUTH-DRY",
      "status": "ready-for-research",
      "title": "Generator Readiness Source Of Truth DRY Pass"
    },
    {
      "number": 2,
      "id": "MBTRUST-A-CHECKER-SCHEMA-HARDENING",
      "status": "ready-for-research",
      "title": "Generator Readiness Checker Schema Hardening"
    },
    {
      "number": 3,
      "id": "MBTRUST-A-QNT-ROLE-INVENTORY",
      "status": "ready-for-research",
      "title": "QNT Role Inventory For Generation Readiness"
    },
    {
      "number": 4,
      "id": "MBTRUST-A-GENERATION-SUBSET-CATALOG",
      "status": "ready-for-research",
      "title": "Generation Subset Catalog And Blocker Vocabulary"
    },
    {
      "number": 5,
      "id": "MBTRUST-A-KERNEL-IR-BOUNDARY-INVENTORY",
      "status": "ready-for-research",
      "title": "Kernel IR Boundary Inventory"
    },
    {
      "number": 6,
      "id": "MBTRUST-A-HIT-POINT-DAMAGE-DRY-RUN",
      "status": "ready-for-research",
      "title": "Hit Point Damage Manual Rust Dry Run"
    },
    {
      "number": 7,
      "id": "MBTRUST-A-MOVEMENT-OBLIGATION-READINESS",
      "status": "ready-for-research",
      "title": "Movement Obligation Generator Readiness Row"
    },
    {
      "number": 8,
      "id": "MBTRUST-A-REACTION-WINDOW-READINESS",
      "status": "ready-for-research",
      "title": "Reaction Window Generator Readiness Row"
    },
    {
      "number": 9,
      "id": "MBTRUST-A-SPELL-PROCEDURE-READINESS",
      "status": "ready-for-research",
      "title": "Spell Procedure Generator Readiness Row"
    },
    {
      "number": 10,
      "id": "MBTRUST-A-CLOSURE-REPORT",
      "status": "blocked",
      "title": "Generator Readiness Closure Report"
    }
  ]
}
-->

This is the single active Ralph lane for MBT/rules-kernel "Rust migration"
preparation. The lane is deliberately **generator-readiness only**. It does not
implement generated Rust, does not replace TypeScript reducers, and does not
reopen closed rules-kernel coverage tasks unless a checker-backed inconsistency
is found.

## Source Of Truth

Use these documents as inputs, but do not duplicate their prose into new places:

- `plans/MBT_COVERAGE_LANE_D_PARITY.md` records the completed B-lane parity and
  coverage closure history.
- `plans/rules-kernel-coverage/PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md`
  defines the split between B coverage closure and C generator readiness.
- `plans/rules-kernel-coverage/README.md` defines current checker-owned
  artifacts, including `generator-readiness.jsonl`.
- `plans/rules-kernel-coverage/REPORT.md` is generated output and must be
  refreshed through the checker, not hand-edited.

If terminology repeats across those documents, centralize the durable term in
`plans/rules-kernel-coverage/README.md` or a small linked C-lane note, then
replace duplicated planning prose with links.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until
`accept`. The reviewer loop must include architecture/connascence,
ubiquitous-language/domain-language, code review, and RAW traceability when a
task touches modeled rule behavior. Fix every reasonable finding, explicitly
reject only findings with a concrete reason, and repeat until no reasonable
findings remain.

## Lane Rules

- Keep B coverage closure and C generator readiness separate.
- Do not add generated Rust or a Rust generator in this lane.
- Do not use MBT for exploratory classification.
- Prefer checker-enforced artifacts over prose-only status.
- Keep `generator-readiness.jsonl` obligation-centered.
- Do not duplicate the profile-to-obligation join outside
  `profile-obligations.jsonl`.
- Do not classify authored catalog breadth as generator readiness.
- If a task discovers an actual coverage gap, record a precise follow-up instead
  of silently widening this lane.

## Verification

Every task must include:

- Read the relevant source documents listed above before editing.
- For rule behavior, read local RAW under `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`.
- Run `pnpm rules-kernel-coverage:check -- --write` when rules-kernel generated
  artifacts change, then `pnpm rules-kernel-coverage:check`.
- Run `pnpm unit-profile-coverage:check -- --write` only when Unit/profile
  generated artifacts change, then `pnpm unit-profile-coverage:check`.
- Run focused package tests only when implementation/checker code changes.
- Run `git diff --check`.
- Complete reviewer-loop convergence.

## Tasks

### Task 1 - MBTRUST-A-SOURCE-OF-TRUTH-DRY - Generator Readiness Source Of Truth DRY Pass

Status: `ready-for-research`

Input:

- `plans/MBT_COVERAGE_LANE_D_PARITY.md`
- `plans/rules-kernel-coverage/PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/REPORT.md`

Output:

- A short durable C-lane source-of-truth section or note that defines generator
  readiness terms once.
- Reduced duplication in nearby docs where safe; links replace repeated prose.
- No generated Rust and no B-lane parity reopening.

### Task 2 - MBTRUST-A-CHECKER-SCHEMA-HARDENING - Generator Readiness Checker Schema Hardening

Status: `ready-for-research`

Input:

- `scripts/rules-kernel-coverage-check.cjs`
- `scripts/rules-kernel-coverage-config.cjs`
- `plans/rules-kernel-coverage/generator-readiness.jsonl`
- `plans/rules-kernel-coverage/README.md`

Output:

- Checker validation for any missing generator-readiness invariants discovered
  during Task 1.
- At minimum, preserve explicit arrays for `semanticCore`, `proofOnly`,
  `generatorSubset`, and `blockedBy`; empty and unknown must remain distinct.
- Focused checker self-test updates if checker behavior changes.

### Task 3 - MBTRUST-A-QNT-ROLE-INVENTORY - QNT Role Inventory For Generation Readiness

Status: `ready-for-research`

Input:

- `plans/rules-kernel-coverage/obligations.jsonl`
- Current package-local QNT owners cited by covered obligations.
- Current `generator-readiness.jsonl`.

Output:

- A checked inventory of QNT owner roles: semantic core, proof-only, MBT fixture,
  bridge, selected-identity trace, or legacy/reference.
- New or updated generator-readiness rows only for obligations where the role
  classification is clear and checker-supported.

### Task 4 - MBTRUST-A-GENERATION-SUBSET-CATALOG - Generation Subset Catalog And Blocker Vocabulary

Status: `ready-for-research`

Input:

- Existing generator-readiness subset names.
- QNT constructs used by the Task 3 semantic-core candidates.

Output:

- A documented generation-subset vocabulary owned by the rules-kernel coverage
  docs or checker config.
- Blocker vocabulary that names why a QNT owner is not yet generator-clean
  without using migration-history labels such as "legacy" as a catch-all.

### Task 5 - MBTRUST-A-KERNEL-IR-BOUNDARY-INVENTORY - Kernel IR Boundary Inventory

Status: `ready-for-research`

Input:

- Covered obligation families in `obligations.jsonl`.
- Runtime owner boundaries in `packages/battle-runtime`,
  `packages/character-creation-runtime`, `packages/character-sheet-runtime`, and
  `packages/character-battle-runtime`.

Output:

- A concise inventory of future kernel IR boundaries: command, fill, result,
  state, active-effect, support-profile, resource, and handoff boundaries.
- No new runtime abstraction unless required to make a checker artifact honest.

### Task 6 - MBTRUST-A-HIT-POINT-DAMAGE-DRY-RUN - Hit Point Damage Manual Rust Dry Run

Status: `ready-for-research`

Input:

- `SHARED.HIT_POINTS.POSITIVE_DAMAGE`
- `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- Current generator-readiness seed row.

Output:

- A manual dry-run artifact mapping the QNT semantic core to hypothetical Rust
  data/function shapes.
- No generated Rust source committed.
- Updated `generator-readiness.jsonl` row with a checked dry-run artifact path if
  the checker supports it.

### Task 7 - MBTRUST-A-MOVEMENT-OBLIGATION-READINESS - Movement Obligation Generator Readiness Row

Status: `ready-for-research`

Input:

- Movement-related covered obligations and QNT owners.
- Current movement runtime owners and parity witnesses.

Output:

- One movement-family generator-readiness row or a precise blocker note if the
  QNT owner is not ready to classify.
- No movement runtime behavior changes.

### Task 8 - MBTRUST-A-REACTION-WINDOW-READINESS - Reaction Window Generator Readiness Row

Status: `ready-for-research`

Input:

- Reaction-window covered obligations and QNT owners.
- Current reaction continuation docs and tests.

Output:

- One reaction-window generator-readiness row or a precise blocker note.
- No reaction runtime behavior changes.

### Task 9 - MBTRUST-A-SPELL-PROCEDURE-READINESS - Spell Procedure Generator Readiness Row

Status: `ready-for-research`

Input:

- Spell procedure covered obligations and QNT owners.
- Current profile-obligation joins and parity witnesses.

Output:

- One spell-procedure generator-readiness row or a precise blocker note.
- No new spell support and no authored identity dispatch.

### Task 10 - MBTRUST-A-CLOSURE-REPORT - Generator Readiness Closure Report

Status: `blocked`

Depends on:

- Tasks 1-9.

Output:

- Refreshed rules-kernel coverage report.
- A short closeout note explaining what is generator-ready, what is fixture-bound
  or proof-only, and what concrete next lane would be needed before real Rust
  generation.

