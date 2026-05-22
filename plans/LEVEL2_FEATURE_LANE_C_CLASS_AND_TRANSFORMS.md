# Level 2 Feature Lane C - Class Resources, Metamagic, And Transformation Pressure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Save Options"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Cast Property Options"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Damage Shape Options"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS",
      "status": "done",
      "title": "Sorcerer Metamagic Reroll Options"
    },
    {
      "number": 5,
      "id": "L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME",
      "status": "done",
      "title": "Monk Step Of The Wind Jump Distance Runtime"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE",
      "status": "done",
      "title": "Sorcerer Font Of Magic Bonus Action And Battle Slot Source"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-SORCERER-METAMAGIC-QUICKENED-ALL-ACTION-SPELLS",
      "status": "done",
      "title": "Sorcerer Metamagic Quickened All Action Spells"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST",
      "status": "ready-for-research",
      "title": "Dragon's Breath Initial Cast And Effect State"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION",
      "status": "blocked",
      "title": "Dragon's Breath Granted Magic Action"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES",
      "status": "ready-for-research",
      "title": "Enhance Ability Upcast Per-Target Ability Choices"
    },
    {
      "number": 11,
      "id": "L12G-RECURSIVE-TAIL-LANE-C",
      "status": "blocked",
      "title": "Lane C Recursive Planning Tail"
    }
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces the stale Loop C class-resource file.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Do not implement Wild Shape in this lane. Wild Shape has had separate external ownership during this planning run.

## Verification

Every task must include:

- RAW/ubiquitous-language check before implementation, using `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- Focused runtime and/or Surface tests for the changed behavior.
- Promoted `packages/battle-runtime/battle-runtime.qnt` parity where battle behavior changes.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check`.
- Relevant package typechecks and focused tests.
- Reviewer-loop convergence.

## Tasks

### Task 1 - L12G-FOLLOWUP-SORCERER-METAMAGIC-SAVE-OPTIONS - Sorcerer Metamagic Save Options

Status: `done`

Input:
- Current Metamagic character facts, battle resource bridge, and Quickened governor support.

Output:
- Support or precise closure for save-affecting Metamagic options.
- Reuse existing spell save holes/fills rather than adding parallel save state.

### Task 2 - L12G-FOLLOWUP-SORCERER-METAMAGIC-CAST-PROPERTY-OPTIONS - Sorcerer Metamagic Cast Property Options

Status: `done`

Input:
- Current Metamagic option projection and spell invocation discovery.

Output:
- Support or precise closure for cast-property options such as range, components, and targeting changes.
- Do not dispatch on authored spell identity.

### Task 3 - L12G-FOLLOWUP-SORCERER-METAMAGIC-DAMAGE-SHAPE-OPTIONS - Sorcerer Metamagic Damage Shape Options

Status: `ready-for-research`

Input:
- Current spell damage pipelines and Metamagic resource bridge.

Output:
- Support or precise closure for damage-shape Metamagic options.
- Keep damage type/dice ownership in the existing damage procedure facts.

### Task 4 - L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS - Sorcerer Metamagic Reroll Options

Status: `done`

Input:
- Current roll/fill protocols and Sorcery Point resource state.

Output:
- Support or precise closure for Metamagic reroll behavior.
- Avoid storing reroll opportunity state when a typed fill boundary can carry it.

### Task 5 - L12G-FOLLOWUP-MONK-STEP-OF-THE-WIND-JUMP-RUNTIME - Monk Step Of The Wind Jump Distance Runtime

Status: `done`

Input:
- Current Monk Focus battle options, movement witness boundary, and Jump spell support.

Output:
- Runtime support or closure for doubled jump distance from Step of the Wind.
- Keep pathfinding and automatic jump-route legality table-owned.

### Task 6 - L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE - Sorcerer Font Of Magic Bonus Action And Battle Slot Source

Status: `done`

Input:
- Current Font of Magic Character Sheet resource facts and battle bridge.

Output:
- Support or closure for Bonus Action battle use/source facts without duplicating spell slot pools across runtimes.

### Task 7 - L12G-FOLLOWUP-SORCERER-METAMAGIC-QUICKENED-ALL-ACTION-SPELLS - Sorcerer Metamagic Quickened All Action Spells

Status: `done`

Input:
- Current Quickened direct Hit Point restoration subset.

Output:
- Broaden Quickened to all supported action-casting spell procedures where the procedure type proves Bonus Action rewrite is safe.
- Unsupported procedure classes must fail before Sorcery Point spending.

### Task 8 - L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST - Dragon's Breath Initial Cast And Effect State

Status: `ready-for-research`

Input:
- SRD Dragon's Breath text and existing spell-created active-effect patterns.

Output:
- Initial cast/effect-state support or split if the granted action makes the task too large.
- Preserve caller/table ownership for cone placement and affected creatures.

### Task 9 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `blocked`

Depends on:
- Task C8.

Output:
- Runtime support for the granted breath action, damage type choice, save/damage resolution, and lifecycle cleanup.

### Task 10 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `ready-for-research`

Input:
- Existing Enhance Ability single-target roll modifier subset.

Output:
- Support per-target ability choices and upcast target scaling, or split if the current Surface shape cannot express it safely.

### Task 11 - L12G-RECURSIVE-TAIL-LANE-C - Lane C Recursive Planning Tail

Status: `blocked`

Unblock only after all ready Lane C tasks are done or explicitly closed.

Output:
- Refresh level-2 class/resource metrics.
- Add the next concrete, Ralph-sized Lane C tasks only if real frontier remains.
