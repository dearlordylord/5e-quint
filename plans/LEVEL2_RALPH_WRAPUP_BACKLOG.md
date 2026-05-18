# Level 2 Ralph Wrap-Up Backlog

Generated on 2026-05-18 while putting active level-2 Ralph lanes A-D into organic shutdown. This file stores unfinished work that was removed from active lane plans so each worker has exactly one current task left.

Do not treat this file as an active Ralph plan.

As of the stashed-frontier restart, the stored leftovers were copied into
active runnable plans:

- `plans/LEVEL2_RALPH_LOOP_A_STASHED_FRONTIER.md`
- `plans/LEVEL2_RALPH_LOOP_C_STASHED_FRONTIER.md`
- `plans/LEVEL2_RALPH_LOOP_D_STASHED_FRONTIER.md`

Keep this file as the archived pre-research source for those plans. Do not run
Ralph directly against it.

## Active Tasks Left In Lanes

- Lane A: Task 30 - L12G-SPELL-GENTLE-REPOSE - Gentle Repose Runtime-Detached Closure (ready-for-research)
- Lane B: Task 50 - L12G-SPELL-WARDING-BOND - Warding Bond Runtime Support (ready-for-research)
- Lane C: Task 76 - L12G-AUTHOR-DRUID-WILD-COMPANION - Druid Wild Companion Boundary Closure (ready-for-research)
- Lane D: Task 65 - L12G-MISSING-GUST-OF-WIND - Gust Of Wind Definition And Support Or Closure (ready-for-research)

## Stored Leftover Tasks

Tasks already marked `done` in any integration lane, and tasks currently active in another lane, are intentionally not duplicated here.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 31 - L12G-SPELL-HEAT-METAL - Heat Metal Runtime Support

Status: `ready-for-research`

Unit: `heat_metal`. Gate task: 33 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- one concrete end state from the Task Output Contract for `heat_metal`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `heat_metal` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 32 - L12G-SPELL-HOLD-PERSON - Hold Person Runtime Support

Status: `ready-for-research`

Unit: `hold_person`. Gate task: 34 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `hold_person`.

Outputs:

- one concrete end state from the Task Output Contract for `hold_person`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `hold_person` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 33 - L12G-SPELL-INVISIBILITY - Invisibility Runtime Support

Status: `ready-for-research`

Unit: `invisibility`. Gate task: 35 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `invisibility`.

Outputs:

- one concrete end state from the Task Output Contract for `invisibility`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `invisibility` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 34 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support

Status: `ready-for-research`

Unit: `lesser_restoration`. Gate task: 36 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `lesser_restoration`.

Outputs:

- one concrete end state from the Task Output Contract for `lesser_restoration`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `lesser_restoration` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 35 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure

Status: `ready-for-research`

Unit: `magic_weapon`. Gate task: 37 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_weapon`.

Outputs:

- one concrete end state from the Task Output Contract for `magic_weapon`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `magic_weapon` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 36 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure

Status: `ready-for-research`

Unit: `mind_spike`. Gate task: 38 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mind_spike`.

Outputs:

- one concrete end state from the Task Output Contract for `mind_spike`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `mind_spike` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->
### Task 51 - L12G-SPELL-WEB - Web Runtime Support Or Closure

Status: `ready-for-research`

Unit: `web`. Gate task: 53 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `web`.

Outputs:

- one concrete end state from the Task Output Contract for `web`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `web` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->
### Task 52 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure

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
### Task 53 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure

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
### Task 54 - L12G-MISSING-AUGURY - Augury Definition And Closure

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
### Task 55 - L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support

Status: `ready-for-research`

Unit: `calm_emotions`. Gate task: 57 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `calm_emotions`.

Outputs:

- one concrete end state from the Task Output Contract for `calm_emotions`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `calm_emotions` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->
### Task 56 - L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure

Status: `ready-for-research`

Unit: `darkness`. Gate task: 58 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkness`.

Outputs:

- one concrete end state from the Task Output Contract for `darkness`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `darkness` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->
### Task 57 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure

Status: `ready-for-research`

Unit: `darkvision`. Gate task: 59 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkvision`.

Outputs:

- one concrete end state from the Task Output Contract for `darkvision`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `darkvision` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->
### Task 58 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure

Status: `ready-for-research`

Unit: `detect_thoughts`. Gate task: 60 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `detect_thoughts`.

Outputs:

- one concrete end state from the Task Output Contract for `detect_thoughts`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `detect_thoughts` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
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

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 77 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS - Druid Wild Shape Character Facts And Resource Projection

Status: `ready-for-research`

Unit: `druid_wild_shape`. Follow-up split from Task 12.

Dependency: Task 76 (`L12G-AUTHOR-DRUID-WILD-COMPANION`) done.

Inputs:

- `packages/surface/content/druid_wild_shape.json`;
- the `druid_wild_shape` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Druid.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet resource/profile owner evidence.

Outputs:

- owner evidence for projecting Wild Shape use count, partial Short Rest/full Long Rest reset, rounded-down duration, learned Beast forms, and one known-form replacement on Long Rest;
- projection derives these facts from the retained Surface feature and class progression without duplicating class progression state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/resource portion of `druid_wild_shape` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no stat-block shape-shifting runtime, equipment handling, Beast attack execution, or companion boundary work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 78 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime

Status: `ready-for-research`

Unit: `druid_wild_shape`. Follow-up split from Task 12.

Dependency: Task 77 (`L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/druid_wild_shape.json`;
- the `druid_wild_shape` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Druid.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- stat-block-control, battle-runtime, Unit profile, owner-evidence, and focused tests for shape-shifting execution.

Outputs:

- supported runtime profile and owner evidence for Beast form choice, game-statistic replacement and retained facts, Temporary Hit Points, no spellcasting, equipment choice/effects, and Wild Shape reversion triggers;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the shape-shifting runtime portion of `druid_wild_shape` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Wild Shape and Shape-Shift rules without homebrew extensions;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 79 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection

Status: `ready-for-research`

Unit: `monk_monks_focus`. Follow-up split from Task 13.

Dependency: Tasks 13 (`L12G-AUTHOR-MONK-MONKS-FOCUS`), 14 (`L12G-AUTHOR-MONK-UNARMORED-MOVEMENT`), and 15 (`L12G-AUTHOR-MONK-UNCANNY-METABOLISM`) done.

Inputs:

- `packages/surface/content/monk_monks_focus.json`;
- the `monk_monks_focus` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet resource/profile owner evidence.

Outputs:

- owner evidence for admitting Monk level-2 progression after the full Monk level-2 feature grant set can be retained;
- Focus Point count, Short or Long Rest reset, initial Focus feature option names, and Focus save DC projection derive from the authored Surface feature and class progression without duplicating class progression or option execution state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/resource portion of `monk_monks_focus` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Flurry of Blows, Patient Defense, Step of the Wind battle option execution is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 80 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution

Status: `ready-for-research`

Unit: `monk_monks_focus`. Follow-up split from Task 13.

Dependency: Task 79 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_monks_focus.json`;
- the `monk_monks_focus` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, character-battle-runtime resource handoff, Unit profile, owner-evidence, and focused tests for Monk's Focus option execution.

Outputs:

- supported runtime profile and owner evidence for Flurry of Blows, Patient Defense, and Step of the Wind option modes;
- Bonus Action economy, Focus Point spending where RAW requires it, Dodge and jump-distance effects, and later Focus spenders consume one shared Focus Point resource rather than synthetic per-feature pools;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the battle-option execution portion of `monk_monks_focus` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Monk's Focus without homebrew extensions and consumes projected Focus Point facts instead of duplicating class progression state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 81 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Use State

Status: `ready-for-research`

Unit: `monk_uncanny_metabolism`. Follow-up split from Task 15.

Dependency: Task 15 (`L12G-AUTHOR-MONK-UNCANNY-METABOLISM`) and Task 79 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_uncanny_metabolism.json`;
- `packages/surface/content/monk_monks_focus.json`;
- the `monk_uncanny_metabolism` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature and use-state owner evidence.

Outputs:

- owner evidence for the retained Uncanny Metabolism feature ref, once-per-Long-Rest use state, and links to the shared Focus Point resource and existing Martial Arts die source;
- use-state projection derives from the retained Surface feature and Monk progression without duplicating Focus Point, Martial Arts die, or class progression state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/use-state portion of `monk_uncanny_metabolism` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Initiative-window choice execution, self-healing runtime, or battle-runtime Focus Point recovery is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 82 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime

Status: `ready-for-research`

Unit: `monk_uncanny_metabolism`. Follow-up split from Task 15.

Dependency: Task 80 (`L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS`) and Task 81 (`L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS`) done.

Inputs:

- `packages/surface/content/monk_uncanny_metabolism.json`;
- the `monk_uncanny_metabolism` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Monk.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, character-battle-runtime resource handoff, Unit profile, owner-evidence, and focused tests for Initiative-window recovery and self-healing execution.

Outputs:

- supported runtime profile and owner evidence for optional Initiative-window Focus Point recovery, self-healing, and Long Rest recharge;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the runtime execution portion of `monk_uncanny_metabolism` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Uncanny Metabolism without homebrew extensions and consumes projected shared Focus Point, once-per-Long-Rest use, and Martial Arts die facts instead of duplicating class progression or die-table state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 83 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts

Status: `ready-for-research`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 18 (`L12G-AUTHOR-SORCERER-FONT-OF-MAGIC`) and Task 19 (`L12G-AUTHOR-SORCERER-METAMAGIC`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- `packages/surface/content/class_sorcerer.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature and resource owner evidence.

Outputs:

- owner evidence for retaining the Font of Magic feature ref with Sorcerer level-2 progression after the full Sorcerer level-2 feature grant set can be retained;
- shared Sorcery Point pool facts, Sorcerer-level cap, and Long Rest reset derive from the authored Surface feature and class progression without duplicating class progression or Metamagic option state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts/resource portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Spell Slot conversion execution or Metamagic option execution is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 84 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points

Status: `ready-for-research`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, spellcasting resource owner, Unit profile, owner-evidence, and focused tests for Spell Slot to Sorcery Point conversion.

Outputs:

- supported runtime profile and owner evidence for the no-action conversion that expends one Spell Slot and grants Sorcery Points equal to the expended slot's level;
- conversion consumes existing Spell Slot state and the projected shared Sorcery Point resource, respecting the shared Sorcery Point cap;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Spell Slot to Sorcery Point conversion portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Sorcery Point to temporary Spell Slot creation or Metamagic option execution is implemented in this task;
- runtime behavior traces to SRD Font of Magic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating class progression or spellcasting resource state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 85 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot

Status: `ready-for-research`

Unit: `sorcerer_font_of_magic`. Follow-up split from Task 18.

Dependency: Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_font_of_magic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, spellcasting resource owner, Unit profile, owner-evidence, and focused tests for Sorcery Point to temporary Spell Slot creation.

Outputs:

- supported runtime profile and owner evidence for the Bonus Action conversion that spends Sorcery Points by the Creating Spell Slots table;
- execution enforces the minimum Sorcerer level for the target slot, creates one Spell Slot no higher than level 5, and expires created slots on Long Rest;
- conversion consumes the projected shared Sorcery Point resource and existing Spell Slot state without duplicating class progression state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Sorcery Point to temporary Spell Slot conversion portion of `sorcerer_font_of_magic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Spell Slot to Sorcery Point conversion or Metamagic option execution is implemented in this task;
- runtime behavior traces to SRD Font of Magic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating class progression or spellcasting resource state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 86 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection

Status: `ready-for-research`

Unit: `sorcerer_metamagic`. Follow-up split from Task 19.

Dependency: Task 19 (`L12G-AUTHOR-SORCERER-METAMAGIC`) and Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_metamagic.json`;
- `packages/surface/content/class_sorcerer.json`;
- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_metamagic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-creation and character-sheet retained-feature, choice, and resource-reference owner evidence.

Outputs:

- owner evidence for retaining the Metamagic feature ref with Sorcerer level-2 progression;
- chosen Metamagic option count, Sorcerer-level replacement lifecycle, unique known-option roster, option costs, stacking facts, and source link to the shared Font of Magic Sorcery Point resource derive from authored Surface records without duplicating class progression or Sorcery Point pool state;
- regenerated coverage artifacts.

Acceptance:

- the character-facts and option-projection portion of `sorcerer_metamagic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no cast-time Metamagic option execution or Font of Magic Spell Slot conversion execution is implemented in this task;
- owner evidence links Metamagic option facts to the shared Font of Magic Sorcery Point resource instead of creating a Metamagic-local point pool;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, C; observed-statuses: deferred, ready-for-research -->
### Task 87 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution

Status: `ready-for-research`

Unit: `sorcerer_metamagic`. Follow-up split from Task 19.

Dependency: Task 86 (`L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS`) and Task 83 (`L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS`) done.

Inputs:

- `packages/surface/content/sorcerer_metamagic.json`;
- `packages/surface/content/sorcerer_font_of_magic.json`;
- the `sorcerer_metamagic` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-battle-runtime, battle-runtime spell invocation hooks, Unit profile, owner-evidence, and focused tests for known Metamagic option execution.

Outputs:

- supported runtime profile and owner evidence for known Metamagic option execution at spell-cast time;
- execution spends the shared Sorcery Point resource projected from Font of Magic, enforces the one-option-per-spell rule plus Empowered Spell and Seeking Spell stacking exceptions, enforces Quickened Spell level-1-plus spell turn limits, and applies the option-specific spell modifications for Careful, Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle, Transmuted, and Twinned Spell;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the cast-time execution portion of `sorcerer_metamagic` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Metamagic without homebrew extensions and consumes projected shared Sorcery Point facts instead of duplicating Font of Magic resource state;
- no Font of Magic Spell Slot conversion behavior is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 88 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `ready-for-research`

Unit: `acid_arrow`. Follow-up split from Task 21.

Dependency: Task 21 (`L12G-SPELL-ACID-ARROW`) done.

Inputs:

- `packages/surface/content/acid_arrow.json`;
- `packages/surface/content/acid_arrow.dhall`;
- the `acid_arrow` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell damage shapes.

Outputs:

- Acid Arrow authored content represents the RAW initial hit damage, later end-of-target-next-turn damage, miss-only immediate half-of-initial damage, and slot scaling for both initial and later damage as lossless executable Spell Definition facts;
- the miss branch is derived from the initial damage relationship rather than stored as an independently fixed 2d4 approximation;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- regenerated coverage artifacts.

Acceptance:

- the Surface damage-shape portion of `acid_arrow` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no battle-runtime Acid Arrow invocation/effect execution is implemented in this task;
- authored facts trace to SRD Acid Arrow without duplicating Spell Invocation or Spell Effect state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 89 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `ready-for-research`

Unit: `acid_arrow`. Follow-up split from Task 21.

Dependency: Task 88 (`L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE`) done.

Inputs:

- `packages/surface/content/acid_arrow.json`;
- the `acid_arrow` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime, spell invocation/effect lifecycle, Unit profile, owner-evidence, and focused tests for Acid Arrow execution.

Outputs:

- supported runtime profile and owner evidence for Acid Arrow as a level-2 prepared Spell Invocation that spends the Magic Action and Spell Slot;
- runtime resolves a ranged Spell Attack, applies immediate Acid damage on hit, stores the Acid Spell Effect that applies at the end of the target's next turn on hit, applies immediate half-of-initial Acid damage on miss only, and scales RAW damage amounts by slot level;
- runtime consumes the repaired Spell Definition facts from Task 88 rather than duplicating or reinterpreting authored damage state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the delayed runtime support portion of `acid_arrow` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Acid Arrow without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant damage formulas;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 90 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape

Status: `ready-for-research`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Task 23 (`L12G-SPELL-ALTER-SELF`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- `packages/surface/content/alter_self.dhall`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell option/effect shapes.

Outputs:

- Alter Self authored content represents Aquatic Adaptation, Change Appearance, and Natural Weapons as lossless executable Spell Definition option facts;
- Natural Weapons preserves the claws, fangs, horns, and hooves choice, the Slashing/Piercing/Bludgeoning damage-type mapping, the 1d6 damage die, and spellcasting-ability attack and damage replacement facts without duplicating Unarmed Strike state;
- Aquatic Adaptation preserves water breathing and Swim Speed equal to Speed as linked projection facts, and Change Appearance remains a no-statistics-change presentation option;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- regenerated coverage artifacts.

Acceptance:

- the Surface option-shape portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no battle-runtime Alter Self invocation, option switching, Aquatic Adaptation execution, or Natural Weapons Unarmed Strike execution is implemented in this task;
- authored facts trace to SRD Alter Self without duplicating Spell Invocation, Spell Effect, creature Speed, or Unarmed Strike state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 90 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State

Status: `ready-for-research`

Unit: `dragons_breath`. Follow-up split from Task 59.

Dependency: Task 59 (`L12G-MISSING-DRAGONS-BREATH`) done.

Inputs:

- `packages/surface/content/dragons_breath.json`;
- `packages/surface/content/dragons_breath.dhall`;
- the `dragons_breath` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell invocation/effect lifecycle, owner evidence, and focused tests for Dragon's Breath initial casting.

Outputs:

- supported runtime owner evidence for the Bonus Action spell invocation that spends a level-2-or-higher Spell Slot, chooses Acid, Cold, Fire, Lightning, or Poison once at cast time, targets one willing touched creature, starts caster-owned Concentration for up to 1 minute, and stores a target-attached active effect;
- active effect state retains the chosen damage type, caster spell save DC, original slot level, willing target attachment, Concentration expiry, and cleanup facts without duplicating Spell Access state or reauthoring the damage type options;
- regenerated coverage artifacts.

Acceptance:

- the initial-cast/effect-state portion of `dragons_breath` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no target-granted Magic action execution is implemented in this task;
- runtime behavior traces to SRD Dragon's Breath without homebrew extensions and consumes the authored Spell Definition facts rather than duplicating spell mechanics in runtime code;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 90 - L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE - Moonbeam Surface Area Lifecycle

Status: `ready-for-research`

Unit: `moonbeam`. Follow-up split from Task 38.

Dependency: Task 38 (`L12G-SPELL-MOONBEAM`) done.

Inputs:

- `packages/surface/content/moonbeam.dhall`;
- `packages/surface/content/moonbeam.json`;
- the `moonbeam` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface Spell Definition schema, tracer, and admission code for spell mechanics.

Outputs:

- Moonbeam Dhall and JSON content represent the point-origin 5-foot-radius, 40-foot-high Cylinder, Concentration duration, Dim Light area, later Magic-action Cylinder movement up to 60 feet, the initial, area-moved, creature-enter, and end-turn Constitution Saving Throw triggers, the once-per-turn save limiter, slot-scaled Radiant damage, and failed-save shape-shift reversion plus shape-shift prevention until the creature leaves the Cylinder;
- schema and tracer support are updated where required so those facts are executable source facts rather than comments or lossy prose;
- regenerated coverage artifacts.

Acceptance:

- the Surface authoring portion of `moonbeam` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no battle-runtime zone execution, table/spatial geometry derivation, or shape-shifting rider execution is implemented in this task;
- authored facts trace to SRD Moonbeam, Cylinder, Dim Light, Concentration, Magic Action, Saving Throw, and Shape-Shifting text without homebrew extensions;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: B; observed-statuses: ready-for-research -->
### Task 90 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support

Status: `ready-for-research`

Unit: `see_invisibility`. Gate task: 46 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- Task 44's installed `see_invisibility` Surface record and Unit claim;
- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing observer, sight, Invisible condition, Spell Invocation, Spell Effect, duration, and owner-evidence code/tests.

Outputs:

- promote See Invisibility as a level-2 self spell that spends the Magic Action and Spell Slot;
- apply and clean up a one-hour self Spell Effect;
- expose observer-scoped sight facts that let only the caster see creatures and objects with the Invisible condition as visible;
- expose Ethereal Plane visibility through table-supplied plane, distance, cover, and sight-line witnesses;
- supported-profile Unit claim, deterministic admission/projection evidence, focused battle-runtime tests, and promoted Quint/runtime parity.

Acceptance:

- See Invisibility support does not grant Truesight, Darkness sight, visual-illusion handling, or transformation detection;
- observer-scoped Invisible benefit denial and Ethereal visibility witness facts are covered by focused runtime tests and the relevant promoted Quint/runtime parity checks;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 91 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime

Status: `ready-for-research`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Task 90 (`L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime self-transformation spell invocation/effect lifecycle, Unit profile, owner-evidence, and focused tests for Alter Self mode state and Aquatic Adaptation execution.

Outputs:

- profile-subset-supported runtime profile and owner evidence for Alter Self casting, spell-owned option state, Magic Action mode replacement, and Concentration cleanup;
- Aquatic Adaptation grants water breathing and a Swim Speed equal to current Speed through linked Speed projection rather than copied spell-local Speed state;
- Change Appearance is closed as runtime-detached presentation with no statistics mutation;
- Natural Weapons remains visible as a separate runtime follow-up instead of being partially implemented here;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Aquatic Adaptation and shared mode-lifecycle portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Natural Weapons Unarmed Strike attack, damage, damage-type, or spellcasting-ability replacement behavior is implemented in this task;
- runtime behavior traces to SRD Alter Self without homebrew extensions and consumes projected Spell Definition facts rather than duplicating creature Speed or option state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 91 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `ready-for-research`

Unit: `dragons_breath`. Follow-up split from Task 59.

Dependency: Task 90 (`L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST`) done.

Inputs:

- `packages/surface/content/dragons_breath.json`;
- the `dragons_breath` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime target-granted action lifecycle, promoted Quint parity, Unit profile, owner evidence, and focused tests for Dragon's Breath target action execution.

Outputs:

- supported-profile Unit claim, deterministic admission/projection evidence, and focused runtime tests for discovering and executing the attached target's Magic action while Dragon's Breath remains active;
- target action execution spends the attached target's Magic action and uses the stored caster spell save DC, chosen damage type, original slot level, and table-supplied area membership to resolve a 15-foot Cone Dexterity save for half damage;
- promoted Quint/runtime parity updates cover target-side action discovery, action economy spending, area membership input, save-for-half damage, slot scaling, and expiry behavior;
- regenerated coverage artifacts.

Acceptance:

- the granted-action execution portion of `dragons_breath` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Dragon's Breath without homebrew extensions and consumes Task 90 effect state rather than creating a parallel spell-action owner;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 91 - L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME - Moonbeam Movable Zone Runtime

Status: `ready-for-research`

Unit: `moonbeam`. Follow-up split from Task 38.

Dependency: Task 90 (`L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE`) done.

Inputs:

- `packages/surface/content/moonbeam.json`;
- the `moonbeam` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, `.references/srd-5.2.1/Rules-Glossary.md`, and `.references/srd-5.2.1/Playing-the-Game.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell invocation/effect lifecycle, table/spatial owner evidence, Unit profile evidence, and focused tests for movable area effects.

Outputs:

- supported-profile Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for Moonbeam casting with Magic Action and Spell Slot spend, caller-supplied Cylinder area identity and affected-creature facts, appearance saves, Concentration-owned movable area effect, later Magic-action beam movement up to 60 feet, table-triggered area-moves-into-creature-space, creature-enters-area, and end-turn saves at most once per creature per turn, slot-scaled Radiant damage with half damage on success, Dim Light and Lightly Obscured projection for the active Cylinder, and concentration/duration cleanup;
- automatic geometry, destination validity, and area membership derivation remain table/spatial owner facts rather than Moonbeam runtime state;
- regenerated coverage artifacts.

Acceptance:

- the movable-zone runtime portion of `moonbeam` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no failed-save shape-shift reversion or shape-shift suppression rider is implemented in this task;
- runtime behavior traces to SRD Moonbeam and area/light/concentration rules without homebrew extensions and consumes Surface facts rather than duplicating authored mechanics;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: B; observed-statuses: ready-for-research -->
### Task 91 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime

Status: `ready-for-research`

Unit: `spike_growth`. Gate task: 50 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- Task 48's `unsupported-profile` Unit claim and follow-up split;
- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Spike Growth Surface content, Unit claims, Grease ground-hazard movement facts, Spell Invocation, Spell Effect, damage, Concentration, and movement/event tests.

Outputs:

- promote Spike Growth's battle-visible hazard: Magic Action and level-2-or-higher Spell Slot spend, caster-owned Concentration up to 10 minutes, caller-supplied point-origin ground-area identity, active Difficult Terrain movement-cost facts for movement through the area, Movement-triggered 2d4 Piercing damage per 5-foot increment traveled into or within the area from caller-supplied path-distance facts, damage disposition and Concentration interactions, and cleanup when Concentration or duration ends;
- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for Spike Growth movement damage, Difficult Terrain movement cost, resource spending, Concentration ownership, and cleanup.

Acceptance:

- automatic geometry, pathfinding, and area-membership derivation remain table/spatial-owner responsibilities rather than hidden Spike Growth runtime behavior;
- Difficult Terrain movement-cost facts and Movement-triggered damage use one active spell/hazard source rather than duplicated parallel state;
- the level 1-2 metric row for `spike_growth` is supported or precisely narrowed to any remaining accepted closure;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 92 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime

Status: `ready-for-research`

Unit: `alter_self`. Follow-up split from Task 23.

Dependency: Tasks 90 (`L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE`) and 91 (`L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME`) done.

Inputs:

- `packages/surface/content/alter_self.json`;
- the `alter_self` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime self-transformation spell invocation/effect lifecycle, character-battle-runtime Unarmed Strike projection, Unit profile, owner-evidence, and focused tests for Natural Weapons execution.

Outputs:

- supported runtime profile and owner evidence for Natural Weapons as a spell-owned Unarmed Strike override;
- execution uses the chosen claws, fangs, horns, or hooves damage type, deals 1d6 damage instead of normal Unarmed Strike damage, uses the caster's spellcasting ability for attack and damage rolls, and cleans up on Concentration end;
- runtime consumes the repaired Natural Weapons Spell Definition facts and shared Alter Self mode-lifecycle support instead of duplicating Unarmed Strike or spell option state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the Natural Weapons runtime portion of `alter_self` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no unrelated Aquatic Adaptation, Change Appearance, or level-1 Loop D/L spell frontier work is implemented in this task;
- runtime behavior traces to SRD Alter Self and Unarmed Strike terminology without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant Unarmed Strike formulas;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 92 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `ready-for-research`

Unit: `enhance_ability`. Follow-up split from Task 60.

Dependency: Task 60 (`L12G-MISSING-ENHANCE-ABILITY`) done.

Inputs:

- `packages/surface/content/enhance_ability.json`;
- `packages/surface/content/enhance_ability.dhall`;
- the `enhance_ability` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime roll-modifier spell invocation target-list fills, chosen-ability active effects, promoted Quint parity, and focused tests for Enhance Ability.

Outputs:

- supported-profile Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for level 3+ Enhance Ability casts that can target one additional creature per spell slot level above 2;
- target-list ability-choice fills retain a distinct Strength, Dexterity, Intelligence, Wisdom, or Charisma choice for each selected target, without allowing Constitution and without sharing one cast-level ability choice across all targets;
- each affected target receives only its own chosen Ability Check Advantage effect, with normal Advantage/Disadvantage cancellation and Concentration cleanup, without duplicating Spell Access or spell-slot state.

Acceptance:

- the upcast per-target ability-choice portion of `enhance_ability` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Enhance Ability without reintroducing 2014 Bear/Bull/Constitution effects absent from SRD 5.2.1;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 92 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Runtime

Status: `ready-for-research`

Unit: `moonbeam`. Follow-up split from Task 38.

Dependency: Task 91 (`L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME`) and Task 78 (`L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME`) done.

Inputs:

- `packages/surface/content/moonbeam.json`;
- the `moonbeam` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- stat-block-control shape-shifting runtime, battle-runtime spell effect lifecycle, Unit profile evidence, and focused tests for shape-shift reversion and suppression.

Outputs:

- supported runtime profile or profile-subset evidence for reverting a shape-shifted target to its true form when it fails the Moonbeam Constitution Saving Throw, preventing that creature from shape-shifting again while it remains in the Moonbeam Cylinder, and clearing the prevention when it leaves the Cylinder or the spell ends;
- execution consumes battle-visible shape-shifted and true-form state from the shape-shifting owner and Moonbeam save/area lifecycle facts from the movable-zone runtime without duplicating either owner state;
- promoted Quint/runtime parity updates if battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the shape-shifting rider portion of `moonbeam` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Moonbeam and Shape-Shifting rules without homebrew extensions and does not create Moonbeam-local duplicate shape-shifting state;
- automatic area membership derivation remains table/spatial owned;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: B; observed-statuses: ready-for-research -->
### Task 92 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary

Status: `ready-for-research`

Unit: `spike_growth`. Gate task: 50 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- Task 48's `unsupported-profile` Unit claim and follow-up split;
- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Spike Growth Surface content, Unit claims, Search action, spell save DC, observer/sight witness, table-recognition, and terrain-hazard owner decisions.

Outputs:

- represent or close the camouflaged terrain recognition rule: whether a creature could see the area when the spell was cast, Search action spend before entering for creatures that did not see it, Wisdom (Perception or Survival) check against the caster's spell save DC, recognition state or explicit table-owned witness used before movement into the area, and cleanup with the hazard;
- Surface schema/content support or accepted runtime-detached closure for Spike Growth hazard recognition, with focused tests and coverage disposition that either promotes the Search recognition boundary or closes it with an explicit table-owned reason.

Acceptance:

- the implementation does not infer sight, visibility, terrain discovery, or hidden-hazard recognition from battle-runtime geometry unless that owner has an explicit executable witness boundary;
- Perception/Survival Search action handling traces to local RAW and ubiquitous language without adding a second spell save DC or duplicate recognition state;
- the level 1-2 metric row for `spike_growth` is supported, accepted-closed, or precisely blocked only by a smaller queued follow-up;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 93 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `ready-for-research`

Unit: `continual_flame`. Follow-up split from Task 28.

Dependency: Task 28 (`L12G-SPELL-CONTINUAL-FLAME`) done.

Inputs:

- `packages/surface/content/continual_flame.json`;
- the `continual_flame` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- promoted battle-runtime light emitter lifecycle, spell-effect removal or suppression owners, Unit profile evidence, and focused tests for until-dispelled object light cleanup.

Outputs:

- supported runtime profile and owner evidence for removing or suppressing object-attached until-dispelled spell occurrences through a generic spell-effect removal or suppression owner;
- Continual Flame object emitters are consumed through the generic owner rather than a Continual Flame-specific removal registry;
- Dispel Magic, antimagic, or the selected suppression/removal procedure remains the owner of the triggering removal semantics;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- Continual Flame cleanup through the generic until-dispelled spell-effect removal or suppression owner is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no presentation-only flame appearance, heat/fuel, covering/hiding, smothering, quenching, or costly Material component inventory behavior is implemented in this task;
- runtime behavior traces to SRD Continual Flame and the selected removal or suppression RAW without homebrew extensions and consumes existing until-dispelled spell-effect markers instead of duplicating emitter ownership;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 93 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `ready-for-research`

Unit: `enlarge_reduce`. Follow-up split from Task 61.

Dependency: Task 61 (`L12G-MISSING-ENLARGE-REDUCE`) done.

Inputs:

- `packages/surface/content/enlarge_reduce.json`;
- `packages/surface/content/enlarge_reduce.dhall`;
- the `enlarge_reduce` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell invocation/effect lifecycle, promoted Quint parity, Unit profile, owner evidence, and focused tests for Enlarge/Reduce creature targets.

Outputs:

- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for the Enlarge/Reduce creature branch without object-target behavior;
- Magic Action and level-2+ Spell Slot spending, caster-owned Concentration, willing target application, unwilling target Constitution save gate, and cast-time Enlarge/Reduce mode choice consume the authored Surface spell definition rather than duplicating spell facts;
- active creature effects project one-step size-category changes, Strength Ability Check and Strength Saving Throw Advantage/Disadvantage with normal cancellation, Enlarge +1d4 and Reduce -1d4 minimum 1 damage for attacks with affected weapons or Unarmed Strikes, and cleanup when Concentration or duration ends.

Acceptance:

- the creature-branch portion of `enlarge_reduce` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no object-target behavior, object size lifecycle, or worn/carried/dropped/thrown item normalization is implemented in this task;
- runtime behavior traces to SRD Enlarge/Reduce without homebrew extensions and consumes the authored Spell Definition facts rather than duplicating spell mechanics in runtime code;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 93 - L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST - Prayer Of Healing Surface Rest Shape

Status: `ready-for-research`

Unit: `prayer_of_healing`. Follow-up split from Task 40.

Dependency: Task 40 (`L12G-SPELL-PRAYER-OF-HEALING`) done.

Inputs:

- `packages/surface/content/prayer_of_healing.dhall`;
- `packages/surface/content/prayer_of_healing.json`;
- the `prayer_of_healing` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, and `.references/srd-5.2.1/Playing-the-Game.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface Spell Definition schema, tracer, and catalog admission code for spell mechanics.

Outputs:

- Prayer of Healing Dhall and JSON content represent 10-minute non-ritual casting, up-to-five recipients that remain within 30 feet for the entire casting, slot-scaled 2d8 plus 1d8 per slot above 2 Hit Point restoration, granted Short Rest benefits, and per-recipient immunity to being affected again until that creature finishes a Long Rest;
- schema and tracer support are updated where required so Short Rest benefits, the Long Rest lockout, and completed-casting eligibility are executable source facts rather than comments or prose-only description;
- regenerated coverage artifacts.

Acceptance:

- the Surface authoring portion of `prayer_of_healing` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no Character Sheet rest execution, Spell Slot spending, range tracking, or encounter-time casting interruption runtime is implemented in this task;
- authored facts trace to SRD Prayer of Healing, Longer Casting Times, Healing, Short Rest, and Long Rest text without homebrew extensions;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: B; observed-statuses: ready-for-research -->
### Task 93 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE - Spiritual Weapon Proxy Surface Shape

Status: `ready-for-research`

Unit: `spiritual_weapon`. Gate task: 51 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- Task 49's `unsupported-profile` Unit claim and follow-up split;
- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Spiritual Weapon Dhall/JSON Surface content, schema/tracer support, and spell-ongoing/proxy authoring patterns.

Outputs:

- replace or verify the Spiritual Weapon Surface shape so it represents the RAW spectral force as a spell-owned proxy/effect, not a creature companion or ordinary object;
- preserve Bonus Action casting, Concentration up to 1 minute, 60-foot placement, immediate attack target within 5 feet of the force, slot-scaled Force damage, and a later-turn single Bonus Action operation that may move the force up to 20 feet and repeat the attack.

Acceptance:

- the Surface shape does not encode the later move and repeat attack as two separately spendable Bonus Action operations;
- Concentration and slot scaling remain source facts on the Spell Definition rather than duplicated runtime metadata;
- the result leaves Task 94 unblocked with executable source facts for a spell-owned attack proxy;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 94 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch

Status: `ready-for-research`

Unit: `enlarge_reduce`. Follow-up split from Task 61.

Dependency: Task 93 (`L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME`) done.

Inputs:

- `packages/surface/content/enlarge_reduce.json`;
- `packages/surface/content/enlarge_reduce.dhall`;
- the `enlarge_reduce` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Task 93 creature-branch active-effect representation;
- surface target selection plus battle-runtime object and item lifecycle owner evidence and focused tests.

Outputs:

- Surface schema/content support for the Enlarge/Reduce object target constraint, runtime object/item lifecycle owner decision, focused tests, and coverage disposition that either supports the object branch or closes it with an accepted runtime-boundary reason;
- object-target behavior represents a target object that is neither worn nor carried, object size-category change and cleanup, and any promoted object lifecycle facts without weakening the creature-branch target type;
- item lifecycle handling covers carried/worn item size changes while the creature branch is active, dropped item normalization, and thrown weapon/ammunition normalization immediately after hit or miss only if those lifecycle facts belong to promoted runtime.

Acceptance:

- the object-branch and item-lifecycle portion of `enlarge_reduce` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Enlarge/Reduce without inventing object inventory, dropped-item, or thrown-item state outside accepted runtime owners;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 94 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape

Status: `ready-for-research`

Unit: `flame_blade`. Follow-up split from Task 29.

Dependency: Task 29 (`L12G-SPELL-FLAME-BLADE`) done.

Inputs:

- `packages/surface/content/flame_blade.json`;
- `packages/surface/content/flame_blade.dhall`;
- the `flame_blade` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- Surface spell schema, Dhall generation, tracer, and focused tests for spell-created held objects and action-gated spell attacks.

Outputs:

- Flame Blade authored content represents Bonus Action creation and re-evocation, free-hand requirement, let-go disappearance, Concentration up to 10 minutes, self-attached held Bright Light 10 feet plus Dim Light for an additional 10 feet, active-blade-gated Magic Action melee spell attack, Fire damage equal to 3d6 plus the caster's spellcasting ability modifier, and +1d6 per slot level above 2 as lossless executable Spell Definition facts;
- schema/tracer support is updated only if the current Surface shape cannot represent those facts;
- battle-runtime Flame Blade invocation, active blade state, attacks, cleanup, and re-evocation are not implemented in this task;
- regenerated coverage artifacts.

Acceptance:

- the Surface lifecycle-shape portion of `flame_blade` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- authored facts trace to SRD Flame Blade without duplicating Spell Invocation, Spell Effect, held-object runtime, light-emitter runtime, attack-roll runtime, or Spell Slot state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 94 - L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST - Prayer Of Healing Character Sheet Rest Runtime

Status: `ready-for-research`

Unit: `prayer_of_healing`. Follow-up split from Task 40.

Dependency: Task 93 (`L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST`) done.

Inputs:

- `packages/surface/content/prayer_of_healing.json`;
- the `prayer_of_healing` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md`, `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, and `.references/srd-5.2.1/Playing-the-Game.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- character-sheet-runtime rest application, spellcasting resource owner evidence, Unit profile evidence, and focused tests for Prayer of Healing execution.

Outputs:

- supported profile or profile-subset evidence, focused runtime tests, and owner evidence for applying Prayer of Healing after the completed 10-minute cast;
- execution spends the Spell Slot at completion, consumes caller-supplied recipient eligibility facts, grants each selected Character Sheet the existing Short Rest benefits without duplicating rest algorithms, applies the slot-scaled healing roll capped by Hit Point maximum, and records/clears the per-recipient Long Rest lockout from the same rest state owner;
- automatic range tracking and encounter-time casting interruption remain caller/table facts rather than Character Sheet state;
- regenerated coverage artifacts.

Acceptance:

- the Character Sheet rest-runtime portion of `prayer_of_healing` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Prayer of Healing, Longer Casting Times, Healing, Short Rest, and Long Rest text without homebrew extensions and consumes existing rest and Spell Slot owners instead of duplicating their state;
- no automatic spatial range tracking, encounter-time concentration interruption, or battle-runtime-only spell invocation behavior is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if battle-runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: B; observed-statuses: ready-for-research -->
### Task 94 - L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME - Spiritual Weapon Persistent Attack Runtime

Status: `ready-for-research`

Unit: `spiritual_weapon`. Gate task: 51 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- Task 49's `unsupported-profile` Unit claim and follow-up split;
- Task 93's executable Spiritual Weapon proxy Surface shape;
- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Spell Invocation, Spell Attack, Spell Effect, Concentration, Bonus Action, table-spatial witness, and active-effect cleanup tests.

Outputs:

- promote Spiritual Weapon as a level-2 prepared Spell Invocation that spends the Bonus Action and Spell Slot, starts caster-owned Concentration up to 1 minute, consumes caller-supplied force placement and target-adjacency facts, resolves the immediate melee Spell Attack, applies slot-scaled Force damage, records the spell-owned attack proxy, offers a later-turn Bonus Action to move the proxy up to 20 feet from caller-supplied destination facts and repeat the attack, and cleans up on Concentration or duration end;
- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for initial casting, Spell Slot spend, Concentration ownership, proxy placement, immediate attack, later Bonus Action movement and repeat attack, slot scaling, and cleanup.

Acceptance:

- automatic geometry, position derivation, line of effect, and target adjacency are table/spatial-owner responsibilities consumed through explicit witness facts;
- the spell-owned proxy is not modeled as a creature companion, ordinary object with Hit Points, or duplicated object state;
- Bonus Action economy, the one Spell Slot per turn rule, Concentration cleanup, and slot-scaled damage are covered by focused tests and promoted Quint/runtime parity;
- the level 1-2 metric row for `spiritual_weapon` is supported or precisely narrowed to any remaining accepted closure;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: D; observed-statuses: ready-for-research -->
### Task 95 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `ready-for-research`

Unit: `enthrall`. Follow-up split from Task 62.

Dependency: Task 62 (`L12G-MISSING-ENTHRALL`) done.

Inputs:

- `packages/surface/content/enthrall.json`;
- `packages/surface/content/enthrall.dhall`;
- the `enthrall` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md` and `.references/srd-5.2.1/Rules-Glossary.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell invocation/effect lifecycle, promoted Quint parity, Unit profile, owner evidence, and focused tests for Enthrall's Perception penalty.

Outputs:

- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for Enthrall's Perception penalty without modeling social attention state;
- Magic Action and level-2+ Spell Slot spending, caster-owned Concentration, caller-supplied eligible creature target list, Wisdom save, failed-save active -10 modifier to Wisdom (Perception) Ability Checks, derived Passive Perception consequence, and cleanup when Concentration or duration ends consume the authored Surface spell definition rather than duplicating spell facts;
- the fighting-caster-or-companions auto-success predicate remains a table/allegiance boundary input, so runtime support only accepts eligible target facts after that predicate has been applied.

Acceptance:

- the Perception-penalty portion of `enthrall` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Enthrall and Passive Perception without inventing social attention or allegiance state outside accepted runtime owners;
- no unrelated level-1 Loop D/L spell frontier work is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A; observed-statuses: ready-for-research -->
### Task 95 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support

Status: `ready-for-research`

Unit: `flame_blade`. Follow-up split from Task 29.

Dependency: Task 94 (`L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE`) must be done before implementation.

Inputs:

- `packages/surface/content/flame_blade.json`;
- the `flame_blade` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell-created held object lifecycle, spell invocation/effect lifecycle, light emitter projection, melee Spell Attack execution, Unit profile, owner-evidence, and promoted Quint parity tests for Flame Blade execution.

Outputs:

- supported runtime profile and owner evidence for Flame Blade as a level-2-or-higher prepared spell that spends a Bonus Action and Spell Slot, starts caster-owned Concentration, consumes caller-supplied free-hand and holding witnesses, creates active spell-created blade state, projects source-owned held light, and cleans up on Concentration, duration, or let-go events;
- runtime permits Magic Action melee spell attacks only while the blade is active, applies Fire damage with slot scaling and spellcasting ability modifier, and supports Bonus Action re-evocation from the same active spell occurrence without a second Spell Slot spend while the spell lasts;
- runtime consumes the repaired Flame Blade Spell Definition facts from Task 94 rather than duplicating free-hand, let-go, re-evocation, light, attack, or damage constants;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- Flame Blade runtime support is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Flame Blade without homebrew extensions and consumes projected Spell Definition facts rather than storing redundant spell-created blade formulas;
- no unrelated level-1 Loop D/L spell frontier, companion boundary, or object inventory behavior is implemented in this task;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 95 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE - Ray Of Enfeeblement D20 Lifecycle Runtime

Status: `ready-for-research`

Unit: `ray_of_enfeeblement`. Follow-up split from Task 42.

Dependency: Task 42 (`L12G-SPELL-RAY-OF-ENFEEBLEMENT`) done.

Inputs:

- `packages/surface/content/ray_of_enfeeblement.json`;
- the `ray_of_enfeeblement` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell invocation, active spell-effect lifecycle, roll-mode owner evidence, Unit profile evidence, and focused tests for Ray of Enfeeblement cast/save behavior.

Outputs:

- profile-subset-supported evidence, focused runtime tests, and owner evidence for Ray of Enfeeblement's Magic Action and level-2-or-higher Spell Slot spend, one creature target within 60 feet, Constitution save, success-side next-attack Disadvantage until the start of the caster's next turn, failed-save Disadvantage on Strength-based D20 Tests, end-of-target-turn Constitution repeat saves ending the spell on success, and Concentration cleanup;
- runtime state exposes one active failed-save Ray effect that later damage-roll subtraction can consume without reowning save, duration, or Concentration state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the cast/save/lifecycle and Strength D20 Test portion of `ray_of_enfeeblement` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no damage-roll subtraction behavior is implemented in this task;
- runtime behavior traces to SRD Ray of Enfeeblement and D20 Test terminology without homebrew extensions and consumes existing Spell Slot, Concentration, end-turn, and roll-mode owners instead of duplicating their state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if battle-runtime behavior changes, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: C; observed-statuses: ready-for-research -->
### Task 96 - L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY - Ray Of Enfeeblement Damage Roll Penalty Runtime

Status: `ready-for-research`

Unit: `ray_of_enfeeblement`. Follow-up split from Task 42.

Dependency: Task 95 (`L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE`) done.

Inputs:

- `packages/surface/content/ray_of_enfeeblement.json`;
- the `ray_of_enfeeblement` Unit claim follow-up split in `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- the promoted failed-save Ray effect from Task 95, battle-runtime damage-roll pipeline owner evidence, Unit profile evidence, and focused tests for source-side damage-roll subtraction.

Outputs:

- supported profile or profile-subset evidence, focused runtime tests, and owner evidence for subtracting 1d8 from all damage rolls made by the affected target while the failed-save Ray effect is active;
- subtraction covers attack, spell, and other battle-owned damage rolls through one generic spell damage-roll penalty path that applies before target-side Resistance, damage reductions, Concentration saves, and damage disposition;
- the damage path consumes the active Ray effect identity from Task 95 instead of duplicating spell duration, save, or Concentration state;
- Quint/runtime parity updates if promoted battle-runtime behavior changes;
- regenerated coverage artifacts.

Acceptance:

- the damage-roll subtraction portion of `ray_of_enfeeblement` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- runtime behavior traces to SRD Ray of Enfeeblement without homebrew extensions and consumes the promoted failed-save Ray effect plus existing damage pipeline owners instead of creating parallel spell damage state;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, package-local promoted MBT if battle-runtime behavior changes, and reviewer-loop convergence are complete.
