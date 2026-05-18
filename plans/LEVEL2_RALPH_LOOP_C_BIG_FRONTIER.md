# Level 2 Ralph Loop C - Split Tail Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 37,
      "id": "L12G-SPELL-MISTY-STEP",
      "status": "ready-for-research",
      "title": "Misty Step Runtime Support"
    },
    {
      "number": 38,
      "id": "L12G-SPELL-MOONBEAM",
      "status": "ready-for-research",
      "title": "Moonbeam Runtime Support Or Closure"
    },
    {
      "number": 39,
      "id": "L12G-SPELL-PASS-WITHOUT-TRACE",
      "status": "ready-for-research",
      "title": "Pass Without Trace Runtime Support Or Closure"
    },
    {
      "number": 40,
      "id": "L12G-SPELL-PRAYER-OF-HEALING",
      "status": "ready-for-research",
      "title": "Prayer Of Healing Runtime Support Or Closure"
    },
    {
      "number": 41,
      "id": "L12G-SPELL-PROTECTION-FROM-POISON",
      "status": "ready-for-research",
      "title": "Protection From Poison Runtime Support"
    },
    {
      "number": 42,
      "id": "L12G-SPELL-RAY-OF-ENFEEBLEMENT",
      "status": "ready-for-research",
      "title": "Ray Of Enfeeblement Runtime Support"
    },
    {
      "number": 76,
      "id": "L12G-AUTHOR-DRUID-WILD-COMPANION",
      "status": "ready-for-research",
      "title": "Druid Wild Companion Boundary Closure"
    },
    {
      "number": 77,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Druid Wild Shape Character Facts And Resource Projection"
    },
    {
      "number": 78,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME",
      "status": "ready-for-research",
      "title": "Druid Wild Shape Shape-Shifting Runtime"
    },
    {
      "number": 79,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Monk's Focus Character Facts And Resource Projection"
    },
    {
      "number": 80,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS",
      "status": "ready-for-research",
      "title": "Monk's Focus Battle Option Execution"
    },
    {
      "number": 81,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Monk Uncanny Metabolism Character Facts And Use State"
    },
    {
      "number": 82,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME",
      "status": "ready-for-research",
      "title": "Monk Uncanny Metabolism Initiative Recovery Runtime"
    },
    {
      "number": 83,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Sorcery Point Resource Facts"
    },
    {
      "number": 84,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Spell Slot To Sorcery Points"
    },
    {
      "number": 85,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Sorcery Points To Spell Slot"
    },
    {
      "number": 86,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS",
      "status": "ready-for-research",
      "title": "Sorcerer Metamagic Character Facts And Option Projection"
    },
    {
      "number": 87,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION",
      "status": "ready-for-research",
      "title": "Sorcerer Metamagic Cast-Time Option Execution"
    }
  ]
}
-->

This is the third level-2 execution lane split from Loop A tail work. Loop C owns Tasks 37-42 and follow-up Tasks 76-87 only.

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

Loop C contains 18 atomic tasks: the remaining Loop A spell tail from Misty Step through Ray of Enfeeblement, plus Druid/Monk/Sorcerer follow-up profile/runtime work moved out of Loop A.

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

## Task Details

### Task 37 - L12G-SPELL-MISTY-STEP - Misty Step Runtime Support

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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

Status: `ready-for-research`

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
