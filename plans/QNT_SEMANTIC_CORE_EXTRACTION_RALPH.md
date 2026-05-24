# QNT Semantic-Core Extraction Ralph Plan

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTSEM-MOVEMENT-RUN-BLOCK-EXTRACTION",
      "status": "ready-for-research",
      "title": "Extract Movement Semantic-Core Run Blocks"
    },
    {
      "number": 2,
      "id": "QNTSEM-REACTION-RUN-BLOCK-EXTRACTION",
      "status": "ready-for-research",
      "title": "Extract Reaction Semantic-Core Run Blocks"
    },
    {
      "number": 3,
      "id": "QNTSEM-SPELL-PROCEDURE-RUN-BLOCK-EXTRACTION",
      "status": "ready-for-research",
      "title": "Extract Spell Procedure Semantic-Core Run Blocks"
    },
    {
      "number": 4,
      "id": "QNTSEM-READINESS-REFRESH",
      "status": "ready-for-research",
      "title": "Refresh Generator Readiness After Extraction"
    },
    {
      "number": 5,
      "id": "QNTSEM-RECURSIVE-NEXT-TASKS",
      "status": "ready-for-research",
      "title": "Mine Next Semantic-Core Cleanup Tasks"
    }
  ]
}
-->

This lane owns QNT semantic-core cleanup for future generator readiness. It
does not create generated Rust, does not replace TypeScript reducers, and does
not add new composite slices except as follow-up tasks for the slice lane.

## Context Budget

Read only:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- relevant rows in `plans/rules-kernel-coverage/generator-readiness.jsonl`
- relevant rows in `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`
- relevant semantic-core `.qnt` file for the current task
- nearby TS mirror or existing MBT/unit test named by current markers

Do not read deleted historical Ralph lanes or broad plan transcripts. Read
`docs/adr/0001-forest-of-qnt-slices.md` or the QNT PRD only if changing the
architecture, vocabulary, checker contract, or task plan shape.

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
- focused package tests for any extracted TS test or touched mirror
- `git diff --check`

Do not run broad MBT unless the task explicitly introduces or changes a bounded
MBT harness.

### Task 1 - QNTSEM-MOVEMENT-RUN-BLOCK-EXTRACTION - Extract Movement Semantic-Core Run Blocks

Status: `ready-for-research`

Input:

- `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` row in
  `generator-readiness.jsonl`
- `packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- current movement TS mirror and tests

Output:

- Remove `run test_*` blocks from the movement semantic-core file by extracting
  their assertions to focused TS tests or a sibling fixture only when a state
  machine shape is required.
- Keep the semantic-core file limited to generator-intended definitions.
- Update generator-readiness blockers only for facts actually resolved.

Acceptance:

- The movement row no longer has `run-block-coupled` if all run blocks were
  removed.
- Existing movement parity remains green.

### Task 2 - QNTSEM-REACTION-RUN-BLOCK-EXTRACTION - Extract Reaction Semantic-Core Run Blocks

Status: `ready-for-research`

Input:

- `BATTLE.REACTION.OFFER_DECLINE_RESUME` row in
  `generator-readiness.jsonl`
- `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`
- current reaction TS mirror and tests

Output:

- Extract semantic-core run blocks to focused TS tests or a sibling fixture
  where needed.
- Preserve reaction continuation, concentration cleanup, offer/decline/resume,
  and reaction quota semantics.
- Update generator-readiness blockers only for facts actually resolved.

Acceptance:

- The reaction row no longer has `run-block-coupled` if all run blocks were
  removed.
- Existing reaction parity remains green.

### Task 3 - QNTSEM-SPELL-PROCEDURE-RUN-BLOCK-EXTRACTION - Extract Spell Procedure Semantic-Core Run Blocks

Status: `ready-for-research`

Input:

- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` row in
  `generator-readiness.jsonl`
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`
- current spell procedure TS mirror and tests

Output:

- Extract spell-procedure run blocks in small coherent groups. If the file is
  too large for one coding session, split the remaining extraction into new
  concrete tasks and land the first coherent group.
- Preserve typed procedure facts and do not dispatch on authored spell identity.
- Update generator-readiness blockers only for facts actually resolved.

Acceptance:

- A coherent spell-procedure run-block group is removed from semantic core and
  covered elsewhere.
- Remaining work, if any, is visible as concrete later tasks in this plan.

### Task 4 - QNTSEM-READINESS-REFRESH - Refresh Generator Readiness After Extraction

Status: `ready-for-research`

Input:

- `generator-readiness.jsonl`
- `qnt-owner-roles.jsonl`
- `kernel-ir-boundaries.jsonl`
- extracted results from Tasks 1-3

Output:

- Reconcile readiness statuses and blocker tokens after extraction.
- Do not mark a row `generation-subset-clean` unless every blocker is actually
  gone and the semantic-core paths still match owner-role rules.

Acceptance:

- `pnpm rules-kernel-coverage:check` is green.
- Readiness rows describe current generator blockers without migration-history
  labels or stale blockers.

### Task 5 - QNTSEM-RECURSIVE-NEXT-TASKS - Mine Next Semantic-Core Cleanup Tasks

Status: `ready-for-research`

Input:

- current `generator-readiness.jsonl`
- current `rules-kernel-coverage/REPORT.md`
- current `QNT_COVERAGE_PROGRAM.md`

Output:

- If runnable semantic-core cleanup remains, add 3-8 new atomic tasks to this
  plan with precise inputs, outputs, acceptance, and source rows.
- If no cleanup remains, mark this task done and explain the next lane in one
  short meaningful note.

Acceptance:

- Ralph does not stop merely because the initial task list is exhausted.
- New tasks do not duplicate the slice lane and do not ask for user input unless
  an actual owner decision is needed.
