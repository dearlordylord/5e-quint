# Level 2 Ralph Loop C - Overnight Class Resources

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS",
      "status": "done",
      "title": "Monk's Focus Character Facts And Resource Projection"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS",
      "status": "done",
      "title": "Monk's Focus Battle Option Execution"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS",
      "status": "done",
      "title": "Monk Uncanny Metabolism Character Facts And Rest-Scoped Use-State Projection"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME",
      "status": "done",
      "title": "Monk Uncanny Metabolism Initiative Recovery Runtime"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS",
      "status": "ready-for-research",
      "title": "Sorcerer Font Of Magic Sorcery Point Resource Facts"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Spell Slot To Sorcery Points"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Sorcery Points To Spell Slot"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Character Facts And Option Projection"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION",
      "status": "blocked",
      "title": "Sorcerer Metamagic Cast-Time Option Execution"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME",
      "status": "ready-for-research",
      "title": "Monk Step of the Wind Jump Distance Runtime"
    },
    {
      "number": 11,
      "id": "L12G-RECURSIVE-TAIL-LOOP-C",
      "status": "blocked",
      "title": "LOOP-C Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns Monk level-2 Focus and Uncanny Metabolism resource/runtime tasks plus Sorcerer Font of Magic and Metamagic resource/runtime tasks.

Preplanned load: 10 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

## Worktree Safety Prefix

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

For each task, first read the referenced backlog or Unit-claim section, then read the matching row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`, the generated coverage reports, local RAW, and `UBIQUITOUS_LANGUAGE.md`. The backlog remains the archived pre-research source; this file is the runnable queue.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Reviewers should reject:

- support claims without executable owner evidence;
- catalog admission treated as runtime support;
- table-detached detection/social/exploration facts added as runtime state;
- object, geometry, light, or pathfinding derivation hidden inside spell support;
- duplicated Spell Definition, Spell Access, Spell Invocation, Spell Effect, Character Sheet, resource, or class progression state;
- automation of player choices, table adjudication, or companion/familiar turn/action control; callers may only provide typed/branded player choices or table-witness facts at explicit boundaries.

## Task Output Contract

Every implementation task must leave its Unit in one concrete end state:

- `supported-profile` with deterministic admission/projection evidence and focused owner tests;
- `profile-subset-supported` only when the executable subset is precise and every residual has an accepted closure kind;
- `unsupported-profile` with an accepted runtime-detached closure when the rule is outside product runtime;
- a smaller follow-up split only when RAW proves the listed task cannot fit in one coding session, with the original metric row left in a precise blocked state rather than generic todo wording.

Each task output must include:

- a RAW traceability note listing every modeled, supported-subset, and closed residual clause with exact local SRD file/heading/line references or an `ASSUMPTIONS.md` entry; if no local RAW source exists, the task must block or close instead of inferring mechanics from backlog wording;
- a boundary discipline note: when the task touches a boundary that uses bare primitives for domain ids, spell/unit/action/condition/damage identifiers, resource names, or authored content names, Ralph must either fix that touched boundary with existing branded/domain types or block with a precise follow-up. Do not ignore touched primitive/domain-id/authored-identity dispatch as pre-existing;
- when authoring or changing SRD catalog records, SRD provenance must be modeled at the SRD collection boundary so mixed-provenance or mixed-license records cannot be admitted; 5e-tools or other structured inputs, if consulted, remain structured input only and are not stored as provenance.

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Do not run battle-runtime MBT unless the task changes promoted battle-runtime behavior and focused tests cannot cover the changed boundary. If MBT is needed, use the repository MBT scarcity protocol.

## Lane Boundaries

- Base branch: `ralph/level2-loop-c/overnight-class-resources`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-c`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not touch the external Claude lane in `plans/LEVEL2_RALPH_LOOP_CLAUDE_STASHED_FRONTIER.md` or `/workspace/typescript/dnd-ralph-level2-claude`.
- Do not touch active Wild Shape manual-review work in `/workspace/typescript/dnd-wild-shape-runtime-c-manual-review`.
- Do not start companion/familiar work, including Find Familiar or companion-control automation.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## Recursive Tail Policy

The final task is intentionally blocked on every real task in this plan and placed last. It auto-unblocks only after the planned implementation queue is done. It must plan new concrete work from current metrics and history; it must not substitute for same-plan dependency unblocking, and it must not reopen external Claude, Wild Shape, or companion work.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection | done | completed baseline | C lane; Unit `monk_monks_focus`. |
| 2 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution | done | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | C lane; Unit `monk_monks_focus`. |
| 3 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Rest-Scoped Use-State Projection | done | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | C lane; Unit `monk_uncanny_metabolism`. |
| 4 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime | done | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS | C lane; Unit `monk_uncanny_metabolism`. |
| 5 | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts | ready-for-research | completed baseline | C lane; Unit `sorcerer_font_of_magic`. |
| 6 | L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_font_of_magic`. |
| 7 | L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_font_of_magic`. |
| 8 | L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_metamagic`. |
| 9 | L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution | blocked | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS | C lane; Unit `sorcerer_metamagic`. |
| 10 | L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step of the Wind Jump Distance Runtime | ready-for-research | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS | C lane; Unit `monk_monks_focus`. |
| 11 | L12G-RECURSIVE-TAIL-LOOP-C - LOOP-C Recursive Next-Batch Planning Tail | blocked | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS, L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION, L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME | Last-resort next-batch planning safety net; auto-unblocks only after every real task in this plan is `done`. |

## Task Details

### Task 1 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection

Status: `done`

Unit: `monk_monks_focus`.
Origin: Original backlog task 79.
Dependencies: none.

Pre-researched scope:

- Retain Monk Focus source facts and project the shared Focus Point resource, level-2 progression, cap, and recovery facts without duplicating class progression state.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- satisfy the output contract from Original backlog task 79.
- leave `monk_monks_focus` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 2 - L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution

Status: `done`

Unit: `monk_monks_focus`.
Origin: Original backlog task 80.
Dependencies: L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS.

Pre-researched scope:

- Execute supported Monk Focus battle options against the shared Focus Point resource, with focused tests and no synthetic option-local resource pool.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- satisfy the output contract from Original backlog task 80.
- leave `monk_monks_focus` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 3 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Rest-Scoped Use-State Projection

Status: `done`

Unit: `monk_uncanny_metabolism`.
Origin: Original backlog task 81.
Dependencies: L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS.

Pre-researched scope:

- Project durable Uncanny Metabolism feature facts separately from rest-scoped use state, deriving the runtime recovery relationship from the shared Focus Point owner.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_uncanny_metabolism`.

Outputs:

- satisfy the output contract from Original backlog task 81.
- leave `monk_uncanny_metabolism` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 4 - L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime

Status: `done`

Unit: `monk_uncanny_metabolism`.
Origin: Original backlog task 82.
Dependencies: L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS.

Pre-researched scope:

- Promote initiative-time recovery/runtime behavior using the existing Focus Point owner and Uncanny Metabolism rest-scoped use-state facts.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `monk_uncanny_metabolism`.

Outputs:

- satisfy the output contract from Original backlog task 82.
- leave `monk_uncanny_metabolism` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 5 - L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts

Status: `ready-for-research`

Unit: `sorcerer_font_of_magic`.
Origin: Original backlog task 83.
Dependencies: none.

Pre-researched scope:

- Retain Font of Magic feature facts and project shared Sorcery Point pool, level-2 progression, cap, and Long Rest reset without duplicating class progression or Metamagic option state.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the output contract from Original backlog task 83.
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 6 - L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points

Status: `blocked`

Unit: `sorcerer_font_of_magic`.
Origin: Original backlog task 84.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS.

Pre-researched scope:

- Execute no-action slot-to-Sorcery-Point conversion using existing Spell Slot state and the shared Sorcery Point resource cap.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the output contract from Original backlog task 84.
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 7 - L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot

Status: `blocked`

Unit: `sorcerer_font_of_magic`.
Origin: Original backlog task 85.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS.

Pre-researched scope:

- Execute Bonus Action Sorcery-Point-to-temporary-Spell-Slot conversion, RAW conversion-cost table, minimum Sorcerer level, slot-level cap, and Long Rest expiry.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_font_of_magic`.

Outputs:

- satisfy the output contract from Original backlog task 85.
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 8 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Original backlog task 86.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS.

Pre-researched scope:

- Project SRD Metamagic options present in `.references/srd-5.2.1/Classes/Sorcerer.md` as typed option facts with one canonical branded option id or typed procedure fact; display/authored names stay derived from the SRD catalog only where presentation needs them. Include replacement lifecycle, option costs, stacking exceptions, and link to the shared Font of Magic Sorcery Point resource. Non-SRD examples must be synthetic and must not copy PHB+ option names, ids, slugs, or catalog identity.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- satisfy the output contract from Original backlog task 86.
- leave `sorcerer_metamagic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 9 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Original backlog task 87.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS.

Pre-researched scope:

- Execute character-selected Metamagic options at Spell Invocation time, enforcing Sorcery Point spend, one-option-per-Spell-Invocation plus RAW exceptions, Quickened limits, and option-specific modifications. Runtime execution must dispatch on typed option facts/procedure shapes, not option name, slug, unit id, or provenance text.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- satisfy the output contract from Original backlog task 87.
- leave `sorcerer_metamagic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 10 - L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step of the Wind Jump Distance Runtime

Status: `ready-for-research`

Unit: `monk_monks_focus`.
Origin: Split residual from Original backlog task 80.
Dependencies: L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS.

Pre-researched scope:

- Execute Step of the Wind's doubled jump distance through an ordinary Long Jump and High Jump movement witness boundary, using the existing movement budget and caller-supplied legal landing/table-spatial facts rather than storing an inert Monk-only active effect.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`, especially `Classes/Monk.md`, jump rules, and action/movement rules;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface Monk's Focus `jumpDistanceMultiplier` facts, promoted Jump movement replacement/witness code, Unit claims, owner evidence, and focused tests for `monk_monks_focus`.

Outputs:

- satisfy the output contract from Original backlog task 80 for the remaining Step of the Wind jump-distance clause;
- leave `monk_monks_focus` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- doubled Long Jump and High Jump distance is consumed through the shared movement witness boundary without duplicating Strength, Speed, movement budget, or table-spatial landing state;
- focused package tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 11 - L12G-RECURSIVE-TAIL-LOOP-C - LOOP-C Recursive Next-Batch Planning Tail

Status: `blocked`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS, L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION, L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude and Wild Shape work, avoid companion work, and create 5-10 new atomic Ralph tasks for level-2 class resource/profile frontier that does not overlap active spell lanes.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- all current `plans/LEVEL2_RALPH_LOOP_*.md` files;
- git history for recently completed level-1/2 support tasks;
- local RAW and `UBIQUITOUS_LANGUAGE.md` for any newly proposed rule task.

Outputs:

- create or update a follow-up Ralph plan with 5-10 new atomic tasks, each with status, dependencies, clear inputs, outputs, and acceptance criteria;
- exclude active external Claude work, active Wild Shape manual-review work, companion/familiar work, and tasks already done in git history;
- when a potential task depends on another active lane, record it as `deferred-external` or put it behind a same-plan blocked dependency rather than making it runnable;
- commit the planning change and then continue with the first runnable task if the harness supports continuing; otherwise leave the plan ready for the orchestrator.

Acceptance:

- the new tasks are atomic enough for one coding session each;
- the new tasks do not duplicate existing plan tasks or completed git history;
- dependency blockers are same-plan IDs when Ralph should auto-unblock them;
- external blockers are labeled explicitly and are not runnable;
- `git diff --check` passes;
- reviewer-loop convergence is run over the plan text and any reasonable planning notes are fixed.
