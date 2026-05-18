# Level 2 Ralph Loop A - Stashed Spell And Surface Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-SPELL-HEAT-METAL",
      "status": "done",
      "title": "Heat Metal Runtime Support"
    },
    {
      "number": 2,
      "id": "L12G-SPELL-HOLD-PERSON",
      "status": "ready-for-research",
      "title": "Hold Person Runtime Support"
    },
    {
      "number": 3,
      "id": "L12G-SPELL-INVISIBILITY",
      "status": "ready-for-research",
      "title": "Invisibility Runtime Support"
    },
    {
      "number": 4,
      "id": "L12G-SPELL-LESSER-RESTORATION",
      "status": "ready-for-research",
      "title": "Lesser Restoration Runtime Support"
    },
    {
      "number": 5,
      "id": "L12G-SPELL-MAGIC-WEAPON",
      "status": "ready-for-research",
      "title": "Magic Weapon Runtime Support Or Closure"
    },
    {
      "number": 6,
      "id": "L12G-SPELL-MIND-SPIKE",
      "status": "ready-for-research",
      "title": "Mind Spike Runtime Support And Knowledge Closure"
    },
    {
      "number": 7,
      "id": "L12G-SPELL-WEB",
      "status": "ready-for-research",
      "title": "Web Runtime Support Or Closure"
    },
    {
      "number": 8,
      "id": "L12G-MISSING-ANIMAL-MESSENGER",
      "status": "ready-for-research",
      "title": "Animal Messenger Definition And Closure"
    },
    {
      "number": 9,
      "id": "L12G-MISSING-ARCANISTS-MAGIC-AURA",
      "status": "ready-for-research",
      "title": "Arcanists Magic Aura Definition And Closure"
    },
    {
      "number": 10,
      "id": "L12G-MISSING-AUGURY",
      "status": "ready-for-research",
      "title": "Augury Definition And Closure"
    },
    {
      "number": 11,
      "id": "L12G-MISSING-CALM-EMOTIONS",
      "status": "ready-for-research",
      "title": "Calm Emotions Definition And Support"
    },
    {
      "number": 12,
      "id": "L12G-MISSING-DARKNESS",
      "status": "ready-for-research",
      "title": "Darkness Definition And Support Or Closure"
    },
    {
      "number": 13,
      "id": "L12G-MISSING-DARKVISION",
      "status": "ready-for-research",
      "title": "Darkvision Definition And Support Or Closure"
    },
    {
      "number": 14,
      "id": "L12G-MISSING-DETECT-THOUGHTS",
      "status": "ready-for-research",
      "title": "Detect Thoughts Definition And Closure"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "ready-for-research",
      "title": "Acid Arrow Surface Damage Shape"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Acid Arrow Delayed Runtime Support"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE",
      "status": "ready-for-research",
      "title": "Alter Self Surface Option Shape"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Aquatic Adaptation Runtime"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Natural Weapons Runtime"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL",
      "status": "ready-for-research",
      "title": "Continual Flame Dispel And Suppression Removal"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Flame Blade Surface Lifecycle Shape"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Flame Blade Runtime Support"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE",
      "status": "ready-for-research",
      "title": "Heat Metal Surface Contact Escape Shape"
    },
    {
      "number": 24,
      "id": "L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME",
      "status": "blocked",
      "title": "Heat Metal Contact Damage Runtime"
    },
    {
      "number": 25,
      "id": "L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY",
      "status": "blocked",
      "title": "Heat Metal Holding Wearing Penalty Runtime"
    }
  ]
}
-->

Lane A owns early remaining authored spell/runtime closures plus Acid Arrow, Alter Self, Continual Flame, and Flame Blade followups. It does not touch Warding Bond, class-feature followups, Moonbeam, Prayer of Healing, Ray of Enfeeblement, Dragon's Breath, Enlarge/Reduce, or active B work.

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

- Base branch: `ralph/level2-loop-a/stashed-frontier`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-a`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not start Warding Bond or any task currently active in Loop B.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support | done | completed baseline | Original backlog task 31; Unit `heat_metal`. |
| 2 | L12G-SPELL-HOLD-PERSON - Hold Person Runtime Support | ready-for-research | completed baseline | Original backlog task 32; Unit `hold_person`. |
| 3 | L12G-SPELL-INVISIBILITY - Invisibility Runtime Support | ready-for-research | completed baseline | Original backlog task 33; Unit `invisibility`. |
| 4 | L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support | ready-for-research | completed baseline | Original backlog task 34; Unit `lesser_restoration`. |
| 5 | L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure | ready-for-research | completed baseline | Original backlog task 35; Unit `magic_weapon`. |
| 6 | L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure | ready-for-research | completed baseline | Original backlog task 36; Unit `mind_spike`. |
| 7 | L12G-SPELL-WEB - Web Runtime Support Or Closure | ready-for-research | completed baseline | Original backlog task 51; Unit `web`. |
| 8 | L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure | ready-for-research | completed baseline | Original backlog task 52; Unit `animal_messenger`. |
| 9 | L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure | ready-for-research | completed baseline | Original backlog task 53; Unit `arcanists_magic_aura`. |
| 10 | L12G-MISSING-AUGURY - Augury Definition And Closure | ready-for-research | completed baseline | Original backlog task 54; Unit `augury`. |
| 11 | L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support | ready-for-research | completed baseline | Original backlog task 55; Unit `calm_emotions`. |
| 12 | L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure | ready-for-research | completed baseline | Original backlog task 56; Unit `darkness`. |
| 13 | L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure | ready-for-research | completed baseline | Original backlog task 57; Unit `darkvision`. |
| 14 | L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure | ready-for-research | completed baseline | Original backlog task 58; Unit `detect_thoughts`. |
| 15 | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape | ready-for-research | completed baseline | Original backlog task 88; Unit `acid_arrow`. |
| 16 | L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support | blocked | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE | Original backlog task 89; Unit `acid_arrow`. |
| 17 | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape | ready-for-research | completed baseline | Original backlog task 90; Unit `alter_self`. |
| 18 | L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime | blocked | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE | Original backlog task 91; Unit `alter_self`. |
| 19 | L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime | blocked | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME | Original backlog task 92; Unit `alter_self`. |
| 20 | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal | ready-for-research | completed baseline | Original backlog task 93; Unit `continual_flame`. |
| 21 | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape | ready-for-research | completed baseline | Original backlog task 94; Unit `flame_blade`. |
| 22 | L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support | blocked | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE | Original backlog task 95; Unit `flame_blade`. |
| 23 | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape | ready-for-research | completed baseline | Follow-up split from Task 1; Unit `heat_metal`. |
| 24 | L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime | blocked | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE | Follow-up split from Task 1; Unit `heat_metal`. |
| 25 | L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime | blocked | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME | Follow-up split from Task 1; Unit `heat_metal`. |

## Task Details

### Task 1 - L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support

Status: `done`

Original backlog task: `Task 31 - L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support`.
Unit: `heat_metal`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 31 - L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `heat_metal` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 2 - L12G-SPELL-HOLD-PERSON - Hold Person Runtime Support

Status: `ready-for-research`

Original backlog task: `Task 32 - L12G-SPELL-HOLD-PERSON - Hold Person Runtime Support`.
Unit: `hold_person`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 32 - L12G-SPELL-HOLD-PERSON - Hold Person Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `hold_person`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `hold_person` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 3 - L12G-SPELL-INVISIBILITY - Invisibility Runtime Support

Status: `ready-for-research`

Original backlog task: `Task 33 - L12G-SPELL-INVISIBILITY - Invisibility Runtime Support`.
Unit: `invisibility`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 33 - L12G-SPELL-INVISIBILITY - Invisibility Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `invisibility`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `invisibility` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 4 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support

Status: `ready-for-research`

Original backlog task: `Task 34 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support`.
Unit: `lesser_restoration`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 34 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `lesser_restoration`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `lesser_restoration` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 5 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure

Status: `ready-for-research`

Original backlog task: `Task 35 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure`.
Unit: `magic_weapon`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 35 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_weapon`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `magic_weapon` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 6 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure

Status: `ready-for-research`

Original backlog task: `Task 36 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure`.
Unit: `mind_spike`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 36 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mind_spike`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `mind_spike` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 7 - L12G-SPELL-WEB - Web Runtime Support Or Closure

Status: `ready-for-research`

Original backlog task: `Task 51 - L12G-SPELL-WEB - Web Runtime Support Or Closure`.
Unit: `web`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 51 - L12G-SPELL-WEB - Web Runtime Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `web`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `web` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 8 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure

Status: `ready-for-research`

Original backlog task: `Task 52 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure`.
Unit: `animal_messenger`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 52 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `animal_messenger`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `animal_messenger` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 9 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure

Status: `ready-for-research`

Original backlog task: `Task 53 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure`.
Unit: `arcanists_magic_aura`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 53 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `arcanists_magic_aura`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `arcanists_magic_aura` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 10 - L12G-MISSING-AUGURY - Augury Definition And Closure

Status: `ready-for-research`

Original backlog task: `Task 54 - L12G-MISSING-AUGURY - Augury Definition And Closure`.
Unit: `augury`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 54 - L12G-MISSING-AUGURY - Augury Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `augury`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `augury` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 11 - L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support

Status: `ready-for-research`

Original backlog task: `Task 55 - L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support`.
Unit: `calm_emotions`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 55 - L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `calm_emotions`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `calm_emotions` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 12 - L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure

Status: `ready-for-research`

Original backlog task: `Task 56 - L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure`.
Unit: `darkness`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 56 - L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkness`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `darkness` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 13 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure

Status: `ready-for-research`

Original backlog task: `Task 57 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure`.
Unit: `darkvision`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 57 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkvision`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `darkvision` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 14 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure

Status: `ready-for-research`

Original backlog task: `Task 58 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure`.
Unit: `detect_thoughts`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 58 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `detect_thoughts`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `detect_thoughts` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 15 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `ready-for-research`

Original backlog task: `Task 88 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape`.
Unit: `acid_arrow`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 88 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `acid_arrow` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 16 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `blocked`

Original backlog task: `Task 89 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support`.
Unit: `acid_arrow`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 89 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support`.

Local dependency: `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `acid_arrow` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 17 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape

Status: `ready-for-research`

Original backlog task: `Task 90 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape`.
Unit: `alter_self`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 90 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 18 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime

Status: `blocked`

Original backlog task: `Task 91 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime`.
Unit: `alter_self`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 91 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime`.

Local dependency: `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 19 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime

Status: `blocked`

Original backlog task: `Task 92 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime`.
Unit: `alter_self`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 92 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime`.

Local dependency: `L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`, `L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 20 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `ready-for-research`

Original backlog task: `Task 93 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal`.
Unit: `continual_flame`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 93 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `continual_flame`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `continual_flame` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 21 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape

Status: `ready-for-research`

Original backlog task: `Task 94 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape`.
Unit: `flame_blade`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 94 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape`.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flame_blade`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `flame_blade` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 22 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support

Status: `blocked`

Original backlog task: `Task 95 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support`.
Unit: `flame_blade`.
Source section: `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`, heading `Task 95 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support`.

Local dependency: `L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE` must be `done` before this task starts.

Inputs:

- the original backlog section named above;
- the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when one exists;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flame_blade`.

Outputs:

- satisfy the exact output contract from the original backlog section;
- leave `flame_blade` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Warding Bond task, active B-lane task, companion-control behavior, or sibling-lane task is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- package typechecks are run for touched packages when dependencies are available;
- MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 23 - L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape

Status: `ready-for-research`

Follow-up split from Task 1 (`L12G-SPELL-HEAT-METAL`).
Unit: `heat_metal`.
Source: Heat Metal Unit claim follow-up `L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE`.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Heat Metal Surface content in `packages/surface/content/heat_metal.dhall` and `packages/surface/content/heat_metal.json`;
- Surface schema, tracer, and content tests touched by ongoing-effect Spell Definition shapes.

Outputs:

- replace Heat Metal's lossy ongoing-effect encoding with a lossless SRD Surface shape for manufactured metal object targeting;
- represent object-contact creature recipients, immediate cast damage plus the same holding/wearing Constitution Saving Throw, later-turn Bonus Action repeat damage gated by object range, and conditional drop-if-possible or Disadvantage fallback until the caster's next turn;
- do not encode drop and Disadvantage as an unconditional composite, and do not omit the cast-time save;
- update generated coverage artifacts after the Surface shape changes.

Acceptance:

- Heat Metal Dhall/JSON content, with schema and tracer support where required, represents object-contact propagation and drop-or-fallback semantics as executable source facts rather than comments or prose-only description;
- RAW and ubiquitous-language checks are performed before modeling;
- focused Surface tests, package typecheck for touched packages when dependencies are available, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- MBT is not run unless promoted battle-runtime behavior changes.

### Task 24 - L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime

Status: `blocked`

Follow-up split from Task 1 (`L12G-SPELL-HEAT-METAL`).
Unit: `heat_metal`.
Source: Heat Metal Unit claim follow-up `L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME`.

Local dependency: `L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE` must be `done` before this task starts.

Inputs:

- the completed Heat Metal Surface contact/drop shape;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing battle-runtime spell invocation/effect lifecycle, damage, Concentration, and Spell Slot support.

Outputs:

- promote the Heat Metal damage lifecycle: Magic Action and level-2+ Spell Slot spend, caster-owned Concentration up to 1 minute, caller-supplied manufactured-metal object identity and contact-creature witnesses, immediate 2d8 Fire damage with slot scaling, later-turn Bonus Action repeat damage on caster turns when caller supplies object-within-range and contact witnesses, damage disposition and Concentration-save integration, and cleanup when Concentration or duration ends;
- leave the holding/wearing penalty to `L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY` if it remains separate;
- update Unit claim/evidence and generated coverage artifacts.

Acceptance:

- Heat Metal has a `profile-subset-supported` Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for the object-contact damage lifecycle;
- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests, package typecheck for touched packages when dependencies are available, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- battle-runtime MBT is used only under the repository scarcity protocol if focused tests cannot cover the promoted boundary.

### Task 25 - L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime

Status: `blocked`

Follow-up split from Task 1 (`L12G-SPELL-HEAT-METAL`).
Unit: `heat_metal`.
Source: Heat Metal Unit claim follow-up `L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY`.

Local dependency: `L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE` and `L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME` must be `done` before this task starts.

Inputs:

- the completed Heat Metal Surface contact/drop shape;
- the promoted Heat Metal contact damage lifecycle;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing battle-runtime object drop outcome boundaries and D20 roll-mode projection support.

Outputs:

- promote the holding/wearing penalty for creatures that take Heat Metal damage from the object: caller-supplied held-or-worn object facts, Constitution Saving Throw against caster Spell Save DC, drop-if-possible through the existing dropped-object outcome boundary without introducing inventory simulation, fallback Disadvantage on Attack Rolls and Ability Checks until the start of the caster's next turn when the object is not dropped, and cleanup/replacement behavior tied to the same Heat Metal spell occurrence;
- update the Heat Metal Unit claim/evidence and generated coverage artifacts.

Acceptance:

- Heat Metal has a supported-profile or profile-subset-supported Unit claim update, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for the save, drop outcome, fallback roll-mode projection, caster-turn-start expiry, and Concentration cleanup;
- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests, package typecheck for touched packages when dependencies are available, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence complete;
- battle-runtime MBT is used only under the repository scarcity protocol if focused tests cannot cover the promoted boundary.
