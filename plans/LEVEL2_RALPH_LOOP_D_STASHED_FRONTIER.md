# Level 2 Ralph Loop D - Stashed Missing Spell Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-MISSING-KNOCK",
      "status": "done",
      "title": "Knock Definition And Closure"
    },
    {
      "number": 2,
      "id": "L12G-MISSING-LEVITATE",
      "status": "done",
      "title": "Levitate Definition And Support Or Closure"
    },
    {
      "number": 3,
      "id": "L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS",
      "status": "done",
      "title": "Locate Animals Or Plants Definition And Closure"
    },
    {
      "number": 4,
      "id": "L12G-MISSING-LOCATE-OBJECT",
      "status": "done",
      "title": "Locate Object Definition And Closure"
    },
    {
      "number": 5,
      "id": "L12G-MISSING-MAGIC-MOUTH",
      "status": "done",
      "title": "Magic Mouth Definition And Closure"
    },
    {
      "number": 6,
      "id": "L12G-MISSING-MIRROR-IMAGE",
      "status": "done",
      "title": "Mirror Image Definition And Runtime Support"
    },
    {
      "number": 7,
      "id": "L12G-MISSING-ROPE-TRICK",
      "status": "ready-for-research",
      "title": "Rope Trick Definition And Closure"
    },
    {
      "number": 8,
      "id": "L12G-MISSING-SILENCE",
      "status": "deferred-to-loop-a",
      "title": "Silence Definition And Support Or Closure"
    },
    {
      "number": 9,
      "id": "L12G-MISSING-SUGGESTION",
      "status": "deferred-to-loop-a",
      "title": "Suggestion Definition And Closure"
    },
    {
      "number": 10,
      "id": "L12G-MISSING-ZONE-OF-TRUTH",
      "status": "deferred-to-loop-a",
      "title": "Zone Of Truth Definition And Closure"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST",
      "status": "deferred-to-loop-a",
      "title": "Dragon's Breath Initial Cast And Effect State"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION",
      "status": "deferred-to-loop-a",
      "title": "Dragon's Breath Granted Magic Action"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES",
      "status": "deferred-to-loop-a",
      "title": "Enhance Ability Upcast Per-Target Ability Choices"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME",
      "status": "deferred-to-loop-a",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH",
      "status": "deferred-to-loop-a",
      "title": "Enlarge Reduce Object Branch"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "deferred-to-loop-a",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME",
      "status": "deferred-to-loop-a",
      "title": "Levitate Creature Runtime Support"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH",
      "status": "deferred-to-loop-a",
      "title": "Levitate Loose Object Branch"
    }
  ]
}
-->

Lane D owns the remaining missing-spell closures from Knock through Zone of Truth plus Dragon's Breath, Enhance Ability, Enlarge/Reduce, Levitate, and Enthrall followups. It does not touch Warding Bond or A/C-owned followups.

This is an active Ralph execution plan created from `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`. The backlog remains the archived pre-research source; this file is the runnable queue.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

For each task, first read the original backlog section referenced in the task body, then read the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`, the generated coverage reports, local RAW, and `UBIQUITOUS_LANGUAGE.md`. This plan intentionally does not duplicate all pre-researched details from the backlog.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Reviewers should reject:

- support claims without executable owner evidence;
- catalog admission treated as runtime support;
- table-detached detection/social/exploration facts added as runtime state;
- object, geometry, light, or pathfinding derivation hidden inside spell support;
- duplicated Spell Definition, Spell Access, Spell Invocation, Spell Effect, Character Sheet, resource, or class progression state;
- companion behavior or companion-control automation.

## Task Output Contract

Every task must leave its Unit in one concrete end state:

- `supported-profile` with deterministic admission/projection evidence and focused owner tests;
- `profile-subset-supported` only when the executable subset is precise and every residual has an accepted closure kind;
- `unsupported-profile` with an accepted runtime-detached closure when the rule is outside product runtime;
- a smaller follow-up split only when RAW proves the listed task cannot fit in one coding session, with the original metric row left in a precise blocked state rather than generic todo wording.

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Do not run battle-runtime MBT unless the task changes promoted battle-runtime behavior and focused tests cannot cover the changed boundary. If MBT is needed, use the repository MBT scarcity protocol.

## Lane Boundaries

- Base branch: `ralph/level2-loop-d/stashed-frontier`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-d`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not start Warding Bond or any task currently active in Loop B.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-MISSING-KNOCK - Knock Definition And Closure | done | completed baseline | Original backlog task 66; Unit `knock`. |
| 2 | L12G-MISSING-LEVITATE - Levitate Definition And Support Or Closure | done | completed baseline | Original backlog task 67; Unit `levitate`. |
| 3 | L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure | done | completed baseline | Original backlog task 68; Unit `locate_animals_or_plants`. |
| 4 | L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure | done | completed baseline | Original backlog task 69; Unit `locate_object`. |
| 5 | L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure | done | completed baseline | Original backlog task 70; Unit `magic_mouth`. |
| 6 | L12G-MISSING-MIRROR-IMAGE - Mirror Image Definition And Runtime Support | done | completed baseline | Original backlog task 71; Unit `mirror_image`. |
| 7 | L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure | ready-for-research | completed baseline | Original backlog task 72; Unit `rope_trick`. |
| 8 | L12G-MISSING-SILENCE - Silence Definition And Support Or Closure | deferred-to-loop-a | completed baseline | Original backlog task 73; Unit `silence`. |
| 9 | L12G-MISSING-SUGGESTION - Suggestion Definition And Closure | deferred-to-loop-a | completed baseline | Original backlog task 74; Unit `suggestion`. |
| 10 | L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure | deferred-to-loop-a | completed baseline | Original backlog task 75; Unit `zone_of_truth`. |
| 11 | L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State | deferred-to-loop-a | completed baseline | Original backlog task 90; Unit `dragons_breath`. |
| 12 | L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action | deferred-to-loop-a | L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST | Original backlog task 91; Unit `dragons_breath`. |
| 13 | L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices | deferred-to-loop-a | completed baseline | Original backlog task 92; Unit `enhance_ability`. |
| 14 | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support | deferred-to-loop-a | completed baseline | Original backlog task 93; Unit `enlarge_reduce`. |
| 15 | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch | deferred-to-loop-a | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME | Original backlog task 94; Unit `enlarge_reduce`. |
| 16 | L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support | deferred-to-loop-a | completed baseline | Original backlog task 95; Unit `enthrall`. |
| 17 | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support | deferred-to-loop-a | L12G-MISSING-LEVITATE | Task 2 follow-up split; Unit `levitate`; creature branch without loose-object behavior. |
| 18 | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch | deferred-to-loop-a | L12G-MISSING-LEVITATE | Task 2 follow-up split; Unit `levitate`; loose-object branch support or closure. |

## Task Details

### Task 1 - L12G-MISSING-KNOCK - Knock Definition And Closure

Status: `done`

Original backlog task: `Task 66 - L12G-MISSING-KNOCK - Knock Definition And Closure`.
Unit: `knock`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 66 - L12G-MISSING-KNOCK - Knock Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `knock`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `knock` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 2 - L12G-MISSING-LEVITATE - Levitate Definition And Support Or Closure

Status: `done`

Original backlog task: `Task 67 - L12G-MISSING-LEVITATE - Levitate Definition And Support Or Closure`.
Unit: `levitate`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 67 - L12G-MISSING-LEVITATE - Levitate Definition And Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `levitate`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `levitate` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 3 - L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure

Status: `done`

Original backlog task: `Task 68 - L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure`.
Unit: `locate_animals_or_plants`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 68 - L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `locate_animals_or_plants`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `locate_animals_or_plants` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 4 - L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure

Status: `done`

Original backlog task: `Task 69 - L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure`.
Unit: `locate_object`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 69 - L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `locate_object`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `locate_object` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 5 - L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure

Status: `done`

Original backlog task: `Task 70 - L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure`.
Unit: `magic_mouth`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 70 - L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_mouth`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `magic_mouth` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 6 - L12G-MISSING-MIRROR-IMAGE - Mirror Image Definition And Runtime Support

Status: `done`

Original backlog task: `Task 71 - L12G-MISSING-MIRROR-IMAGE - Mirror Image Definition And Runtime Support`.
Unit: `mirror_image`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 71 - L12G-MISSING-MIRROR-IMAGE - Mirror Image Definition And Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mirror_image`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `mirror_image` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 7 - L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure

Status: `ready-for-research`

Original backlog task: `Task 72 - L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure`.
Unit: `rope_trick`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 72 - L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `rope_trick`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `rope_trick` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 8 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure

Status: `deferred-to-loop-a`

Original backlog task: `Task 73 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure`.
Unit: `silence`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 73 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `silence`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `silence` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 9 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure

Status: `deferred-to-loop-a`

Original backlog task: `Task 74 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure`.
Unit: `suggestion`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 74 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `suggestion`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `suggestion` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 10 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure

Status: `deferred-to-loop-a`

Original backlog task: `Task 75 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure`.
Unit: `zone_of_truth`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 75 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `zone_of_truth`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `zone_of_truth` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 11 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State

Status: `deferred-to-loop-a`

Original backlog task: `Task 90 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State`.
Unit: `dragons_breath`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 90 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `dragons_breath`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `dragons_breath` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 12 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `deferred-to-loop-a`

Original backlog task: `Task 91 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action`.
Unit: `dragons_breath`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 91 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action`.

Local dependency: `L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `dragons_breath`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `dragons_breath` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 13 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `deferred-to-loop-a`

Original backlog task: `Task 92 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices`.
Unit: `enhance_ability`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 92 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enhance_ability`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `enhance_ability` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 14 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `deferred-to-loop-a`

Original backlog task: `Task 93 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support`.
Unit: `enlarge_reduce`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 93 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enlarge_reduce`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `enlarge_reduce` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 15 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch

Status: `deferred-to-loop-a`

Original backlog task: `Task 94 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch`.
Unit: `enlarge_reduce`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 94 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch`.

Local dependency: `L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enlarge_reduce`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `enlarge_reduce` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 16 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `deferred-to-loop-a`

Original backlog task: `Task 95 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support`.
Unit: `enthrall`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 95 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enthrall`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `enthrall` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 17 - L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support

Status: `deferred-to-loop-a`

Origin: Task 2 follow-up split from `L12G-MISSING-LEVITATE`.
Unit: `levitate`.

Inputs:

- `packages/surface/content/levitate.dhall` and `packages/surface/content/levitate.json`;
- the `levitate` Unit claim and generated coverage rows;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- promoted `@dnd/battle-runtime` spell invocation/effect lifecycle owners and package-local Quint spec;
- focused tests for spell casting, Concentration cleanup, vertical movement witnesses, and active effect projection.

Outputs:

- promote Levitate's creature branch: Magic Action and level-2+ Spell Slot spend, one visible creature target within 60 feet, caster-owned Concentration up to 10 minutes, unwilling-creature Constitution save gate, active levitated-target state with initial rise up to 20 feet, suspended/aloft projection, target movement only through caller-supplied fixed-object or surface-within-reach witnesses as if climbing, caster Magic Action altitude changes up to 20 feet while the target remains within range, self-target altitude changes as part of the target's move, and gentle-grounding cleanup when Concentration or duration ends;
- update the relevant promoted Quint model before runtime behavior when behavior changes;
- leave loose-object target behavior and automatic elevation/pathfinding derivation outside this task;
- regenerate coverage artifacts.

Acceptance:

- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for the creature branch;
- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 18 - L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch

Status: `deferred-to-loop-a`

Origin: Task 2 follow-up split from `L12G-MISSING-LEVITATE`.
Unit: `levitate`.

Inputs:

- `packages/surface/content/levitate.dhall` and `packages/surface/content/levitate.json`;
- the `levitate` Unit claim and generated coverage rows;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing object target, object lifecycle, spell invocation/effect lifecycle, and table/spatial witness owners;
- focused tests for whichever Surface/runtime boundary is chosen.

Outputs:

- represent and promote or close Levitate's loose-object branch: one visible loose object target within 60 feet weighing up to 500 pounds, no creature saving throw, spell-owned suspension and altitude changes, fixed-object or surface movement restrictions where relevant, range-gated caster movement, and gentle grounding when the spell ends without inventing spell-specific object position state;
- reuse any future object lifecycle owner rather than duplicating object state inside Levitate;
- update the Unit claim and generated coverage artifacts with either supported evidence or an accepted runtime-boundary closure.

Acceptance:

- focused Surface/runtime owner decision with tests or accepted runtime-detached closure for loose-object suspension, altitude control, range, and gentle-grounding facts;
- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.
