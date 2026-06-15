# Ralph Lane: Level 1-4 MCP Scenario Gate

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-04-MCP-LEVEL14-SCENARIO-GATE",
      "status": "done",
      "title": "Add level-1-4 MCP scenario evidence"
    }
  ]
}
-->

## Lane Scope

This is the formal ultra-golden blocker for level 1-4. It owns MCP scenario
evidence for the four required level-1-4 flows:

- `mcp-workflow-discovery`
- `character-creation`
- `character-sheet`
- `battle`

The existing level 1, level 1-2, and level 1-3 scenario evidence must remain
valid.

## Source Artifacts

- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-protocol.test.ts`
- Existing level-3 scenario: `create-level-three-wizard-and-cast-scorching-ray`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before implementation.
- Use returned hole ids, option ids, and draft/session revisions. Do not
  hard-code runtime behavior on authored identity.
- Scenario evidence belongs in the MCP scenario manifest and checked MCP tests;
  support-profile status is not a substitute.
- Keep level 1, 1-2, and 1-3 evidence intact.

### Task 1 - L14G-04-MCP-LEVEL14-SCENARIO-GATE

Status: `done`

Expected size: about 1.5 to 2 focused days.

Output:

- Design and implement a supported SRD level-4 character advancement scenario.
- Exercise level-4 choice/finalization paths, including Ability Score
  Improvement or another qualifying feat choice.
- Read back durable Character Sheet state after finalization.
- Hand off to battle when the resulting character has battle-relevant level-4
  facts.
- Update `plans/unit-profile-coverage/mcp-scenario-evidence.json` with
  `mcp-scenario` evidence rows for all four level-1-4 required flows.
- Regenerate the ultra-golden gate.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` reports level-1-4 MCP scenario evidence as `4/4`.
- `level-1`, `level-1-2`, and `level-1-3` remain pass in the ultra-golden gate.
- The scenario follows MCP-returned workflow state rather than relying on
  hand-maintained ids in runtime behavior.
- The MCP scenario evidence command remains the checker-owned source of truth.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

Plan Impact:

- If the scenario cannot be implemented because level-4 source/catalog work is
  still missing, mark the task blocked with `Blocker Type: dependency` and name
  the exact lane.
- If implementation reveals additional MCP workflow gaps, split them into
  concrete follow-up tasks.
