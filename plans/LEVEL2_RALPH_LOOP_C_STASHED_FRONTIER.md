# Level 2 Ralph Loop C - Stashed Class And Mid Spell Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Druid Wild Shape Character Facts And Resource Projection"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME",
      "status": "blocked",
      "title": "Druid Wild Shape Shape-Shifting Runtime"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Monk's Focus Character Facts And Resource Projection"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS",
      "status": "blocked",
      "title": "Monk's Focus Battle Option Execution"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS",
      "status": "blocked",
      "title": "Monk Uncanny Metabolism Character Facts And Use State"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME",
      "status": "blocked",
      "title": "Monk Uncanny Metabolism Initiative Recovery Runtime"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Sorcery Point Resource Facts"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Spell Slot To Sorcery Points"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Sorcery Points To Spell Slot"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Character Facts And Option Projection"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION",
      "status": "blocked",
      "title": "Sorcerer Metamagic Cast-Time Option Execution"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Moonbeam Surface Area Lifecycle"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME",
      "status": "blocked",
      "title": "Moonbeam Movable Zone Runtime"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER",
      "status": "blocked",
      "title": "Moonbeam Shape-Shifting Rider Runtime"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST",
      "status": "ready-for-research",
      "title": "Prayer Of Healing Surface Rest Shape"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST",
      "status": "blocked",
      "title": "Prayer Of Healing Character Sheet Rest Runtime"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Ray Of Enfeeblement D20 Lifecycle Runtime"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY",
      "status": "blocked",
      "title": "Ray Of Enfeeblement Damage Roll Penalty Runtime"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT",
      "status": "ready-for-research",
      "title": "See Invisibility Observer Sight Runtime Support"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME",
      "status": "ready-for-research",
      "title": "Spike Growth Movement Hazard Runtime"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION",
      "status": "ready-for-research",
      "title": "Spike Growth Hazard Recognition Boundary"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE",
      "status": "ready-for-research",
      "title": "Spiritual Weapon Proxy Surface Shape"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME",
      "status": "blocked",
      "title": "Spiritual Weapon Persistent Attack Runtime"
    }
  ]
}
-->

Lane C owns class-feature followups plus Moonbeam, Prayer of Healing, Ray of Enfeeblement, See Invisibility, Spike Growth, and Spiritual Weapon followups. It does not touch Warding Bond or the A/D spell groups.

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

- Base branch: `ralph/level2-loop-c/stashed-frontier`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-c`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not start Warding Bond or any task currently active in Loop B.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS - Druid Wild Shape Character Facts And Resource Projection | ready-for-research | completed baseline | Original backlog task 77; Unit `druid_wild_shape`. |
| 2 | L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime | blocked | L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS | Original backlog task 78; Unit `druid_wild_shape`. |
| 3 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection | ready-for-research | completed baseline | Original backlog task 79; Unit `monk_monks_focus`. |
| 4 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution | blocked | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | Original backlog task 80; Unit `monk_monks_focus`. |
| 5 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State | blocked | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | Original backlog task 81; Unit `monk_uncanny_metabolism`. |
| 6 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime | blocked | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS | Original backlog task 82; Unit `monk_uncanny_metabolism`. |
| 7 | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts | ready-for-research | completed baseline | Original backlog task 83; Unit `sorcerer_font_of_magic`. |
| 8 | L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | Original backlog task 84; Unit `sorcerer_font_of_magic`. |
| 9 | L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | Original backlog task 85; Unit `sorcerer_font_of_magic`. |
| 10 | L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | Original backlog task 86; Unit `sorcerer_metamagic`. |
| 11 | L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS | Original backlog task 87; Unit `sorcerer_metamagic`. |
| 12 | L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle | ready-for-research | completed baseline | Original backlog task 90; Unit `moonbeam`. |
| 13 | L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime | blocked | L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE | Original backlog task 91; Unit `moonbeam`. |
| 14 | L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime | blocked | L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME, L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME | Original backlog task 92; Unit `moonbeam`. |
| 15 | L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape | ready-for-research | completed baseline | Original backlog task 93; Unit `prayer_of_healing`. |
| 16 | L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime | blocked | L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST | Original backlog task 94; Unit `prayer_of_healing`. |
| 17 | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime | ready-for-research | completed baseline | Original backlog task 95; Unit `ray_of_enfeeblement`. |
| 18 | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime | blocked | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE | Original backlog task 96; Unit `ray_of_enfeeblement`. |
| 19 | L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support | ready-for-research | completed baseline | Original backlog task 90; Unit `see_invisibility`. |
| 20 | L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime | ready-for-research | completed baseline | Original backlog task 91; Unit `spike_growth`. |
| 21 | L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary | ready-for-research | completed baseline | Original backlog task 92; Unit `spike_growth`. |
| 22 | L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape | ready-for-research | completed baseline | Original backlog task 93; Unit `spiritual_weapon`. |
| 23 | L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime | blocked | L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE | Original backlog task 94; Unit `spiritual_weapon`. |

## Task Details

### Task 1 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS - Druid Wild Shape Character Facts And Resource Projection

Status: `ready-for-research`

Original backlog task: `Task 77 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS - Druid Wild Shape Character Facts And Resource Projection`.
Unit: `druid_wild_shape`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 77 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS - Druid Wild Shape Character Facts And Resource Projection`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `druid_wild_shape`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `druid_wild_shape` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 2 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime

Status: `blocked`

Original backlog task: `Task 78 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime`.
Unit: `druid_wild_shape`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 78 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime`.

Local dependency: `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `druid_wild_shape`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `druid_wild_shape` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 3 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection

Status: `ready-for-research`

Original backlog task: `Task 79 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection`.
Unit: `monk_monks_focus`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 79 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `monk_monks_focus` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 4 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution

Status: `blocked`

Original backlog task: `Task 80 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution`.
Unit: `monk_monks_focus`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 80 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution`.

Local dependency: `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `monk_monks_focus` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 5 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State

Status: `blocked`

Original backlog task: `Task 81 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State`.
Unit: `monk_uncanny_metabolism`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 81 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State`.

Local dependency: `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_uncanny_metabolism`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `monk_uncanny_metabolism` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 6 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime

Status: `blocked`

Original backlog task: `Task 82 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime`.
Unit: `monk_uncanny_metabolism`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 82 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime`.

Local dependency: `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS`, `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_uncanny_metabolism`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `monk_uncanny_metabolism` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 7 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts

Status: `ready-for-research`

Original backlog task: `Task 83 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts`.
Unit: `sorcerer_font_of_magic`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 83 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 8 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points

Status: `blocked`

Original backlog task: `Task 84 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points`.
Unit: `sorcerer_font_of_magic`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 84 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points`.

Local dependency: `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 9 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot

Status: `blocked`

Original backlog task: `Task 85 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot`.
Unit: `sorcerer_font_of_magic`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 85 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot`.

Local dependency: `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 10 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection

Status: `blocked`

Original backlog task: `Task 86 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection`.
Unit: `sorcerer_metamagic`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 86 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection`.

Local dependency: `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `sorcerer_metamagic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 11 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution

Status: `blocked`

Original backlog task: `Task 87 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution`.
Unit: `sorcerer_metamagic`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 87 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution`.

Local dependency: `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`, `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `sorcerer_metamagic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 12 - L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle

Status: `ready-for-research`

Original backlog task: `Task 90 - L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle`.
Unit: `moonbeam`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 90 - L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `moonbeam`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `moonbeam` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 13 - L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime

Status: `blocked`

Original backlog task: `Task 91 - L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime`.
Unit: `moonbeam`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 91 - L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime`.

Local dependency: `L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `moonbeam`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `moonbeam` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 14 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime

Status: `blocked`

Original backlog task: `Task 92 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime`.
Unit: `moonbeam`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 92 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime`.

Local dependency: `L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME`, `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `moonbeam`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `moonbeam` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 15 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape

Status: `ready-for-research`

Original backlog task: `Task 93 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape`.
Unit: `prayer_of_healing`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 93 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `prayer_of_healing`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `prayer_of_healing` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 16 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime

Status: `blocked`

Original backlog task: `Task 94 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime`.
Unit: `prayer_of_healing`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 94 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime`.

Local dependency: `L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `prayer_of_healing`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `prayer_of_healing` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 17 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime

Status: `ready-for-research`

Original backlog task: `Task 95 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime`.
Unit: `ray_of_enfeeblement`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 95 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `ray_of_enfeeblement`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `ray_of_enfeeblement` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 18 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime

Status: `blocked`

Original backlog task: `Task 96 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime`.
Unit: `ray_of_enfeeblement`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 96 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime`.

Local dependency: `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `ray_of_enfeeblement`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `ray_of_enfeeblement` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 19 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support

Status: `ready-for-research`

Original backlog task: `Task 90 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support`.
Unit: `see_invisibility`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 90 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `see_invisibility`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `see_invisibility` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 20 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime

Status: `ready-for-research`

Original backlog task: `Task 91 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime`.
Unit: `spike_growth`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 91 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spike_growth`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `spike_growth` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 21 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary

Status: `ready-for-research`

Original backlog task: `Task 92 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary`.
Unit: `spike_growth`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 92 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spike_growth`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `spike_growth` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 22 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape

Status: `ready-for-research`

Original backlog task: `Task 93 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape`.
Unit: `spiritual_weapon`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 93 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spiritual_weapon`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `spiritual_weapon` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 23 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime

Status: `blocked`

Original backlog task: `Task 94 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime`.
Unit: `spiritual_weapon`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 94 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime`.

Local dependency: `L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spiritual_weapon`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `spiritual_weapon` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.
