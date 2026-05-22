# Level 2 Feature Lane A - Spatial, Visibility, And Table-Witnessed Areas

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {"number":1,"id":"L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH","status":"done","title":"Darkness Object-Origin Branch"},
    {"number":2,"id":"L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT","status":"done","title":"See Invisibility Observer Sight Runtime Support"},
    {"number":3,"id":"L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME","status":"done","title":"Spike Growth Movement Hazard Runtime"},
    {"number":4,"id":"L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION","status":"done","title":"Spike Growth Hazard Recognition Boundary"},
    {"number":5,"id":"L12G-MISSING-SILENCE","status":"done","title":"Silence Definition And Support Or Closure"},
    {"number":6,"id":"L12G-MISSING-SUGGESTION","status":"done","title":"Suggestion Definition And Closure"},
    {"number":7,"id":"L12G-MISSING-ZONE-OF-TRUTH","status":"done","title":"Zone Of Truth Definition And Closure"},
    {"number":8,"id":"L12G-RECURSIVE-TAIL-LANE-A","status":"ready-for-research","title":"Lane A Recursive Planning Tail"}
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

Status: `done`

Input:
- Current Darkness point-origin runtime support and the completed spell-created-light overlap subset on `master`.
- SRD Darkness object-origin text.

Output:
- Accepted runtime-detached closure for object-origin Darkness: target object not worn or carried, object-origin 15-foot Emanation identity, object movement boundary, and opaque-cover blocking stay outside promoted runtime because the current owner model consumes point-origin area ids and sight/light witnesses, not a moving object-attached Darkness zone with opaque-cover suppression.
- No duplicated map geometry or pathfinding state.
- Updated `darkness` unit claim narrows the remaining Darkness follow-up surface to `L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL`.

### Task 2 - L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support

Status: `done`

Input:
- Existing sight, Invisible, Darkvision, and benefit-denial projections.
- SRD See Invisibility text.

Output:
- Supported observer-scoped runtime profile for See Invisibility: Magic Action plus level-2 Spell Slot spend, one-hour self effect, observer-scoped visibility over the Invisible condition, and duration cleanup.
- Invisible object visibility and Ethereal visibility stay caller-witnessed observer facts keyed by sight-line, cover, and plane witnesses rather than stored battle geometry or duplicated target state.
- Focused runtime and package-local Quint tests prove the effect does not mutate target Invisible condition state, does not bypass Hidden, and does not widen into Truesight behavior.

### Task 3 - L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime

Status: `done`

Input:
- Existing area hazard, Difficult Terrain, movement path witness, and damage-disposition machinery.
- SRD Spike Growth text.

Output:
- Profile-subset support for active Spike Growth area, caller-supplied movement distance through the area, 2d4 Piercing per 5 feet, Concentration/duration cleanup, and movement-cost projection.
- Automatic geometry/pathfinding remains table-owned.

### Task 4 - L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary

Status: `done`

Input:
- Result of Task A3 when available, plus existing Search action and table-witness language.

Output:
- Accepted runtime-detached closure for the camouflaged terrain recognition rule: visibility at cast time, Search Action declaration before entry, Wisdom (Perception or Survival) result against the caster's Spell Save DC, and the resulting recognized-hazard witness are table/perception facts outside promoted battle runtime.
- The Spike Growth Surface description records the SRD recognition text; the promoted runtime continues to consume caller-supplied movement-area facts without duplicating per-observer terrain-knowledge state.

### Task 5 - L12G-MISSING-SILENCE - Silence Definition And Support Or Closure

Status: `done`

Input:
- SRD Silence text and current spell Surface catalog.

Output:
- Authored SRD Surface definition plus accepted runtime-detached closure for Silence's audio boundary, entirely-inside area membership, Thunder-immunity projection, Deafened projection, and Verbal-component casting block.
- Runtime does not infer audio geometry automatically; table-supplied area/membership facts remain the boundary.

### Task 6 - L12G-MISSING-SUGGESTION - Suggestion Definition And Closure

Status: `done`

Input:
- SRD Suggestion text and existing table-owned/player-choice terminology.

Output:
- Authored SRD Surface definition plus accepted runtime-detached closure for Suggestion's hearing/understanding gate, player-authored suggested activity, achievable and obvious-damage judgment, Charmed-target pursuit, and activity-completion ending.
- Runtime records no commanded-behavior state and does not infer or enforce suggested activity compliance from authored spell identity; table/social adjudication remains the boundary.

### Task 7 - L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure

Status: `done`

Input:
- SRD Zone of Truth text and existing truth/knowledge/table adjudication boundaries.

Output:
- Authored SRD Surface definition plus accepted runtime-detached closure for Zone of Truth's recurring Charisma Saving Throw, failed-save truthfulness constraint, affected-creature spell awareness, evasive truthful response permission, and caster save-outcome knowledge.
- Runtime records no conversation transcript, statement-truth facts, evasive-response handling, or lie-detection state; table/social adjudication remains the boundary.

### Task 8 - L12G-RECURSIVE-TAIL-LANE-A - Lane A Recursive Planning Tail

Status: `ready-for-research`

Unblock only after all ready Lane A tasks are done or explicitly closed.

Output:
- Refresh level-2 feature metrics.
- Add the next concrete, Ralph-sized Lane A tasks only if real frontier remains.
