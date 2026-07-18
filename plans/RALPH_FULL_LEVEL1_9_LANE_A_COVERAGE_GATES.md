# Ralph Full Level 1-9 Lane A: Coverage Gates

> **Historical execution projection:** see [plan status](README.md#historical-ralph-task-indexes).

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19A-01-BASELINE-ACCOUNTING-SNAPSHOT", "status": "already-applied", "title": "Preserve the level-1-9 accounting baseline without treating it as feature completion" },
    { "number": 2, "id": "L19A-02-LEVEL9-INVENTORY-PLUMBING", "status": "already-applied", "title": "Keep generated level-9 and spell-level-5 inventory plumbing" },
    { "number": 3, "id": "L19A-03-LEVEL19-REPORT-PLUMBING", "status": "already-applied", "title": "Keep generated level-1-9 full-support and mining-audit reports" },
    { "number": 4, "id": "L19A-04-NONVACUOUS-SCOPE-CHECKS", "status": "already-applied", "title": "Keep non-vacuity checks for level-9 and spell-level-5 scope" },
    { "number": 5, "id": "L19A-05-ULTRA-GOLDEN-SCOPE-WIRING", "status": "already-applied", "title": "Keep level-1-9 ultra-golden scope wiring as baseline scope plumbing" },
    { "number": 6, "id": "L19A-06-STRICT-DISPOSITION-GATE", "status": "already-applied", "title": "Make final level-1-9 support fail on unsupported, catalog-only, future-owner, or audit-reuse closure" },
    { "number": 7, "id": "L19A-07-STRICT-ARTIFACT-REFRESH", "status": "already-applied", "title": "Regenerate level-1-9 artifacts under the strict full-support semantics" }
  ]
}
-->

## Lane Scope

Lane A owns generated level-1-9 denominator/report plumbing and the strict final
gate rewrite. Existing level-1-9 accounting artifacts are baseline evidence
only; they do not prove product-complete support.

This lane is not a plan-only deliverable. It must keep the strict gates active
while the implementation lanes remove blockers; visible blockers are work
queues, not completion evidence.

Default Ralph behavior for this lane is to expose or refresh strict blockers,
then continue into the first runnable implementation lane unless the latest user
request explicitly asks for planning-only plan maintenance. A lane-only blocker
audit, report refresh, or graph cleanup is not a successful run while strict
implementation blockers remain.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane may expose blockers, refresh reports, or repair gate semantics, but a
Ralph run must keep moving into the first runnable implementation lane unless
strict gates already pass. A lane-only report refresh is not completion.

If strict blockers remain after a refresh, the next action is not more coverage
planning. Pick the smallest blocker owned by Surface/Dhall, Character
Creation, Character Sheet/session, battle runtime/QNT/rule-core, MCP/session
tooling, rules-kernel, cleanroom, or derived coverage evidence, then implement
that owner change and rerun the strict gate.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19A-01-BASELINE-ACCOUNTING-SNAPSHOT | none | Preserve `LEVEL1_9_BASELINE_2026-07-08.md`. |
| L19A-02-LEVEL9-INVENTORY-PLUMBING | L19A-01-BASELINE-ACCOUNTING-SNAPSHOT | Preserve generated `level-9` and `spell-level-5` denominator rows. |
| L19A-03-LEVEL19-REPORT-PLUMBING | L19A-02-LEVEL9-INVENTORY-PLUMBING | Preserve level-1-9 report and mining-audit projections. |
| L19A-04-NONVACUOUS-SCOPE-CHECKS | L19A-03-LEVEL19-REPORT-PLUMBING | Preserve non-vacuity checks for new bands. |
| L19A-05-ULTRA-GOLDEN-SCOPE-WIRING | L19A-03-LEVEL19-REPORT-PLUMBING | Preserve `level-1-9` ultra-golden scope wiring. |
| L19A-06-STRICT-DISPOSITION-GATE | L19A-04-NONVACUOUS-SCOPE-CHECKS, L19A-05-ULTRA-GOLDEN-SCOPE-WIRING | Already applied: final gates fail on unsupported/catalog/future-owner/audit-reuse states. |
| L19A-07-STRICT-ARTIFACT-REFRESH | all implementation and evidence lanes | Regenerate strict full-support, mining-audit, and ultra-golden artifacts. |

## Required Verification

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `git diff --check`

## Forbidden Shortcuts

- Do not hand-edit generated JSON rows.
- Do not remove level-9 or spell-level-5 rows from the denominator to pass.
- Do not preserve the old semantics where future-owner text satisfies final
  level-1-9 support.
- Do not stop after making blockers visible while implementation work remains
  runnable.
