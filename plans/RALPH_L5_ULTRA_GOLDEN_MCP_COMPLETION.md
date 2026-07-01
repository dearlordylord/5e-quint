# Ralph L5 Ultra-Golden MCP Completion

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5UG-PRE-01-L5-FULL-QUEUE-CLOSED",
      "status": "ready-for-research",
      "title": "Verify the L5 full SRD queue is closed"
    },
    {
      "number": 2,
      "id": "L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING",
      "status": "blocked",
      "title": "Add level-1-5 support report plumbing"
    },
    {
      "number": 3,
      "id": "L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE",
      "status": "blocked",
      "title": "Wire level-1-5 into the ultra-golden aggregate"
    },
    {
      "number": 4,
      "id": "L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION",
      "status": "blocked",
      "title": "Reconcile level-1-5 non-MCP ultra-golden layers"
    },
    {
      "number": 5,
      "id": "L5UG-MCP-01-LEVEL5-VERTICAL-DECISION",
      "status": "blocked",
      "title": "Choose the level-5 MCP vertical scenario"
    },
    {
      "number": 6,
      "id": "L5UG-MCP-02-LEVEL5-SHEET-SCENARIO",
      "status": "blocked",
      "title": "Implement level-5 MCP creation and sheet scenario coverage"
    },
    {
      "number": 7,
      "id": "L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF",
      "status": "blocked",
      "title": "Extend the level-5 MCP scenario through battle handoff"
    },
    {
      "number": 8,
      "id": "L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY",
      "status": "blocked",
      "title": "Register the level-5 MCP scenario in acceptance coverage"
    },
    {
      "number": 9,
      "id": "L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE",
      "status": "blocked",
      "title": "Admit level-1-5 MCP scenario evidence"
    },
    {
      "number": 10,
      "id": "L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH",
      "status": "blocked",
      "title": "Refresh and verify the level-1-5 ultra-golden gate"
    }
  ]
}
-->

## Scope

This is the follow-on Ralph queue after
`plans/RALPH_L5_FULL_SRD_COMPLETION.md` closes. The first queue completes
level-5 SRD SDK/accounting closure. This queue raises the level-5 result to the
same user-facing standard used by level 4: ultra-golden scope coverage with
checker-owned MCP scenario evidence.

Run it after the first queue has no remaining runnable tasks:

```bash
scripts/ralph-run.sh plans/RALPH_L5_ULTRA_GOLDEN_MCP_COMPLETION.md
```

## Ralph Task-Base Check

Every Ralph task must run the task-base check before research or edits:

1. Log the task-provided Base SHA or Base ref.
2. Log `HEAD`.
3. Run `git merge-base --is-ancestor <Base SHA> HEAD`.
4. Stop and report a branch-base mismatch if the ancestor check fails. Do not
   rebase or repair branch state inside the task.

## Source Artifacts

- `plans/RALPH_L5_FULL_SRD_COMPLETION.md`
- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/ultra-golden-gate.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- This queue may change checker, MCP test, generated report, and planning files.
  It must not reopen SDK/accounting rows already closed by the first queue
  unless a checker-owned contradiction is found.
- Keep L5 scope SRD-only. PHB+ content remains out of scope.
- MCP scenarios must follow returned tool state: use returned draft revisions,
  hole ids, option ids, character ids, battle ids, and battle holes. Do not
  branch runtime behavior on authored Unit, class, feature, spell, or scenario
  names.
- Prefer one level-5 vertical scenario that covers workflow discovery,
  character creation or advancement, durable Character Sheet state, and battle
  handoff. Add a second scenario only if one vertical cannot honestly cover all
  four required MCP flows.
- Do not add duplicate state for Spell Slots, prepared spells, spellbook
  contents, feature resources, battle spell slots, or battle actions. Thread or
  project existing owners.
- If level-1-5 ultra-golden cannot pass because a non-MCP layer is genuinely
  missing support or parity after the first queue is closed, split that missing
  work into concrete Ralph tasks in this plan instead of hiding it in prose.
- Do not run MBT for plan-only or MCP-only tasks. Run focused MBT only if a task
  changes battle runtime or QNT parity behavior.

## DAG / Queue Order

|   # | Task                                                                                       | Status             | Depends on                                                                                      | Notes                                                                                 |
| --: | ------------------------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
|   1 | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED - Verify the L5 full SRD queue is closed                  | ready-for-research | none                                                                                            | Confirms the SDK/accounting queue is actually closed before ultra-golden work starts.  |
|   2 | L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING - Add level-1-5 support report plumbing              | blocked            | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED                                                                | Adds the generated level-support report path before ultra-golden consumes it.          |
|   3 | L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE - Wire level-1-5 into the ultra-golden aggregate          | blocked            | L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING                                                           | Extends the aggregate gate without weakening older scopes.                             |
|   4 | L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION - Reconcile level-1-5 non-MCP ultra-golden layers | blocked           | L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE                                                                | Confirms support, QNT/generator, and parity layers before MCP evidence closeout.       |
|   5 | L5UG-MCP-01-LEVEL5-VERTICAL-DECISION - Choose the level-5 MCP vertical scenario            | blocked            | L5UG-PRE-01-L5-FULL-QUEUE-CLOSED                                                                | Chooses the smallest honest SRD-only vertical from post-SDK-supported behavior.        |
|   6 | L5UG-MCP-02-LEVEL5-SHEET-SCENARIO - Implement level-5 MCP creation and sheet scenario coverage | blocked        | L5UG-MCP-01-LEVEL5-VERTICAL-DECISION                                                            | Adds creation/finalization/sheet proof before battle handoff.                          |
|   7 | L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF - Extend the level-5 MCP scenario through battle handoff | blocked            | L5UG-MCP-02-LEVEL5-SHEET-SCENARIO, L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION                    | Adds battle handoff only after sheet coverage and non-MCP blockers are known.          |
|   8 | L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY - Register the level-5 MCP scenario in acceptance coverage | blocked        | L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF                                                               | Wires the executable scenario into MCP acceptance coverage.                             |
|   9 | L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE - Admit level-1-5 MCP scenario evidence              | blocked            | L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY                                                            | Updates checker-owned MCP evidence only after executable coverage exists.              |
|  10 | L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH - Refresh and verify the level-1-5 ultra-golden gate    | blocked            | L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE                                                           | Final generated refresh after scope, parity, and MCP evidence land.                    |

## Shared Verification

- RAW/ubiquitous-language check: before modeling or asserting level-5 behavior,
  read the relevant `.references/srd-5.2.1/` passages and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Base commands:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm sdk-raw-integration-inventory:check`,
  `pnpm cleanroom-branch-coverage:check`,
  `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`,
  `git diff --check`.
- If checker or generated report files change, run:
  `pnpm unit-profile-coverage:check --write`,
  then rerun `pnpm unit-profile-coverage:check`.
- If battle runtime or QNT parity behavior changes, add the focused runtime/QNT
  verification required by that task. Do not use broad MBT as exploratory
  validation.

## Task Details

### Task 1 - L5UG-PRE-01-L5-FULL-QUEUE-CLOSED

Status: `ready-for-research`

Depends on: none

Inputs:

- `plans/RALPH_L5_FULL_SRD_COMPLETION.md`
- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- Current `pnpm sdk-raw-integration-inventory:check` and
  `pnpm unit-profile-coverage:check` results.

Current state:

- The L5 SDK/accounting queue is expected to run first from
  `plans/RALPH_L5_FULL_SRD_COMPLETION.md`.
- This queue should not start ultra-golden implementation while the first queue
  still has runnable or blocked tasks.

Output:

- Verify `plans/RALPH_L5_FULL_SRD_COMPLETION.md` has no remaining tasks with a
  runnable, blocked, or deferred status.
- Verify the first queue's final generated-refresh task has landed and current
  generated artifacts agree with the post-L5 accounting state.
- If the first queue is not closed, mark this task `blocked` with
  `Blocker Type: dependency` and name the unfinished task ids. Do not edit the
  rest of this plan.

Completion / Success Criteria:

- It is safe to run the ultra-golden queue because the SDK/accounting queue is
  closed.
- `pnpm sdk-raw-integration-inventory:check` passes.
- `pnpm unit-profile-coverage:check` passes or any failure is documented as a
  pre-existing repository/worktree problem unrelated to level-5 closure.
- Task 2 and Task 5 are unblocked only after this task is accepted.

Verification:

- Shared verification commands that are relevant to a read-only prerequisite
  check.

### Task 2 - L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING

Status: `blocked`

Depends on: `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`.

Inputs:

- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- Existing level-support report paths for level 1 through level 4.
- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`

Current state:

- Unit-profile coverage currently emits level-support reports through
  `level-1-4`.
- L5 SDK/accounting artifacts exist separately and are not yet exposed as a
  checker-owned level-support report.

Output:

- Add the checker/config paths needed for a generated `level-1-5` support
  report and JSON artifact.
- Derive the level-1-5 report from generated inventory/accounting inputs rather
  than hand-maintained prose.
- Preserve existing level-1 through level-1-4 report outputs.

Completion / Success Criteria:

- The repository has generated level-1-5 support report paths wired through the
  checker.
- Running the checker write path can produce the new artifacts without
  weakening older level reports.
- Any open level-1-5 support blockers are checker-readable.

Verification:

- `pnpm unit-profile-coverage:check --write`
- Shared verification.

### Task 3 - L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE

Status: `blocked`

Depends on: `L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-SCOPE-01-LEVEL15-REPORT-PLUMBING`.

Inputs:

- `scripts/ultra-golden-gate.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- The generated level-1-5 support report and JSON path from Task 2.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- Existing `ULTRA_GOLDEN_GATE.md` and `ultra-golden-gate.json` shape.

Current state:

- `scripts/ultra-golden-gate.cjs` currently scopes the aggregate through
  `level-1-4`.
- Task 2 must create the level-1-5 support report input before this task wires
  it into the aggregate.

Output:

- Add `level-1-5` to the ultra-golden aggregate scope.
- Preserve older scope behavior and report wording.
- Make missing level-1-5 layer evidence appear as explicit checker blockers.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` and `ultra-golden-gate.json` include a `level-1-5`
  scope.
- Existing level-1, level-1-2, level-1-3, and level-1-4 scope results are not
  weakened.
- No generated coverage artifact is hand-edited outside the checker write path.

Verification:

- `pnpm unit-profile-coverage:check --write`
- Shared verification.

### Task 4 - L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION

Status: `blocked`

Depends on: `L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-SCOPE-02-ULTRA-GOLDEN-SCOPE`.

Inputs:

- The level-1-5 ultra-golden output from Task 3.
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/cleanroom-branch-coverage/`
- `pnpm rules-kernel-coverage:check` output.
- `pnpm cleanroom-branch-coverage:check` output.

Current state:

- Ultra-golden is conjunctive: support completeness, QNT/generator readiness,
  MBT/parity evidence, and MCP scenario evidence must all pass for the scoped
  level.
- The first L5 queue is expected to close SDK/accounting rows, but it does not
  by itself prove the non-MCP ultra-golden layers for `level-1-5`.

Output:

- Reconcile `level-1-5` support completeness, QNT/generator readiness, and
  MBT/parity evidence after Task 3 adds the scope.
- If these layers already pass from existing evidence, record the checker-owned
  result and preserve it.
- If a non-MCP layer is missing evidence, do not let downstream MCP battle
  handoff unblock prematurely. Either resolve the blocker in this task, or add
  concrete Ralph tasks for the blocker and update `ralph-task-index`,
  `## DAG / Queue Order`, and downstream dependencies so Task 7 and Task 10
  depend on the new blocker tasks.

Completion / Success Criteria:

- The only remaining `level-1-5` ultra-golden blockers are MCP scenario evidence
  blockers, or this plan has concrete additional tasks for every non-MCP
  blocker and downstream dependencies have been rewired to wait for them.
- No parity evidence is inferred from SDK scenarios unless the checker already
  admits that witness kind for the layer.
- If any non-MCP blocker remains unresolved and no dependency-rewired follow-up
  task was added, this task is not complete and must stay non-done.
- No MBT is run unless this task changes battle runtime or QNT parity behavior.

Verification:

- Shared verification plus any focused checker command needed by split blocker
  tasks.

### Task 5 - L5UG-MCP-01-LEVEL5-VERTICAL-DECISION

Status: `blocked`

Depends on: `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-PRE-01-L5-FULL-QUEUE-CLOSED`.

Inputs:

- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- L4 uses the executable MCP scenario
  `create-level-four-wizard-asi-and-battle-handoff`.
- L5 needs a comparable user-facing vertical that proves level-5 character
  state, spell access, durable Character Sheet projection, and battle handoff.

Output:

- Write `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`.
- Choose the smallest honest SRD-only level-5 MCP vertical.
- Prefer a Wizard or other class path that can prove level-3 spell access and
  battle handoff using already-supported level-5 behavior after the first queue
  closes.
- Record exact local SRD anchors, existing owner boundaries, selected Unit or
  spell candidates, expected Spell Slot projection, and why the vertical covers
  the required MCP flows.
- Update Tasks 6 and 7 in this plan if the chosen scenario requires more
  precise acceptance than the defaults below.

Completion / Success Criteria:

- The decision artifact names one primary scenario and rejects plausible
  alternatives with concrete reasons.
- The chosen scenario does not depend on future-owner-before-SDK rows.
- The scenario can be executed through MCP-returned holes/tool state rather than
  hard-coded internal state.

Verification:

- RAW/ubiquitous-language check for the selected class and spell anchors.
- `git diff --check`.

### Task 6 - L5UG-MCP-02-LEVEL5-SHEET-SCENARIO

Status: `blocked`

Depends on: `L5UG-MCP-01-LEVEL5-VERTICAL-DECISION`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-MCP-01-LEVEL5-VERTICAL-DECISION`.

Inputs:

- `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/character-tools.ts`
- `packages/mcp/src/protocol-server.ts`
- Local SRD anchors named by the Task 5 decision artifact.

Current state:

- MCP tests currently include level-3 and level-4 verticals, but no level-5
  vertical.

Output:

- Add the level-5 MCP scenario helper and creation/finalization path in
  `packages/mcp/test-support/mcp-acceptance-scenarios.ts`.
- Prove durable Character Sheet state for the chosen level-5 character before
  battle starts.
- Keep battle start or battle action assertions out of this task unless they
  are needed to make the helper compile.

Completion / Success Criteria:

- The scenario can create or advance the selected SRD level-5 character through
  MCP-returned holes/tool state.
- For a full-caster level-5 path, the Character Sheet exposes level-3 spell
  access and expected Spell Slot progression without duplicate Spell Slot state.
- The helper follows returned revisions, hole ids, and option ids.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 7 - L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF

Status: `blocked`

Depends on: `L5UG-MCP-02-LEVEL5-SHEET-SCENARIO`,
`L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-MCP-02-LEVEL5-SHEET-SCENARIO` and
`L5UG-GATE-01-NON-MCP-LAYER-RECONCILIATION`.

Inputs:

- The level-5 sheet scenario helper from Task 6.
- `plans/unit-profile-coverage/L5_ULTRA_GOLDEN_MCP_VERTICAL_DECISION.md`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- Battle handoff and selected behavior owners named by the Task 5 decision.
- Current Task 4 non-MCP layer reconciliation result.

Current state:

- Task 6 proves the level-5 character/sheet path.
- This task owns only battle handoff and the selected supported level-5 battle
  behavior.

Output:

- Extend the Task 6 scenario through `start_battle`.
- Inspect battle projection for the selected level-5 character.
- Exercise or discover the selected supported level-5 battle behavior from
  Task 5 without adding new runtime semantics.

Completion / Success Criteria:

- The battle starts from the durable character created by the level-5 scenario.
- Battle handoff exposes the expected level-5 state and, for a full-caster path,
  level-3 Spell Slot/access projection.
- The scenario follows returned battle ids, combatant ids, and battle holes.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 8 - L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY

Status: `blocked`

Depends on: `L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-MCP-03-LEVEL5-BATTLE-HANDOFF`.

Inputs:

- The executable level-5 MCP scenario from Tasks 6 and 7.
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`

Current state:

- The executable scenario must be listed in MCP acceptance metadata before the
  evidence manifest can cite it.

Output:

- Add the level-5 scenario to the MCP acceptance scenario registry.
- Register the scenario in `packages/mcp/src/mcp-protocol.test.ts` or the
  package-local acceptance runner entry point used by the registry.
- Preserve existing level-1 through level-4 scenarios.

Completion / Success Criteria:

- `verifyAgentConversationScenarios` and the protocol acceptance test include
  the level-5 scenario.
- The scenario id is stable and suitable for
  `plans/unit-profile-coverage/mcp-scenario-evidence.json`.
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` passes.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`.

### Task 9 - L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE

Status: `blocked`

Depends on: `L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-MCP-04-LEVEL5-SCENARIO-REGISTRY`.

Inputs:

- Registered scenario id from Task 8.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `scripts/ultra-golden-gate.cjs`
- Existing level-1 through level-1-4 MCP evidence rows.

Current state:

- `plans/unit-profile-coverage/mcp-scenario-evidence.json` currently records
  required MCP flows through `level-1-4`.

Output:

- Add `level-1-5` to the required MCP flow scope where appropriate.
- Add checker-owned MCP scenario evidence rows for the executable level-5
  scenario.
- Add or update the level-1-5 MCP scope audit decision so evidence admission is
  explicit and checker-owned.
- If any required flow lacks executable evidence, do not admit a placeholder
  closure. Add concrete Ralph implementation tasks and update `ralph-task-index`,
  `## DAG / Queue Order`, and this task's dependencies so this task cannot
  complete before those tasks land.

Completion / Success Criteria:

- `packages/mcp/src/mcp-scenario-evidence.test.ts` accepts the manifest.
- Every `level-1-5` required flow has executable `mcp-scenario` evidence.
- If executable evidence is still missing for any required flow, this task is
  not complete and must stay non-done with dependency-rewired follow-up tasks in
  the plan.
- The manifest references real repo-relative owner and test paths.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Shared verification.

### Task 10 - L5UG-FINAL-01-ULTRA-GOLDEN-REFRESH

Status: `blocked`

Depends on: `L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE`

Blocker Type: dependency

Blocker Detail: waiting for `L5UG-MCP-05-LEVEL15-SCENARIO-EVIDENCE`.

Inputs:

- All generated artifacts touched by Tasks 2, 3, 4, and 9.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- Shared verification command output.

Current state:

- The final generated reports must be refreshed only after scope, non-MCP
  layers, and MCP evidence are all reconciled.

Output:

- Regenerate unit-profile and ultra-golden artifacts.
- Confirm `level-1-5` passes every ultra-golden layer.
- Update planning text only when a durable new fact was learned during the
  queue.

Completion / Success Criteria:

- `ULTRA_GOLDEN_GATE.md` reports `level-1-5` as pass across support
  completeness, QNT/generator readiness, MBT/parity evidence, and MCP scenario
  evidence.
- `plans/unit-profile-coverage/ultra-golden-gate.json` records the same result.
- Existing level-1 through level-1-4 results remain pass.
- No new broad TODO or prose-only blocker remains in this plan.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`
