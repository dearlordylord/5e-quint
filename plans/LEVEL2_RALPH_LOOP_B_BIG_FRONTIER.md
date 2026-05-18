# Level 2 Ralph Loop B - Split Big Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 43,
      "id": "L12G-SPELL-SCORCHING-RAY",
      "status": "done",
      "title": "Scorching Ray Runtime Support"
    },
    {
      "number": 44,
      "id": "L12G-SPELL-SEE-INVISIBILITY",
      "status": "done",
      "title": "See Invisibility Runtime Support Or Closure"
    },
    {
      "number": 45,
      "id": "L12G-SPELL-SHATTER",
      "status": "done",
      "title": "Shatter Runtime Support"
    },
    {
      "number": 46,
      "id": "L12G-SPELL-SHINING-SMITE",
      "status": "done",
      "title": "Shining Smite Runtime Support"
    },
    {
      "number": 47,
      "id": "L12G-SPELL-SPIDER-CLIMB",
      "status": "done",
      "title": "Spider Climb Runtime Support"
    },
    {
      "number": 48,
      "id": "L12G-SPELL-SPIKE-GROWTH",
      "status": "done",
      "title": "Spike Growth Runtime Support Or Closure"
    },
    {
      "number": 49,
      "id": "L12G-SPELL-SPIRITUAL-WEAPON",
      "status": "done",
      "title": "Spiritual Weapon Runtime Support"
    },
    {
      "number": 50,
      "id": "L12G-SPELL-WARDING-BOND",
      "status": "ready-for-research",
      "title": "Warding Bond Runtime Support"
    }
  ]
}
-->

This is the second level-2 execution lane. Loop B owns Tasks 43-58 and Tasks 90-94. Loop D owns Tasks 59-75. Loop A owns Tasks 22-36 and 88-89; Loop C owns Tasks 37-42 and 76-87. Do not implement or re-open sibling-lane tasks from this lane.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

For each task id in this plan, use the matching row in
`plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` as the pre-researched owner shape
and required output. This lane is an execution manifest over that gate, not a
second copy of the same domain details.

Each task starts by reading:

- the matching row in `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
  or `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- the local RAW source under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, Unit profiles, owner-evidence
  manifests, and focused tests for the Unit id.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer
loop must include RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code-review passes. Fix every reasonable finding,
explicitly reject only findings with a concrete reason, and repeat until no
reasonable findings remain.

Reviewers should reject:

- support claims without executable owner evidence;
- catalog admission treated as runtime support;
- table-detached detection/social/exploration facts added as runtime state;
- object, geometry, light, or pathfinding derivation hidden inside spell
  support;
- duplicated Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Character Sheet, or resource state;
- companion behavior.

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

Loop B contains 21 atomic tasks: Tasks 43-58, from Scorching Ray through
Detect Thoughts, plus Tasks 90-94 for the See Invisibility, Spike Growth, and Spiritual Weapon follow-up splits. Tasks
59-75 have moved to Loop D. The historical manifest rows for Tasks 59-75 remain
below, but they stay `deferred` here so Loop B cannot pick them. It excludes all
level-1, Loop D/L, companion/familiar boundary, and Counterspell work.

| Lane | Gate | Task | Unit |
| ---: | ---: | --- | --- |
| 43 | 45 | `L12G-SPELL-SCORCHING-RAY` | `scorching_ray` |
| 44 | 46 | `L12G-SPELL-SEE-INVISIBILITY` | `see_invisibility` |
| 45 | 47 | `L12G-SPELL-SHATTER` | `shatter` |
| 46 | 48 | `L12G-SPELL-SHINING-SMITE` | `shining_smite` |
| 47 | 49 | `L12G-SPELL-SPIDER-CLIMB` | `spider_climb` |
| 48 | 50 | `L12G-SPELL-SPIKE-GROWTH` | `spike_growth` |
| 49 | 51 | `L12G-SPELL-SPIRITUAL-WEAPON` | `spiritual_weapon` |
| 50 | 52 | `L12G-SPELL-WARDING-BOND` | `warding_bond` |
| 51 | 53 | `L12G-SPELL-WEB` | `web` |
| 52 | 54 | `L12G-MISSING-ANIMAL-MESSENGER` | `animal_messenger` |
| 53 | 55 | `L12G-MISSING-ARCANISTS-MAGIC-AURA` | `arcanists_magic_aura` |
| 54 | 56 | `L12G-MISSING-AUGURY` | `augury` |
| 55 | 57 | `L12G-MISSING-CALM-EMOTIONS` | `calm_emotions` |
| 56 | 58 | `L12G-MISSING-DARKNESS` | `darkness` |
| 57 | 59 | `L12G-MISSING-DARKVISION` | `darkvision` |
| 58 | 60 | `L12G-MISSING-DETECT-THOUGHTS` | `detect_thoughts` |
| 90 | 46 | `L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT` | `see_invisibility` |
| 91 | 50 | `L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME` | `spike_growth` |
| 92 | 50 | `L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION` | `spike_growth` |
| 93 | 51 | `L12G-FOLLOWUP-SPIRITUAL-WEAPON-SURFACE-PROXY-SHAPE` | `spiritual_weapon` |
| 94 | 51 | `L12G-FOLLOWUP-SPIRITUAL-WEAPON-PERSISTENT-ATTACK-RUNTIME` | `spiritual_weapon` |
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

## Wrap-Up Directive

This lane is in organic shutdown mode. Complete only Task 50 - L12G-SPELL-WARDING-BOND - Warding Bond Runtime Support, run reviewer-loop convergence, merge the completed task through this integration branch, and then stop. Do not start another task from this file.

All other unfinished tasks from this lane were moved to `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`. That backlog is storage for future orchestration, not active work for this lane.

### Task 43 - L12G-SPELL-SCORCHING-RAY - Scorching Ray Runtime Support

Status: `done`

Unit: `scorching_ray`. Gate task: 45 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `scorching_ray`.
- continuation WIP, if still available, on branch `backup/level2-b-task-43-scorching-ray-wip-20260518-121151`
  at commit `c9b0cb72be980577800e685dd16fb67863d56a2f`; inspect and cherry-pick/rework it only
  if it still matches RAW, ubiquitous language, architecture, and the task output contract.

Outputs:

- one concrete end state from the Task Output Contract for `scorching_ray`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `scorching_ray` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 44 - L12G-SPELL-SEE-INVISIBILITY - See Invisibility Runtime Support Or Closure

Status: `done`

Unit: `see_invisibility`. Gate task: 46 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Result: See Invisibility is installed in the SRD Unit catalog with a distinct
`see_invisible_and_ethereal` Surface effect atom and an `unsupported-profile`
claim. Runtime behavior remains executable as Task 90 rather than being
collapsed into Truesight or catalog admission.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `see_invisibility`.

Outputs:

- one concrete end state from the Task Output Contract for `see_invisibility`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `see_invisibility` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 45 - L12G-SPELL-SHATTER - Shatter Runtime Support

Status: `done`

Unit: `shatter`. Gate task: 47 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Result: Shatter is a `supported-profile` Unit for save-gated Thunder damage,
Construct save Disadvantage, slot scaling, and caller-supplied nonmagical
unattended object damage facts. Automatic area membership, line of effect,
object inventory/material/magical/worn-carried discovery, and grid geometry
remain runtime-detached table/spatial derivations outside the Shatter runtime
profile.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `shatter`.

Outputs:

- one concrete end state from the Task Output Contract for `shatter`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `shatter` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 46 - L12G-SPELL-SHINING-SMITE - Shining Smite Runtime Support

Status: `done`

Unit: `shining_smite`. Gate task: 48 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `shining_smite`.

Outputs:

- one concrete end state from the Task Output Contract for `shining_smite`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `shining_smite` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 47 - L12G-SPELL-SPIDER-CLIMB - Spider Climb Runtime Support

Status: `done`

Unit: `spider_climb`. Gate task: 49 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Result: Spider Climb is a `supported-profile` Unit for Magic Action casting
with a level-2-or-higher Spell Slot, caller-supplied known-willing touched
creature targets, one additional willing target per slot level above 2,
Concentration cleanup, and a Climb Speed grant equal to the target's effective
Speed. Automatic vertical-surface and ceiling path legality, hands-free
traversal presentation, collision/pathfinding, and final-position derivation
remain caller/table-owned spatial movement facts outside the promoted runtime
profile.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spider_climb`.

Outputs:

- one concrete end state from the Task Output Contract for `spider_climb`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `spider_climb` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 48 - L12G-SPELL-SPIKE-GROWTH - Spike Growth Runtime Support Or Closure

Status: `done`

Unit: `spike_growth`. Gate task: 50 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Result: Spike Growth remains an `unsupported-profile` Unit in Task 48. Runtime
work is split into Task 91 for the battle-visible movement hazard and Task 92
for the camouflaged terrain recognition/Search boundary, rather than treating
catalog admission or Grease-specific ground-hazard facts as Spike Growth
runtime support.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spike_growth`.

Outputs:

- one concrete end state from the Task Output Contract for `spike_growth`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `spike_growth` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 49 - L12G-SPELL-SPIRITUAL-WEAPON - Spiritual Weapon Runtime Support

Status: `done`

Unit: `spiritual_weapon`. Gate task: 51 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Result: Spiritual Weapon remains an `unsupported-profile` Unit in Task 49.
Runtime work is split into Task 93 for the spell-owned proxy Surface shape and
Task 94 for the battle-visible persistent attack runtime, rather than treating
catalog admission, a generic object, or a companion-like controller as
Spiritual Weapon support. Local SRD 5.2.1 text requires Bonus Action casting,
Concentration up to 1 minute, a floating spectral force placed within range,
an immediate melee Spell Attack, later Bonus Action force movement plus repeat
attack, Force damage, and higher-slot damage scaling.
RAW trace: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:512` through
`:525`, with the Cleric list entry at `.references/srd-5.2.1/Classes/Cleric.md:196`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `spiritual_weapon`.

Outputs:

- one concrete end state from the Task Output Contract for `spiritual_weapon`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `spiritual_weapon` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 50 - L12G-SPELL-WARDING-BOND - Warding Bond Runtime Support

Status: `ready-for-research`

Unit: `warding_bond`. Gate task: 52 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `warding_bond`.

Outputs:

- one concrete end state from the Task Output Contract for `warding_bond`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `warding_bond` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.
