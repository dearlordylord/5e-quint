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
      "status": "ready-for-research",
      "title": "Surface Profile Join Evidence Closure"
    },
    {
      "number": 22,
      "id": "L12G-MISSING-ANIMAL-MESSENGER",
      "status": "ready-for-research",
      "title": "Animal Messenger Definition And Closure"
    },
    {
      "number": 23,
      "id": "L12G-MISSING-ARCANISTS-MAGIC-AURA",
      "status": "ready-for-research",
      "title": "Arcanists Magic Aura Definition And Closure"
    },
    {
      "number": 24,
      "id": "L12G-MISSING-AUGURY",
      "status": "ready-for-research",
      "title": "Augury Definition And Closure"
    },
    {
      "number": 25,
      "id": "L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS",
      "status": "ready-for-research",
      "title": "Locate Animals Or Plants Definition And Closure"
    },
    {
      "number": 26,
      "id": "L12G-MISSING-LOCATE-OBJECT",
      "status": "ready-for-research",
      "title": "Locate Object Definition And Closure"
    },
    {
      "number": 27,
      "id": "L12G-MISSING-MAGIC-MOUTH",
      "status": "ready-for-research",
      "title": "Magic Mouth Definition And Closure"
    },
    {
      "number": 28,
      "id": "L12G-MISSING-ROPE-TRICK",
      "status": "ready-for-research",
      "title": "Rope Trick Definition And Closure"
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

Status: `ready-for-research`

Depends on:
- Task 14.

Output:
- Prove every currently admitted executable battle Surface profile points to a covered rules-kernel semantic obligation, or record explicit non-runtime or boundary dispositions.

## Overnight Backlog Refill

### Task 22 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure

Status: `ready-for-research`

Unit: `animal_messenger`. Gate task: 54 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `animal_messenger`.

Outputs:

- one concrete end state from the Task Output Contract for `animal_messenger`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `animal_messenger` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 23 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure

Status: `ready-for-research`

Unit: `arcanists_magic_aura`. Gate task: 55 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `arcanists_magic_aura`.

Outputs:

- one concrete end state from the Task Output Contract for `arcanists_magic_aura`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `arcanists_magic_aura` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 24 - L12G-MISSING-AUGURY - Augury Definition And Closure

Status: `ready-for-research`

Unit: `augury`. Gate task: 56 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `augury`.

Outputs:

- one concrete end state from the Task Output Contract for `augury`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `augury` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 25 - L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure

Status: `ready-for-research`

Unit: `locate_animals_or_plants`. Gate task: 70 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `locate_animals_or_plants`.

Outputs:

- one concrete end state from the Task Output Contract for `locate_animals_or_plants`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `locate_animals_or_plants` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->

### Task 26 - L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure

Status: `ready-for-research`

Unit: `locate_object`. Gate task: 71 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `locate_object`.

Outputs:

- one concrete end state from the Task Output Contract for `locate_object`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `locate_object` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->

### Task 27 - L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure

Status: `ready-for-research`

Unit: `magic_mouth`. Gate task: 72 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_mouth`.

Outputs:

- one concrete end state from the Task Output Contract for `magic_mouth`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `magic_mouth` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->

### Task 28 - L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure

Status: `ready-for-research`

Unit: `rope_trick`. Gate task: 74 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `rope_trick`.

Outputs:

- one concrete end state from the Task Output Contract for `rope_trick`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `rope_trick` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
