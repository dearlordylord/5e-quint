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
      "status": "done",
      "title": "Magic Weapon Runtime Support Or Closure"
    },
    {
      "number": 3,
      "id": "L12G-SPELL-MIND-SPIKE",
      "status": "done",
      "title": "Mind Spike Runtime Support And Knowledge Closure"
    },
    {
      "number": 4,
      "id": "L12G-SPELL-WEB",
      "status": "done",
      "title": "Web Runtime Support Or Closure"
    },
    {
      "number": 5,
      "id": "L12G-MISSING-ANIMAL-MESSENGER",
      "status": "done",
      "title": "Animal Messenger Definition And Closure"
    },
    {
      "number": 6,
      "id": "L12G-MISSING-ARCANISTS-MAGIC-AURA",
      "status": "done",
      "title": "Arcanists Magic Aura Definition And Closure"
    },
    {
      "number": 7,
      "id": "L12G-MISSING-AUGURY",
      "status": "done",
      "title": "Augury Definition And Closure"
    },
    {
      "number": 8,
      "id": "L12G-MISSING-CALM-EMOTIONS",
      "status": "done",
      "title": "Calm Emotions Definition And Support"
    },
    {
      "number": 9,
      "id": "L12G-MISSING-DARKNESS",
      "status": "done",
      "title": "Darkness Definition And Support Or Closure"
    },
    {
      "number": 10,
      "id": "L12G-MISSING-DARKVISION",
      "status": "done",
      "title": "Darkvision Definition And Support Or Closure"
    },
    {
      "number": 11,
      "id": "L12G-MISSING-DETECT-THOUGHTS",
      "status": "done",
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
      "id": "L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE",
      "status": "ready-for-research",
      "title": "Magic Weapon Surface Item Enhancement Shape"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME",
      "status": "blocked",
      "title": "Magic Weapon Item Enhancement Runtime"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE",
      "status": "ready-for-research",
      "title": "Web Surface Area Hazard Shape"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME",
      "status": "blocked",
      "title": "Web Restraint Hazard Runtime"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE",
      "status": "blocked",
      "title": "Web Terrain Obscurement Fire Boundary"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME",
      "status": "ready-for-research",
      "title": "Darkness Point-Origin Area Runtime Support"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH",
      "status": "ready-for-research",
      "title": "Darkness Object-Origin Branch"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL",
      "status": "blocked",
      "title": "Darkness Spell-Created Light Dispel"
    },
    {
      "number": 22,
      "id": "L12G-RECURSIVE-TAIL-LOOP-A",
      "status": "blocked",
      "title": "LOOP-A Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns open-runtime spells, missing spell definition closures, and Gust of Wind witness support not owned by Claude, Wild Shape, or Moonbeam.

Preplanned load: 21 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

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
- Do not touch active Moonbeam work owned by external/manual agents.
- Do not start companion/familiar work, including Find Familiar or companion-control automation.
- Shared generated coverage artifacts may conflict at merge time; regenerate them in master after integration merges.

## Recursive Tail Policy

The final task is intentionally blocked on every real task in this plan and placed last. It auto-unblocks only after the planned implementation queue is done. It must plan new concrete work from current metrics and history; it must not substitute for same-plan dependency unblocking, and it must not reopen external Claude, Wild Shape, Moonbeam, or companion work.

## DAG / Queue Order

| # | Task | Status | Depends On | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L12G-SPELL-LESSER-RESTORATION - Lesser Restoration Runtime Support | done | completed baseline | A lane; Unit `lesser_restoration`. |
| 2 | L12G-SPELL-MAGIC-WEAPON - Magic Weapon Runtime Support Or Closure | done | completed baseline | A lane; Unit `magic_weapon`. |
| 3 | L12G-SPELL-MIND-SPIKE - Mind Spike Runtime Support And Knowledge Closure | done | completed baseline | A lane; Unit `mind_spike`. |
| 4 | L12G-SPELL-WEB - Web Runtime Support Or Closure | done | completed baseline | A lane; Unit `web`. |
| 5 | L12G-MISSING-ANIMAL-MESSENGER - Animal Messenger Definition And Closure | done | completed baseline | A lane; Unit `animal_messenger`. |
| 6 | L12G-MISSING-ARCANISTS-MAGIC-AURA - Arcanists Magic Aura Definition And Closure | done | completed baseline | A lane; Unit `arcanists_magic_aura`. |
| 7 | L12G-MISSING-AUGURY - Augury Definition And Closure | done | completed baseline | A lane; Unit `augury`. |
| 8 | L12G-MISSING-CALM-EMOTIONS - Calm Emotions Definition And Support | done | completed baseline | A lane; Unit `calm_emotions`. |
| 9 | L12G-MISSING-DARKNESS - Darkness Definition And Support Or Closure | done | completed baseline | A lane; Unit `darkness`. |
| 10 | L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure | done | completed baseline | A lane; Unit `darkvision`. |
| 11 | L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure | done | completed baseline | A lane; Unit `detect_thoughts`. |
| 12 | L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME - Gust of Wind Line Runtime Support | done | completed baseline | A lane; Unit `gust_of_wind`. |
| 13 | L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE - Gust of Wind Gas And Flame Presentation Closure | ready-for-research | completed baseline | A lane; Unit `gust_of_wind`. |
| 14 | L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE - Magic Weapon Surface Item Enhancement Shape | ready-for-research | completed baseline | A lane; Unit `magic_weapon`. |
| 15 | L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME - Magic Weapon Item Enhancement Runtime | blocked | L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE | A lane; Unit `magic_weapon`. |
| 16 | L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE - Web Surface Area Hazard Shape | ready-for-research | completed baseline | A lane; Unit `web`. |
| 17 | L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME - Web Restraint Hazard Runtime | blocked | L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE | A lane; Unit `web`. |
| 18 | L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE - Web Terrain Obscurement Fire Boundary | blocked | L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE, L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME | A lane; Unit `web`. |
| 19 | L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME - Darkness Point-Origin Area Runtime Support | ready-for-research | L12G-MISSING-DARKNESS | A lane; Unit `darkness`. |
| 20 | L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH - Darkness Object-Origin Branch | ready-for-research | L12G-MISSING-DARKNESS | A lane; Unit `darkness`. |
| 21 | L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL - Darkness Spell-Created Light Dispel | blocked | L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME, L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH | A lane; Unit `darkness`. |
| 22 | L12G-RECURSIVE-TAIL-LOOP-A - LOOP-A Recursive Next-Batch Planning Tail | blocked | L12G-SPELL-LESSER-RESTORATION, L12G-SPELL-MAGIC-WEAPON, L12G-SPELL-MIND-SPIKE, L12G-SPELL-WEB, L12G-MISSING-ANIMAL-MESSENGER, L12G-MISSING-ARCANISTS-MAGIC-AURA, L12G-MISSING-AUGURY, L12G-MISSING-CALM-EMOTIONS, L12G-MISSING-DARKNESS, L12G-MISSING-DARKVISION, L12G-MISSING-DETECT-THOUGHTS, L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME, L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE, L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE, L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME, L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE, L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME, L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE, L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME, L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH, L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL | Last-resort next-batch planning safety net; auto-unblocks only after every real task in this plan is `done`. |

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

### Task 14 - L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE - Magic Weapon Surface Item Enhancement Shape

Status: `ready-for-research`

Unit: `magic_weapon`.
Origin: Follow-up split from `magic_weapon` unit claim and `L12G-SPELL-MAGIC-WEAPON`.
Dependencies: none.

Pre-researched scope:

- Replace Magic Weapon's lossy Surface mechanics with a lossless SRD shape for Bonus Action level-2-or-higher casting, Touch range, one nonmagical weapon target, one-hour non-Concentration duration, target magic-weapon status, slot-tiered +1/+2/+3 bonuses to attack rolls and damage rolls made with that weapon, and same-caster recast early ending.

Inputs:

- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Magic Weapon Surface content, schema/tracer support, Unit claims, owner evidence, and focused tests.

Outputs:

- Magic Weapon Dhall and JSON content, plus schema/tracer support where required, represent the nonmagical weapon target, item-attached magic-weapon status, slot-tiered attack and damage bonuses, and recast ending as executable source facts rather than comments or prose-only description;
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

### Task 15 - L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME - Magic Weapon Item Enhancement Runtime

Status: `blocked`

Unit: `magic_weapon`.
Origin: Follow-up split from `magic_weapon` unit claim and `L12G-SPELL-MAGIC-WEAPON`.
Dependencies: L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE.

Pre-researched scope:

- Promote Magic Weapon as a level-2-or-higher Bonus Action Spell Invocation that spends the Bonus Action and Spell Slot, consumes caller-supplied target item identity and nonmagical weapon witness facts, records one caster-owned item-attached Spell Effect, projects magic-weapon status plus the slot-tiered attack-roll and damage-roll bonuses only for attacks and damage made with that item, and ends on duration expiry or same-caster recast without rewriting authored weapon records or adding a parallel spell-owned loadout table.

Inputs:

- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- Magic Weapon Surface item-enhancement shape from `L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE`;
- existing battle-runtime spell invocation, item/equipment, weapon attack/damage projection, Unit claims, owner evidence, and focused tests.

Outputs:

- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for spell discovery, resource spending, item-attached Spell Effect state, exact-item attack and damage projections, magic-weapon status projection, duration cleanup, and same-caster recast replacement;
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

### Task 16 - L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE - Web Surface Area Hazard Shape

Status: `ready-for-research`

Unit: `web`.
Origin: Follow-up split from `web` unit claim and `L12G-SPELL-WEB`.
Dependencies: none.

Pre-researched scope:

- Replace Web's partial Surface mechanics with a lossless SRD shape for Magic Action level-2 Spell Slot casting, point-origin 20-foot Cube, Concentration up to 1 hour, Difficult Terrain, Lightly Obscured area, anchoring or flat-surface layering, flat-surface 5-foot depth, start-of-next-caster-turn collapse, first-entry-on-a-turn creature-entry Dexterity save trigger, separate turn-start Dexterity save trigger, failed-save Restrained while in the webs or until escape, action Strength (Athletics) escape against caster spell save DC, and flammable 5-foot Cube burn-away with 2d4 Fire damage to creatures that start turns in the fire.

Inputs:

- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Web Surface content, schema/tracer support, Unit claims, owner evidence, and focused tests.

Outputs:

- Web Dhall and JSON content, plus schema/tracer support where required, make area identity, first-entry-on-a-turn and turn-start save triggers, Restrained lifecycle, escape, terrain/obscurement, anchor collapse, flat-surface depth, and flammable cube cleanup executable source facts instead of comments or prose-only description;
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

### Task 17 - L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME - Web Restraint Hazard Runtime

Status: `blocked`

Unit: `web`.
Origin: Follow-up split from `web` unit claim and `L12G-SPELL-WEB`.
Dependencies: L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE.

Pre-researched scope:

- Promote Web's battle-visible restraint hazard: Magic Action and level-2-or-higher Spell Slot spend, caller-supplied point-origin 20-foot Cube area identity, Concentration-owned active Web area, table-triggered affected-creature facts for first-entry-on-a-turn saves and separate start-turn in-area saves, failed-save spell-owned Restrained condition tied to table-witnessed still-in-webs state, action Strength (Athletics) escape against caster spell save DC, and cleanup when escape succeeds, the target is no longer in the webs, Concentration or duration ends, or table supplies collapse or removal.

Inputs:

- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- Web Surface area-hazard shape from `L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE`;
- existing battle-runtime spell invocation, condition, area/spatial witness, Unit claims, owner evidence, and focused tests.

Outputs:

- supported-profile or profile-subset-supported Unit claim, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for resource spending, active area identity, first-entry-on-a-turn and start-turn save triggers, Restrained application, escape, and cleanup without automatic geometry, pathfinding, or area membership derivation;
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

### Task 18 - L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE - Web Terrain Obscurement Fire Boundary

Status: `blocked`

Unit: `web`.
Origin: Follow-up split from `web` unit claim and `L12G-SPELL-WEB`.
Dependencies: L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE, L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME.

Pre-researched scope:

- Decide and promote or close Web's area projection and flammable-cube clauses: active Web area as Difficult Terrain movement-cost facts, Lightly Obscured sight or perception projection, anchoring or layering collapse boundary, flat-surface 5-foot depth projection, and fire-exposed 5-foot Cube burn-away after 1 round with 2d4 Fire damage to creatures starting turns in the fire, consuming table-supplied fire exposure and affected-creature witnesses rather than storing independent map squares.

Inputs:

- `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md` when this task appears in the gate;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- Web Surface area-hazard shape from `L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE`;
- Web active-area runtime owner from `L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME`;
- existing light/obscurement, movement, damage, table/spatial/environment witness owners, Unit claims, owner evidence, and focused tests.

Outputs:

- focused Surface/runtime owner decision with tests or accepted runtime-detached closure for Difficult Terrain, Lightly Obscured, anchor collapse, flat-surface depth, and burning-cube damage and cleanup, reusing existing light/obscurement, movement, damage, and table/spatial witness owners without duplicating area state;
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

### Task 19 - L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME - Darkness Point-Origin Area Runtime Support

Status: `ready-for-research`

Unit: `darkness`.
Origin: Follow-up split from Task 9 and the Darkness Unit claim.
Dependencies: L12G-MISSING-DARKNESS.

Pre-researched scope:

- Promote Darkness's point-origin Sphere branch: Magic Action and level-2-or-higher Spell Slot spend, caster-owned Concentration up to 10 minutes, caller-supplied 15-foot point-origin Sphere area identity, active magical Darkness/Heavily Obscured zone projection that ordinary sight and Darkvision cannot see through, nonmagical light denial as a light/obscurement witness consequence rather than deletion of existing light emitters, and cleanup when Concentration or duration ends.
- Do not implement object-origin Darkness or spell-created-light overlap dispel in this task.

Inputs:

- `packages/surface/content/darkness.dhall` and `packages/surface/content/darkness.json`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `packages/battle-runtime/battle-runtime.qnt` and promoted battle-runtime tests;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness`;
- `UBIQUITOUS_LANGUAGE.md`.

Outputs:

- supported-profile or profile-subset-supported Unit claim for the point-origin branch;
- deterministic admission/projection evidence for point-origin magical Darkness;
- focused runtime tests and promoted Quint/runtime parity for point-origin magical Darkness without object-origin or spell-created-light-dispel behavior;
- regenerated coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- runtime support consumes table/spatial visibility witness facts and does not duplicate light, map, pathfinding, or object-cover state;
- focused package tests cover the point-origin owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 20 - L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH - Darkness Object-Origin Branch

Status: `ready-for-research`

Unit: `darkness`.
Origin: Follow-up split from Task 9 and the Darkness Unit claim.
Dependencies: L12G-MISSING-DARKNESS.

Pre-researched scope:

- Represent and promote or close Darkness's object branch: target object not worn or carried, 15-foot Emanation originating from that object, object-origin area identity, and opaque-cover blocking.
- Consume existing object and opaque-cover witness facts; do not add duplicate map, cover, item-lifecycle, or spatial derivation state.

Inputs:

- `packages/surface/content/darkness.dhall` and `packages/surface/content/darkness.json`;
- Surface Spell Definition schema and tracer files for attachment/area choices;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness`;
- `UBIQUITOUS_LANGUAGE.md`.

Outputs:

- Darkness Surface content and runtime owner decision with focused tests for the object-origin branch;
- supported-profile/profile-subset-supported evidence or accepted closure if object attachment, movement, and opaque-cover blocking stay outside promoted runtime;
- regenerated coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- any Surface shape makes the point-origin and object-origin alternatives unambiguous instead of duplicating derivable state;
- focused Surface/runtime tests cover the owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 21 - L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL - Darkness Spell-Created Light Dispel

Status: `blocked`

Unit: `darkness`.
Origin: Follow-up split from Task 9 and the Darkness plus Continual Flame Unit claims.
Dependencies: L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME, L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH.

Pre-researched scope:

- Promote or close the overlap rule that dispels another level-2-or-lower spell when Darkness overlaps Bright Light or Dim Light created by that spell.
- Consume generic spell-created light facts such as Continual Flame rather than dispatching on spell identity; Continual Flame cleanup must remain represented through generic spell-created light facts.

Inputs:

- `packages/surface/content/darkness.dhall` and `packages/surface/content/darkness.json`;
- `packages/surface/content/continual_flame.dhall` and `packages/surface/content/continual_flame.json`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- promoted battle-runtime spell effect lifecycle owners and relevant Quint specs;
- local RAW under `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness`;
- `UBIQUITOUS_LANGUAGE.md`.

Outputs:

- focused tests and promoted Quint/runtime parity or accepted closure for overlap-triggered dispel of spell-created light;
- updated Darkness and Continual Flame Unit claims that keep the overlap owner generic and avoid spell-identity dispatch;
- regenerated coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- no Darkness-local registry or spell-name/id dispatch is introduced for spell-created light;
- focused package tests cover the overlap owner boundary touched by the task;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 22 - L12G-RECURSIVE-TAIL-LOOP-A - LOOP-A Recursive Next-Batch Planning Tail

Status: `blocked`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: L12G-SPELL-LESSER-RESTORATION, L12G-SPELL-MAGIC-WEAPON, L12G-SPELL-MIND-SPIKE, L12G-SPELL-WEB, L12G-MISSING-ANIMAL-MESSENGER, L12G-MISSING-ARCANISTS-MAGIC-AURA, L12G-MISSING-AUGURY, L12G-MISSING-CALM-EMOTIONS, L12G-MISSING-DARKNESS, L12G-MISSING-DARKVISION, L12G-MISSING-DETECT-THOUGHTS, L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME, L12G-FOLLOWUP-GUST-OF-WIND-GAS-FLAME-CLOSURE, L12G-FOLLOWUP-MAGIC-WEAPON-SURFACE-ITEM-SHAPE, L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME, L12G-FOLLOWUP-WEB-SURFACE-AREA-HAZARD-SHAPE, L12G-FOLLOWUP-WEB-RESTRAINT-HAZARD-RUNTIME, L12G-FOLLOWUP-WEB-TERRAIN-OBSCUREMENT-FIRE, L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME, L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH, L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude, Wild Shape, and Moonbeam work, avoid companion work, and create 5-10 new atomic Ralph tasks for open spell closures and newly exposed strict level-1/2 runtime/profile frontier.

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
