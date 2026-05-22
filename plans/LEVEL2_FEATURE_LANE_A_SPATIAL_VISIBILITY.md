# Level 2 Feature Lane A - Spatial, Visibility, And Table-Witnessed Areas

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH",
      "status": "done",
      "title": "Darkness Object-Origin Branch"
    },
    {
      "number": 2,
      "id": "L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT",
      "status": "done",
      "title": "See Invisibility Observer Sight Runtime Support"
    },
    {
      "number": 3,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME",
      "status": "done",
      "title": "Spike Growth Movement Hazard Runtime"
    },
    {
      "number": 4,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION",
      "status": "done",
      "title": "Spike Growth Hazard Recognition Boundary"
    },
    {
      "number": 5,
      "id": "L12G-MISSING-SILENCE",
      "status": "done",
      "title": "Silence Definition And Support Or Closure"
    },
    {
      "number": 6,
      "id": "L12G-MISSING-SUGGESTION",
      "status": "done",
      "title": "Suggestion Definition And Closure"
    },
    {
      "number": 7,
      "id": "L12G-MISSING-ZONE-OF-TRUTH",
      "status": "done",
      "title": "Zone Of Truth Definition And Closure"
    },
    {
      "number": 8,
      "id": "L12G-RECURSIVE-TAIL-LANE-A",
      "status": "done",
      "title": "Lane A Recursive Planning Tail"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME",
      "status": "ready-for-research",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH",
      "status": "blocked",
      "title": "Enlarge Reduce Object Branch"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "ready-for-research",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME",
      "status": "ready-for-research",
      "title": "Levitate Creature Runtime Support"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH",
      "status": "blocked",
      "title": "Levitate Loose Object Branch"
    },
    {
      "number": 14,
      "id": "L12G-RECURSIVE-TAIL-LANE-A-2",
      "status": "blocked",
      "title": "Lane A Recursive Planning Tail 2"
    },
    {
      "number": 17,
      "id": "L12G-MISSING-DARKVISION",
      "status": "ready-for-research",
      "title": "Darkvision Definition And Support Or Closure"
    },
    {
      "number": 18,
      "id": "L12G-MISSING-DETECT-THOUGHTS",
      "status": "ready-for-research",
      "title": "Detect Thoughts Definition And Closure"
    },
    {
      "number": 19,
      "id": "L12G-MISSING-KNOCK",
      "status": "ready-for-research",
      "title": "Knock Definition And Closure"
    }
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

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Key context | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | L12G-FOLLOWUP-DARKNESS-OBJECT-ORIGIN-BRANCH - Darkness Object-Origin Branch | done | none | none | SRD Darkness object-origin text; current Darkness point-origin runtime support | Completed as accepted runtime-detached closure for object-origin Darkness. |
| 2 | L12G-FOLLOWUP-SEE-INVISIBILITY-RUNTIME-SUPPORT - See Invisibility Observer Sight Runtime Support | done | none | none | See Invisibility; existing sight, Invisible, Darkvision, and benefit-denial projections | Completed observer-scoped visibility support without mutating target Invisible state. |
| 3 | L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME - Spike Growth Movement Hazard Runtime | done | none | L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION | Spike Growth; area hazard, Difficult Terrain, movement path witness, damage disposition | Completed movement hazard runtime subset. |
| 4 | L12G-FOLLOWUP-SPIKE-GROWTH-HAZARD-RECOGNITION - Spike Growth Hazard Recognition Boundary | done | L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME | none | Spike Growth recognition text; Search action and table-witness language | Completed as accepted runtime-detached closure for camouflaged terrain recognition. |
| 5 | L12G-MISSING-SILENCE - Silence Definition And Support Or Closure | done | none | none | SRD Silence; spell Surface catalog | Completed Surface definition and runtime-detached closure. |
| 6 | L12G-MISSING-SUGGESTION - Suggestion Definition And Closure | done | none | none | SRD Suggestion; table-owned/player-choice terminology | Completed Surface definition and runtime-detached closure. |
| 7 | L12G-MISSING-ZONE-OF-TRUTH - Zone Of Truth Definition And Closure | done | none | none | SRD Zone of Truth; truth/knowledge/table adjudication boundaries | Completed Surface definition and runtime-detached closure. |
| 8 | L12G-RECURSIVE-TAIL-LANE-A - Lane A Recursive Planning Tail | done | completed ready Lane A tasks | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME, L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME, L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME | Refreshed Unit metrics and checker-readable follow-up splits | Completed by adding the next concrete Lane A frontier batch. |
| 9 | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support | ready-for-research | L12G-RECURSIVE-TAIL-LANE-A | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enlarge/Reduce creature branch; current unsupported-profile split | Next executable Enlarge/Reduce creature branch research/implementation task. |
| 10 | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch | blocked | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enlarge/Reduce object and worn/carried item text; object/item lifecycle boundaries | Blocked until the creature branch establishes the shared active effect and item-size boundary. |
| 11 | L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support | ready-for-research | L12G-RECURSIVE-TAIL-LANE-A | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enthrall; target-list, Saving Throw, fixed d20-roll modifier, Passive Check projection boundaries | Independent executable Enthrall Perception subset research/implementation task. |
| 12 | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support | ready-for-research | L12G-RECURSIVE-TAIL-LANE-A | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Levitate creature branch; movement and table/spatial witness boundaries | Independent executable Levitate creature branch research/implementation task. |
| 13 | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch | blocked | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Levitate loose object branch; shared object lifecycle or table/spatial witness owner | Blocked until the creature branch establishes the shared levitated-target and altitude-control boundary. |
| 14 | L12G-RECURSIVE-TAIL-LANE-A-2 - Lane A Recursive Planning Tail 2 | blocked | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME, L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH | next Lane A frontier if any | Refreshed level-2 feature metrics after this appended batch | Unblock only after the appended Lane A follow-up batch is done or explicitly closed. |

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

Status: `done`

Unblock only after all ready Lane A tasks are done or explicitly closed.

Output:
- Refresh level-2 feature metrics.
- Add the next concrete, Ralph-sized Lane A tasks only if real frontier remains.

Completed:
- Refreshed generated Unit profile and SRD inventory artifacts with
  `pnpm unit-profile-coverage:check --write`; no generated file changes were
  needed because the reports were already current.
- Current level 1-2 battle readiness remains 526/556 (94.6%) with 14
  battle-runtime-required rows, 14 partial-battle-runtime rows, and 2
  owner-evidence-required rows.
- Current strict level 1-2 runtime/profile support remains 113/171 (66.1%),
  strict target closure remains 169/171 (98.8%), and the blocked-follow-up
  split includes the Lane A units `enlarge_reduce`, `enthrall`, and `levitate`.
- Appended the next Lane A batch from the checker-readable Unit follow-up
  splits. Bard Jack of All Trades and Sorcerer Metamagic remain visible
  non-Lane-A owner-evidence gaps and should stay outside this spatial,
  visibility, and table-witnessed-area lane.

Verification completed:
`pnpm unit-profile-coverage:check --write`;
`pnpm unit-profile-coverage:check`.

### Task 9 - L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support

Status: `ready-for-research`

Depends on: L12G-RECURSIVE-TAIL-LANE-A

Blocks: L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- SRD Enlarge/Reduce creature branch text.
- Existing Spell Invocation, Concentration, active-effect, Size, Strength
  Ability Check, Strength Saving Throw, attack damage rider, Unarmed Strike,
  and weapon damage pipelines.
- Current `enlarge_reduce` unsupported-profile Unit follow-up split in
  `plans/unit-profile-coverage/unit-claims.jsonl`.

Output:
- Supported-profile or profile-subset-supported Unit claim for the creature
  branch: Magic Action and level-2+ Spell Slot spend, caster-owned
  Concentration, willing target application, unwilling target Constitution
  Saving Throw gate, cast-time Enlarge/Reduce mode choice, active Size-category
  projection, Strength Ability Check and Strength Saving Throw
  Advantage/Disadvantage with normal cancellation, Enlarge +1d4 and Reduce -1d4
  minimum 1 damage for affected weapon or Unarmed Strike hits, and cleanup when
  Concentration or duration ends.
- No object-target behavior, worn/carried item lifecycle, or thrown
  weapon/ammunition normalization in this task.
- Deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the supported creature branch.

### Task 10 - L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch

Status: `blocked`

Depends on: L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME

Blocks: L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- Result of Task 9.
- SRD Enlarge/Reduce object and worn/carried item text.
- Existing Surface target selection, object/item lifecycle, weapon, ammunition,
  and dropped-item boundaries.

Output:
- Surface schema/content support for the object target constraint: one object
  that is neither worn nor carried.
- Runtime object/item lifecycle owner decision for object Size-category change
  and cleanup, carried/worn item size changes while a creature branch is active,
  dropped item normalization, and thrown weapon/ammunition normalization
  immediately after hit or miss.
- Focused tests and coverage disposition that either supports the object branch
  or closes it with an accepted runtime-boundary reason, without duplicating
  object or item state inside Enlarge/Reduce.

### Task 11 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `ready-for-research`

Depends on: L12G-RECURSIVE-TAIL-LANE-A

Blocks: L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- SRD Enthrall text.
- Existing Spell Invocation, Concentration, target-list admission, Saving Throw,
  fixed d20-roll modifier, Wisdom (Perception) Ability Check, and Passive Check
  projection boundaries.
- Current `enthrall` unsupported-profile Unit follow-up split in
  `plans/unit-profile-coverage/unit-claims.jsonl`.

Output:
- Supported-profile or profile-subset-supported Unit claim for Enthrall's
  battle-visible Perception subset: Magic Action and level-2+ Spell Slot spend,
  caster-owned Concentration, caller-supplied eligible creature target list
  after applying the fighting-caster-or-companions auto-success predicate at the
  table boundary, Wisdom Saving Throw, failed-save active -10 modifier to Wisdom
  (Perception) Ability Checks, derived Passive Perception consequence from the
  same modifier, and cleanup when Concentration or duration ends.
- Broader social attention adjudication remains runtime-detached.
- Deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the Perception penalty subset.

### Task 12 - L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support

Status: `ready-for-research`

Depends on: L12G-RECURSIVE-TAIL-LANE-A

Blocks: L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- SRD Levitate creature branch text.
- Existing Spell Invocation, Concentration, active-effect, movement, vertical
  movement witness, Magic Action, range, and table/spatial boundaries.
- Current `levitate` unsupported-profile Unit follow-up split in
  `plans/unit-profile-coverage/unit-claims.jsonl`.

Output:
- Supported-profile or profile-subset-supported Unit claim for Levitate's
  creature branch: Magic Action and level-2+ Spell Slot spend, one visible
  creature target within 60 feet, caster-owned Concentration up to 10 minutes,
  unwilling-creature Constitution Saving Throw gate, active levitated-target
  state with initial rise up to 20 feet, suspended/aloft projection, movement
  only through caller-supplied fixed-object or surface-within-reach witnesses as
  if climbing, caster Magic Action altitude changes up to 20 feet while the
  target remains within range, self-target altitude changes as part of the
  target's move, and gentle-grounding cleanup when Concentration or duration
  ends.
- No loose-object target behavior and no automatic elevation/pathfinding
  derivation.
- Deterministic admission/projection evidence, focused runtime tests, and
  promoted Quint/runtime parity for the creature branch.

### Task 13 - L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch

Status: `blocked`

Depends on: L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME

Blocks: L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- Result of Task 12.
- SRD Levitate loose object text.
- Existing Surface Spell Definition authoring and any shared object lifecycle or
  table/spatial witness owner selected by prior tasks.

Output:
- Focused Surface/runtime owner decision for Levitate's loose object branch:
  one visible loose object target within 60 feet weighing up to 500 pounds, no
  creature Saving Throw, spell-owned suspension and altitude changes,
  fixed-object or surface movement restrictions where relevant, range-gated
  caster movement, and gentle grounding when the spell ends.
- Focused tests or accepted runtime-detached closure for loose-object
  suspension, altitude control, range, and gentle-grounding facts, reusing any
  shared object lifecycle owner instead of duplicating object state inside
  Levitate.

### Task 14 - L12G-RECURSIVE-TAIL-LANE-A-2 - Lane A Recursive Planning Tail 2

Status: `blocked`

Depends on: L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME, L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH

Unblock only after the appended Lane A follow-up batch is done or explicitly
closed.

Output:
- Refresh level-2 feature metrics.
- Add the next concrete, Ralph-sized Lane A tasks only if real frontier remains.


### Task 17 - L12G-MISSING-DARKVISION - Darkvision Definition And Support Or Closure

Status: `ready-for-research`

Unit: `darkvision`. Gate task: 59 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `darkvision`.

Outputs:

- one concrete end state from the Task Output Contract for `darkvision`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `darkvision` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B; observed-statuses: deferred, ready-for-research -->

### Task 18 - L12G-MISSING-DETECT-THOUGHTS - Detect Thoughts Definition And Closure

Status: `ready-for-research`

Unit: `detect_thoughts`. Gate task: 60 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `detect_thoughts`.

Outputs:

- one concrete end state from the Task Output Contract for `detect_thoughts`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `detect_thoughts` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->

### Task 19 - L12G-MISSING-KNOCK - Knock Definition And Closure

Status: `ready-for-research`

Unit: `knock`. Gate task: 68 in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`.

Inputs:

- the matching gate row in `plans/LEVEL1_2_FULL_SUPPORT_RALPH_GATE.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`;
- local RAW under `.references/srd-5.2.1/`;
- `UBIQUITOUS_LANGUAGE.md`;
- existing Surface content, Unit claims, owner evidence, and focused tests for `knock`.

Outputs:

- one concrete end state from the Task Output Contract for `knock`;
- updated Surface/runtime/profile/evidence files only when they are the correct owner;
- regenerated coverage artifacts.

Acceptance:

- the level 1-2 metric row for `knock` is supported, accepted-closed, or precisely blocked by a smaller follow-up split;
- no level-1 Loop D/L or companion boundary work is pulled into this lane;
- focused verification, `pnpm unit-profile-coverage:check --write`, `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop convergence are complete.

<!-- moved-from-lanes: A, B, D; observed-statuses: deferred, ready-for-research -->
