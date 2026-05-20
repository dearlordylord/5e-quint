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
      "status": "done",
      "title": "Sorcerer Font Of Magic Sorcery Point Resource Facts"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS",
      "status": "done",
      "title": "Sorcerer Font Of Magic Spell Slot To Sorcery Points"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS",
      "status": "done",
      "title": "Sorcerer Font Of Magic Sorcery Points To Spell Slot"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS",
      "status": "done",
      "title": "Sorcerer Metamagic Character Facts And Option Projection"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT",
      "status": "done",
      "title": "Sorcerer Metamagic Advancement Replacement"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION",
      "status": "done",
      "title": "Sorcerer Metamagic Cast-Time Option Execution"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE",
      "status": "ready-for-research",
      "title": "Sorcerer Metamagic Battle Resource Bridge"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED",
      "status": "blocked",
      "title": "Sorcerer Metamagic Cast Governor And Quickened"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Save Options"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Cast Property Options"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Damage Shape Options"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS",
      "status": "blocked",
      "title": "Sorcerer Metamagic Reroll Options"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME",
      "status": "ready-for-research",
      "title": "Monk Step of the Wind Jump Distance Runtime"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE",
      "status": "blocked",
      "title": "Sorcerer Font Of Magic Bonus Action And Battle Slot Source"
    },
    {
      "number": 19,
      "id": "L12G-RECURSIVE-TAIL-LOOP-C",
      "status": "blocked",
      "title": "LOOP-C Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns Monk level-2 Focus and Uncanny Metabolism resource/runtime tasks plus Sorcerer Font of Magic and Metamagic resource/runtime tasks.

Preplanned load: 18 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

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
- Do not touch active Moonbeam work owned by external/manual agents.
- Do not start companion/familiar work, including Find Familiar or companion-control automation.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## Recursive Tail Policy

The final task is intentionally blocked on every real task in this plan and placed last. It auto-unblocks only after the planned implementation queue is done. It must plan new concrete work from current metrics and history; it must not substitute for same-plan dependency unblocking, and it must not reopen external Claude, Wild Shape, Moonbeam, or companion work.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS - Monk's Focus Character Facts And Resource Projection | done | completed baseline | C lane; Unit `monk_monks_focus`. |
| 2 | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS - Monk's Focus Battle Option Execution | done | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | C lane; Unit `monk_monks_focus`. |
| 3 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS - Monk Uncanny Metabolism Character Facts And Rest-Scoped Use-State Projection | done | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS | C lane; Unit `monk_uncanny_metabolism`. |
| 4 | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME - Monk Uncanny Metabolism Initiative Recovery Runtime | done | L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS | C lane; Unit `monk_uncanny_metabolism`. |
| 5 | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS - Sorcerer Font Of Magic Sorcery Point Resource Facts | done | completed baseline | C lane; Unit `sorcerer_font_of_magic`. |
| 6 | L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS - Sorcerer Font Of Magic Spell Slot To Sorcery Points | done | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_font_of_magic`. |
| 7 | L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS - Sorcerer Font Of Magic Sorcery Points To Spell Slot | done | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_font_of_magic`. |
| 8 | L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS - Sorcerer Metamagic Character Facts And Option Projection | done | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS | C lane; Unit `sorcerer_metamagic`. |
| 9 | L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT - Sorcerer Metamagic Advancement Replacement | done | L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS | C lane; Unit `sorcerer_metamagic`. |
| 10 | L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution | done | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT | C lane; Unit `sorcerer_metamagic`; closed as executable follow-up split. |
| 11 | L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE - Sorcerer Metamagic Battle Resource Bridge | ready-for-research | L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT | C lane; Unit `sorcerer_metamagic`. |
| 12 | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED - Sorcerer Metamagic Cast Governor And Quickened | blocked | L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE | C lane; Unit `sorcerer_metamagic`. |
| 13 | L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS - Sorcerer Metamagic Save Options | blocked | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED | C lane; Unit `sorcerer_metamagic`. |
| 14 | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS - Sorcerer Metamagic Cast Property Options | blocked | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED | C lane; Unit `sorcerer_metamagic`. |
| 15 | L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS - Sorcerer Metamagic Damage Shape Options | blocked | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED | C lane; Unit `sorcerer_metamagic`. |
| 16 | L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS - Sorcerer Metamagic Reroll Options | blocked | L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED | C lane; Unit `sorcerer_metamagic`. |
| 17 | L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step of the Wind Jump Distance Runtime | ready-for-research | L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS | C lane; Unit `monk_monks_focus`. |
| 18 | L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE - Sorcerer Font Of Magic Bonus Action And Battle Slot Source | blocked | L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE | C lane; Unit `sorcerer_font_of_magic`; coordinates shared Sorcery Point battle state with Metamagic bridge. |
| 19 | L12G-RECURSIVE-TAIL-LOOP-C - LOOP-C Recursive Next-Batch Planning Tail | blocked | L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS, L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT, L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE, L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED, L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS, L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE | Last-resort next-batch planning safety net; auto-unblocks only after every real task in this plan is `done`. |

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

Unit: `sorcerer_metamagic`.
Origin: Original backlog task 86.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS.

Pre-researched scope:

- Project SRD Metamagic options present in `.references/srd-5.2.1/Classes/Sorcerer.md` as typed option facts with one canonical branded option id or typed procedure fact; display/authored names stay derived from the SRD catalog only where presentation needs them. Include replacement lifecycle, option costs, stacking exceptions, and link to the shared Font of Magic Sorcery Point resource. Non-SRD examples must be synthetic and must not copy PHB+ option names, ids, slugs, or catalog identity.
- Task 8 lands the acquisition-time character fact subset: selected Metamagic option facts, option costs, stacking facts, spell-use limit, and shared Font of Magic Sorcery Point resource link. `L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT` owns the remaining replacement lifecycle and later option-gain workflow.

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

### Task 9 - L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT - Sorcerer Metamagic Advancement Replacement

Status: `done`

Unit: `sorcerer_metamagic`.
Origin: Split residual from Original backlog task 86 after Task 8 projected acquisition-time Metamagic option facts but left Sorcerer-level replacement and later option gains unconsumed by the production CharacterBuild advancement workflow.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS.

Pre-researched scope:

- Consume the Metamagic replacement source fact during Sorcerer level gain, preserving the known-option count, replacing exactly one known option with one unknown option, and adding the two new known options at Sorcerer levels 10 and 17 from the Surface choice-count thresholds without duplicating class progression or option roster state.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`, especially `Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface Metamagic `choiceCount` and `changeOn` facts, `character-creation-runtime` advancement workflow, Task 8 Metamagic option facts, Unit claims, owner evidence, and focused tests for `sorcerer_metamagic`.

Outputs:

- satisfy the remaining replacement-lifecycle output contract from Original backlog task 86;
- leave `sorcerer_metamagic` advancement replacement supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- replacement is legal only when gaining a Sorcerer level and replaces exactly one currently known Metamagic option with one currently unknown option;
- level-10 and level-17 option gains derive their required new option counts from the existing Surface choice-count thresholds without duplicating progression or option roster state;
- focused `character-creation-runtime` advancement tests cover legal replacement, same-option/unknown/duplicate gates, and level-10/17 option gains;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 10 - L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION - Sorcerer Metamagic Cast-Time Option Execution

Status: `done`

Unit: `sorcerer_metamagic`.
Origin: Original backlog task 87.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT.

Pre-researched scope:

- Evaluated the monolithic Metamagic cast-time execution task against existing Font of Magic point-pool ownership, CharacterBuild selected-option facts, Character Battle handoff, and battle-runtime Spell Invocation lifecycle owners.
- Closed this task as a precise executable split: the remaining runtime work is represented by the six smaller same-plan follow-ups below, each owning one resource, admission, or spell-lifecycle slice.
- No runtime behavior is promoted by this task; production execution must still dispatch on typed option facts/procedure shapes, not option name, slug, Unit id, or provenance text.

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

- satisfy the output contract from Original backlog task 87 by converting it into executable smaller follow-up tasks;
- leave `sorcerer_metamagic` profile-subset-supported and precisely blocked by the synchronized follow-up split;
- add current-task closure evidence for `L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION`;
- regenerate coverage artifacts and synchronize this runnable plan's index, DAG, and task details.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- the Unit claim, task-claim closure, generated coverage artifacts, and runnable plan all name the same six follow-up IDs;
- no package runtime tests, typecheck, Quint, or MBT are required because this task changes only planning/coverage artifacts;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 11 - L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE - Sorcerer Metamagic Battle Resource Bridge

Status: `ready-for-research`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT.

Pre-researched scope:

- Project the existing Font of Magic Sorcery Point point-pool and selected Metamagic option facts into Character Battle and battle-runtime state.
- Persist point-pool spending back through Character Sheet handoff without creating a Metamagic-local pool.
- Expose known Metamagic options as typed `effectKind`, `stackingMode`, and cost facts rather than option authored identity.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Font of Magic point-pool facts, selected Metamagic CharacterBuild facts, Character Battle handoff, and battle-runtime resource state.

Outputs:

- Character Battle and battle-runtime state can carry and spend the shared Sorcery Point point-pool;
- Character Sheet handoff preserves the shared point-pool expenditure;
- known Metamagic options are exposed through typed runtime facts with focused tests and coverage evidence.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no duplicate Sorcery Point state is introduced;
- focused Character Sheet, Character Battle, and battle-runtime tests cover resource projection and handoff;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 12 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED - Sorcerer Metamagic Cast Governor And Quickened

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE.

Pre-researched scope:

- Apply Metamagic use admission at the Spell Invocation boundary: known-option selection, Sorcery Point affordability, one option per spell, and Empowered/Seeking stacking exceptions.
- Promote Quickened Spell's action-cost rewrite and current-turn level-1-plus spell prohibition.
- Do not claim Sorcery Incarnate or Arcane Apotheosis feature modifiers in this task.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime Spell Invocation discovery, action-economy, and resource-spending owners from the Metamagic battle resource bridge.

Outputs:

- profile-subset-supported or supported Unit claim with runtime evidence for Metamagic use admission, Sorcery Point spending, stacking limits, Quickened Bonus Action casting, and the same-turn level-1-plus prohibition.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- runtime execution dispatches on typed Metamagic facts and Spell Invocation shape, not option identity;
- focused runtime tests cover affordability, stacking, Quickened action cost, and same-turn spell limits;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 13 - L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS - Sorcerer Metamagic Save Options

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED.

Pre-researched scope:

- Promote Careful Spell and Heightened Spell against supported save-for-half and save-gated spell procedures.
- Careful protects a Charisma-modifier-limited chosen creature set with automatic Saving Throw success and no half-damage-on-success.
- Heightened gives one target Disadvantage on Saving Throws against the spell.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime Saving Throw spell resolution hooks and Metamagic cast governor facts.

Outputs:

- supported-profile or profile-subset-supported Unit claim with typed holes/fills, focused runtime tests, and promoted Quint/runtime parity for Careful and Heightened without option identity dispatch.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- the protected-target and disadvantaged-target facts are typed at the Spell Invocation boundary;
- focused runtime tests cover automatic success, no successful-save damage, and target Disadvantage;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 14 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS - Sorcerer Metamagic Cast Property Options

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED.

Pre-researched scope:

- Promote Distant, Extended, and Subtle Spell for supported spell procedures.
- Distant doubles range only for spells with a range of at least 5 feet, or makes Touch range 30 feet.
- Extended doubles eligible duration to a 24-hour cap and grants Advantage on Concentration Saving Throws for the spell.
- Subtle suppresses eligible spell components while preserving consumed or priced Material components.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell profile projection, Concentration save, and component/material witness boundaries.

Outputs:

- supported-profile or profile-subset-supported Unit claim with focused tests for Distant range changes, Extended duration and Concentration-save Advantage, and Subtle component suppression.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- Self and other non-Touch/non-numeric ranges are not admitted to Distant's doubling branch;
- component suppression preserves consumed or priced Material component requirements;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 15 - L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS - Sorcerer Metamagic Damage Shape Options

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED.

Pre-researched scope:

- Promote Transmuted Spell and Twinned Spell for supported spell procedures.
- Transmuted substitutes only Acid, Cold, Fire, Lightning, Poison, or Thunder spell damage among that closed set.
- Twinned increases effective spell level by 1 only for spells whose higher-slot profile targets one additional creature.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime spell damage profile and upcast targeting projection.

Outputs:

- supported-profile or profile-subset-supported Unit claim with focused runtime tests and promoted Quint/runtime parity for typed damage-type substitution and higher-slot target-count projection without duplicating Spell Slot state.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- damage-type substitution and Twinned eligibility are derived from typed spell facts, not spell identity;
- focused runtime tests cover the closed damage-type set and higher-slot one-additional-creature gate;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 16 - L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS - Sorcerer Metamagic Reroll Options

Status: `blocked`

Unit: `sorcerer_metamagic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-METAMAGIC-OPTION-EXECUTION.
Dependencies: L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED.

Pre-researched scope:

- Promote Empowered Spell and Seeking Spell rerolls after damage rolls or missed spell attacks.
- Consume typed reroll fills, enforce Charisma-modifier damage-die limits where applicable, use the new rolls, and preserve the options' different-Metamagic stacking exception.

Inputs:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Classes/Sorcerer.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- battle-runtime damage-roll and spell-attack miss lifecycle.

Outputs:

- supported-profile or profile-subset-supported Unit claim with focused runtime tests and promoted Quint/runtime parity for post-roll damage dice rerolls and missed spell attack d20 rerolls.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- reroll choices and new roll values are typed fills at the roll lifecycle boundary;
- focused runtime tests cover damage dice reroll limits, missed spell attack rerolls, new-roll replacement, and stacking exceptions;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 17 - L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step of the Wind Jump Distance Runtime

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

### Task 18 - L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE - Sorcerer Font Of Magic Bonus Action And Battle Slot Source

Status: `blocked`

Unit: `sorcerer_font_of_magic`.
Origin: Split from L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS after Task 7 promoted Character Sheet created-slot state but left battle action-economy and slot-source preservation unresolved.
Dependencies: L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE.

Pre-researched scope:

- Execute Font of Magic Creating Spell Slots at a boundary that spends the Bonus Action.
- Preserve ordinary-versus-created Spell Slot source through battle spell casting and Character Sheet handoff when ordinary and created slots of the same level coexist.
- Keep created Spell Slot state owned by the Character Sheet delta state introduced by L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS; do not add a parallel battle-only created-slot pool.
- Coordinate with the Metamagic battle resource bridge so Sorcery Point battle state has one owner across Font of Magic and Metamagic execution.

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

- satisfy the remaining Font of Magic Creating Spell Slots Bonus Action and battle slot-source output contract;
- leave `sorcerer_font_of_magic` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- the implementation consumes the Task 7 Character Sheet created-slot delta state instead of duplicating temporary Spell Slot ownership;
- focused Character Sheet, Character Battle, and battle-runtime tests cover Bonus Action spending and source-aware battle spell-slot spending/handoff;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- if promoted battle-runtime spell invocation state changes, update package-local Quint parity and run battle-runtime MBT under the repository scarcity protocol.

### Task 19 - L12G-RECURSIVE-TAIL-LOOP-C - LOOP-C Recursive Next-Batch Planning Tail

Status: `blocked`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS, L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS, L12G-FOLLOWUP-SORCERER-FONT-SLOT-TO-POINTS, L12G-FOLLOWUP-SORCERER-FONT-POINTS-TO-SLOTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS, L12G-FOLLOWUP-SORCERER-METAMAGIC-ADVANCEMENT-REPLACEMENT, L12G-FOLLOWUP-SORCERER-METAMAGIC-BATTLE-RESOURCE-BRIDGE, L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-GOVERNOR-QUICKENED, L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS, L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS, L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME, L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude, Wild Shape, and Moonbeam work, avoid companion work, and create 5-10 new atomic Ralph tasks for level-2 class resource/profile frontier that does not overlap active spell lanes.

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
- exclude active external Claude work, active Wild Shape manual-review work, active Moonbeam external/manual work, companion/familiar work, and tasks already done in git history;
- when a potential task depends on another active lane, record it as `deferred-external` or put it behind a same-plan blocked dependency rather than making it runnable;
- commit the planning change and then continue with the first runnable task if the harness supports continuing; otherwise leave the plan ready for the orchestrator.

Acceptance:

- the new tasks are atomic enough for one coding session each;
- the new tasks do not duplicate existing plan tasks or completed git history;
- dependency blockers are same-plan IDs when Ralph should auto-unblock them;
- external blockers are labeled explicitly and are not runnable;
- `git diff --check` passes;
- reviewer-loop convergence is run over the plan text and any reasonable planning notes are fixed.
