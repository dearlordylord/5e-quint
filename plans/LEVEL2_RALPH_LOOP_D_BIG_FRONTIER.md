# Level 2 Ralph Loop D - Split Tail Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 59,
      "id": "L12G-MISSING-DRAGONS-BREATH",
      "status": "ready-for-research",
      "title": "Dragons Breath Definition And Runtime Support"
    },
    {
      "number": 60,
      "id": "L12G-MISSING-ENHANCE-ABILITY",
      "status": "ready-for-research",
      "title": "Enhance Ability Definition And Support"
    },
    {
      "number": 61,
      "id": "L12G-MISSING-ENLARGE-REDUCE",
      "status": "ready-for-research",
      "title": "Enlarge Reduce Definition And Support"
    },
    {
      "number": 62,
      "id": "L12G-MISSING-ENTHRALL",
      "status": "ready-for-research",
      "title": "Enthrall Definition And Closure"
    },
    {
      "number": 63,
      "id": "L12G-MISSING-FIND-TRAPS",
      "status": "ready-for-research",
      "title": "Find Traps Definition And Closure"
    },
    {
      "number": 64,
      "id": "L12G-MISSING-FLAMING-SPHERE",
      "status": "ready-for-research",
      "title": "Flaming Sphere Definition And Runtime Support"
    },
    {
      "number": 65,
      "id": "L12G-MISSING-GUST-OF-WIND",
      "status": "ready-for-research",
      "title": "Gust Of Wind Definition And Support Or Closure"
    },
    {
      "number": 66,
      "id": "L12G-MISSING-KNOCK",
      "status": "ready-for-research",
      "title": "Knock Definition And Closure"
    },
    {
      "number": 67,
      "id": "L12G-MISSING-LEVITATE",
      "status": "ready-for-research",
      "title": "Levitate Definition And Support Or Closure"
    },
    {
      "number": 68,
      "id": "L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS",
      "status": "ready-for-research",
      "title": "Locate Animals Or Plants Definition And Closure"
    },
    {
      "number": 69,
      "id": "L12G-MISSING-LOCATE-OBJECT",
      "status": "ready-for-research",
      "title": "Locate Object Definition And Closure"
    },
    {
      "number": 70,
      "id": "L12G-MISSING-MAGIC-MOUTH",
      "status": "ready-for-research",
      "title": "Magic Mouth Definition And Closure"
    },
    {
      "number": 71,
      "id": "L12G-MISSING-MIRROR-IMAGE",
      "status": "ready-for-research",
      "title": "Mirror Image Definition And Runtime Support"
    },
    {
      "number": 72,
      "id": "L12G-MISSING-ROPE-TRICK",
      "status": "ready-for-research",
      "title": "Rope Trick Definition And Closure"
    },
    {
      "number": 73,
      "id": "L12G-MISSING-SILENCE",
      "status": "ready-for-research",
      "title": "Silence Definition And Support Or Closure"
    },
    {
      "number": 74,
      "id": "L12G-MISSING-SUGGESTION",
      "status": "ready-for-research",
      "title": "Suggestion Definition And Closure"
    },
    {
      "number": 75,
      "id": "L12G-MISSING-ZONE-OF-TRUTH",
      "status": "ready-for-research",
      "title": "Zone Of Truth Definition And Closure"
    }
  ]
}
-->

This is the fourth level-2 execution lane split from Loop B tail work. Loop D owns Tasks 59-75 only.

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

Loop D contains 17 atomic tasks: the missing-definition/runtime-or-closure tail from Dragons Breath through Zone of Truth.

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

## Task Details

### Task 59 - L12G-MISSING-DRAGONS-BREATH - Dragons Breath Definition And Runtime Support

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

### Task 66 - L12G-MISSING-KNOCK - Knock Definition And Closure

Status: `ready-for-research`

Unit: `knock`. Gate task: 68 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `knock`.

Outputs:

- one concrete end state from the Task Output Contract for `knock`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `knock` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 67 - L12G-MISSING-LEVITATE - Levitate Definition And Support Or Closure

Status: `ready-for-research`

Unit: `levitate`. Gate task: 69 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `levitate`.

Outputs:

- one concrete end state from the Task Output Contract for `levitate`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `levitate` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 68 - L12G-MISSING-LOCATE-ANIMALS-OR-PLANTS - Locate Animals Or Plants Definition And Closure

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

### Task 69 - L12G-MISSING-LOCATE-OBJECT - Locate Object Definition And Closure

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

### Task 70 - L12G-MISSING-MAGIC-MOUTH - Magic Mouth Definition And Closure

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

### Task 71 - L12G-MISSING-MIRROR-IMAGE - Mirror Image Definition And Runtime Support

Status: `ready-for-research`

Unit: `mirror_image`. Gate task: 73 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mirror_image`.

Outputs:

- one concrete end state from the Task Output Contract for `mirror_image`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `mirror_image` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 72 - L12G-MISSING-ROPE-TRICK - Rope Trick Definition And Closure

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

### Task 73 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure

Status: `ready-for-research`

Unit: `silence`. Gate task: 75 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `silence`.

Outputs:

- one concrete end state from the Task Output Contract for `silence`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `silence` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 74 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure

Status: `ready-for-research`

Unit: `suggestion`. Gate task: 76 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `suggestion`.

Outputs:

- one concrete end state from the Task Output Contract for `suggestion`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `suggestion` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 75 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure

Status: `ready-for-research`

Unit: `zone_of_truth`. Gate task: 77 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `zone_of_truth`.

Outputs:

- one concrete end state from the Task Output Contract for `zone_of_truth`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `zone_of_truth` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.
