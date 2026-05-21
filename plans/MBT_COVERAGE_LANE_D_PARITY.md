# MBT Coverage Lane D - Rules-Kernel Parity And Coverage Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {"number":1,"id":"RKBC-HANDOFF-IDENTITY-CONFLICTS","status":"done","title":"Character Battle Identity And Max HP Conflict Handling"},
    {"number":2,"id":"RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY","status":"done","title":"Spell Direct Condition Removal And Protection Parity Witnesses"},
    {"number":3,"id":"RKBC-SPELL-SAVE-GATED-CONDITION-PARITY","status":"done","title":"Spell Save-Gated Condition Parity Witnesses"},
    {"number":4,"id":"RKBC-SPELL-ROLL-SCALAR-PARITY","status":"done","title":"Spell Roll Modifier And Scalar Buff Parity Witnesses"},
    {"number":5,"id":"RKBC-SPELL-MAKE-STABLE-PARITY","status":"ready-for-research","title":"Spell Make Stable Parity Witness"},
    {"number":6,"id":"RKBC-SPELL-SELF-TRANSFORMATION-PARITY","status":"ready-for-research","title":"Spell Self Transformation Mode Parity Witness"},
    {"number":7,"id":"RKBC-SPELL-REACTION-CASTING-PARITY","status":"ready-for-research","title":"Spell Reaction Casting Parity Witnesses"},
    {"number":8,"id":"RKBC-SPELL-AFTER-HIT-RIDERS-PARITY","status":"ready-for-research","title":"Spell After-Hit Rider Parity Witnesses"},
    {"number":9,"id":"RKBC-SPELL-WEAPON-HOSTED-PARITY","status":"ready-for-research","title":"Spell Weapon-Hosted Attack And Rider Parity Witnesses"},
    {"number":10,"id":"RKBC-SPELL-MARKED-RIDER-PARITY","status":"ready-for-research","title":"Spell Marked Damage Rider Parity Witnesses"},
    {"number":11,"id":"RKBC-SPELL-ATTACK-SEQUENCES-PARITY","status":"ready-for-research","title":"Spell Attack Sequence Parity Witnesses"},
    {"number":12,"id":"RKBC-SPELL-MIRROR-IMAGE-PARITY","status":"ready-for-research","title":"Mirror Image Hit Interception Parity Witness"},
    {"number":13,"id":"RKBC-SPELL-LINKED-EFFECT-PARITY","status":"ready-for-research","title":"Linked Spell Effect Damage Sharing Parity Witness"},
    {"number":14,"id":"RKBC-FINAL-COVERAGE-CLOSURE-GATE","status":"blocked","title":"Final MBT Coverage Closure Gate"}
  ]
}
-->

This is an active Ralph execution plan for MBT/coverage parity work. It replaces the stale rules-kernel B closure active lane.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability where rule behavior is involved, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

This lane must not implement level-2 feature behavior from lanes A-C. It may add parity witnesses, MBT hooks, coverage obligations, reports, and focused tests for already-supported behavior.

## Verification

Every task must include:

- Read relevant promoted package-local Quint specs before changing MBT or coverage.
- When moving a rules-kernel obligation from `needs-parity-witness` to `covered`, update the obligation artifacts and add matching `KERNEL-COVERAGE` owner markers to every listed QNT and runtime owner file; the checker does not infer owner coverage from parity-witness comments alone.
- If MBT is run, follow AGENTS.md MBT protocol exactly: one MBT run at a time, background timing wrapper, no exploratory MBT.
- `pnpm rules-kernel-coverage:check -- --write`, then `pnpm rules-kernel-coverage:check` when rules-kernel reports change.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check` when profile reports change.
- Relevant focused tests/typechecks.
- Reviewer-loop convergence.

## Tasks

### Task 1 - RKBC-HANDOFF-IDENTITY-CONFLICTS - Character Battle Identity And Max HP Conflict Handling

Status: `done`

Input:
- Current character battle initialization and settlement coverage.

Output:
- Coverage/parity witness for identity and max-HP conflict handling, or precise closure if no runtime behavior is missing.

### Task 2 - RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY - Spell Direct Condition Removal And Protection Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for direct condition removal/protection profiles already supported in runtime.

### Task 3 - RKBC-SPELL-SAVE-GATED-CONDITION-PARITY - Spell Save-Gated Condition Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for save-gated condition profiles already supported in runtime.

### Task 4 - RKBC-SPELL-ROLL-SCALAR-PARITY - Spell Roll Modifier And Scalar Buff Parity Witnesses

Status: `done`

Output:
- Parity witnesses or focused tests for roll modifier and scalar buff profiles already supported in runtime.

### Task 5 - RKBC-SPELL-MAKE-STABLE-PARITY - Spell Make Stable Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for the Make Stable spell profile already supported in runtime.

### Task 6 - RKBC-SPELL-SELF-TRANSFORMATION-PARITY - Spell Self Transformation Mode Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for Alter Self self-transformation behavior already supported in runtime.

### Task 7 - RKBC-SPELL-REACTION-CASTING-PARITY - Spell Reaction Casting Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported reaction spell casting behavior.

### Task 8 - RKBC-SPELL-AFTER-HIT-RIDERS-PARITY - Spell After-Hit Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported after-hit damage, illumination, restraint, and timed-save riders.

### Task 9 - RKBC-SPELL-WEAPON-HOSTED-PARITY - Spell Weapon-Hosted Attack And Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported spell-hosted weapon attacks, weapon overrides, and weapon riders.

### Task 10 - RKBC-SPELL-MARKED-RIDER-PARITY - Spell Marked Damage Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported marked damage rider behavior.

### Task 11 - RKBC-SPELL-ATTACK-SEQUENCES-PARITY - Spell Attack Sequence Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported independent and chained spell attack sequences.

### Task 12 - RKBC-SPELL-MIRROR-IMAGE-PARITY - Mirror Image Hit Interception Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for Mirror Image hit interception already supported in runtime.

### Task 13 - RKBC-SPELL-LINKED-EFFECT-PARITY - Linked Spell Effect Damage Sharing Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for linked spell-effect damage sharing already supported in runtime.

### Task 14 - RKBC-FINAL-COVERAGE-CLOSURE-GATE - Final MBT Coverage Closure Gate

Status: `blocked`

Depends on:
- Tasks D1-D13.

Output:
- Refresh rules-kernel and unit-profile coverage reports.
- Record remaining gaps as explicit nonfeature follow-ups or close the lane.
