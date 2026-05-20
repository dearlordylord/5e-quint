# Level 2 Ralph Loop A - Overnight Open Spells And Closures

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-SPELL-LESSER-RESTORATION",
      "status": "done",
      "title": "Lesser Restoration Runtime Support"
    },
    {
      "number": 2,
      "id": "L12G-SPELL-MAGIC-WEAPON",
      "status": "ready-for-research",
      "title": "Magic Weapon Runtime Support Or Closure"
    },
    {
      "number": 3,
      "id": "L12G-SPELL-MIND-SPIKE",
      "status": "ready-for-research",
      "title": "Mind Spike Runtime Support And Knowledge Closure"
    },
    {
      "number": 4,
      "id": "L12G-SPELL-WEB",
      "status": "ready-for-research",
      "title": "Web Runtime Support Or Closure"
    },
    {
      "number": 5,
      "id": "L12G-MISSING-ANIMAL-MESSENGER",
      "status": "ready-for-research",
      "title": "Animal Messenger Definition And Closure"
    },
    {
      "number": 6,
      "id": "L12G-MISSING-ARCANISTS-MAGIC-AURA",
      "status": "ready-for-research",
      "title": "Arcanists Magic Aura Definition And Closure"
    },
    {
      "number": 7,
      "id": "L12G-MISSING-AUGURY",
      "status": "ready-for-research",
      "title": "Augury Definition And Closure"
    },
    {
      "number": 8,
      "id": "L12G-MISSING-CALM-EMOTIONS",
      "status": "ready-for-research",
      "title": "Calm Emotions Definition And Support"
    },
    {
      "number": 9,
      "id": "L12G-MISSING-DARKNESS",
      "status": "ready-for-research",
      "title": "Darkness Definition And Support Or Closure"
    },
    {
      "number": 10,
      "id": "L12G-MISSING-DARKVISION",
      "status": "ready-for-research",
      "title": "Darkvision Definition And Support Or Closure"
    },
    {
      "number": 11,
      "id": "L12G-MISSING-DETECT-THOUGHTS",
      "status": "ready-for-research",
      "title": "Detect Thoughts Definition And Closure"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME",
      "status": "ready-for-research",
      "title": "Gust of Wind Line Runtime Support"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE",
      "status": "ready-for-research",
      "title": "Gust of Wind Gas And Flame Presentation Closure"
    },
    {
      "number": 14,
      "id": "L12G-RECURSIVE-TAIL-LOOP-A",
      "status": "blocked",
      "title": "LOOP-A Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns open-runtime spells, missing spell definition closures, and Gust of Wind witness support not owned by Claude or Wild Shape.

Preplanned load: 13 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

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

- Base branch: `ralph/level2-loop-a/overnight-open-spells`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-a`.
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
| 1 | L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support | done | completed baseline | A lane; Unit `lesser_restoration`. |
| 2 | L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure | ready-for-research | completed baseline | A lane; Unit `magic_weapon`. |
| 3 | L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure | ready-for-research | completed baseline | A lane; Unit `mind_spike`. |
| 4 | L12G-SPELL-WEB - Web Runtime Support Or Closure | ready-for-research | completed baseline | A lane; Unit `web`. |
| 5 | L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure | ready-for-research | completed baseline | A lane; Unit `animal_messenger`. |
| 6 | L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure | ready-for-research | completed baseline | A lane; Unit `arcanists_magic_aura`. |
| 7 | L12G-MISSING-AUGURY - Augury Definition And Closure | ready-for-research | completed baseline | A lane; Unit `augury`. |
| 8 | L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support | ready-for-research | completed baseline | A lane; Unit `calm_emotions`. |
| 9 | L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure | ready-for-research | completed baseline | A lane; Unit `darkness`. |
| 10 | L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure | ready-for-research | completed baseline | A lane; Unit `darkvision`. |
| 11 | L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure | ready-for-research | completed baseline | A lane; Unit `detect_thoughts`. |
| 12 | L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME - Gust of Wind Line Runtime Support | ready-for-research | completed baseline | A lane; Unit `gust_of_wind`. |
| 13 | L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE - Gust of Wind Gas And Flame Presentation Closure | ready-for-research | completed baseline | A lane; Unit `gust_of_wind`. |
| 14 | L12G-RECURSIVE-TAIL-LOOP-A - LOOP-A Recursive Next-Batch Planning Tail | blocked | L12G-SPELL-LESSER-RESTORATION, L12G-SPELL-MAGIC-WEAPON, L12G-SPELL-MIND-SPIKE, L12G-SPELL-WEB, L12G-MISSING-ANIMAL-MESSENGER, L12G-MISSING-ARCANISTS-MAGIC-AURA, L12G-MISSING-AUGURY, L12G-MISSING-CALM-EMOTIONS, L12G-MISSING-DARKNESS, L12G-MISSING-DARKVISION, L12G-MISSING-DETECT-THOUGHTS, L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME, L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE | Last-resort next-batch planning safety net; auto-unblocks only after every real task in this plan is `done`. |

## Task Details

### Task 1 - L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support

Status: `done`

Unit: `lesser_restoration`.
Origin: Original backlog task 34.
Dependencies: none.

Pre-researched scope:

- Promote or precisely close Lesser Restoration as a level-2 spell that ends exactly one RAW-listed condition, `Blinded`, `Deafened`, `Paralyzed`, or `Poisoned`; do not model disease or poison removal unless local SRD or `ASSUMPTIONS.md` supplies a separate source.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `lesser_restoration`.

Outputs:

- satisfy the output contract from Original backlog task 34.
- leave `lesser_restoration` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 2 - L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure

Status: `ready-for-research`

Unit: `magic_weapon`.
Origin: Original backlog task 35.
Dependencies: none.

Pre-researched scope:

- Decide and implement the executable magic-weapon enhancement subset, or close object/enchantment facts that belong to table/object owners.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `magic_weapon`.

Outputs:

- satisfy the output contract from Original backlog task 35.
- leave `magic_weapon` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 3 - L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure

Status: `ready-for-research`

Unit: `mind_spike`.
Origin: Original backlog task 36.
Dependencies: none.

Pre-researched scope:

- Promote the save-damage/concentration subset and explicitly close location-knowledge tracking if it remains runtime-detached table knowledge.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `mind_spike`.

Outputs:

- satisfy the output contract from Original backlog task 36.
- leave `mind_spike` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 4 - L12G-SPELL-WEB - Web Runtime Support Or Closure

Status: `ready-for-research`

Unit: `web`.
Origin: Original backlog task 51.
Dependencies: none.

Pre-researched scope:

- Promote or split Web around table-witnessed area membership, Restrained lifecycle, escape/burning cleanup, and table-owned spatial facts.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `web`.

Outputs:

- satisfy the output contract from Original backlog task 51.
- leave `web` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 5 - L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure

Status: `ready-for-research`

Unit: `animal_messenger`.
Origin: Original backlog task 52.
Dependencies: none.

Pre-researched scope:

- Author only SRD-provenance Surface/catalog facts and close Beast route choice, recipient matching, travel progress, delivery success, message loss, and return behavior as runtime-detached table-owned Beast routing/message-delivery adjudication unless an existing non-companion travel/message owner already consumes those facts.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `animal_messenger`.

Outputs:

- satisfy the output contract from Original backlog task 52.
- leave `animal_messenger` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 6 - L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure

Status: `ready-for-research`

Unit: `arcanists_magic_aura`.
Origin: Original backlog task 53.
Dependencies: none.

Pre-researched scope:

- Author the missing SRD-provenance Spell Definition/Unit record and close aura deception/detection consequences as runtime-detached unless an existing owner consumes them.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `arcanists_magic_aura`.

Outputs:

- satisfy the output contract from Original backlog task 53.
- leave `arcanists_magic_aura` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 7 - L12G-MISSING-AUGURY - Augury Definition And Closure

Status: `ready-for-research`

Unit: `augury`.
Origin: Original backlog task 54.
Dependencies: none.

Pre-researched scope:

- Author the missing SRD-provenance Spell Definition/Unit record and close omen/advice adjudication as runtime-detached table knowledge.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `augury`.

Outputs:

- satisfy the output contract from Original backlog task 54.
- leave `augury` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 8 - L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support

Status: `ready-for-research`

Unit: `calm_emotions`.
Origin: Original backlog task 55.
Dependencies: none.

Pre-researched scope:

- Author and promote the executable condition-suppression or hostility-suppression subset only where existing condition owners can represent it; close social residuals explicitly.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `calm_emotions`.

Outputs:

- satisfy the output contract from Original backlog task 55.
- leave `calm_emotions` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 9 - L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure

Status: `ready-for-research`

Unit: `darkness`.
Origin: Original backlog task 56.
Dependencies: none.

Pre-researched scope:

- Author Darkness facts and support only witnesses consumed by an existing light/visibility/spell-area owner; do not add Darkness-local light, obscurement, object-cover, or spatial derivation state. Otherwise close those clauses as runtime-detached.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkness`.

Outputs:

- satisfy the output contract from Original backlog task 56.
- leave `darkness` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 10 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure

Status: `ready-for-research`

Unit: `darkvision`.
Origin: Original backlog task 57.
Dependencies: none.

Pre-researched scope:

- Author the SRD-provenance Spell Definition and project a Character Sheet sense fact only if a supported visibility owner consumes it; otherwise close visibility/presentation clauses as runtime-detached.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkvision`.

Outputs:

- satisfy the output contract from Original backlog task 57.
- leave `darkvision` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 11 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure

Status: `ready-for-research`

Unit: `detect_thoughts`.
Origin: Original backlog task 58.
Dependencies: none.

Pre-researched scope:

- Author the missing SRD-provenance Spell Definition/Unit record and close thought reading, Search, hidden presence, and Probe knowledge adjudication as runtime-detached unless a precise check owner already exists. If a touched check-owner boundary exists but is too weak, do not ignore it as pre-existing debt; either strengthen the owner in this task when local, or leave a precise blocked split naming the owner invariant needed before support can be claimed.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `detect_thoughts`.

Outputs:

- satisfy the output contract from Original backlog task 58.
- leave `detect_thoughts` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 12 - L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME - Gust of Wind Line Runtime Support

Status: `ready-for-research`

Unit: `gust_of_wind`.
Origin: Follow-up split from `gust_of_wind` unit claim and `L12G-MISSING-GUST-OF-WIND` gate task 67.
Dependencies: none.

Pre-researched scope:

- Promote Gust of Wind battle-visible Line profile: Magic Action and level-2+ Spell Slot spend, caster-owned Concentration, caster-selected direction, branded Spell Effect/area occurrence identity, table-witnessed creatures occupying the Line, initial and end-turn Strength saves, failed-save 15-foot push facts away from the caster, active 2-for-1 Movement cost when moving closer to the caster using table-witnessed movement facts, Bonus Action direction replacement, and cleanup on Concentration/duration end.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `gust_of_wind`.

Outputs:

- satisfy the output contract from Follow-up split from `gust_of_wind` unit claim and `L12G-MISSING-GUST-OF-WIND` gate task 67.
- leave `gust_of_wind` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 13 - L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE - Gust of Wind Gas And Flame Presentation Closure

Status: `ready-for-research`

Unit: `gust_of_wind`.
Origin: Follow-up split from `gust_of_wind` unit claim and `L12G-MISSING-GUST-OF-WIND` gate task 67.
Dependencies: none.

Pre-researched scope:

- Do not create spell-local gas, vapor, flame, candle, lantern, or environmental wind state. Support Gust of Wind gas/vapor/flame clauses only through an existing object/environment owner with caller-supplied typed witnesses; otherwise accepted-close them as presentation/environment-runtime-detached.

Inputs:

- `plans/LEVEL2_RALPH_WRAPUP_BACKLOG.md` when this task has an archived backlog section;
- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `gust_of_wind`.

Outputs:

- satisfy the output contract from Follow-up split from `gust_of_wind` unit claim and `L12G-MISSING-GUST-OF-WIND` gate task 67.
- leave `gust_of_wind` supported, accepted-closed, or precisely blocked by a smaller follow-up split;
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

### Task 14 - L12G-RECURSIVE-TAIL-LOOP-A - LOOP-A Recursive Next-Batch Planning Tail

Status: `blocked`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: L12G-SPELL-LESSER-RESTORATION, L12G-SPELL-MAGIC-WEAPON, L12G-SPELL-MIND-SPIKE, L12G-SPELL-WEB, L12G-MISSING-ANIMAL-MESSENGER, L12G-MISSING-ARCANISTS-MAGIC-AURA, L12G-MISSING-AUGURY, L12G-MISSING-CALM-EMOTIONS, L12G-MISSING-DARKNESS, L12G-MISSING-DARKVISION, L12G-MISSING-DETECT-THOUGHTS, L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME, L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude and Wild Shape work, avoid companion work, and create 5-10 new atomic Ralph tasks for open spell closures and newly exposed strict level-1/2 runtime/profile frontier.

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
