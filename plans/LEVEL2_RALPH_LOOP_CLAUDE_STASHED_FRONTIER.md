# Level 2 Ralph Claude Lane - Stashed Tail Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 35,
      "id": "L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Moonbeam Surface Area Lifecycle"
    },
    {
      "number": 36,
      "id": "L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME",
      "status": "blocked",
      "title": "Moonbeam Movable Zone Runtime"
    },
    {
      "number": 37,
      "id": "L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER",
      "status": "deferred-external",
      "title": "Moonbeam Shape-Shifting Rider Runtime"
    },
    {
      "number": 38,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST",
      "status": "ready-for-research",
      "title": "Prayer Of Healing Surface Rest Shape"
    },
    {
      "number": 39,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST",
      "status": "blocked",
      "title": "Prayer Of Healing Character Sheet Rest Runtime"
    },
    {
      "number": 40,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Ray Of Enfeeblement D20 Lifecycle Runtime"
    },
    {
      "number": 41,
      "id": "L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY",
      "status": "blocked",
      "title": "Ray Of Enfeeblement Damage Roll Penalty Runtime"
    },
    {
      "number": 42,
      "id": "L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT",
      "status": "ready-for-research",
      "title": "See Invisibility Observer Sight Runtime Support"
    },
    {
      "number": 43,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME",
      "status": "ready-for-research",
      "title": "Spike Growth Movement Hazard Runtime"
    },
    {
      "number": 44,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION",
      "status": "ready-for-research",
      "title": "Spike Growth Hazard Recognition Boundary"
    },
    {
      "number": 45,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE",
      "status": "ready-for-research",
      "title": "Spiritual Weapon Proxy Surface Shape"
    },
    {
      "number": 46,
      "id": "L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME",
      "status": "blocked",
      "title": "Spiritual Weapon Persistent Attack Runtime"
    },
    {
      "number": 47,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-RETAINED-STATISTICS",
      "status": "deferred-external",
      "title": "Druid Wild Shape Retained Statistics And Active Form Persistence"
    },
    {
      "number": 48,
      "id": "L12G-MISSING-SILENCE",
      "status": "ready-for-research",
      "title": "Silence Definition And Support Or Closure"
    },
    {
      "number": 49,
      "id": "L12G-MISSING-SUGGESTION",
      "status": "ready-for-research",
      "title": "Suggestion Definition And Closure"
    },
    {
      "number": 50,
      "id": "L12G-MISSING-ZONE-OF-TRUTH",
      "status": "ready-for-research",
      "title": "Zone Of Truth Definition And Closure"
    },
    {
      "number": 51,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST",
      "status": "ready-for-research",
      "title": "Dragon's Breath Initial Cast And Effect State"
    },
    {
      "number": 52,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION",
      "status": "blocked",
      "title": "Dragon's Breath Granted Magic Action"
    },
    {
      "number": 53,
      "id": "L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES",
      "status": "ready-for-research",
      "title": "Enhance Ability Upcast Per-Target Ability Choices"
    },
    {
      "number": 54,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME",
      "status": "ready-for-research",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 55,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH",
      "status": "blocked",
      "title": "Enlarge Reduce Object Branch"
    },
    {
      "number": 56,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "ready-for-research",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 57,
      "id": "L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME",
      "status": "deferred-external",
      "title": "Levitate Creature Runtime Support"
    },
    {
      "number": 58,
      "id": "L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH",
      "status": "deferred-external",
      "title": "Levitate Loose Object Branch"
    }
  ]
}
-->

Claude lane owns the tail work split out of Loop A: Moonbeam, Prayer of Healing, Ray of Enfeeblement, See Invisibility, Spike Growth, Spiritual Weapon, missing level-2 definitions from Silence through Zone of Truth, Dragon's Breath, Enhance Ability, Enlarge/Reduce, Enthrall, and deferred external Levitate/Wild Shape tail rows.

This is an active Ralph execution plan split from `plans/LEVEL2_RALPH_LOOP_A_STASHED_FRONTIER.md`. Loop A must not implement these tasks after this split. This lane uses the Claude Code implementer through `scripts/ralph-run.sh --implementation-runner claude`; reviewer, chooser, and decider still use Codex.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

For each task, first read the original backlog section referenced in the task body, then read the matching row in `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`, `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`, local RAW, and `UBIQUITOUS_LANGUAGE.md`. This plan intentionally does not duplicate all pre-researched details from the backlog.

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

- Base branch: `ralph/level2-loop-claude/stashed-frontier`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-claude`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not implement Loop A tasks 1-34, including the active Lesser Restoration task.
- Do not implement active Loop C Wild Shape work; Task 47 remains deferred-external until that dependency lands and is deliberately not runnable now.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 35 | L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle | ready-for-research | completed baseline | Moved from Loop C task 12. |
| 36 | L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime | blocked | L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE | Moved from Loop C task 13. |
| 37 | L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime | deferred-external | L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME, L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME | Moved from Loop C task 14. External dependency left in Loop C: L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME. |
| 38 | L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape | ready-for-research | completed baseline | Moved from Loop C task 15. |
| 39 | L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime | blocked | L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST | Moved from Loop C task 16. |
| 40 | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime | ready-for-research | completed baseline | Moved from Loop C task 17. |
| 41 | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime | blocked | L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE | Moved from Loop C task 18. |
| 42 | L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support | ready-for-research | completed baseline | Moved from Loop C task 19. |
| 43 | L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime | ready-for-research | completed baseline | Moved from Loop C task 20. |
| 44 | L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary | ready-for-research | completed baseline | Moved from Loop C task 21. |
| 45 | L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape | ready-for-research | completed baseline | Moved from Loop C task 22. |
| 46 | L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime | blocked | L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE | Moved from Loop C task 23. |
| 47 | L12G-FOLLOWUP-DRUID-WILD-SHAPE-RETAINED-STATISTICS - Druid Wild Shape Retained Statistics And Active Form Persistence | deferred-external | L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME | Moved from Loop C task 24. External dependency left in Loop C: L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME. |
| 48 | L12G-MISSING-SILENCE - Silence Definition And Support Or Closure | ready-for-research | completed baseline | Moved from Loop D task 8. |
| 49 | L12G-MISSING-SUGGESTION - Suggestion Definition And Closure | ready-for-research | completed baseline | Moved from Loop D task 9. |
| 50 | L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure | ready-for-research | completed baseline | Moved from Loop D task 10. |
| 51 | L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State | ready-for-research | completed baseline | Moved from Loop D task 11. |
| 52 | L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action | blocked | L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST | Moved from Loop D task 12. |
| 53 | L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices | ready-for-research | completed baseline | Moved from Loop D task 13. |
| 54 | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support | ready-for-research | completed baseline | Moved from Loop D task 14. |
| 55 | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch | blocked | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME | Moved from Loop D task 15. |
| 56 | L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support | ready-for-research | completed baseline | Moved from Loop D task 16. |
| 57 | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support | deferred-external | L12G-MISSING-LEVITATE | Moved from Loop D task 17. External dependency left in Loop D: L12G-MISSING-LEVITATE. |
| 58 | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch | deferred-external | L12G-MISSING-LEVITATE | Moved from Loop D task 18. External dependency left in Loop D: L12G-MISSING-LEVITATE. |

## Task Details

### Task 35 - L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle

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

Moved into Loop A from Loop C task 12 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 36 - L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime

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

Moved into Loop A from Loop C task 13 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 37 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime

Status: `deferred-external`

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

Moved into Loop A from Loop C task 14 during shrink-to-A orchestration. Do not re-open this task in Loop C.

External dependency: `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` remains owned by Loop C's current task. Keep this task non-runnable until that dependency has landed in master and master has been merged into this Loop A staging branch.

### Task 38 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape

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

Moved into Loop A from Loop C task 15 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 39 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime

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

Moved into Loop A from Loop C task 16 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 40 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime

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

Moved into Loop A from Loop C task 17 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 41 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime

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

Moved into Loop A from Loop C task 18 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 42 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support

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

Moved into Loop A from Loop C task 19 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 43 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime

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

Moved into Loop A from Loop C task 20 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 44 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary

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

Moved into Loop A from Loop C task 21 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 45 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape

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

Moved into Loop A from Loop C task 22 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 46 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime

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

Moved into Loop A from Loop C task 23 during shrink-to-A orchestration. Do not re-open this task in Loop C.

### Task 47 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-RETAINED-STATISTICS - Druid Wild Shape Retained Statistics And Active Form Persistence

Status: `deferred-external`

Unit: `druid_wild_shape`.
Source section: split from `Task 2 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime And Promoted Parity`.

Local dependency: `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` must be `done` before this task starts.

Inputs:

- `.references/srd-5.2.1/Classes/Druid.md` Wild Shape;
- `UBIQUITOUS_LANGUAGE.md`;
- `packages/surface/content/druid_wild_shape.json`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- the active Wild Shape form state, true-form Character Sheet facts, chosen Beast Stat Block facts, Unit claims, owner evidence, and focused tests produced by Task 2.

Outputs:

- supported runtime profile and focused tests for the full SRD game-statistic replacement and retention matrix beyond Task 2's battle execution slice;
- generic Strength, Dexterity, Constitution, Skill, Saving Throw, sense, language, speech, anatomy, active-form duration across non-battle time, and other Beast Stat Block versus retained Character Sheet projections derive from the true-form Character Sheet and chosen Beast Stat Block without duplicated true-form or Stat Block facts;
- active-form persistence and handoff behavior is either implemented by the shared transformation owner or precisely blocked by a typed boundary;
- regenerated coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- retained and replaced Wild Shape statistics trace to SRD Wild Shape without homebrew extensions, and invalid true-form/Beast-form combinations are unrepresentable at the relevant boundary;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

Moved into Loop A from Loop C task 24 during shrink-to-A orchestration. Do not re-open this task in Loop C.

External dependency: `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` remains owned by Loop C's current task. Keep this task non-runnable until that dependency has landed in master and master has been merged into this Loop A staging branch.

### Task 48 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 8 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 49 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 9 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 50 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 10 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 51 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 11 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 52 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `blocked`

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

Moved into Loop A from Loop D task 12 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 53 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 13 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 54 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 14 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 55 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch

Status: `blocked`

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

Moved into Loop A from Loop D task 15 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 56 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `ready-for-research`

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

Moved into Loop A from Loop D task 16 during shrink-to-A orchestration. Do not re-open this task in Loop D.

### Task 57 - L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support

Status: `deferred-external`

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

Moved into Loop A from Loop D task 17 during shrink-to-A orchestration. Do not re-open this task in Loop D.

External dependency: `L12G-MISSING-LEVITATE` remains owned by Loop D's already-completed Task 2. Keep this task non-runnable until Loop D has landed in master and master has been merged into this Loop A staging branch.

### Task 58 - L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch

Status: `deferred-external`

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

Moved into Loop A from Loop D task 18 during shrink-to-A orchestration. Do not re-open this task in Loop D.

External dependency: `L12G-MISSING-LEVITATE` remains owned by Loop D's already-completed Task 2. Keep this task non-runnable until Loop D has landed in master and master has been merged into this Loop A staging branch.
