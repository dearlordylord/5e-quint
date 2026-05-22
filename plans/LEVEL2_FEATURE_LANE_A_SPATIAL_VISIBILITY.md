# Level 2 Feature Lane A - Spatial, Visibility, And Table-Witnessed Areas

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {"number":1,"id":"L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH","status":"ready-for-research","title":"Darkness Object-Origin Branch"},
    {"number":2,"id":"L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT","status":"ready-for-research","title":"See Invisibility Observer Sight Runtime Support"},
    {"number":3,"id":"L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME","status":"ready-for-research","title":"Spike Growth Movement Hazard Runtime"},
    {"number":4,"id":"L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION","status":"ready-for-research","title":"Spike Growth Hazard Recognition Boundary"},
    {"number":5,"id":"L12G-MISSING-SILENCE","status":"ready-for-research","title":"Silence Definition And Support Or Closure"},
    {"number":6,"id":"L12G-MISSING-SUGGESTION","status":"ready-for-research","title":"Suggestion Definition And Closure"},
    {"number":7,"id":"L12G-MISSING-ZONE-OF-TRUTH","status":"ready-for-research","title":"Zone Of Truth Definition And Closure"},
    {"number":8,"id":"L12G-RECURSIVE-TAIL-LANE-A","status":"blocked","title":"Lane A Recursive Planning Tail"}
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces the stale A/B/C/Claude level-2 loop files.

Every Ralph prompt for this lane must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD matches. If not, run `git rebase master`.

Ralph must run the implementer, reviewer, handback, and decider loop until `accept`. The reviewer loop must include RAW traceability, ubiquitous-language/domain-language, architecture/connascence, and code-review passes. Fix every reasonable finding, explicitly reject only findings with a concrete reason, and repeat until no reasonable findings remain.

Do not implement Wild Shape or Moonbeam work in this lane. Those have had separate external ownership during this planning run.

## Verification

Every task must include:

- RAW/ubiquitous-language check before implementation, using `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- Focused runtime and/or Surface tests for the changed behavior.
- Promoted `packages/battle-runtime/battle-runtime.qnt` parity where battle behavior changes.
- `pnpm unit-profile-coverage:check -- --write`, then `pnpm unit-profile-coverage:check`.
- Relevant package typechecks and focused tests.
- Reviewer-loop convergence.

## Tasks

### Task 1 - L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH - Darkness Object-Origin Branch

Status: `ready-for-research`

Input:
- Current Darkness point-origin runtime support and the completed spell-created-light overlap subset on `master`.
- SRD Darkness object-origin text.

Output:
- Surface/runtime support or accepted closure for object-origin Darkness: target object not worn or carried, object-origin 15-foot Emanation identity, object movement boundary, and opaque-cover blocking.
- No duplicated map geometry or pathfinding state.
- Updated `darkness` unit claim and focused tests.

### Task 2 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support

Status: `ready-for-research`

Input:
- Existing sight, Invisible, Darkvision, and benefit-denial projections.
- SRD See Invisibility text.

Output:
- Supported profile or precise closure for observer-scoped See Invisibility runtime support.
- Focused tests proving the observer effect does not mutate target condition state or duplicate visibility facts.

### Task 3 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime

Status: `ready-for-research`

Input:
- Existing area hazard, Difficult Terrain, movement path witness, and damage-disposition machinery.
- SRD Spike Growth text.

Output:
- Profile-subset support for active Spike Growth area, caller-supplied movement distance through the area, 2d4 Piercing per 5 feet, Concentration/duration cleanup, and movement-cost projection.
- Automatic geometry/pathfinding remains table-owned.

### Task 4 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary

Status: `ready-for-research`

Input:
- Result of Task A3 when available, plus existing Search action and table-witness language.

Output:
- Surface support or accepted runtime-detached closure for the camouflaged terrain recognition rule.
- If promoted, represent Search action spend and recognition witness without duplicating table perception state.

### Task 5 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure

Status: `ready-for-research`

Input:
- SRD Silence text and current spell Surface catalog.

Output:
- Authored Surface definition plus supported profile, profile subset, or accepted runtime-detached closure.
- Runtime must not infer audio geometry automatically; table-supplied area/membership facts remain the boundary.

### Task 6 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure

Status: `ready-for-research`

Input:
- SRD Suggestion text and existing table-owned/player-choice terminology.

Output:
- Authored Surface definition plus coverage disposition.
- Prefer runtime-detached/table-choice closure unless a precise battle-owned executable subset exists.

### Task 7 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure

Status: `ready-for-research`

Input:
- SRD Zone of Truth text and existing truth/knowledge/table adjudication boundaries.

Output:
- Authored Surface definition plus coverage disposition.
- Do not add conversation-state or lie-detection runtime state unless it has a clear executable battle owner.

### Task 8 - L12G-RECURSIVE-TAIL-LANE-A - Lane A Recursive Planning Tail

Status: `blocked`

Unblock only after all ready Lane A tasks are done or explicitly closed.

Output:
- Refresh level-2 feature metrics.
- Add the next concrete, Ralph-sized Lane A tasks only if real frontier remains.
