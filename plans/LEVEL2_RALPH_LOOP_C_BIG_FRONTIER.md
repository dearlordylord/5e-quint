# Level 2 Ralph Loop C - Split Tail Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 37,
      "id": "L12G-SPELL-MISTY-STEP",
      "status": "done",
      "title": "Misty Step Runtime Support"
    },
    {
      "number": 38,
      "id": "L12G-SPELL-MOONBEAM",
      "status": "done",
      "title": "Moonbeam Runtime Support Or Closure"
    },
    {
      "number": 39,
      "id": "L12G-SPELL-PASS-WITHOUT-TRACE",
      "status": "done",
      "title": "Pass Without Trace Runtime Support Or Closure"
    },
    {
      "number": 40,
      "id": "L12G-SPELL-PRAYER-OF-HEALING",
      "status": "done",
      "title": "Prayer Of Healing Runtime Support Or Closure"
    },
    {
      "number": 41,
      "id": "L12G-SPELL-PROTECTION-FROM-POISON",
      "status": "done",
      "title": "Protection From Poison Runtime Support"
    },
    {
      "number": 42,
      "id": "L12G-SPELL-RAY-OF-ENFEEBLEMENT",
      "status": "done",
      "title": "Ray Of Enfeeblement Runtime Support"
    },
    {
      "number": 76,
      "id": "L12G-AUTHOR-DRUID-WILD-COMPANION",
      "status": "ready-for-research",
      "title": "Druid Wild Companion Boundary Closure"
    }
  ]
}
-->

This is the third level-2 execution lane split from Loop A tail work. Loop C owns Tasks 37-42 and follow-up Tasks 76-87 and 90-96 only.

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

Loop C contains 25 atomic tasks: the remaining Loop A spell tail from Misty Step through Ray of Enfeeblement, Druid/Monk/Sorcerer follow-up profile/runtime work moved out of Loop A, the Moonbeam follow-up split discovered by Task 38, the Prayer of Healing follow-up split discovered by Task 40, and the Ray of Enfeeblement follow-up split discovered by Task 42.

It excludes Loop A Tasks 22-36 and 88-89, Loop B Tasks 43-58, Loop D Tasks 59-75, all level-1 Loop D/L work, companion autonomous-control, familiar autonomous-control, and Counterspell work. Wild Companion work in this lane is only the table-choice/source-link boundary; no autonomous companion decision engine belongs here.

| Lane | Gate/source | Task | Unit |
| ---: | --- | --- | --- |
| 37 | 39 | `L12G-SPELL-MISTY-STEP` | `misty_step` |
| 38 | 40 | `L12G-SPELL-MOONBEAM` | `moonbeam` |
| 39 | 41 | `L12G-SPELL-PASS-WITHOUT-TRACE` | `pass_without_trace` |
| 40 | 42 | `L12G-SPELL-PRAYER-OF-HEALING` | `prayer_of_healing` |
| 41 | 43 | `L12G-SPELL-PROTECTION-FROM-POISON` | `protection_from_poison` |
| 42 | 44 | `L12G-SPELL-RAY-OF-ENFEEBLEMENT` | `ray_of_enfeeblement` |
| 76 | 13 | `L12G-AUTHOR-DRUID-WILD-COMPANION` | `druid_wild_companion` |
| 77 | 12 follow-up | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | `druid_wild_shape` |
| 78 | 12 follow-up | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` | `druid_wild_shape` |
| 79 | 13 follow-up | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | `monk_monks_focus` |
| 80 | 13 follow-up | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | `monk_monks_focus` |
| 81 | 15 follow-up | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS` | `monk_uncanny_metabolism` |
| 82 | 15 follow-up | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME` | `monk_uncanny_metabolism` |
| 83 | 18 follow-up | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | `sorcerer_font_of_magic` |
| 84 | 18 follow-up | `L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS` | `sorcerer_font_of_magic` |
| 85 | 18 follow-up | `L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS` | `sorcerer_font_of_magic` |
| 86 | 19 follow-up | `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS` | `sorcerer_metamagic` |
| 87 | 19 follow-up | `L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION` | `sorcerer_metamagic` |
| 90 | 38 follow-up | `L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE` | `moonbeam` |
| 91 | 38 follow-up | `L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME` | `moonbeam` |
| 92 | 38 follow-up | `L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER` | `moonbeam` |
| 93 | 40 follow-up | `L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST` | `prayer_of_healing` |
| 94 | 40 follow-up | `L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST` | `prayer_of_healing` |
| 95 | 42 follow-up | `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE` | `ray_of_enfeeblement` |
| 96 | 42 follow-up | `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY` | `ray_of_enfeeblement` |

## Follow-Up Dependencies

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| `L12G-AUTHOR-DRUID-WILD-COMPANION` | `L12G-AUTHOR-DRUID-WILD-SHAPE` | Druid level-2 admission must retain both level-2 feature refs without treating companion execution as Wild Shape support. |
| `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | `L12G-AUTHOR-DRUID-WILD-COMPANION` | Character creation/sheet projection needs the Druid level-2 feature boundary closed before projecting Wild Shape resources and known forms. |
| `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` | `L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS` | Shape-shifting runtime should consume the projected Wild Shape resource, duration, and known-form facts instead of duplicating class progression state. |
| `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | `L12G-AUTHOR-MONK-MONKS-FOCUS`, `L12G-AUTHOR-MONK-UNARMORED-MOVEMENT`, `L12G-AUTHOR-MONK-UNCANNY-METABOLISM` | Monk level-2 admission should retain the full level-2 feature grant set before projecting Focus Point resources from the authored Monk's Focus record. |
| `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | Battle option execution should consume the projected shared Focus Point resource instead of creating per-feature pools. |
| `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS` | `L12G-AUTHOR-MONK-UNCANNY-METABOLISM`, `L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS` | Uncanny Metabolism use-state projection should retain the authored feature and link to the already-owned shared Focus Point resource and Martial Arts die source. |
| `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME` | `L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS`, `L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS` | Initiative-window recovery should consume the projected once-per-Long-Rest use state and shared Focus Point battle handoff instead of creating a per-feature pool. |
| `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | `L12G-AUTHOR-SORCERER-FONT-OF-MAGIC`, `L12G-AUTHOR-SORCERER-METAMAGIC` | Sorcerer level-2 admission should retain the full level-2 feature grant set before projecting the shared Sorcery Point resource from Font of Magic. |
| `L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS` | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Spell Slot to Sorcery Point conversion should consume existing Spell Slot state and the projected shared Sorcery Point resource instead of creating per-feature resource state. |
| `L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS` | `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Sorcery Point to temporary Spell Slot creation should consume the projected shared Sorcery Point resource and own the temporary slot lifecycle without duplicating class progression state. |
| `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS` | `L12G-AUTHOR-SORCERER-METAMAGIC`, `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Metamagic option projection should retain the authored Metamagic feature and link known option facts to the shared Sorcery Point resource projected from Font of Magic instead of duplicating point-pool state. |
| `L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION` | `L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS`, `L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS` | Cast-time Metamagic execution should consume known-option and shared Sorcery Point resource facts rather than creating a Metamagic-local point pool. |
| `L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE` | `L12G-SPELL-MOONBEAM` | Moonbeam Surface authoring must capture the RAW movable Cylinder, Dim Light, recurring save, once-per-turn, slot-scaling, and shape-shift rider facts before runtime owners consume them. |
| `L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME` | `L12G-FOLLOWUP-MOONBEAM-SURFACE-LIFECYCLE` | Runtime zone execution should consume the repaired Moonbeam Spell Definition facts and caller-supplied table/spatial witnesses instead of duplicating area membership or geometry derivation. |
| `L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER` | `L12G-FOLLOWUP-MOONBEAM-MOVABLE-ZONE-RUNTIME`, `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME` | The failed-save rider should attach to Moonbeam save results and consume a promoted shape-shifted/true-form state instead of creating Moonbeam-local shape-shifting state. |
| `L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST` | `L12G-SPELL-PRAYER-OF-HEALING` | Prayer of Healing Surface authoring must capture the Short Rest benefit, per-recipient Long Rest lockout, completed 10-minute casting boundary, and slot-scaled healing facts before Character Sheet runtime consumes them. |
| `L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST` | `L12G-FOLLOWUP-PRAYER-OF-HEALING-SURFACE-REST` | Character Sheet runtime should consume repaired Spell Definition facts and existing rest/spell-slot owners instead of duplicating Short Rest algorithms, Hit Point maximum capping, or Spell Slot recovery state. |
| `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE` | `L12G-SPELL-RAY-OF-ENFEEBLEMENT` | Ray of Enfeeblement runtime must first own the cast, save, Concentration, repeat-save, success-side next-attack, and failed-save Strength D20 Test lifecycle before damage-roll subtraction consumes that active effect. |
| `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY` | `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE` | Damage-roll subtraction should consume the promoted failed-save Ray effect identity and lifecycle instead of duplicating spell duration, save, or Concentration state in the damage pipeline. |

## Task Details

## Wrap-Up Directive

This lane is in organic shutdown mode. Complete only Task 76 - L12G-AUTHOR-DRUID-WILD-COMPANION - Druid Wild Companion Boundary Closure, run reviewer-loop convergence, merge the completed task through this integration branch, and then stop. Do not start another task from this file.

All other unfinished tasks from this lane were moved to `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md`. That backlog is storage for future orchestration, not active work for this lane.

### Task 37 - L12G-SPELL-MISTY-STEP - Misty Step Runtime Support

Status: `done`

Unit: `misty_step`. Gate task: 39 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `misty_step`.

Outputs:

- one concrete end state from the Task Output Contract for `misty_step`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `misty_step` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 38 - L12G-SPELL-MOONBEAM - Moonbeam Runtime Support Or Closure

Status: `done`

Unit: `moonbeam`. Gate task: 40 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `moonbeam`.

Outputs:

- one concrete end state from the Task Output Contract for `moonbeam`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `moonbeam` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 39 - L12G-SPELL-PASS-WITHOUT-TRACE - Pass Without Trace Runtime Support Or Closure

Status: `done`

Unit: `pass_without_trace`. Gate task: 41 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `pass_without_trace`.

Outputs:

- one concrete end state from the Task Output Contract for `pass_without_trace`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `pass_without_trace` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 40 - L12G-SPELL-PRAYER-OF-HEALING - Prayer Of Healing Runtime Support Or Closure

Status: `done`

Unit: `prayer_of_healing`. Gate task: 42 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `prayer_of_healing`.

Outputs:

- one concrete end state from the Task Output Contract for `prayer_of_healing`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `prayer_of_healing` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 41 - L12G-SPELL-PROTECTION-FROM-POISON - Protection From Poison Runtime Support

Status: `done`

Unit: `protection_from_poison`. Gate task: 43 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `protection_from_poison`.

Outputs:

- one concrete end state from the Task Output Contract for `protection_from_poison`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `protection_from_poison` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 42 - L12G-SPELL-RAY-OF-ENFEEBLEMENT - Ray Of Enfeeblement Runtime Support

Status: `done`

Unit: `ray_of_enfeeblement`. Gate task: 44 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `ray_of_enfeeblement`.

Outputs:

- one concrete end state from the Task Output Contract for `ray_of_enfeeblement`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `ray_of_enfeeblement` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

### Task 76 - L12G-AUTHOR-DRUID-WILD-COMPANION - Druid Wild Companion Boundary Closure

Status: `ready-for-research`

Unit: `druid_wild_companion`. Gate task: 13 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Dependency: Task 12 (`L12G-AUTHOR-DRUID-WILD-SHAPE`) done.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `druid_wild_companion` and `find_familiar`.

Outputs:

- one concrete end state from the Task Output Contract for `druid_wild_companion`;
- Druid level-2 progression admission can retain both Wild Shape and Wild Companion feature refs without treating companion execution as Wild Shape support;
- companion execution remains closed separately rather than pulled into Wild Shape.

Acceptance:

- the level 1-2 metric row for `druid_wild_companion` is supported, accepted-closed, or precisely blocked by a smaller companion follow-up split;
- no level-1 Loop D/L work or broad companion runtime execution is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.
