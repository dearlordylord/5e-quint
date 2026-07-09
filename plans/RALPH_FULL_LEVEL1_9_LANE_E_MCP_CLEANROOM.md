# Ralph Full Level 1-9 Lane E: MCP and Cleanroom

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE", "status": "already-applied", "title": "Add rules-kernel and cleanroom evidence for every promoted level-1-9 behavior" },
    { "number": 2, "id": "L19F-02-MCP-LEVEL9-SHEET-SCENARIO", "status": "already-applied", "title": "Add executable level-9 character creation and sheet MCP scenario evidence" },
    { "number": 3, "id": "L19F-03-MCP-LEVEL9-BATTLE-HANDOFF", "status": "already-applied", "title": "Add executable level-9 battle handoff MCP scenario evidence" },
    { "number": 4, "id": "L19F-04-MCP-NONBATTLE-CONTACT-PATRON", "status": "already-applied", "title": "Add executable nonbattle MCP scenario evidence for Contact Patron or equivalent level-5 support" }
  ]
}
-->

## Lane Scope

Lane E owns evidence rows outside direct Surface/runtime implementation:
rules-kernel obligations, cleanroom branch evidence, and executable MCP
scenarios. MCP `scopeAuditDecisions` alone is not final level-1-9 evidence.

This lane is complete only when executable `level-1-9` MCP scenario evidence,
rules-kernel rows, and cleanroom evidence exist for the implemented behavior and
their checkers pass. Audit reuse or a missing-evidence note is a blocker, not an
acceptable endpoint.

Canonical task bodies are in `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`.

## Implementation Convergence

This lane must add executable evidence for behavior implemented by the Surface,
Character Sheet, runtime/QNT, or session lanes. Evidence-only labels are not
enough: every row must point to a runnable scenario, obligation, cleanroom
branch, or focused test that exercises the implemented support.

If the blocker is missing scenario or cleanroom coverage, add and run the
scenario or evidence generator. Do not stop after describing the missing row or
copying audit decisions into the level-1-9 evidence set.

## Task DAG

| Task | Depends on | Output |
| --- | --- | --- |
| L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE | implementation lanes C and D | Rules-kernel and cleanroom evidence for promoted behavior. |
| L19F-02-MCP-LEVEL9-SHEET-SCENARIO | L19C-02-RANGER-EXPERTISE-GENERIC-OWNER, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION | Real `level-1-9` character creation/sheet MCP evidence using returned draft revisions and option ids. |
| L19F-03-MCP-LEVEL9-BATTLE-HANDOFF | level-9 battle feature or level-5 battle spell support, L19F-02-MCP-LEVEL9-SHEET-SCENARIO | Real `level-1-9` battle handoff evidence through returned battle holes. |
| L19F-04-MCP-NONBATTLE-CONTACT-PATRON | L19C-04-CONTACT-PATRON-SHEET-SESSION, L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION, L19F-02-MCP-LEVEL9-SHEET-SCENARIO | Real `level-1-9` nonbattle Contact Patron or equivalent level-5 evidence. |

## Required Verification

- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

## Forbidden Shortcuts

- Do not reuse earlier MCP audit evidence as level-1-9 scenario evidence.
- Do not add rules-kernel labels without executable obligations.
- Do not hand-edit `mcp-scenario-evidence.json` without test-backed generation.
- Do not close this lane with bookkeeping rows that are not backed by executed
  implementation behavior.
