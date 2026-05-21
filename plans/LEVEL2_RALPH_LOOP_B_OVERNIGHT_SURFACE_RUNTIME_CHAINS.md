# Level 2 Ralph Loop B - Overnight Surface Runtime Chains

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION",
      "status": "blocked",
      "title": "Acid Arrow RAW Corpus Reconciliation"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "blocked",
      "title": "Acid Arrow Surface Damage Shape"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Acid Arrow Delayed Runtime Support"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE",
      "status": "done",
      "title": "Alter Self Surface Option Shape"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME",
      "status": "done",
      "title": "Alter Self Mode Lifecycle And Aquatic Runtime"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME",
      "status": "done",
      "title": "Alter Self Natural Weapons Runtime"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL",
      "status": "done",
      "title": "Continual Flame Dispel And Suppression Removal"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE",
      "status": "done",
      "title": "Flame Blade Surface Lifecycle Shape"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT",
      "status": "done",
      "title": "Flame Blade Runtime Support"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE",
      "status": "done",
      "title": "Heat Metal Surface Contact Escape Shape"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME",
      "status": "done",
      "title": "Heat Metal Contact Damage Runtime"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY",
      "status": "done",
      "title": "Heat Metal Holding Wearing Penalty Runtime"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING",
      "status": "ready-for-research",
      "title": "Dispel Magic Ongoing Spell Ending"
    },
    {
      "number": 14,
      "id": "L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL",
      "status": "ready-for-research",
      "title": "Darkness Spell-Created Light Dispel"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-ANTIMAGIC-FIELD-SPELL-EFFECT-SUPPRESSION",
      "status": "ready-for-research",
      "title": "Antimagic Field Spell Effect Suppression"
    },
    {
      "number": 16,
      "id": "L12G-RECURSIVE-TAIL-LOOP-B",
      "status": "blocked",
      "title": "LOOP-B Recursive Next-Batch Planning Tail"
    }
  ]
}
-->

This is a runnable overnight Ralph plan split out of the stale monolithic A plan and the current level-1/2 strict frontier. It owns Surface-to-runtime chains for Acid Arrow, Alter Self, Continual Flame, Flame Blade, and Heat Metal.

Preplanned load: 15 real atomic implementation/planning tasks plus one recursive planning tail. The recursive tail is a fallback only; ordinary `blocked` tasks already auto-unblock when their same-plan dependencies are marked `done`.

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

- Base branch: `ralph/level2-loop-b/overnight-surface-runtime`.
- Integration worktree: `/workspace/typescript/dnd-ralph-level2-b`.
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
| 1 | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Acid Arrow RAW Corpus Reconciliation | blocked | owner RAW-corpus decision | B lane; Unit `acid_arrow`; local SRD 5.2.1 line 14 omits initial hit damage while line 16 refers to both initial and later damage. |
| 2 | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION | B lane; Unit `acid_arrow`. |
| 3 | L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support | blocked | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE | B lane; Unit `acid_arrow`. |
| 4 | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape | done | completed baseline | B lane; Unit `alter_self`. |
| 5 | L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Mode Lifecycle And Aquatic Runtime | done | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE | B lane; Unit `alter_self`. |
| 6 | L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime | done | L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME | B lane; Unit `alter_self`. |
| 7 | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal | done | completed baseline | B lane; Unit `continual_flame`; split remaining RAW-sourced cleanup owners into concrete follow-up tasks. |
| 8 | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape | done | completed baseline | B lane; Unit `flame_blade`; installed Surface lifecycle shape and left runtime support to Task 9. |
| 9 | L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support | done | L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE | B lane; Unit `flame_blade`; promoted spell-created held object runtime support. |
| 10 | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape | done | completed baseline | B lane; Unit `heat_metal`. |
| 11 | L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime | done | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE | B lane; Unit `heat_metal`. |
| 12 | L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime | done | L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME | B lane; Unit `heat_metal`; promoted held/worn save, drop witness, fallback penalty, and cleanup runtime support. |
| 13 | L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING - Dispel Magic Ongoing Spell Ending | ready-for-research | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL | B lane split; Unit `dispel_magic`; resolves generic ongoing spell ending for object-attached Continual Flame occurrences without a spell-specific removal registry. |
| 14 | L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL - Darkness Spell-Created Light Dispel | ready-for-research | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL | B lane split; Unit `darkness`; first author or close the missing SRD Darkness Unit, then resolve level-2-or-lower spell-created light overlap dispel. |
| 15 | L12G-FOLLOWUP-ANTIMAGIC-FIELD-SPELL-EFFECT-SUPPRESSION - Antimagic Field Spell Effect Suppression | ready-for-research | L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL | B lane split; Unit `antimagic_field`; resolves generic ongoing spell suppression for object-attached Continual Flame occurrences without duplicating emitter state. |
| 16 | L12G-RECURSIVE-TAIL-LOOP-B - LOOP-B Recursive Next-Batch Planning Tail | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION, L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE, L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT, L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME, L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME, L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL, L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE, L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT, L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME, L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY, L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING, L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL, L12G-FOLLOWUP-ANTIMAGIC-FIELD-SPELL-EFFECT-SUPPRESSION | Last-resort next-batch planning safety net; auto-unblocks only after every real task in this plan is `done`. |

## Task Details

### Task 1 - L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Acid Arrow RAW Corpus Reconciliation

Status: `blocked`

Unit: `acid_arrow`.
Origin: Split from Task 1 attempt of `L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE`.
Dependencies: owner RAW-corpus decision.

Pre-researched scope:

- Resolve the local SRD 5.2.1 Acid Arrow contradiction before any Surface or runtime modeling: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` line 14 states only later Acid damage at the end of the target's next turn, while line 14's miss branch refers to "initial damage" and line 16 says both initial and later damage increase. `ASSUMPTIONS.md` currently has no Acid Arrow entry. The owner must either correct the local corpus or add an approved assumption that explicitly identifies whether initial hit damage exists, how miss-only half damage is derived, which damage occurs at the end of the target's next turn, and how slot scaling applies.

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `ASSUMPTIONS.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `acid_arrow`.

Outputs:

- owner-approved RAW corpus correction or `ASSUMPTIONS.md` entry that makes the initial/later/miss damage relationship modelable without inference from contradictory prose;
- keep `acid_arrow` out of runtime support until this correction or assumption lands;
- update affected Unit claims and coverage artifacts only when the owner-approved decision changes the executable task surface.

Acceptance:

- RAW and ubiquitous-language checks are performed before changing content;
- no immediate hit damage, miss-only half damage, delayed damage, or slot scaling is modeled from implication alone;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes.

### Task 2 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Acid Arrow Surface Damage Shape

Status: `blocked`

Unit: `acid_arrow`.
Origin: Original backlog task 88.
Dependencies: L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION.

Pre-researched scope:

- After the RAW corpus or `ASSUMPTIONS.md` resolves Acid Arrow's initial/later damage relationship, replace Acid Arrow lossy mechanics with lossless Surface facts for the approved damage timing, miss branch, end-of-next-turn damage, and slot scaling. Do not model immediate initial hit damage, half-on-miss damage, or "both initial and later" scaling until the owner-approved RAW reconciliation exists.

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

### Task 3 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Acid Arrow Delayed Runtime Support

Status: `blocked`

Unit: `acid_arrow`.
Origin: Original backlog task 89.
Dependencies: L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE.

Pre-researched scope:

- Promote Acid Arrow runtime after the Surface shape and RAW-corpus reconciliation land: attack roll, approved hit/miss damage timing, delayed end-of-target-next-turn damage where sourced, slot scaling, resource spending, typed Spell Effect occurrence identity, and cleanup.

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

### Task 4 - L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE - Alter Self Surface Option Shape

Status: `done`

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

### Task 5 - L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME - Alter Self Mode Lifecycle And Aquatic Runtime

Status: `done`

Unit: `alter_self`.
Origin: Original backlog task 91.
Dependencies: L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE.

Pre-researched scope:

- Promote Alter Self Spell Effect state for the active player-selected option, Magic Action option replacement, Concentration cleanup, shared mode-lifecycle API, Aquatic Adaptation water breathing, linked Swim Speed equal to Speed, and Change Appearance closure.

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

### Task 6 - L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME - Alter Self Natural Weapons Runtime

Status: `done`

Unit: `alter_self`.
Origin: Original backlog task 92.
Dependencies: L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME.

Pre-researched scope:

- Promote Natural Weapons as active Alter Self Spell Effect state that overrides Unarmed Strike using a player-selected typed `DamageType`, 1d6 damage, caster spellcasting ability for attack and damage rolls, shared mode replacement, and cleanup.

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

### Task 7 - L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL - Continual Flame Dispel And Suppression Removal

Status: `done`

Unit: `continual_flame`.
Origin: Original backlog task 93.
Dependencies: none.

Pre-researched scope:

- Close or promote only RAW-sourced Continual Flame interactions: `Until dispelled`, covered/hidden presentation, not smothered/quenched, and any separately sourced interaction such as Darkness dispelling spell-created light. Do not add generic suppression/removal mechanics.

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

### Task 8 - L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE - Flame Blade Surface Lifecycle Shape

Status: `done`

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

### Task 9 - L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT - Flame Blade Runtime Support

Status: `done`

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

### Task 10 - L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE - Heat Metal Surface Contact Escape Shape

Status: `done`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: none.

Pre-researched scope:

- Replace Heat Metal lossy ongoing-effect encoding with lossless Surface facts for table-witnessed manufactured-metal object targeting, table-witnessed contact/wearing/holding facts, Spell Invocation damage/save facts, later Bonus Action repeat damage, and typed drop-capability/drop-result witness facts rather than runtime object derivation.

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

### Task 11 - L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME - Heat Metal Contact Damage Runtime

Status: `done`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE.

Pre-researched scope:

- Promote Heat Metal damage lifecycle after the Surface shape lands: spell spend, table-witnessed object/contact facts, immediate and repeat Fire damage, slot scaling, damage disposition, Concentration saves, branded active Spell Effect occurrence identity, and cleanup.

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

### Task 12 - L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY - Heat Metal Holding Wearing Penalty Runtime

Status: `done`

Unit: `heat_metal`.
Origin: Follow-up split from completed `L12G-SPELL-HEAT-METAL`.
Dependencies: L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME.

Pre-researched scope:

- Promote the held/worn object save, typed drop-capability/drop-result witness, fallback Attack Roll and Ability Check Disadvantage, caster-turn-start expiry, and cleanup tied to the same branded Heat Metal Spell Effect occurrence.

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

### Task 13 - L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING - Dispel Magic Ongoing Spell Ending

Status: `ready-for-research`

Unit: `dispel_magic`.
Origin: Split from completed Task 7 `L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL`.
Dependencies: L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL.

Pre-researched scope:

- Promote or precisely close Dispel Magic's ongoing-spell ending procedure from `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel Magic`: target creature/object/magical-effect selection, automatic ending for ongoing spells of level 3 or lower on the target, ability-check gate for level 4 or higher ongoing spells, and higher-slot automatic ending when the ongoing spell level is at most the slot level used. The owner must consume generic ongoing Spell Effect occurrences such as object-attached Continual Flame rather than adding a Continual Flame-specific removal registry.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- `plans/unit-profile-coverage/unit-matrix.json`;
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `dispel_magic` and object-light Spell Effect occurrences including `continual_flame`.

Outputs:

- supported Dispel Magic profile, accepted closure, or a smaller follow-up split for ongoing Spell Effect ending;
- Continual Flame's deferred Dispel Magic cleanup remains represented through the generic ongoing Spell Effect owner, not through authored spell identity dispatch or a parallel per-spell removal list;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover Dispel Magic target admission, low-level automatic ending, higher-level ability-check or slot gate behavior, and object-attached Continual Flame cleanup when supported;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 14 - L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL - Darkness Spell-Created Light Dispel

Status: `ready-for-research`

Unit: `darkness`.
Origin: Split from completed Task 7 `L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL`.
Dependencies: L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL.

Pre-researched scope:

- Author or explicitly close the missing SRD Darkness Surface Unit, then promote or precisely close the overlap rule from `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness`: if Darkness overlaps Bright Light or Dim Light created by a spell of level 2 or lower, that other spell is dispelled. Consume generic spell-created light facts, including Continual Flame object emitters, without dispatching on authored spell identity.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- `plans/unit-profile-coverage/unit-matrix.json`;
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for object-light Spell Effect occurrences including `continual_flame`.

Outputs:

- SRD-provenance Darkness Surface catalog outcome plus supported profile, accepted closure, or a smaller follow-up split for spell-created light overlap dispel;
- the three current missing Darkness spell-list rows are resolved through authored catalog evidence or an explicit accepted closure;
- Continual Flame's deferred Darkness overlap cleanup remains represented through the Darkness owner and generic spell-created light facts;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover Darkness catalog admission or accepted closure, overlap with level-2-or-lower spell-created Bright/Dim Light, non-identity-based cleanup of Continual Flame when supported, and any retained unsupported residuals;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 15 - L12G-FOLLOWUP-ANTIMAGIC-FIELD-SPELL-EFFECT-SUPPRESSION - Antimagic Field Spell Effect Suppression

Status: `ready-for-research`

Unit: `antimagic_field`.
Origin: Split from completed Task 7 `L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL`.
Dependencies: L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL.

Pre-researched scope:

- Promote or precisely close Antimagic Field's ongoing-spell suppression from `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field`: ongoing spells in the area are suppressed except those cast by an Artifact or deity; suppressed effects do not function, but suppressed time counts against duration. The owner must suppress object-attached Continual Flame emitters without deleting their spell occurrence or duplicating emitter state.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- `plans/unit-profile-coverage/unit-matrix.json`;
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `antimagic_field` and object-light Spell Effect occurrences including `continual_flame`.

Outputs:

- supported Antimagic Field profile, accepted closure, or a smaller follow-up split for ongoing Spell Effect suppression;
- Continual Flame's deferred Antimagic Field suppression remains represented through a generic ongoing Spell Effect suppression owner, not through authored spell identity dispatch or duplicated object-emitter state;
- update only the owner files required by the task;
- regenerate coverage artifacts.

Acceptance:

- RAW and ubiquitous-language checks are performed before modeling;
- focused package tests cover Antimagic Field suppression of ongoing spells in the area, non-deleting suppression and restoration of object-attached Continual Flame emitters when supported, Artifact/deity exception handling or accepted closure, and duration-time handling for suppressed effects;
- package typecheck is run for touched packages when dependencies are available;
- `pnpm unit-profile-coverage:check --write` and `pnpm unit-profile-coverage:check` are run;
- `git diff --check` passes;
- reviewer-loop convergence completes with RAW, ubiquitous-language/domain-language, architecture/connascence, and code-review passes;
- battle-runtime MBT is used only under the repository scarcity protocol when promoted battle-runtime behavior changes and focused tests cannot cover the boundary.

### Task 16 - L12G-RECURSIVE-TAIL-LOOP-B - LOOP-B Recursive Next-Batch Planning Tail

Status: `blocked`

Unit: `level1_2_frontier`.
Origin: Safety-net planning task for when this plan has no earlier runnable implementation tasks.
Dependencies: L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION, L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE, L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT, L12G-FOLLOWUP-ALTER-SELF-SURFACE-OPTION-SHAPE, L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME, L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME, L12G-FOLLOWUP-CONTINUAL-FLAME-DISPEL-REMOVAL, L12G-FOLLOWUP-FLAME-BLADE-SURFACE-LIFECYCLE, L12G-FOLLOWUP-FLAME-BLADE-RUNTIME-SUPPORT, L12G-FOLLOWUP-HEAT-METAL-SURFACE-CONTACT-ESCAPE-SHAPE, L12G-FOLLOWUP-HEAT-METAL-CONTACT-DAMAGE-RUNTIME, L12G-FOLLOWUP-HEAT-METAL-HOLDING-WEARING-PENALTY, L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING, L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL, L12G-FOLLOWUP-ANTIMAGIC-FIELD-SPELL-EFFECT-SUPPRESSION.

Pre-researched scope:

- Do not use this as ordinary dependency unblocking. Ralph already auto-unblocks same-plan blocked tasks whose dependencies are done. Use this only when no earlier task in this plan is runnable: inspect current metrics and git history, exclude external Claude, Wild Shape, and Moonbeam work, avoid companion work, and create 5-10 new atomic Ralph tasks for Surface-to-runtime spell chains and follow-up splits produced by those chains.

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
