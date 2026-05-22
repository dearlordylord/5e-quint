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
      "status": "done",
      "title": "Enlarge Reduce Creature Runtime Support"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH",
      "status": "done",
      "title": "Enlarge Reduce Object Branch"
    },
    {
      "number": 11,
      "id": "L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME",
      "status": "done",
      "title": "Enthrall Perception Penalty Runtime Support"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME",
      "status": "done",
      "title": "Levitate Creature Runtime Support"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH",
      "status": "done",
      "title": "Levitate Loose Object Branch"
    },
    {
      "number": 14,
      "id": "L12G-RECURSIVE-TAIL-LANE-A-2",
      "status": "done",
      "title": "Lane A Recursive Planning Tail 2"
    },
    {
      "number": 15,
      "id": "L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL",
      "status": "done",
      "title": "Darkness Spell-Created Light Dispel"
    },
    {
      "number": 16,
      "id": "L12G-FOLLOWUP-SPIKE-GROWTH-PROFILE-ACCOUNTING",
      "status": "done",
      "title": "Spike Growth Profile Accounting Closure"
    },
    {
      "number": 17,
      "id": "L12G-FOLLOWUP-PRAYER-OF-HEALING-PROFILE-ACCOUNTING",
      "status": "done",
      "title": "Prayer Of Healing Profile Accounting Closure"
    },
    {
      "number": 18,
      "id": "L12G-FOLLOWUP-FIND-STEED-COMPANION-BOUNDARY",
      "status": "done",
      "title": "Find Steed Companion Boundary Closure"
    },
    {
      "number": 19,
      "id": "L3-SPELL-FLY-RUNTIME-SURVEY",
      "status": "done",
      "title": "Level 3 Fly Runtime Survey And Task Split"
    },
    {
      "number": 20,
      "id": "L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY",
      "status": "done",
      "title": "Level 3 Lightning Bolt Runtime Survey And Task Split"
    },
    {
      "number": 21,
      "id": "L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY",
      "status": "done",
      "title": "Level 3 Hypnotic Pattern Runtime Survey And Task Split"
    },
    {
      "number": 22,
      "id": "L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR",
      "status": "done",
      "title": "Fly Surface Target Repair"
    },
    {
      "number": 23,
      "id": "L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME",
      "status": "done",
      "title": "Fly Special Speed Runtime"
    },
    {
      "number": 24,
      "id": "L3-FOLLOWUP-FLY-END-FALL-WITNESS",
      "status": "ready-for-research",
      "title": "Fly End Fall Witness"
    },
    {
      "number": 25,
      "id": "L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR",
      "status": "deferred",
      "title": "Hypnotic Pattern Surface Escape Repair"
    },
    {
      "number": 26,
      "id": "L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME",
      "status": "blocked",
      "title": "Hypnotic Pattern Control Runtime"
    }
  ]
}
-->

This is an active Ralph execution plan for level-2 feature/runtime coverage. It replaces the stale A/B/C/Claude level-2 loop files.


Planning policy update, 2026-05-22: until the owner explicitly reopens level-3 expansion, recursive tails and deciders must add only level-1/level-2 closure tasks. Park not-yet-started level-3 tasks as `deferred` instead of expanding this lane with more level-3 work.

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
| 9 | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME - Enlarge Reduce Creature Runtime Support | done | L12G-RECURSIVE-TAIL-LANE-A | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enlarge/Reduce creature branch; current unsupported-profile split | Next executable Enlarge/Reduce creature branch research/implementation task. |
| 10 | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH - Enlarge Reduce Object Branch | done | L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enlarge/Reduce object and worn/carried item text; object/item lifecycle boundaries | Completed Surface object-target support and accepted runtime-detached closure for object/item Size lifecycle residuals. |
| 11 | L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support | done | L12G-RECURSIVE-TAIL-LANE-A | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Enthrall; target-list, Saving Throw, fixed d20-roll modifier, Passive Check projection boundaries | Completed Enthrall Perception penalty subset through the promoted roll-modifier profile. |
| 12 | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME - Levitate Creature Runtime Support | done | L12G-RECURSIVE-TAIL-LANE-A | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH, L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Levitate creature branch; movement and table/spatial witness boundaries | Completed Levitate creature runtime subset with active levitated-target state and altitude-control witness boundaries. |
| 13 | L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH - Levitate Loose Object Branch | done | L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME | L12G-RECURSIVE-TAIL-LANE-A-2 | SRD Levitate loose object branch; shared object lifecycle or table/spatial witness owner | Completed as accepted runtime-detached closure for loose-object lifecycle and table/spatial vertical movement residuals. |
| 14 | L12G-RECURSIVE-TAIL-LANE-A-2 - Lane A Recursive Planning Tail 2 | done | L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME, L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH | L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL, L12G-FOLLOWUP-SPIKE-GROWTH-PROFILE-ACCOUNTING, L12G-FOLLOWUP-PRAYER-OF-HEALING-PROFILE-ACCOUNTING, L12G-FOLLOWUP-FIND-STEED-COMPANION-BOUNDARY, L3-SPELL-FLY-RUNTIME-SURVEY, L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY, L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY | Refreshed level-2 feature metrics after this appended batch | Completed by confirming generated metrics and keeping the already-appended Level 2 completion / Level 3 kickoff refill tasks as the concrete frontier. |
| 17 | L12G-FOLLOWUP-PRAYER-OF-HEALING-PROFILE-ACCOUNTING - Prayer Of Healing Profile Accounting Closure | done | L12G-RECURSIVE-TAIL-LANE-A-2 | none | Current Prayer of Healing Surface content, Character Sheet rest profile claim, owner evidence, and focused tests | Completed by confirming existing profile artifacts already classify Prayer of Healing as `profile-subset-supported` with Character Sheet owner evidence and outside-battle-runtime closure for automatic casting progress, range maintenance, and interruption tracking. |
| 18 | L12G-FOLLOWUP-FIND-STEED-COMPANION-BOUNDARY - Find Steed Companion Boundary Closure | done | L12G-RECURSIVE-TAIL-LANE-A-2 | none | Find Steed Surface content, mounted-combat text, Unit/profile claims, owner evidence, and focused tests | Completed by recording `find_steed` as an `unsupported-profile` closed at the companion-control boundary, without Unit catalog admission, companion AI, autonomous control behavior, or authored-identity dispatch. |
| 19 | L3-SPELL-FLY-RUNTIME-SURVEY - Level 3 Fly Runtime Survey And Task Split | done | L12G-RECURSIVE-TAIL-LANE-A-2 | L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR | Fly Surface content, Speed and Movement language, current Unit/profile claims, and falling witness boundaries | Completed by recording Fly as an unsupported-profile follow-up split; no runtime support, companion behavior, or authored-identity dispatch is claimed. |
| 20 | L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY - Level 3 Lightning Bolt Runtime Survey And Task Split | done | L12G-RECURSIVE-TAIL-LANE-A-2 | none | Lightning Bolt Surface content, line/area damage support, Unit/profile claims, and focused tests | Completed by admitting Lightning Bolt as a supported self-origin Line save-gated damage profile while leaving Line direction, Total Cover blocking, point-of-origin inclusion choice, affected-creature derivation, and map geometry table-owned. |
| 21 | L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY - Level 3 Hypnotic Pattern Runtime Survey And Task Split | done | L12G-RECURSIVE-TAIL-LANE-A-2 | L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR | Hypnotic Pattern Surface content, condition-save/incapacitation support, Unit/profile claims, and focused tests | Completed by recording Hypnotic Pattern as an unsupported-profile follow-up split for Surface sight/escape repair and battle control runtime support; no companion behavior or authored-identity dispatch is claimed. |
| 22 | L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR - Fly Surface Target Repair | done | L3-SPELL-FLY-RUNTIME-SURVEY | L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME | Fly Surface target shape and sibling touched willing creature spell selection vocabulary | Completed by structurally encoding Fly's touched willing creature target eligibility before runtime admission. |
| 23 | L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME - Fly Special Speed Runtime | done | L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR | L3-FOLLOWUP-FLY-END-FALL-WITNESS | Fly fixed special Speed, hover, movement kind vocabulary, active-effect cleanup, and promoted Quint parity | Completed by admitting Fly through the scalar-buff runtime profile with fixed Fly Speed, hover retention, slot-scaled willing targets, movement/Dash projection, cleanup, and promoted Quint parity while leaving spell-end falling to Task 24. |
| 24 | L3-FOLLOWUP-FLY-END-FALL-WITNESS - Fly End Fall Witness | ready-for-research | L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME | none | Fly spell-end falling clause, caller-supplied aloft/can-stop-fall witnesses, and existing falling reaction/landing pipeline | Promote the spell-end fall handoff now that the active Fly effect exists. |
| 25 | L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR - Hypnotic Pattern Surface Escape Repair | deferred | L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY | L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME | Hypnotic Pattern sight-gated area targeting and target-specific escape facts | Repair typed Surface facts before runtime admission. |
| 26 | L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME - Hypnotic Pattern Control Runtime | blocked | L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR | none | Hypnotic Pattern linked Charmed/Incapacitated/Speed 0 target effect, damage cleanup, shake-awake action, and promoted Quint parity | Promote the battle control lifecycle after the Surface escape repair lands. |

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

Status: `done`

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

Status: `done`

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
- Accepted runtime-detached closure for object Size-category change and cleanup,
  carried/worn item size changes while a creature branch is active, dropped item
  normalization, and thrown weapon/ammunition normalization immediately after
  hit or miss: promoted battle runtime has no canonical object Size state,
  carried/worn item Size state, dropped-item location state, or thrown
  weapon/ammunition occurrence lifecycle to mutate and clean up.
- Focused Surface/runtime tests and coverage disposition keep promoted support
  narrowed to the existing creature branch without duplicating object or item
  state inside Enlarge/Reduce.

### Task 11 - L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME - Enthrall Perception Penalty Runtime Support

Status: `done`

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

Status: `done`

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

Status: `done`

Depends on: L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME

Blocks: L12G-RECURSIVE-TAIL-LANE-A-2

Input:
- Result of Task 12.
- SRD Levitate loose object text.
- Existing Surface Spell Definition authoring and any shared object lifecycle or
  table/spatial witness owner selected by prior tasks.

Output:
- Accepted runtime-detached closure for Levitate's loose object branch: the
  Surface Spell Definition records the loose-object target shape, visibility,
  60-foot range, 500-pound weight gate, no creature Saving Throw for objects,
  suspension, altitude-control, range-gated caster movement,
  fixed-object-or-surface movement language, and gentle-grounding text.
- Promoted battle runtime does not add Levitate-specific object altitude state:
  loose-object position, weight, aloft/grounded state, fixed-object/surface
  reach, range derivation, map geometry, and gentle grounding remain with a
  runtime-detached loose-object lifecycle and table/spatial vertical movement
  owner until a generic owner exists.

### Task 14 - L12G-RECURSIVE-TAIL-LANE-A-2 - Lane A Recursive Planning Tail 2

Status: `done`

Depends on: L12G-FOLLOWUP-ENLARGE-REDUCE-OBJECT-BRANCH, L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME, L12G-FOLLOWUP-LEVITATE-OBJECT-BRANCH

The appended Lane A follow-up batch is complete or explicitly closed.

Output:
- Refresh level-2 feature metrics.
- Add the next concrete, Ralph-sized Lane A tasks only if real frontier remains.

Completed:
- Refreshed generated Unit profile and SRD inventory artifacts with
  `pnpm unit-profile-coverage:check --write`; no generated file changes were
  needed because the reports were already current.
- Current level 1-2 battle readiness is 534/556 (96%) with 2
  battle-runtime-required rows, 18 partial-battle-runtime rows, and 2
  owner-evidence-required rows.
- Current strict level 1-2 runtime/profile support is 113/171 (66.1%),
  strict target closure is 169/171 (98.8%), and supported executable Unit
  coverage is 136/196 (69.4%).
- The remaining Lane A frontier is already represented by the appended refill:
  Darkness spell-created light dispel, Spike Growth profile accounting, Prayer
  of Healing profile accounting, Find Steed companion-boundary closure, and the
  Level 3 Fly, Lightning Bolt, and Hypnotic Pattern survey/split tasks.
- Dragon's Breath remains an open level-2 profile-accounting row, but it is
  already owned by Lane C's Dragon's Breath granted-action task rather than this
  Lane A tail.

Verification completed:
RAW/ubiquitous-language planning check against local SRD spell entries and
`UBIQUITOUS_LANGUAGE.md`;
`pnpm unit-profile-coverage:check --write`;
`pnpm unit-profile-coverage:check`.

## Level 2 Completion And Level 3 Kickoff Refill

### Task 15 - L12G-FOLLOWUP-DARKNESS-SPELL-CREATED-LIGHT-DISPEL - Darkness Spell-Created Light Dispel

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Supported Darkness overlap dispel of level-2-or-lower spell-created Bright/Dim Light through generic tracked spell-light source effect id and source spell level facts, without authored spell identity dispatch.
- Updated Darkness and Continual Flame profile/evidence/report artifacts to remove this follow-up while keeping Dispel Magic and object-origin Darkness as separate visible boundaries.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 22 - L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR - Fly Surface Target Repair

Status: `done`

Depends on: L3-SPELL-FLY-RUNTIME-SURVEY

Blocks: L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME

Input:

- SRD Fly text under `.references/srd-5.2.1/Spells/Descriptions-E-L.md`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Fly Surface Dhall/JSON content.
- Sibling touched willing creature target shapes for Jump and Spider Climb.

Output:

- Repair the Fly Surface target shape while preserving the existing SRD spell definition, fixed 60-foot Fly Speed grant, hover flag, Concentration up to 10 minutes, and slot-scaled target count.
- Structurally encode a touched willing creature target with `targetKinds: ["creature"]` and `disposition: "willing"` using the existing selection vocabulary instead of authored spell identity.
- Update generated Surface JSON and focused Surface/unit-catalog tests proving Fly round-trips with typed target eligibility before runtime admission.

Acceptance:

- Fly Surface target eligibility is checker-visible and matches the SRD touched willing creature requirement.
- No spell-end falling runtime behavior is claimed by this task.
- No authored identity dispatch is introduced in runtime code.

Completed by structurally encoding Fly's touched willing creature target eligibility in Surface Dhall/JSON and adding a focused catalog-boundary round-trip test before runtime admission.

### Task 23 - L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME - Fly Special Speed Runtime

Status: `done`

Depends on: L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR

Blocks: L3-FOLLOWUP-FLY-END-FALL-WITNESS

Input:

- Completed Fly Surface target repair.
- Current scalar-buff, special-Speed active effect, movement/Dash projection, and package-local Quint movement vocabulary.
- SRD Speed, Movement, Fly Speed, hover, Concentration, and Spell Slot language.

Output:

- Admit the repaired Fly record into the Unit catalog through a typed spell invocation profile.
- Support Magic Action level-3-or-higher Spell Slot casting, touched willing target-list targeting, caster-owned Concentration up to 10 minutes, fixed 60-foot Fly Speed, hover, slot-scaled target count, and cleanup on Concentration or duration end.
- Widen promoted runtime and package-local Quint movement kind vocabulary to include Fly Speed, and make effective movement and Dash budget projection consume the fixed special Speed without duplicating walk Speed or spent Movement state.
- Update Unit claims, deterministic admission/projection evidence, focused runtime tests, generated coverage artifacts, and promoted Quint/runtime parity.

Acceptance:

- Fly is supported or profile-subset-supported for the active Speed grant only.
- Automatic pathfinding, map elevation, aloft status, landing legality, and spell-end falling stay caller/table-supplied until Task 24.
- No companion AI/autonomous-control behavior or authored-identity runtime dispatch is introduced.

Completed by admitting Fly through the scalar-buff runtime profile with fixed Fly Speed, hover retention, slot-scaled willing targets, movement/Dash projection, cleanup, deterministic coverage evidence, and promoted Quint parity while leaving spell-end falling to Task 24.

### Task 24 - L3-FOLLOWUP-FLY-END-FALL-WITNESS - Fly End Fall Witness

Status: `ready-for-research`

Depends on: L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME

Blocks: none

Input:

- Completed active Fly Speed runtime support.
- SRD Fly spell-end falling clause and Rules Glossary flying/falling language.
- Existing Feather Fall, `creatureFalls`, and landing/reaction witness boundaries.

Output:

- Connect Fly effect cleanup to caller-supplied still-aloft and can-stop-fall witnesses.
- Either open the existing `creatureFalls` reaction window for affected targets or record why the target can stop the fall.
- Preserve Feather Fall's existing falling-trigger and landing owner; do not add battle-owned elevation simulation or treat hover as a generic immunity to every fall source.
- Add focused tests for Concentration break, duration expiration, recast or replacement cleanup, hover-relevant fall prevention, and handoff to the existing falling reaction/landing pipeline, plus promoted Quint/runtime parity.

Acceptance:

- Spell-end falling is represented as an explicit witness boundary tied to Fly effect cleanup.
- Existing falling reaction and landing ownership is reused rather than duplicated.
- No authored identity dispatch is introduced in runtime code.

### Task 16 - L12G-FOLLOWUP-SPIKE-GROWTH-PROFILE-ACCOUNTING - Spike Growth Profile Accounting Closure

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Accepted target-closed/profile-accounting closure for Spike Growth:
  `plans/unit-profile-coverage/unit-claims.jsonl` records
  `profile-subset-supported` for `spell.invocation-spike-growth-movement-hazard`,
  `plans/unit-profile-coverage/unit-evidence.jsonl` records deterministic
  admission/projection evidence, and the generated strict report classifies
  `spike_growth` as `closed-runtime-detached-table-adjudication` rather than
  `open-profile-accounting`.
- The supported profile remains Magic Action and level-2-or-higher Spell Slot
  casting, caller-supplied 20-foot-radius Sphere area identity, caster-owned
  Concentration up to 10 minutes, active Difficult Terrain movement-cost
  projection from caller-supplied movement distance, 2d4 Piercing damage per
  5 feet traveled into or within the area, and Concentration/duration cleanup.
- The camouflaged-terrain recognition clause remains an accepted
  runtime-detached table Search/perception witness boundary: visibility at cast
  time, Search Action declaration before entry, Wisdom (Perception or Survival)
  check result against the caster's Spell Save DC, and recognized-hazard
  witness are not duplicated in promoted battle runtime.
- No smaller Spike Growth follow-up is needed for this lane; automatic geometry,
  pathfinding, and per-observer terrain-knowledge derivation remain table-owned.
- Verification completed with local RAW/ubiquitous-language review,
  `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop
  convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 17 - L12G-FOLLOWUP-PRAYER-OF-HEALING-PROFILE-ACCOUNTING - Prayer Of Healing Profile Accounting Closure

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Accepted profile-subset-supported closure for Prayer of Healing:
  `plans/unit-profile-coverage/unit-claims.jsonl` records the
  `character-sheet.spell-rest-benefit-application` supported subset,
  `plans/unit-profile-coverage/unit-evidence.jsonl` records deterministic
  admission/projection evidence, and the generated strict report classifies
  `prayer_of_healing` as supported rather than open profile accounting.
- The supported profile remains completed-cast Character Sheet application:
  the runtime spends a level-2-or-higher Spell Slot at completion, applies the
  existing Short Rest benefit per caller-selected recipient, applies
  slot-scaled healing capped by Hit Point maximum, records the same-spell
  recipient Long Rest lockout, and clears that lockout through existing Long
  Rest state.
- Automatic 10-minute casting progress, range maintenance tracking, and
  encounter-time interruption detection remain accepted outside-battle-runtime
  caller/table witness responsibilities; no parallel Character Sheet or battle
  runtime state is introduced for them.
- No smaller Prayer of Healing follow-up is needed for this lane.
- Verification completed with local RAW/ubiquitous-language review,
  `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop
  convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 18 - L12G-FOLLOWUP-FIND-STEED-COMPANION-BOUNDARY - Find Steed Companion Boundary Closure

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Accepted unsupported-profile closure for Find Steed:
  `plans/unit-profile-coverage/unit-claims.jsonl` records a top-level
  `companion-control-boundary` battle-readiness closure, and the generated
  strict report classifies `find_steed` as
  `closed-companion-control-boundary` rather than `open-runtime-behavior`.
- The Surface record remains partial structured input for a future
  mount companion owner: it records SRD provenance, core casting facts, inline
  Otherworldly Steed stat-block facts, caster-chosen creature type mode,
  slot-scaled AC and Hit Points, Life Bond, shared-Initiative control metadata,
  and disappearance metadata, but does not claim promoted runtime support.
- Future mount companion ownership must model summoned mount lifecycle,
  rider/control state, stat-block projection and actions, disappearance, and
  item-drop boundaries without autonomous companion action selection or
  authored-identity dispatch in generic runtime code.
- No smaller Find Steed follow-up is needed for this lane; the remaining work
  belongs to a future mount companion lifecycle/control owner rather than this
  level-2 strict closure task.
- Verification completed with local mounted-combat RAW and ubiquitous-language
  review, local Surface-content review,
  `pnpm unit-profile-coverage:check`, `git diff --check`, and reviewer-loop
  convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 19 - L3-SPELL-FLY-RUNTIME-SURVEY - Level 3 Fly Runtime Survey And Task Split

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Fly, current Surface content, Unit/profile claims, and existing movement/witness language.
- Completed as an unsupported-profile follow-up split instead of support or runtime-detached closure because Fly has executable battle-facing work that is broader than current scalar-buff support: target-list admission, fixed Fly Speed, hover, Concentration cleanup, and spell-end falling witness handoff.
- Added `plans/unit-profile-coverage/L3_FLY_RUNTIME_SURVEY.md` as the survey evidence.
- Updated `plans/unit-profile-coverage/unit-claims.jsonl` so the generated inventory/report classify Fly as a checker-visible follow-up split rather than an unowned `srd-candidate`.
- Added the schedulable follow-up tasks:
  `L3-FOLLOWUP-FLY-SURFACE-TARGET-REPAIR`,
  `L3-FOLLOWUP-FLY-SPECIAL-SPEED-RUNTIME`, and
  `L3-FOLLOWUP-FLY-END-FALL-WITNESS`.
- No companion AI/autonomous-control behavior or authored-identity runtime dispatch is introduced.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 20 - L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY - Level 3 Lightning Bolt Runtime Survey And Task Split

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Lightning Bolt and current line/area damage support; produce supported/closed accounting or a precise runtime implementation split for line save damage.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

Completed:

- Lightning Bolt is supported through `spell.invocation-damage-save-or-attack`: Magic Action level-3-or-higher Spell Slot casting, caller-supplied self-origin 100-foot-long, 5-foot-wide Line affected-creature boundary, Dexterity save-gated Lightning damage with half damage on success, and slot-scaled damage dice.
- Line direction, Total Cover blocking, point-of-origin inclusion choice, affected-creature derivation, and map geometry remain table/spatial owner facts outside the promoted runtime profile.
- Survey and generated coverage artifacts are recorded in `plans/unit-profile-coverage/L3_LIGHTNING_BOLT_RUNTIME_SURVEY.md`, `unit-claims.jsonl`, `unit-evidence.jsonl`, `SRD_UNIT_INVENTORY.md`, `UNIT_REPORT.md`, `srd-unit-inventory.json`, and `unit-matrix.json`.

### Task 21 - L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY - Level 3 Hypnotic Pattern Runtime Survey And Task Split

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Hypnotic Pattern and existing condition-save/incapacitation support; close table-owned presentation or create a precise runtime task split.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

Completed:

- Hypnotic Pattern closes as an unsupported-profile follow-up split rather than
  support or runtime-detached closure. The installed Surface record captures the
  SRD spell's Action cast, 120-foot range, 30-foot Cube, Wisdom Saving Throw,
  Charmed plus Incapacitated plus Speed 0 failed-save bundle, Concentration, and
  target-damage early end, but exact runtime support still needs typed
  sight-gated area target facts and the action-spend shake-awake escape.
- Added the schedulable follow-up tasks:
  `L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR` and
  `L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME`.
- Automatic Cube geometry, Total Cover, point-of-origin inclusion, area
  membership, and sight derivation remain table/spatial witness facts.
- No companion AI/autonomous-control behavior or authored-identity runtime
  dispatch is introduced.
- Survey and generated coverage artifacts are recorded in
  `plans/unit-profile-coverage/L3_HYPNOTIC_PATTERN_RUNTIME_SURVEY.md`,
  `unit-claims.jsonl`, `SRD_UNIT_INVENTORY.md`, `UNIT_REPORT.md`,
  `srd-unit-inventory.json`, and `unit-matrix.json`.

### Task 25 - L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR - Hypnotic Pattern Surface Escape Repair

Status: `deferred`

Deferred Detail: Owner instruction on 2026-05-22: park not-yet-started level-3 work while the level-1/level-2 closure frontier remains active.

Depends on: L3-SPELL-HYPNOTIC-PATTERN-RUNTIME-SURVEY

Blocks: L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME

Input:

- SRD Hypnotic Pattern text and current
  `packages/surface/content/hypnotic_pattern.dhall` / generated JSON.
- Existing Surface spell area, composite effect, and duration escape vocabulary.
- `L3_HYPNOTIC_PATTERN_RUNTIME_SURVEY.md`.

Output:

- Repair Hypnotic Pattern's Surface shape so the 30-foot Cube, sight-gated
  affected-creature predicate, Charmed plus Incapacitated plus Speed 0
  failed-save bundle, target-takes-damage early end, and another-creature
  action-spend shake-awake escape are represented as typed procedure facts
  instead of prose-only runtime behavior.
- Updated Dhall and generated JSON content plus focused Surface/unit-catalog
  tests proving the repaired record round-trips before runtime admission.

Acceptance:

- The repaired Surface record preserves exact SRD provenance and does not
  represent sight, area membership, Total Cover, or Cube geometry as duplicated
  battle state.
- The shake-awake escape is target-specific and requires someone other than the
  affected target to spend an action.
- No runtime support is claimed from Surface admission alone.

### Task 26 - L3-FOLLOWUP-HYPNOTIC-PATTERN-CONTROL-RUNTIME - Hypnotic Pattern Control Runtime

Status: `blocked`

Depends on: L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR

Blocks: none

Input:

- Repaired Hypnotic Pattern Surface record from
  `L3-FOLLOWUP-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR`.
- Existing condition-save, Hideous Laughter damage lifecycle, action-resource,
  Concentration, and area witness support.
- `packages/battle-runtime/battle-runtime.qnt` promoted runtime authority.

Output:

- Promote Hypnotic Pattern by admitting the repaired record into the Unit
  catalog; spending the Magic Action and level-3-or-higher Spell Slot; owning
  caster Concentration up to 1 minute; consuming caller-supplied Cube
  affected-creature and sight witnesses; resolving Wisdom Saving Throws;
  applying one source-owned target effect that projects Charmed, Incapacitated,
  and Speed 0; removing only the spell-owned target effect on affected-target
  damage or another creature's shake-awake action; and cleaning up on
  Concentration or duration end.
- Supported-profile or profile-subset-supported Unit claim, deterministic
  admission/projection evidence, focused runtime tests, generated coverage
  artifacts, and promoted Quint/runtime parity.

Acceptance:

- Charmed, Incapacitated, and Speed 0 cannot diverge for the same spell-owned
  Hypnotic Pattern target effect, and independent condition or Speed sources are
  preserved.
- Automatic Cube geometry, Total Cover, point-of-origin inclusion, area
  membership, and sight derivation remain caller/table-owned.
- No companion AI/autonomous-control behavior or authored-identity runtime
  dispatch is introduced.
