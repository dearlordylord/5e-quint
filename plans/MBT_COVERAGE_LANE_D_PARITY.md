# MBT Coverage Lane D - Rules-Kernel Parity And Coverage Closure

This is an active Ralph execution plan for MBT/coverage parity work. It replaces the stale rules-kernel B closure active lane.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability where rule behavior is involved, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

This lane must not implement level-2 feature behavior from lanes A-C. It may add parity witnesses, MBT hooks, coverage obligations, reports, and focused tests for already-supported behavior.

## Verification

Every task must include:

- Read relevant promoted package-local Quint specs before changing MBT or coverage.
- If MBT is run, follow AGENTS.md MBT protocol exactly: one MBT run at a time, background timing wrapper, no exploratory MBT.
- `pnpm rules-kernel-coverage:check -- --write`, then `pnpm rules-kernel-coverage:check` when rules-kernel reports change.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check` when profile reports change.
- Relevant focused tests/typechecks.
- Reviewer-loop convergence.

## Tasks

### Task D1 - RKBC-HANDOFF-IDENTITY-CONFLICTS - Character Battle Identity And Max HP Conflict Handling

Status: `ready-for-research`

Input:
- Current character battle initialization and settlement coverage.

Output:
- Coverage/parity witness for identity and max-HP conflict handling, or precise closure if no runtime behavior is missing.

### Task D2 - RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY - Spell Direct Condition Removal And Protection Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses or focused tests for direct condition removal/protection profiles already supported in runtime.

### Task D3 - RKBC-SPELL-SAVE-GATED-CONDITION-PARITY - Spell Save-Gated Condition Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses or focused tests for save-gated condition profiles already supported in runtime.

### Task D4 - RKBC-SPELL-ROLL-SCALAR-PARITY - Spell Roll Modifier And Scalar Buff Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses or focused tests for roll modifier and scalar buff profiles already supported in runtime.

### Task D5 - RKBC-SPELL-MAKE-STABLE-PARITY - Spell Make Stable Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for the Make Stable spell profile already supported in runtime.

### Task D6 - RKBC-SPELL-SELF-TRANSFORMATION-PARITY - Spell Self Transformation Mode Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for Alter Self self-transformation behavior already supported in runtime.

### Task D7 - RKBC-SPELL-REACTION-CASTING-PARITY - Spell Reaction Casting Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported reaction spell casting behavior.

### Task D8 - RKBC-SPELL-AFTER-HIT-RIDERS-PARITY - Spell After-Hit Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported after-hit damage, illumination, restraint, and timed-save riders.

### Task D9 - RKBC-SPELL-WEAPON-HOSTED-PARITY - Spell Weapon-Hosted Attack And Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported spell-hosted weapon attacks, weapon overrides, and weapon riders.

### Task D10 - RKBC-SPELL-MARKED-RIDER-PARITY - Spell Marked Damage Rider Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported marked damage rider behavior.

### Task D11 - RKBC-SPELL-ATTACK-SEQUENCES-PARITY - Spell Attack Sequence Parity Witnesses

Status: `ready-for-research`

Output:
- Parity witnesses for supported independent and chained spell attack sequences.

### Task D12 - RKBC-SPELL-MIRROR-IMAGE-PARITY - Mirror Image Hit Interception Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for Mirror Image hit interception already supported in runtime.

### Task D13 - RKBC-SPELL-LINKED-EFFECT-PARITY - Linked Spell Effect Damage Sharing Parity Witness

Status: `ready-for-research`

Output:
- Parity witness for linked spell-effect damage sharing already supported in runtime.

### Task D14 - RKBC-FINAL-COVERAGE-CLOSURE-GATE - Final MBT Coverage Closure Gate

Status: `blocked`

Depends on:
- Tasks D1-D13.

Output:
- Refresh rules-kernel and unit-profile coverage reports.
- Record remaining gaps as explicit nonfeature follow-ups or close the lane.
