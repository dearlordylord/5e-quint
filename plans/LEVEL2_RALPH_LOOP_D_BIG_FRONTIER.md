# Level 2 Ralph Loop D - Split Tail Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 59,
      "id": "L12G-MISSING-DRAGONS-BREATH",
      "status": "done",
      "title": "Dragons Breath Definition And Runtime Support"
    },
    {
      "number": 60,
      "id": "L12G-MISSING-ENHANCE-ABILITY",
      "status": "done",
      "title": "Enhance Ability Definition And Support"
    },
    {
      "number": 61,
      "id": "L12G-MISSING-ENLARGE-REDUCE",
      "status": "done",
      "title": "Enlarge Reduce Definition And Support"
    },
    {
      "number": 62,
      "id": "L12G-MISSING-ENTHRALL",
      "status": "done",
      "title": "Enthrall Definition And Closure"
    },
    {
      "number": 63,
      "id": "L12G-MISSING-FIND-TRAPS",
      "status": "done",
      "title": "Find Traps Definition And Closure"
    },
    {
      "number": 64,
      "id": "L12G-MISSING-FLAMING-SPHERE",
      "status": "done",
      "title": "Flaming Sphere Definition And Runtime Support"
    },
    {
      "number": 65,
      "id": "L12G-MISSING-GUST-OF-WIND",
      "status": "ready-for-research",
      "title": "Gust Of Wind Definition And Support Or Closure"
    }
  ]
}
-->

This is the fourth level-2 execution lane split from Loop B tail work. Loop D owns Tasks 59-75 plus follow-up Tasks 90-95 only.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> current master and sibling Ralph work. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

Before each task, read the matching RAW under `.references/srd-5.2.1/`,
`UBIQUITOUS_LANGUAGE.md`, the matching gate row in
`plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`, and the current coverage rows in
`plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`. Implement only SRD
5.2.1 behavior or an accepted runtime-detached closure.

## Review Loop

Every task must run the normal reviewer-loop convergence: RAW traceability,
ubiquitous-language/domain-language, architecture/connascence, and code-review
passes. Fix every reasonable note, explicitly reject only with a concrete
reason, and repeat until no reasonable findings remain.

## Task Output Contract

Every task must leave its Unit in one concrete end state:

- `supported-profile` with deterministic admission/projection evidence and
  focused owner tests;
- `profile-subset-supported` only when the executable subset is precise and
  every residual has an accepted closure kind;
- `unsupported-profile` with an accepted runtime-detached closure when the rule
  is outside product runtime;
- a smaller follow-up split only when RAW proves the listed task cannot fit in
  one coding session, with the original metric row left in a precise blocked
  state rather than generic todo wording.

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Do not run battle-runtime MBT unless the task changes promoted battle-runtime
behavior and focused tests cannot cover the changed boundary. If MBT is needed,
use the repository MBT scarcity protocol.

## Included Work

Loop D contains 23 atomic tasks: the missing-definition/runtime-or-closure tail from Dragons Breath through Zone of Truth, plus the Dragon's Breath initial-cast and granted-action follow-up split, the Enhance Ability upcast per-target ability follow-up, the Enlarge/Reduce creature-runtime and object-branch follow-up split, and the Enthrall Perception penalty runtime follow-up.

It excludes Loop A Tasks 22-36 and 88-89, Loop B Tasks 43-58, Loop C Tasks 37-42 and 76-87, all level-1 Loop D/L work, companion/familiar boundary work, and Counterspell work.

| Lane | Gate/source | Task | Unit |
| ---: | --- | --- | --- |
| 59 | 61 | `L12G-MISSING-DRAGONS-BREATH` | `dragons_breath` |
| 60 | 62 | `L12G-MISSING-ENHANCE-ABILITY` | `enhance_ability` |
| 61 | 63 | `L12G-MISSING-ENLARGE-REDUCE` | `enlarge_reduce` |
| 62 | 64 | `L12G-MISSING-ENTHRALL` | `enthrall` |
| 63 | 65 | `L12G-MISSING-FIND-TRAPS` | `find_traps` |
| 64 | 66 | `L12G-MISSING-FLAMING-SPHERE` | `flaming_sphere` |
| 65 | 67 | `L12G-MISSING-GUST-OF-WIND` | `gust_of_wind` |
| 66 | 68 | `L12G-MISSING-KNOCK` | `knock` |
| 67 | 69 | `L12G-MISSING-LEVITATE` | `levitate` |
| 68 | 70 | `L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS` | `locate_animals_or_plants` |
| 69 | 71 | `L12G-MISSING-LOCATE-OBJECT` | `locate_object` |
| 70 | 72 | `L12G-MISSING-MAGIC-MOUTH` | `magic_mouth` |
| 71 | 73 | `L12G-MISSING-MIRROR-IMAGE` | `mirror_image` |
| 72 | 74 | `L12G-MISSING-ROPE-TRICK` | `rope_trick` |
| 73 | 75 | `L12G-MISSING-SILENCE` | `silence` |
| 74 | 76 | `L12G-MISSING-SUGGESTION` | `suggestion` |
| 75 | 77 | `L12G-MISSING-ZONE-OF-TRUTH` | `zone_of_truth` |
| 90 | 61 follow-up | `L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST` | `dragons_breath` |
| 91 | 61 follow-up | `L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION` | `dragons_breath` |
| 92 | 62 follow-up | `L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES` | `enhance_ability` |
| 93 | 63 follow-up | `L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME` | `enlarge_reduce` |
| 94 | 63 follow-up | `L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH` | `enlarge_reduce` |
| 95 | 64 follow-up | `L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME` | `enthrall` |

## Follow-Up Dependencies

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| `L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST` | `L12G-MISSING-DRAGONS-BREATH` | Runtime support should consume the authored SRD Surface spell definition rather than duplicating Dragon's Breath spell facts in battle-runtime code. |
| `L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION` | `L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST` | Target-granted Magic action execution needs the initial cast to own Spell Slot spending, caster Concentration, target attachment, chosen damage type, caster spell save DC, and original slot level state. |
| `L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES` | `L12G-MISSING-ENHANCE-ABILITY` | Slot-scaled Enhance Ability casting needs the authored spell definition and one-target chosen-ability runtime subset before widening the target-list fill protocol to carry independent ability choices per target. |
| `L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME` | `L12G-MISSING-ENLARGE-REDUCE` | Creature-branch runtime support should consume the authored SRD Surface spell definition rather than duplicating Enlarge/Reduce spell facts in battle-runtime code. |
| `L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH` | `L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME` | Object and item size lifecycle work needs the creature branch's active-effect representation before adding object-target behavior and worn/carried/dropped/thrown item normalization. |
| `L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME` | `L12G-MISSING-ENTHRALL` | Runtime support should consume the authored SRD Surface spell definition and preserve the table-supplied fighting-caster-or-companions auto-success boundary before promoting the Perception penalty. |

## Task Details

## Wrap-Up Directive

This lane is in organic shutdown mode. Complete only Task 65 - L12G-MISSING-GUST-OF-WIND - Gust Of Wind Definition And Support Or Closure, run reviewer-loop convergence, merge the completed task through this integration branch, and then stop. Do not start another task from this file.

All other unfinished tasks from this lane were moved to `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`. That backlog is storage for future orchestration, not active work for this lane.

### Task 59 - L12G-MISSING-DRAGONS-BREATH - Dragons Breath Definition And Runtime Support

Status: `done`

Unit: `dragons_breath`. Gate task: 61 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `dragons_breath`.

Outputs:

- one concrete end state from the Task Output Contract for `dragons_breath`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `dragons_breath` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 60 - L12G-MISSING-ENHANCE-ABILITY - Enhance Ability Definition And Support

Status: `done`

Unit: `enhance_ability`. Gate task: 62 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enhance_ability`.

Outputs:

- one concrete end state from the Task Output Contract for `enhance_ability`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `enhance_ability` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 61 - L12G-MISSING-ENLARGE-REDUCE - Enlarge Reduce Definition And Support

Status: `done`

Unit: `enlarge_reduce`. Gate task: 63 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enlarge_reduce`.

Outputs:

- one concrete end state from the Task Output Contract for `enlarge_reduce`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `enlarge_reduce` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 62 - L12G-MISSING-ENTHRALL - Enthrall Definition And Closure

Status: `done`

Unit: `enthrall`. Gate task: 64 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `enthrall`.

Outputs:

- one concrete end state from the Task Output Contract for `enthrall`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `enthrall` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 63 - L12G-MISSING-FIND-TRAPS - Find Traps Definition And Closure

Status: `done`

Unit: `find_traps`. Gate task: 65 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `find_traps`.

Outputs:

- one concrete end state from the Task Output Contract for `find_traps`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `find_traps` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 64 - L12G-MISSING-FLAMING-SPHERE - Flaming Sphere Definition And Runtime Support

Status: `done`

Unit: `flaming_sphere`. Gate task: 66 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flaming_sphere`.

Outputs:

- one concrete end state from the Task Output Contract for `flaming_sphere`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `flaming_sphere` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 65 - L12G-MISSING-GUST-OF-WIND - Gust Of Wind Definition And Support Or Closure

Status: `ready-for-research`

Unit: `gust_of_wind`. Gate task: 67 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `gust_of_wind`.

Outputs:

- one concrete end state from the Task Output Contract for `gust_of_wind`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `gust_of_wind` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.
