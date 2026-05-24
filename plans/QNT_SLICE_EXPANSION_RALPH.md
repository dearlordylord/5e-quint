# QNT Slice Expansion Ralph Plan

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTSLICE-CANDIDATE-INVENTORY",
      "status": "ready-for-research",
      "title": "Inventory Next Composite Slice Candidates"
    },
    {
      "number": 2,
      "id": "QNTSLICE-SLOT-EXPENDITURE-ATOMIC",
      "status": "ready-for-research",
      "title": "Author Slot Expenditure Atomic Rule"
    },
    {
      "number": 3,
      "id": "QNTSLICE-SPELL-SAVE-GATE-ATOMIC",
      "status": "ready-for-research",
      "title": "Author Spell Save Gate Atomic Rule"
    },
    {
      "number": 4,
      "id": "QNTSLICE-FIRST-COMPOSITE-AFTER-PILOT",
      "status": "ready-for-research",
      "title": "Add First Post-Pilot Composite Slice"
    },
    {
      "number": 5,
      "id": "QNTSLICE-RECURSIVE-NEXT-TASKS",
      "status": "ready-for-research",
      "title": "Mine Next Slice Tasks"
    }
  ]
}
-->

This lane adds ADR-0001 slice-shaped QNT coverage: small composite `.qnt`
files, bounded sibling `.mbt.qnt` harnesses, TypeScript mirror/parity tests,
and checker rows. It does not build a whole-battle QNT model and does not
generate Rust.

## Context Budget

Read only:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `docs/adr/0001-forest-of-qnt-slices.md`
- `plans/rules-kernel-coverage/README.md`
- relevant rows in `obligations.jsonl`, `profile-obligations.jsonl`,
  `qnt-owner-roles.jsonl`, and `generator-readiness.jsonl`
- current pilot files:
  - `packages/battle-runtime/creature-attack.qnt`
  - `packages/battle-runtime/creature-attack.mbt.qnt`
  - `packages/battle-runtime/src/battle-reducer/creature-attack.ts`
  - `packages/battle-runtime/src/creature-attack.mbt.test.ts`

Do not read deleted historical Ralph lanes. Read the QNT PRD only if changing
the B/C split, checker vocabulary, or generator-readiness contract.

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Run the reviewer loop until convergence: RAW traceability when modeled rules
change, ubiquitous-language/domain-language, architecture/connascence, and code
review. Fix every reasonable finding, reject only with a concrete reason, and
repeat until no reasonable findings remain.

## Verification

Each task must run:

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- the new or touched slice parity test
- `git diff --check`

Keep MBT bounded. Do not run broad battle MBT unless explicitly needed after a
runtime behavior change.

### Task 1 - QNTSLICE-CANDIDATE-INVENTORY - Inventory Next Composite Slice Candidates

Status: `ready-for-research`

Input:

- `plans/rules-kernel-coverage/obligations.jsonl`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/QNT_COVERAGE_PROGRAM.md`
- creature-attack pilot files

Output:

- Add or refine 3-6 concrete composite slice tasks in this plan.
- Each candidate must name its obligation/profile rows, atomic dependencies,
  intended bounded state, TS mirror path, parity test path, and why it is not a
  whole-battle model.
- Do not implement a slice in this task unless the inventory is already
  trivially complete and the first candidate is small.

Acceptance:

- Later tasks are executable without broad repo survey.
- The queue remains aligned with ADR-0001.

### Task 2 - QNTSLICE-SLOT-EXPENDITURE-ATOMIC - Author Slot Expenditure Atomic Rule

Status: `ready-for-research`

Input:

- existing spell slot spending reducers and tests
- relevant spell procedure obligation/profile rows
- `packages/shared-algebras/proofs/rule-core/`

Output:

- Add a pure semantic-core atomic QNT rule for spell slot expenditure if no
  equivalent already exists.
- Add a TypeScript mirror and focused unit tests.
- Add checker rows/markers required by rules-kernel coverage.

Acceptance:

- The atomic rule can be imported by later composite spell slices.
- No duplicate slot state is introduced.

### Task 3 - QNTSLICE-SPELL-SAVE-GATE-ATOMIC - Author Spell Save Gate Atomic Rule

Status: `ready-for-research`

Input:

- existing save-gated spell reducers and tests
- relevant spell procedure obligation/profile rows
- `packages/shared-algebras/proofs/rule-core/`

Output:

- Add a pure semantic-core atomic QNT rule for spell save gating if no
  equivalent already exists.
- Add a TypeScript mirror and focused unit tests.
- Add checker rows/markers required by rules-kernel coverage.

Acceptance:

- The atomic rule can be imported by later composite spell slices.
- Save success/failure effects remain typed facts, not authored identity
  dispatch.

### Task 4 - QNTSLICE-FIRST-COMPOSITE-AFTER-PILOT - Add First Post-Pilot Composite Slice

Status: `ready-for-research`

Depends on:

- Task 1.

Input:

- top candidate from Task 1
- creature-attack pilot files
- required atomic rules

Output:

- Add one small composite slice with:
  - composite `.qnt`
  - bounded sibling `.mbt.qnt`
  - TypeScript mirror function
  - parity test script
  - obligation/readiness/owner-role rows
- Keep state minimal and push variability into per-action nondet/fills.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.

### Task 5 - QNTSLICE-RECURSIVE-NEXT-TASKS - Mine Next Slice Tasks

Status: `ready-for-research`

Input:

- current `obligations.jsonl`
- current `profile-obligations.jsonl`
- current `generator-readiness.jsonl`
- current slice task outcomes

Output:

- If more slice work remains, add 3-8 new atomic slice tasks to this plan.
- If no slice work remains, mark this task done with a short meaningful note.
- Keep tasks disjoint from the semantic-core extraction lane.

Acceptance:

- Ralph does not stop merely because the seed queue is exhausted.
- Added tasks remain one-coding-session sized and context-managed.
