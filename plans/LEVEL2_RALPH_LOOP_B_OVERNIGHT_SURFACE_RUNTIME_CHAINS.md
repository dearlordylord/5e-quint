# Level 2 Ralph Loop B - Overnight Surface Runtime Chains

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "ready-for-research",
      "title": "Acid Arrow Surface Damage Shape"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Acid Arrow Delayed Runtime Support"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE",
      "status": "ready-for-research",
      "title": "Alter Self Surface Option Shape"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Aquatic Adaptation Runtime"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME",
      "status": "blocked",
      "title": "Alter Self Natural Weapons Runtime"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL",
      "status": "ready-for-research",
      "title": "Continual Flame Dispel And Suppression Removal"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Flame Blade Surface Lifecycle Shape"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Flame Blade Runtime Support"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE",
      "status": "ready-for-research",
      "title": "Heat Metal Surface Contact Escape Shape"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME",
      "status": "blocked",
      "title": "Heat Metal Contact Damage Runtime"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY",
      "status": "blocked",
      "title": "Heat Metal Holding Wearing Penalty Runtime"
    },
    {
      "number": 12,
      "id": "L12G-RECURSIVE-TAIL-LOOP-B",
      "status": "ready-for-research",
      "title": "LOOP-B Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns Surface-to-runtime chains for Acid Arrow, Alter Self, Continual Flame, Flame Blade, and Heat Metal.

Preplanned load: 11 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

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
- companion behavior, companion control, or caller/table decision automation.

## Task Output Contract

Every implementation task must leave its Unit in one concrete end state:

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

- Base branch: `ralph/level2-loop-b/overnight-surface-runtime`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-b`.
- Do not edit `plans/ACTIVE_PLAN.md`.
- Do not touch the external Claude lane in `plans/LEVEL2_RALPH_LOOP_CLAUDE_STASHED_FRONTIER.md` or `/workspace/typescript/dnd-ralph-level2-claude`.
- Do not touch active Wild Shape manual-review work in `/workspace/typescript/dnd-wild-shape-runtime-c-manual-review`.
- Do not start companion/familiar work, including Find Familiar or companion-control automation.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## Recursive Tail Policy

The final task is intentionally runnable and placed last. Use it only when no earlier task in this plan is runnable. It must plan new concrete work from current metrics and history; it must not substitute for same-plan dependency unblocking, and it must not reopen external Claude, Wild Shape, or companion work.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape | ready-for-research | completed baseline | B lane; Unit `acid_arrow`. |
| 2 | L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support | blocked | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE | B lane; Unit `acid_arrow`. |
| 3 | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape | ready-for-research | completed baseline | B lane; Unit `alter_self`. |
| 4 | L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime | blocked | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE | B lane; Unit `alter_self`. |
| 5 | L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime | blocked | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME | B lane; Unit `alter_self`. |
| 6 | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal | ready-for-research | completed baseline | B lane; Unit `continual_flame`. |
| 7 | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape | ready-for-research | completed baseline | B lane; Unit `flame_blade`. |
| 8 | L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support | blocked | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE | B lane; Unit `flame_blade`. |
| 9 | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape | ready-for-research | completed baseline | B lane; Unit `heat_metal`. |
| 10 | L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime | blocked | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE | B lane; Unit `heat_metal`. |
| 11 | L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime | blocked | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME | B lane; Unit `heat_metal`. |
| 12 | L12G-RECURSIVE-TAIL-LOOP-B - LOOP-B Recursive Next-Batch Planning Tail | ready-for-research | completed baseline | Last-resort next-batch planning safety net; do not use before earlier runnable tasks are exhausted. |

## Task Details

### Task 1 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `ready-for-research`

Unit: `acid_arrow`.
Origin: Original backlog task 88.
Dependencies: none.

Pre-researched scope:

- Replace Acid Arrow lossy mechanics with lossless Surface facts for initial hit damage, end-of-next-turn damage, immediate half-of-initial miss damage only, and slot scaling for both initial and later damage.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- satisfy the output contract from Original backlog task 88.
- leave `acid_arrow` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 2 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `blocked`

Unit: `acid_arrow`.
Origin: Original backlog task 89.
Dependencies: L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE.

Pre-researched scope:

- Promote Acid Arrow runtime after the Surface shape lands: attack roll, immediate hit damage, miss half-damage, delayed end-of-target-next-turn damage, slot scaling, resource spending, and cleanup.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- satisfy the output contract from Original backlog task 89.
- leave `acid_arrow` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 3 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape

Status: `ready-for-research`

Unit: `alter_self`.
Origin: Original backlog task 90.
Dependencies: none.

Pre-researched scope:

- Replace the Natural Weapons placeholder with lossless options for Aquatic Adaptation, Change Appearance, and Natural Weapons, including natural growth, damage type, d6 die, and spellcasting ability replacement facts.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the output contract from Original backlog task 90.
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 4 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Aquatic Adaptation Runtime

Status: `blocked`

Unit: `alter_self`.
Origin: Original backlog task 91.
Dependencies: L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE.

Pre-researched scope:

- Promote spell-owned Alter Self option state, Magic-action mode replacement, Concentration cleanup, water breathing, linked Swim Speed equal to Speed, and Change Appearance closure.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the output contract from Original backlog task 91.
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 5 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime

Status: `blocked`

Unit: `alter_self`.
Origin: Original backlog task 92.
Dependencies: L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME.

Pre-researched scope:

- Promote Natural Weapons as a spell-owned Unarmed Strike override using chosen damage type, 1d6 damage, caster spellcasting ability for attack and damage rolls, mode replacement, and cleanup.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `alter_self`.

Outputs:

- satisfy the output contract from Original backlog task 92.
- leave `alter_self` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 6 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `ready-for-research`

Unit: `continual_flame`.
Origin: Original backlog task 93.
Dependencies: none.

Pre-researched scope:

- Close or promote Continual Flame removal/suppression interactions without introducing duplicate object-light or spell-effect state.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `continual_flame`.

Outputs:

- satisfy the output contract from Original backlog task 93.
- leave `continual_flame` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 7 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape

Status: `ready-for-research`

Unit: `flame_blade`.
Origin: Original backlog task 94.
Dependencies: none.

Pre-researched scope:

- Repair Flame Blade Surface facts for free-hand, let-go, re-evocation, light, attack, damage, Concentration, and slot scaling before runtime promotion.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flame_blade`.

Outputs:

- satisfy the output contract from Original backlog task 94.
- leave `flame_blade` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 8 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support

Status: `blocked`

Unit: `flame_blade`.
Origin: Original backlog task 95.
Dependencies: L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE.

Pre-researched scope:

- Promote Flame Blade runtime using the repaired Surface shape without duplicating free-hand, let-go, re-evocation, light, attack, or damage constants.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `flame_blade`.

Outputs:

- satisfy the output contract from Original backlog task 95.
- leave `flame_blade` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 9 - L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape

Status: `ready-for-research`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: none.

Pre-researched scope:

- Replace Heat Metal lossy ongoing-effect encoding with lossless Surface facts for manufactured metal object targeting, object-contact recipients, immediate cast damage and cast-time save, later Bonus Action repeat damage, and drop-if-possible or Disadvantage fallback.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- satisfy the output contract from Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
- leave `heat_metal` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 10 - L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime

Status: `blocked`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE.

Pre-researched scope:

- Promote Heat Metal damage lifecycle after the Surface shape lands: spell spend, object/contact witnesses, immediate and repeat Fire damage, slot scaling, damage disposition, Concentration saves, and cleanup.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- satisfy the output contract from Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
- leave `heat_metal` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 11 - L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime

Status: `blocked`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME.

Pre-researched scope:

- Promote the held/worn object save, drop outcome, fallback Attack Roll and Ability Check Disadvantage, caster-turn-start expiry, and cleanup tied to the same Heat Metal occurrence.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `heat_metal`.

Outputs:

- satisfy the output contract from Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
- leave `heat_metal` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 12 - L12G-RECURSIVE-TAIL-LOOP-B - LOOP-B Recursive Next-Batch Planning Tail

Status: `ready-for-research`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: none.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude and Wild Shape work, avoid companion work, and create 5-10 new atomic Ralph tasks for Surface-to-runtime spell chains and follow-up splits produced by those chains.

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
