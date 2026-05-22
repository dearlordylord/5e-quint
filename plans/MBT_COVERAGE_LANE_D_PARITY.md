# MBT Coverage Lane D - Rules-Kernel Parity And Coverage Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "RKBC-HANDOFF-IDENTITY-CONFLICTS",
      "status": "done",
      "title": "Character Battle Identity And Max HP Conflict Handling"
    },
    {
      "number": 2,
      "id": "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
      "status": "done",
      "title": "Spell Direct Condition Removal And Protection Parity Witnesses"
    },
    {
      "number": 3,
      "id": "RKBC-SPELL-SAVE-GATED-CONDITION-PARITY",
      "status": "done",
      "title": "Spell Save-Gated Condition Parity Witnesses"
    },
    {
      "number": 4,
      "id": "RKBC-SPELL-ROLL-SCALAR-PARITY",
      "status": "done",
      "title": "Spell Roll Modifier And Scalar Buff Parity Witnesses"
    },
    {
      "number": 5,
      "id": "RKBC-SPELL-MAKE-STABLE-PARITY",
      "status": "done",
      "title": "Spell Make Stable Parity Witness"
    },
    {
      "number": 6,
      "id": "RKBC-SPELL-SELF-TRANSFORMATION-PARITY",
      "status": "done",
      "title": "Spell Self Transformation Mode Parity Witness"
    },
    {
      "number": 7,
      "id": "RKBC-SPELL-REACTION-CASTING-PARITY",
      "status": "done",
      "title": "Spell Reaction Casting Parity Witnesses"
    },
    {
      "number": 8,
      "id": "RKBC-SPELL-AFTER-HIT-RIDERS-PARITY",
      "status": "done",
      "title": "Spell After-Hit Rider Parity Witnesses"
    },
    {
      "number": 9,
      "id": "RKBC-SPELL-WEAPON-HOSTED-PARITY",
      "status": "done",
      "title": "Spell Weapon-Hosted Attack And Rider Parity Witnesses"
    },
    {
      "number": 10,
      "id": "RKBC-SPELL-MARKED-RIDER-PARITY",
      "status": "done",
      "title": "Spell Marked Damage Rider Parity Witnesses"
    },
    {
      "number": 11,
      "id": "RKBC-SPELL-ATTACK-SEQUENCES-PARITY",
      "status": "done",
      "title": "Spell Attack Sequence Parity Witnesses"
    },
    {
      "number": 12,
      "id": "RKBC-SPELL-MIRROR-IMAGE-PARITY",
      "status": "done",
      "title": "Mirror Image Hit Interception Parity Witness"
    },
    {
      "number": 13,
      "id": "RKBC-SPELL-LINKED-EFFECT-PARITY",
      "status": "done",
      "title": "Linked Spell Effect Damage Sharing Parity Witness"
    },
    {
      "number": 14,
      "id": "RKBC-FINAL-COVERAGE-CLOSURE-GATE",
      "status": "done",
      "title": "Final MBT Coverage Closure Gate"
    },
    {
      "number": 15,
      "id": "RKBC-NONFEATURE-DIRECT-CONDITION-LIFECYCLE-WITNESS",
      "status": "done",
      "title": "Direct Condition Lifecycle Coverage Witness"
    },
    {
      "number": 16,
      "id": "RKBC-NONFEATURE-SAVE-GATED-ATTACK-ADVANTAGE-WITNESS",
      "status": "done",
      "title": "Save-Gated Attack Advantage Coverage Witness"
    },
    {
      "number": 17,
      "id": "RKBC-NONFEATURE-MOONBEAM-MOVABLE-ZONE-WITNESS",
      "status": "done",
      "title": "Moonbeam Movable Zone Coverage Witness"
    },
    {
      "number": 18,
      "id": "RKBC-NONFEATURE-CREATURE-TYPE-PROTECTION-WITNESS",
      "status": "done",
      "title": "Creature-Type Protection Coverage Witness"
    },
    {
      "number": 19,
      "id": "RKBC-NONFEATURE-CONDITION-IMMUNITY-THP-WITNESS",
      "status": "done",
      "title": "Condition Immunity Temporary Hit Point Coverage Witness"
    },
    {
      "number": 20,
      "id": "RKBC-NONFEATURE-CONDITION-REMOVAL-PROTECTION-WITNESS",
      "status": "done",
      "title": "Condition Removal And Protection Coverage Witness"
    },
    {
      "number": 21,
      "id": "RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE",
      "status": "done",
      "title": "Surface Profile Join Evidence Closure"
    },
    {
      "number": 22,
      "id": "L3-METRIC-SCOPE-EXPANSION-PRECHECK",
      "status": "done",
      "title": "Level 3 Metric Scope Expansion Precheck"
    },
    {
      "number": 23,
      "id": "L3-SPELL-UNIT-INVENTORY-SEED",
      "status": "done",
      "title": "Level 3 Spell Unit Inventory Seed"
    },
    {
      "number": 24,
      "id": "L3-RULES-KERNEL-JOIN-PRECHECK",
      "status": "done",
      "title": "Level 3 Rules-Kernel Join Precheck"
    },
    {
      "number": 25,
      "id": "L3-SPELL-COUNTERSPELL-ACCOUNTING-AUDIT",
      "status": "ready-for-research",
      "title": "Level 3 Counterspell Accounting Audit"
    },
    {
      "number": 26,
      "id": "L3-SPELL-DISPEL-MAGIC-ACCOUNTING-AUDIT",
      "status": "ready-for-research",
      "title": "Level 3 Dispel Magic Accounting Audit"
    },
    {
      "number": 27,
      "id": "L3-SPELL-CLAIRVOYANCE-CLOSURE-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Clairvoyance Closure Survey"
    },
    {
      "number": 28,
      "id": "L3-SPELL-TONGUES-CLOSURE-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Tongues Closure Survey"
    },
    {
      "number": 29,
      "id": "L3-SPELL-WATER-BREATHING-CLOSURE-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Water Breathing Closure Survey"
    },
    {
      "number": 30,
      "id": "L3-CLASS-SUBCLASS-INVENTORY-SEED",
      "status": "ready-for-research",
      "title": "Level 3 Class And Subclass Inventory Seed"
    }
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

Status: `done`

Output:
- Parity witness for the Make Stable spell profile already supported in runtime.

### Task 6 - RKBC-SPELL-SELF-TRANSFORMATION-PARITY - Spell Self Transformation Mode Parity Witness

Status: `done`

Output:
- Parity witness for Alter Self self-transformation behavior already supported in runtime.

### Task 7 - RKBC-SPELL-REACTION-CASTING-PARITY - Spell Reaction Casting Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported reaction spell casting behavior.

### Task 8 - RKBC-SPELL-AFTER-HIT-RIDERS-PARITY - Spell After-Hit Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported after-hit damage, illumination, restraint, and timed-save riders.

### Task 9 - RKBC-SPELL-WEAPON-HOSTED-PARITY - Spell Weapon-Hosted Attack And Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported spell-hosted weapon attacks, weapon overrides, and weapon riders.

### Task 10 - RKBC-SPELL-MARKED-RIDER-PARITY - Spell Marked Damage Rider Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported marked damage rider behavior.

### Task 11 - RKBC-SPELL-ATTACK-SEQUENCES-PARITY - Spell Attack Sequence Parity Witnesses

Status: `done`

Output:
- Parity witnesses for supported independent and chained spell attack sequences.

### Task 12 - RKBC-SPELL-MIRROR-IMAGE-PARITY - Mirror Image Hit Interception Parity Witness

Status: `done`

Output:
- Parity witness for Mirror Image hit interception already supported in runtime.

### Task 13 - RKBC-SPELL-LINKED-EFFECT-PARITY - Linked Spell Effect Damage Sharing Parity Witness

Status: `done`

Output:
- Parity witness for linked spell-effect damage sharing already supported in runtime.

### Task 14 - RKBC-FINAL-COVERAGE-CLOSURE-GATE - Final MBT Coverage Closure Gate

Status: `done`

Depends on:
- Tasks D1-D13.

Output:
- Refresh rules-kernel and unit-profile coverage reports.
- Record remaining gaps as explicit nonfeature follow-ups or close the lane.

### Task 15 - RKBC-NONFEATURE-DIRECT-CONDITION-LIFECYCLE-WITNESS - Direct Condition Lifecycle Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`, covering direct spell-owned condition application, cleanup, duration expiry, and target-action early ending, or split unsupported branches into explicit boundary rows.

### Task 16 - RKBC-NONFEATURE-SAVE-GATED-ATTACK-ADVANTAGE-WITNESS - Save-Gated Attack Advantage Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`, covering failed-save attack-roll Advantage active effects from save outcome through attack-roll projection.

### Task 17 - RKBC-NONFEATURE-MOONBEAM-MOVABLE-ZONE-WITNESS - Moonbeam Movable Zone Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE`, covering current Moonbeam movable-zone lifecycle semantics, or split any shapechanging rider that is outside current runtime support.

### Task 18 - RKBC-NONFEATURE-CREATURE-TYPE-PROTECTION-WITNESS - Creature-Type Protection Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`, covering creature-type protection, prevention, and relevant-effect Saving Throw Advantage.

### Task 19 - RKBC-NONFEATURE-CONDITION-IMMUNITY-THP-WITNESS - Condition Immunity Temporary Hit Point Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`, covering condition immunity with start-turn Temporary Hit Point refresh and cleanup.

### Task 20 - RKBC-NONFEATURE-CONDITION-REMOVAL-PROTECTION-WITNESS - Condition Removal And Protection Coverage Witness

Status: `done`

Depends on:
- Task 14.

Output:
- Add focused parity witness ownership for `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION`, covering direct condition removal and poison protection semantics beyond the selected-identity evidence already recorded for Unit replay.

### Task 21 - RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE - Surface Profile Join Evidence Closure

Status: `done`

Depends on:
- Task 14.

Output:
- Prove every pre-Level-3 admitted executable battle Surface profile points to a covered rules-kernel semantic obligation, or record explicit non-runtime or boundary dispositions.

## Overnight Backlog Refill

## Level 2 Completion And Level 3 Kickoff Refill

### Task 22 - L3-METRIC-SCOPE-EXPANSION-PRECHECK - Level 3 Metric Scope Expansion Precheck

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Survey how level 1-2 inventory/report metrics are generated and propose the smallest safe extension for spell-level-3/class-level-3 pressure without breaking existing level 1-2 reporting.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 23 - L3-SPELL-UNIT-INVENTORY-SEED - Level 3 Spell Unit Inventory Seed

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Seed or plan level-3 spell-pressure inventory rows from installed SRD Surface spell content, with level-3 rows clearly separated from level 1-2 metrics.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 24 - L3-RULES-KERNEL-JOIN-PRECHECK - Level 3 Rules-Kernel Join Precheck

Status: `done`

Depends on:

- Task 23.

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Survey level-3 supported or likely-supported profiles and identify rules-kernel obligation mappings needed before broad implementation.
- Resolve the current `spell.invocation-ray-of-enfeeblement-d20-lifecycle` profile join gap by mapping it to a covered rules-kernel obligation or splitting a precise follow-up when that mapping would overclaim current behavior.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 25 - L3-SPELL-COUNTERSPELL-ACCOUNTING-AUDIT - Level 3 Counterspell Accounting Audit

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Check existing Counterspell support against level-3 metric expansion and add any missing profile/evidence/rules-kernel accounting without changing already-correct runtime behavior.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 26 - L3-SPELL-DISPEL-MAGIC-ACCOUNTING-AUDIT - Level 3 Dispel Magic Accounting Audit

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Check existing Dispel Magic support against level-3 metric expansion and add any missing profile/evidence/rules-kernel accounting without duplicating ongoing spell ending logic.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 27 - L3-SPELL-CLAIRVOYANCE-CLOSURE-SURVEY - Level 3 Clairvoyance Closure Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Clairvoyance and current content; close runtime-detached sensor/table ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 28 - L3-SPELL-TONGUES-CLOSURE-SURVEY - Level 3 Tongues Closure Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Tongues and current language-access policy; close runtime-detached language/table ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 29 - L3-SPELL-WATER-BREATHING-CLOSURE-SURVEY - Level 3 Water Breathing Closure Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Water Breathing and current environmental/table policy; close runtime-detached environment ownership or split any actual runtime/profile work.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 30 - L3-CLASS-SUBCLASS-INVENTORY-SEED - Level 3 Class And Subclass Inventory Seed

Status: `ready-for-research`

Depends on:

- Task 22.
- Task 23.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface class, subclass, class-feature, Spell Access, Unit claim, and
  owner-evidence artifacts.

Output:

- Seed or plan class `level-3` inventory rows from the SRD class feature table
  rows, class Level 3 headings, subclass selection rows, subclass feature
  grants, and subclass always-prepared Spell Access rows.
- Keep class/subclass `level-3` rows separate from `spell-level-3` spell-list
  pressure and from existing Level 1-2 readiness/support reports.
- Update generated inventory/report artifacts only where this class/subclass
  task is the correct owner; otherwise record precise follow-up splits.

Acceptance:

- The 51 pre-scanned class `level-3` rows have checker-visible classification:
  supported owner evidence, accepted runtime-detached or character-fact closure,
  or a smaller executable follow-up split.
- Subclass selection, subclass feature grants, and subclass Spell Access are not
  collapsed into spell-list pressure or treated as runtime support from catalog
  admission alone.
- No companion AI/autonomous-control behavior and no authored identity dispatch
  are introduced.
