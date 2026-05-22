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
      "status": "done",
      "title": "Dragon's Breath Initial Cast And Effect State"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION",
      "status": "done",
      "title": "Dragon's Breath Granted Magic Action"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES",
      "status": "done",
      "title": "Enhance Ability Upcast Per-Target Ability Choices"
    },
    {
      "number": 11,
      "id": "L12G-RECURSIVE-TAIL-LANE-C",
      "status": "blocked",
      "title": "Lane C Recursive Planning Tail"
    },
    {
      "number": 12,
      "id": "L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER",
      "status": "done",
      "title": "Moonbeam Shape-Shifting Rider Recheck"
    },
    {
      "number": 13,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-RETAINED-STATISTICS",
      "status": "done",
      "title": "Druid Wild Shape Retained Statistics Recheck"
    },
    {
      "number": 14,
      "id": "L3-FIGHTER-CHAMPION-SUBCLASS-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Fighter Champion Survey"
    },
    {
      "number": 15,
      "id": "L3-WIZARD-EVOKER-SUBCLASS-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Wizard Evoker Survey"
    },
    {
      "number": 16,
      "id": "L3-SPELL-HASTE-RUNTIME-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Haste Runtime Survey"
    },
    {
      "number": 17,
      "id": "L3-SPELL-SLOW-RUNTIME-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Slow Runtime Survey"
    },
    {
      "number": 18,
      "id": "L3-SPELL-PROTECTION-FROM-ENERGY-RUNTIME-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Protection From Energy Runtime Survey"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-SHAPESHIFT-TRUE-FORM-RUNTIME",
      "status": "ready-for-research",
      "title": "Shared Shape-Shifted True-Form Runtime State"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION",
      "status": "blocked",
      "title": "Moonbeam Shape-Shift Area Suppression Rider"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION",
      "status": "ready-for-research",
      "title": "Druid Wild Shape D20 Statistic Projection"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME",
      "status": "blocked",
      "title": "Druid Wild Shape Shape-Shifting Runtime And Promoted Parity"
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

Status: `done`

Input:
- SRD Dragon's Breath text and existing spell-created active-effect patterns.

Output:
- Initial cast/effect-state support or split if the granted action makes the task too large.
- Preserve caller/table ownership for cone placement and affected creatures.

### Task 9 - L12G-FOLLOWUP-DRAGONS-BREATH-GRANTED-ACTION - Dragon's Breath Granted Magic Action

Status: `done`

Depends on:
- Task C8.

Output:
- Runtime support for the granted breath action, damage type choice, save/damage resolution, and lifecycle cleanup.

### Task 10 - L12G-FOLLOWUP-ENHANCE-ABILITY-UPCAST-PER-TARGET-ABILITIES - Enhance Ability Upcast Per-Target Ability Choices

Status: `done`

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

## Level 2 Completion And Level 3 Kickoff Refill

### Task 12 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-RIDER - Moonbeam Shape-Shifting Rider Recheck

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Recheck current merged Moonbeam/Wild Shape state. If not already solved, implement or split the failed-save shape-shift reversion/suppression rider; if solved externally, update claims/evidence.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

Result:

- Rechecked SRD Moonbeam and Druid Wild Shape against the promoted Moonbeam movable-zone runtime and the Druid Wild Shape runtime subset.
- Closed this task as a smaller precise follow-up split: Moonbeam already has supported movable-zone damage/lifecycle coverage, but its failed-save shape-shift rider must wait for a source-neutral shape-shifted true-form runtime owner before Moonbeam can consume the fact without Druid-only or authored-identity dispatch.
- Added `L12G-FOLLOWUP-SHAPESHIFT-TRUE-FORM-RUNTIME` and `L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION` as executable follow-up tasks.

Verification notes:

- RAW/ubiquitous-language check: SRD 5.2.1 `Spells/Descriptions-M-P.md#Moonbeam` says a failed-save shape-shifted creature reverts to its true form and cannot shape-shift until it leaves the Cylinder; SRD 5.2.1 `Classes/Druid.md#Level 2: Wild Shape` says Wild Shape shape-shifts into a learned Beast form; `UBIQUITOUS_LANGUAGE.md` keeps Cylinder/Area of Effect terminology and companion-control wording distinct. No companion control behavior is introduced.
- Reviewer-loop convergence: round 1 found the split only in generated coverage artifacts; round 2 records Task 12 as done and materializes the two follow-up IDs in this Ralph plan and the mirrored in-repo lane plan. No runtime or Quint behavior changed, so MBT is not applicable.

### Task 13 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-RETAINED-STATISTICS - Druid Wild Shape Retained Statistics Recheck

Status: `done`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Recheck current merged Wild Shape state. If retained statistics/persistence are already solved, update claims/evidence; otherwise split the smallest remaining runtime/profile task.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

Result:

- Rechecked SRD Wild Shape retained statistics and Shape-Shifting RAW against the merged Wild Shape runtime subset.
- Accepted active-form cross-boundary persistence as runtime-detached under `ASSUMPTIONS.md` A27: Character Battle settlement rejects active Wild Shape forms until dismissal or reversion.
- Split the remaining battle-owned retained-statistic work to `L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION`: effective Ability Check and Saving Throw ability-score selection plus Skill and Saving Throw proficiency reconciliation.
- Left equipment disposition, Beast Spells, form anatomy, battle-owned sense/communication projection, unsupported Stat Block actions, attack prose riders, multi-component damage, and Stat Block non-Attack actions under `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME`.

Verification notes:

- RAW/ubiquitous-language check: SRD 5.2.1 `Classes/Druid.md#Level 2: Wild Shape` defines retained and replaced game statistics, no spellcasting, Temporary Hit Points, equipment behavior, and reversion triggers; SRD 5.2.1 `Rules-Glossary.md#Shape-Shifting` says shape-shift descriptions control retained facts and ongoing effects carry over unless stated otherwise; `UBIQUITOUS_LANGUAGE.md` keeps Stat Block, Character Sheet, Ability Check, Saving Throw, Skill, Temporary Hit Points, and Companion Control terms distinct.
- Coverage verification: `pnpm unit-profile-coverage:check -- --write`, `pnpm unit-profile-coverage:check`, and `git diff --check` passed in the implementation worktree. No runtime or Quint behavior changed, so MBT is not applicable.
- Reviewer-loop convergence: the implementation review found the split only in coverage artifacts; this revision synchronized the Ralph plan index/task details and mirrored in-repo lane plan with the new follow-up ID.

### Task 14 - L3-FIGHTER-CHAMPION-SUBCLASS-SURVEY - Level 3 Fighter Champion Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Fighter level-3 Champion subclass facts and current character creation/unit records; close as class-fact projection or split missing runtime/profile support.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 15 - L3-WIZARD-EVOKER-SUBCLASS-SURVEY - Level 3 Wizard Evoker Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Wizard level-3 Evoker subclass facts and current character creation/unit records; close as class-fact projection or split missing runtime/profile support.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 16 - L3-SPELL-HASTE-RUNTIME-SURVEY - Level 3 Haste Runtime Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- If SRD Haste is present in local corpus/content, survey runtime support needs for action economy, AC/speed, and lethargy; otherwise record missing-corpus/content closure.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 17 - L3-SPELL-SLOW-RUNTIME-SURVEY - Level 3 Slow Runtime Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- If SRD Slow is present in local corpus/content, survey runtime support needs for save-gated action/speed/AC penalties; otherwise record missing-corpus/content closure.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 18 - L3-SPELL-PROTECTION-FROM-ENERGY-RUNTIME-SURVEY - Level 3 Protection From Energy Runtime Survey

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Surface content, Unit/profile claims, owner evidence, and focused tests.

Output:

- Read SRD Protection From Energy and existing resistance active-effect support; close or split runtime work for chosen damage resistance.
- Updated plan/profile/evidence/report artifacts only when they are the correct owner.
- Focused verification, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 19 - L12G-FOLLOWUP-SHAPESHIFT-TRUE-FORM-RUNTIME - Shared Shape-Shifted True-Form Runtime State

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/` for shape-shifting sources such as Wild Shape, Polymorph-style spell transformations, and stat-block shapechangers.
- `UBIQUITOUS_LANGUAGE.md`.
- Existing Druid Wild Shape runtime subset, self-transformation support, stat-block controls, and Moonbeam shape-shift rider claim.

Output:

- Promote a source-neutral battle-visible shape-shifted state that records enough true-form and replacement-form facts for runtime consumers to test whether a creature is shape-shifted and revert it to its true form.
- Do not branch on authored Unit ids, spell ids, names, or provenance sections.
- Avoid duplicating true-form facts beside their source state; make the reversion owner derive or project from one canonical shape-shift state.
- Focused Wild Shape and synthetic transformation tests, package-local promoted Quint/runtime parity for reversion, generated coverage artifacts, `git diff --check`, and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 20 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION - Moonbeam Shape-Shift Area Suppression Rider

Status: `blocked`

Depends on:

- Task 19.

Input:

- Task 19 shared shape-shifted true-form runtime owner.
- Local RAW under `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Moonbeam`.
- `UBIQUITOUS_LANGUAGE.md`.
- Promoted Moonbeam movable-zone runtime, table/spatial trigger boundary, and coverage artifacts.

Output:

- Execute Moonbeam's failed-save shape-shift rider using the shared shape-shift state: failed save reverts a shape-shifted target, successful save does not, and reversion applies across all Moonbeam save triggers.
- Suppress shape-shifting only while the target remains in that Moonbeam Cylinder.
- Clear suppression on explicit caller/table-supplied Cylinder exit and when the Moonbeam spell ends.
- Focused runtime tests for failed save, successful save, once-per-turn duplicate behavior, exit cleanup, and spell cleanup; package-local promoted Quint/runtime parity; generated coverage artifacts; `git diff --check`; and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 21 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION - Druid Wild Shape D20 Statistic Projection

Status: `ready-for-research`

Depends on:

- Task 13.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape` and `.references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting`.
- `UBIQUITOUS_LANGUAGE.md`.
- `druid_wild_shape` Unit claim and `unit-feature.druid-wild-shape-known-form` support profile.
- Existing battle-runtime Wild Shape active-form state, stat-block readers, character statistic readers, and D20 Ability Check/Saving Throw/Skill hole projection code.

Output:

- Owner: battle-runtime D20 statistic projection for active Wild Shape forms; Character Sheet and Stat Block records remain the source facts.
- Project the Wild Shape battle-owned D20 statistic matrix: Beast Strength, Dexterity, and Constitution; retained character Intelligence, Wisdom, and Charisma; retained Skill and Saving Throw proficiencies using the character Proficiency Bonus; gained Beast proficiencies; and higher Beast stat-block modifiers where RAW provides one.
- Keep true-form Character Sheet facts and replacement Beast Stat Block facts as the source state; do not duplicate them into parallel retained-statistic state.
- Focused Ability Check, Skill, and Saving Throw runtime tests; package-local promoted Quint/runtime parity if battle behavior is promoted; generated coverage artifacts; `git diff --check`; and reviewer-loop convergence.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.

### Task 22 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime And Promoted Parity

Status: `blocked`

Blocked by:

- Plan-wide Wild Shape ownership boundary: this lane must not implement Wild Shape; this task mirrors the existing wrapup backlog follow-up so Task 13's excluded shape-shifting work remains visible in this plan.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape` and `.references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting`.
- `UBIQUITOUS_LANGUAGE.md`.
- Existing Druid Wild Shape runtime subset and `unit-feature.druid-wild-shape-known-form` support profile.
- `L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION` for battle-owned D20 statistic projection.

Output:

- Promote the remaining Wild Shape battle execution beyond the merged-equipment subset: equipment disposition choices for falling or worn equipment, Beast Spells casting exceptions, Beast-form Grapple/free-hand and object-handling anatomy, battle-owned sense or communication projection, unsupported Stat Block action sections, attack prose riders, multi-component damage, and Stat Block non-Attack actions.
- Keep D20 Ability Check, Saving Throw, Skill, and proficiency reconciliation in `L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION`; do not duplicate those source facts here.
- Owner: battle-runtime, character-battle-runtime, and package-local `battle-runtime.qnt` parity.

Acceptance:

- The task lands as supported, accepted-closed/runtime-detached, or a smaller precise follow-up split.
- No companion AI/autonomous-control behavior is introduced.
- No authored identity dispatch is introduced in runtime code.
