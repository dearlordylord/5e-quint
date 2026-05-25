# QNT Semantic-Core Extraction Ralph Plan

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTSEM-MOVEMENT-RUN-BLOCK-EXTRACTION",
      "status": "done",
      "title": "Extract Movement Semantic-Core Run Blocks"
    },
    {
      "number": 2,
      "id": "QNTSEM-REACTION-RUN-BLOCK-EXTRACTION",
      "status": "done",
      "title": "Extract Reaction Semantic-Core Run Blocks"
    },
    {
      "number": 3,
      "id": "QNTSEM-SPELL-PROCEDURE-RUN-BLOCK-EXTRACTION",
      "status": "done",
      "title": "Extract Spell Procedure Semantic-Core Run Blocks"
    },
    {
      "number": 4,
      "id": "QNTSEM-READINESS-REFRESH",
      "status": "done",
      "title": "Refresh Generator Readiness After Extraction"
    },
    {
      "number": 5,
      "id": "QNTSEM-RECURSIVE-NEXT-TASKS",
      "status": "done",
      "title": "Mine Next Semantic-Core Cleanup Tasks"
    },
    {
      "number": 6,
      "id": "QNTSEM-SPELL-INVOCATION-RESOURCE-CORE",
      "status": "done",
      "title": "Split Spell Invocation Resource Core"
    },
    {
      "number": 7,
      "id": "QNTSEM-SPELL-DAMAGE-PROJECTION-CORE",
      "status": "done",
      "title": "Split Spell Damage Projection Core"
    },
    {
      "number": 8,
      "id": "QNTSEM-SPELL-HP-OBJECT-EFFECT-CORE",
      "status": "blocked",
      "title": "Split Spell Hit Point And Object Effect Core"
    },
    {
      "number": 9,
      "id": "QNTSEM-SPELL-PERSISTENT-EFFECT-CORE",
      "status": "blocked",
      "title": "Split Spell Persistent Effect Core"
    },
    {
      "number": 10,
      "id": "QNTSEM-READIED-SPELL-RESPONSE-CORE",
      "status": "blocked",
      "title": "Split Readied Spell Response Core"
    },
    {
      "number": 11,
      "id": "QNTSEM-SPELL-PROCEDURE-READINESS-CLOSURE",
      "status": "blocked",
      "title": "Refresh Spell Procedure Generator Readiness"
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

Every Ralph task prompt must include its task-base check: compare the declared
base ref and `HEAD`, then verify the declared Base SHA is an ancestor of
`HEAD`. If the ancestor check fails, stop and report the branch-base mismatch.
Do not use this lane plan as authority to rebase a task worktree.

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Completed:

- Current generator readiness has three clean semantic-core rows and one
  runnable cleanup row:
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` remains `fixture-bound` with
  `blockedBy: ["fixture-world-coupled"]`.
- Added Tasks 6-11 to split the remaining spell procedure semantic core into
  generator-oriented rule families and then refresh the checker-owned readiness
  row.

### Task 6 - QNTSEM-SPELL-INVOCATION-RESOURCE-CORE - Split Spell Invocation Resource Core

Status: `done`

Input:

- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` row in
  `generator-readiness.jsonl` (`status: fixture-bound`,
  `blockedBy: fixture-world-coupled`).
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` row in `obligations.jsonl`.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md` and
  `UBIQUITOUS_LANGUAGE.md`.
- `packages/shared-algebras/proofs/rule-core/spell-procedure-profiles.qnt`
  definitions for invocation action cost, Spell Slot ledger, slot-spell
  same-turn gating, target-count admission, `resolveSpellInvocation`,
  `canSpendSpellSlot`, and `spendSpellSlot`.
- `packages/shared-algebras/proofs/rule-core/action-turn-procedures.qnt`.
- `packages/battle-runtime/rule-core-spells.mbt.qnt` and
  `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`.

Output:

- Extract spell invocation resource semantics into a focused semantic-core QNT
  owner whose input shape is casting cost, slot level, target cardinality, and
  access/admission facts rather than a broad SRD spell fixture world.
- Keep SRD spell examples and bounded proof samples in proof/example owners, not
  in the extracted generator input.
- Update imports, `qnt-owner-roles.jsonl`, and the spell procedure
  generator-readiness row so the new owner is classified as `semantic-core`.

Acceptance:

- The extracted owner contains no `run` blocks, no proof-machine `var` state,
  and no example-world branches.
- Runtime semantics still spend Magic Action/Bonus Action and Spell Slots
  exactly as the existing focused spell MBT expects.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-spells`, and
  `git diff --check` are green.

### Task 7 - QNTSEM-SPELL-DAMAGE-PROJECTION-CORE - Split Spell Damage Projection Core

Status: `done`

Depends on: Task 6

Input:

- Task 6 output.
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`,
  `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`, and
  `SHARED.HIT_POINTS.POSITIVE_DAMAGE` rows in `obligations.jsonl`.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, the relevant SRD spell
  description files for the spell facts being moved, and
  `UBIQUITOUS_LANGUAGE.md`.
- `spell-procedure-profiles.qnt` definitions for spell attack damage, save-gated
  damage, Magic Missile damage, Ray of Frost effect resolution, Acid Splash
  effect resolution, damage type projection, target cardinality, save-success
  damage policy, and failed-save side-effect projection.
- Existing damage atomic owners imported by `spell-procedure-profiles.qnt`.

Output:

- Extract spell attack/save damage projection semantics into focused
  semantic-core QNT owner(s) that consume typed procedure facts and damage
  branch facts instead of SRD spell fixture variants.
- Leave spell-specific examples in `spell-procedure-profiles-examples.qnt` or an
  equivalent proof-only/example owner.
- Update imports, owner-role rows, and generator-readiness source rows for every
  obligation whose semantic owner moves.

Acceptance:

- The extracted damage projection core keeps damage branch semantics reusable by
  future generator work without adding a composite slice or production reducer
  wiring.
- No production runtime path dispatches on authored spell id/name/provenance as a
  result of the split.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-spells`, and
  `git diff --check` are green.

### Task 8 - QNTSEM-SPELL-HP-OBJECT-EFFECT-CORE - Split Spell Hit Point And Object Effect Core

Status: `blocked`

Depends on: Task 7

Input:

- Task 7 output.
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` and
  `BATTLE.SPELL.HIT_POINT_RESTORATION` rows in `obligations.jsonl`.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`,
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md`,
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, and
  `UBIQUITOUS_LANGUAGE.md`.
- `spell-procedure-profiles.qnt` definitions for direct Hit Point restoration,
  object Hit Point damage facts, and the supporting damage/healing result
  records.
- `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`,
  `zero-hit-point-lifecycle.qnt`, and `hit-point-damage.qnt`.

Output:

- Extract direct Hit Point restoration and object Hit Point damage semantics into
  focused semantic-core QNT owner(s).
- Keep target selection, table/spatial facts, and SRD spell examples outside the
  extracted generator input.
- Update imports, owner-role rows, and readiness rows for moved semantic owners.

Acceptance:

- The split does not duplicate Hit Point recovery/damage facts already owned by
  imported atomics; it imports or projects those facts from the existing owners.
- Empty, absent, and unsupported effect collections remain distinguishable in
  the modeled types or are made unrepresentable.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-spells`, and
  `git diff --check` are green.

### Task 9 - QNTSEM-SPELL-PERSISTENT-EFFECT-CORE - Split Spell Persistent Effect Core

Status: `blocked`

Depends on: Task 8

Input:

- Task 8 output.
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` row in `obligations.jsonl`.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, the relevant SRD spell
  description files for the persistent effects being moved, and
  `UBIQUITOUS_LANGUAGE.md`.
- `spell-procedure-profiles.qnt` definitions for Mage Armor effect
  creation/ending, scalar spell effect projection, sleep repeat-save lifecycle
  facts, turn-start temporary Hit Points, and timed spell duration predicates.

Output:

- Extract persistent and timed spell effect lifecycle semantics into focused
  semantic-core QNT owner(s).
- Preserve table/spatial ownership for area membership, target discovery, and
  map facts; do not add parallel runtime state for facts already represented by
  imported owners or caller-supplied witnesses.
- Update imports, owner-role rows, and readiness rows for moved semantic owners.

Acceptance:

- The extracted owner keeps persistent effect state transitions and timed
  duration predicates separate from spell catalog examples.
- Empty, absent, and unsupported effect collections remain distinguishable in
  the modeled types or are made unrepresentable.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-spells`, and
  `git diff --check` are green.

### Task 10 - QNTSEM-READIED-SPELL-RESPONSE-CORE - Split Readied Spell Response Core

Status: `blocked`

Depends on: Task 9

Input:

- Task 9 output.
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` and
  `BATTLE.REACTION.OFFER_DECLINE_RESUME` rows in `obligations.jsonl`.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`,
  `.references/srd-5.2.1/Rules-Glossary.md`, and `UBIQUITOUS_LANGUAGE.md`.
- `spell-procedure-profiles.qnt` definitions for readied spell held effects,
  readied spell release, concentration dissipation, holding a readied spell
  response, offering the reaction, and releasing the reaction.
- `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`.

Output:

- Extract Readied Spell Response semantics into a focused semantic-core QNT owner
  that imports the reaction protocol owner and consumes the spell invocation core
  from Task 6.
- Preserve the domain boundary between spending casting resources when the spell
  is readied, holding Concentration while the spell is held, spending Reaction
  on release, and dissipating the held spell when Concentration is gone.
- Update imports, owner-role rows, and readiness rows for moved semantic owners.

Acceptance:

- The extracted owner encodes the readied-spell sequencing invariant in one
  operation or state-typed workflow; callers do not need to remember a separate
  sequence of low-level updates.
- The reaction owner remains the source of reaction-window and Concentration
  protocol facts; the readied-spell owner does not duplicate them.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-spells`,
  `pnpm --filter @dnd/battle-runtime test:mbt:rule-core-reactions`, and
  `git diff --check` are green.

### Task 11 - QNTSEM-SPELL-PROCEDURE-READINESS-CLOSURE - Refresh Spell Procedure Generator Readiness

Status: `blocked`

Depends on: Tasks 6-10

Input:

- Outputs from Tasks 6-10.
- `generator-readiness.jsonl`, `qnt-owner-roles.jsonl`,
  `kernel-ir-boundaries.jsonl`, and `REPORT.md`.
- Any new or moved spell procedure semantic-core owner files.

Output:

- Reconcile `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` readiness after the spell
  procedure semantic-core split.
- If all fixture-world coupling has been removed, mark the row
  `generation-subset-clean` with an empty `blockedBy` array; otherwise keep
  `fixture-bound` and name only the concrete remaining blocker.
- Keep proof/example owners classified as `proof-only` or `mbt-fixture` rather
  than generator input.

Acceptance:

- `generator-readiness.jsonl` describes the actual spell procedure generator
  input without migration-history labels or stale blockers.
- `REPORT.md` shows no remaining semantic-core cleanup task unless a concrete
  blocker still exists.
- `pnpm rules-kernel-coverage:check -- --write`,
  `pnpm rules-kernel-coverage:check`, and `git diff --check` are green.
