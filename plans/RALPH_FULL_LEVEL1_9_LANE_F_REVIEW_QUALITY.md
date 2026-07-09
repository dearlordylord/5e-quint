# Ralph Full Level 1-9 Lane F: Review and Quality

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19F-05-FOCUSED-QNT-MBT-CLOSURE", "status": "already-applied", "title": "Run focused QNT, proof, runtime, and MBT checks for promoted behavior" },
    { "number": 2, "id": "L19F-06-REVIEWER-LOOP-CONVERGENCE", "status": "already-applied", "title": "Run RAW, ubiquitous-language, architecture, connascence, and code-review convergence" },
    { "number": 3, "id": "L19F-07-RALPH-PLAN-CONSISTENCY", "status": "already-applied", "title": "Final-only, post-implementation plan consistency check" },
    { "number": 4, "id": "L19F-08-FINAL-SERIALIZED-QUALITY-GATE", "status": "already-applied", "title": "Run the final serialized quality gate for true level-9 full support" }
  ]
}
-->

## Lane Scope

Lane F serializes verification after implementation lanes converge. It owns
focused QNT/MBT closure, reviewer-loop convergence, plan consistency, and the
final quality gate.

This lane is complete only when the implementation has converged: strict
level-1-9 support passes, `level-1-9` ultra-golden passes, focused QNT/MBT
evidence exists for promoted runtime behavior, and reviewer-loop findings are
fixed or explicitly rejected with concrete reasons.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane verifies convergence after implementation; it does not replace
implementation. A plan-consistency pass, reviewer-loop pass, or generated-report
refresh can finish this lane only when strict support blockers are already zero
and the final serialized gate passes.

Default Ralph behavior for this lane is to run final verification only after
implementation lanes have closed every blocker. If blockers remain, this lane
must name the owning implementation task and return there; it must not end with
review notes, plan cleanup, or refreshed reports as the only output.

Do not select `L19F-07-RALPH-PLAN-CONSISTENCY` while strict support blockers
remain. It is a terminal hygiene check after implementation convergence, not an
implementation task.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19F-05-FOCUSED-QNT-MBT-CLOSURE | all promoted battle-runtime/QNT behavior | Focused QNT, proof, runtime, and MBT evidence. |
| L19F-06-REVIEWER-LOOP-CONVERGENCE | all implementation and evidence lanes | RAW, ubiquitous-language, architecture, connascence, and code-review findings fixed or explicitly rejected. |
| L19F-07-RALPH-PLAN-CONSISTENCY | L19F-06-REVIEWER-LOOP-CONVERGENCE | Final-only plan index, DAG, task headings, and lane files synchronized. |
| L19F-08-FINAL-SERIALIZED-QUALITY-GATE | L19A-07-STRICT-ARTIFACT-REFRESH | Final command transcript. |

## Required Verification

- Focused QNT/MBT for every promoted runtime behavior.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Focused package typechecks/tests for Surface, character creation/sheet, battle runtime, and MCP.
- `git diff --check`

## Forbidden Shortcuts

- Do not skip reviewer-loop convergence for nontrivial changes.
- Do not run multiple MBT processes concurrently.
- Do not mark the goal complete until strict current-state evidence proves every explicit requirement.
- Do not treat plan consistency, review notes, or refreshed reports as a
  substitute for closing product-support blockers.
