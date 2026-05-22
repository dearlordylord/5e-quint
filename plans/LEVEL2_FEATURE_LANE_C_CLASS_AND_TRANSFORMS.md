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
      "status": "done",
      "title": "Level 3 Fighter Champion Survey"
    },
    {
      "number": 15,
      "id": "L3-FOLLOWUP-FIGHTER-CHAMPION-REMARKABLE-ATHLETE",
      "status": "blocked",
      "title": "Fighter Champion Remarkable Athlete Runtime Split"
    },
    {
      "number": 16,
      "id": "L3-WIZARD-EVOKER-SUBCLASS-SURVEY",
      "status": "done",
      "title": "Level 3 Wizard Evoker Survey"
    },
    {
      "number": 17,
      "id": "L3-SPELL-HASTE-RUNTIME-SURVEY",
      "status": "done",
      "title": "Level 3 Haste Runtime Survey"
    },
    {
      "number": 18,
      "id": "L3-SPELL-SLOW-RUNTIME-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Slow Runtime Survey"
    },
    {
      "number": 19,
      "id": "L3-SPELL-PROTECTION-FROM-ENERGY-RUNTIME-SURVEY",
      "status": "ready-for-research",
      "title": "Level 3 Protection From Energy Runtime Survey"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-SHAPESHIFT-TRUE-FORM-RUNTIME",
      "status": "ready-for-research",
      "title": "Shared Shape-Shifted True-Form Runtime State"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION",
      "status": "blocked",
      "title": "Moonbeam Shape-Shift Area Suppression Rider"
    },
    {
      "number": 22,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION",
      "status": "ready-for-research",
      "title": "Druid Wild Shape D20 Statistic Projection"
    },
    {
      "number": 23,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME",
      "status": "blocked",
      "title": "Druid Wild Shape Shape-Shifting Runtime And Promoted Parity"
    },
    {
      "number": 24,
      "id": "L12G-FOLLOWUP-WIZARD-EVOKER-EVOCATION-SAVANT",
      "status": "ready-for-research",
      "title": "Wizard Evoker Evocation Savant Spellbook Projection"
    },
    {
      "number": 25,
      "id": "L12G-FOLLOWUP-WIZARD-EVOKER-POTENT-CANTRIP",
      "status": "ready-for-research",
      "title": "Wizard Evoker Potent Cantrip Runtime Support"
    },
    {
      "number": 26,
      "id": "L3-FOLLOWUP-HASTE-SURFACE-AUTHORING",
      "status": "ready-for-research",
      "title": "Haste Surface Authoring And Restriction Shape"
    },
    {
      "number": 27,
      "id": "L3-FOLLOWUP-HASTE-POSITIVE-RUNTIME",
      "status": "blocked",
      "title": "Haste Positive Runtime Support"
    },
    {
      "number": 28,
      "id": "L3-FOLLOWUP-HASTE-LETHARGY-RUNTIME",
      "status": "blocked",
      "title": "Haste Lethargy Runtime Support"
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

Status: `done`

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

Result:

- Rechecked SRD Fighter level-3 subclass and Champion RAW. Fighter Subclass grants chosen subclass features whose Fighter level is met; Champion level 3 grants Improved Critical and Remarkable Athlete.
- Authored `subclass_fighter_champion` to grant the existing supported `fighter_improved_critical` Unit at Fighter level 3.
- Updated character creation feature and Unit-ref projection so selected subclass feature grants are derived from the selected subclass record and owning class level. The finalized build still stores only the selected subclass ref, avoiding duplicate feature state.
- Split unimplemented Remarkable Athlete work to `L3-FOLLOWUP-FIGHTER-CHAMPION-REMARKABLE-ATHLETE`: Surface authoring for `fighter_remarkable_athlete`, Initiative and Strength (Athletics) Advantage support, and post-critical-hit movement ownership.

Verification notes:

- RAW/ubiquitous-language check: SRD 5.2.1 `Classes/Fighter.md#Level 3: Fighter Subclass`, `#Level 3: Improved Critical`, and `#Level 3: Remarkable Athlete`; `UBIQUITOUS_LANGUAGE.md` terms for Character Building, Character Sheet, Attack Roll, Critical Hit, Initiative, Advantage, Ability Check, Speed, Movement, and Opportunity Attack.
- Focused verification: `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts -t "authors Fighter Champion feature grants"`; `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts -t "retains selected subclass Unit refs"`; `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts -t "finalizes the complete Orc Soldier Fighter manifest"`; `pnpm --filter @dnd/character-creation-runtime typecheck`; `pnpm --filter @dnd/surface typecheck`; `pnpm unit-profile-coverage:check -- --write`; `pnpm unit-profile-coverage:check`; `git diff --check 969412f50ec1e433a3f9d801f6fb6b6f7474833f`.
- Full diagnostic character-creation test still has two unrelated invalid-vs-incomplete baseline failures; the Task 14 ordering and subclass projection tests pass. No battle runtime behavior changed, so MBT is not applicable.

### Task 15 - L3-FOLLOWUP-FIGHTER-CHAMPION-REMARKABLE-ATHLETE - Fighter Champion Remarkable Athlete Runtime Split

Status: `blocked`

Depends on: Task 14 accepted in the Ralph run and synchronized to the external Ralph plan.

Owner:

- Surface authoring for the SRD Champion class-feature Unit.
- Character-creation Unit admission/projection for the authored feature.
- Character Sheet or battle-runtime roll-mode owner for Initiative and Strength (Athletics) Advantage, as determined by existing roll-mode boundaries.
- Battle runtime owner decision for the post-critical-hit movement window.

Input:

- SRD 5.2.1 Fighter Champion `Level 3: Remarkable Athlete`.
- `UBIQUITOUS_LANGUAGE.md` terms for Initiative, Advantage, Ability Check, Critical Hit, Speed, Movement, and Opportunity Attack.
- Existing roll-mode profiles and movement/critical-hit runtime owners.

Output:

- Author `fighter_remarkable_athlete` as an SRD Champion level-3 class-feature Unit or record a valid owner-accepted closure if authoring is blocked.
- Promote or precisely close the Initiative Advantage and Strength (Athletics) Advantage subset without duplicating roll-mode state.
- Promote, split, or precisely close the immediate optional movement up to half Speed after scoring a Critical Hit without provoking Opportunity Attacks.
- Update Unit claims/evidence/report artifacts and focused tests for any supported subset.

Acceptance:

- Remarkable Athlete lands as supported, accepted-closed/runtime-detached, or further split into smaller executable tasks with concrete owners.
- No authored identity runtime dispatch is introduced.
- No companion AI/autonomous-control behavior is introduced.
- Focused verification includes RAW/ubiquitous-language check, relevant Surface/character-creation tests, `pnpm unit-profile-coverage:check`, and promoted battle-runtime parity only if battle behavior changes.

### Task 16 - L3-WIZARD-EVOKER-SUBCLASS-SURVEY - Level 3 Wizard Evoker Survey

Status: `done`

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

Result:

- Rechecked SRD Wizard level-3 subclass and Evoker RAW. Wizard level 3 grants a Wizard subclass; Evoker level 3 grants Evocation Savant and Potent Cantrip.
- Kept `subclass_wizard_evoker` as an unsupported-profile subclass container because it currently owns selection identity only: the Surface Wizard class names the level-3 option and the character-creation support gate knows the option id, but the supported progression set does not admit same-class Wizard 3 and the subclass Unit has no level-3 feature grants.
- Split Evocation Savant to `L12G-FOLLOWUP-WIZARD-EVOKER-EVOCATION-SAVANT`: author/link the feature Unit, admit Wizard 3 if still absent, and project spellbook grants from Wizard Spell Access, spell school, spell level, and spell slot level facts without duplicating an Evoker spell roster.
- Split Potent Cantrip to `L12G-FOLLOWUP-WIZARD-EVOKER-POTENT-CANTRIP`: author/link the feature Unit and promote cantrip half-damage/no-additional-effect runtime support from cantrip procedure shape and selected feature facts without authored-identity dispatch.

Verification notes:

- RAW/ubiquitous-language check: SRD 5.2.1 `Classes/Wizard.md#Level 3: Wizard Subclass`, `#Level 3: Evocation Savant`, and `#Level 3: Potent Cantrip`; `UBIQUITOUS_LANGUAGE.md` terms for Attack Roll, Saving Throw, Resolve, Apply, Spend, Grant, Damage Type, and damage halving.
- Coverage verification: `pnpm unit-profile-coverage:check` and `git diff --check` passed in the decider worktree. No runtime or Quint behavior changed, so MBT is not applicable.
- Reviewer-loop convergence: implementation review found no issues; decider review added the required executable plan tasks for the two split mechanics.

### Task 17 - L3-SPELL-HASTE-RUNTIME-SURVEY - Level 3 Haste Runtime Survey

Status: `done`

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

Result:

- Rechecked SRD 5.2.1 Haste RAW. Haste is present in the local SRD corpus but has no authored `packages/surface/content/haste.json`, no Unit catalog admission, and no `haste` row in the Unit profile claims or generated matrix.
- Closed Task 17 as a follow-up split instead of claiming support. Legacy root Quint mentions Haste, but the promoted authority is package-local `packages/battle-runtime/battle-runtime.qnt`; promoted battle runtime has no Haste Unit/profile owner today.
- Recorded the detailed survey in `plans/unit-profile-coverage/L3_HASTE_RUNTIME_SURVEY.md`.
- Split Surface authoring to `L3-FOLLOWUP-HASTE-SURFACE-AUTHORING`: author Haste only after Surface can represent an allow-list extra-action restriction with Attack limited to one attack only and a typed end-of-effect lethargy rider.
- Split the active positive runtime to `L3-FOLLOWUP-HASTE-POSITIVE-RUNTIME`: promote Magic Action and level-3+ Spell Slot spend, caster-owned Concentration, willing target admission, doubled Speed, +2 Armor Class, Dexterity Saving Throw Advantage, and the restricted per-target-turn additional action without authored-identity dispatch.
- Split the end rider to `L3-FOLLOWUP-HASTE-LETHARGY-RUNTIME`: promote Incapacitated plus Speed 0 until the end of the target's next turn when the Haste effect ends, preserving independent Incapacitated sources and not treating Incapacitated as an implicit Speed-0 shortcut.

Verification notes:

- RAW/ubiquitous-language check: SRD 5.2.1 `Spells/Descriptions-E-L.md#Haste`; `UBIQUITOUS_LANGUAGE.md` terms for Magic Action, Spell Slot, Concentration, Speed, Movement, Armor Class, Saving Throw, Advantage, Action, Attack action, Dash, Disengage, Hide, Utilize, and Incapacitated.
- Coverage verification: Task 17 changed survey/plan artifacts only and did not add Unit claims, Surface catalog admission, runtime reducers, or promoted Quint behavior. `pnpm unit-profile-coverage:check` and `git diff --check` are the relevant checks; MBT is not applicable.
- Reviewer-loop convergence: survey review found no runtime/code-change issues; architecture and connascence review kept Haste split into Surface action restriction/lethargy authoring, active positive runtime, and end-rider lifecycle instead of adding workaround adapters or authored-identity dispatch.

### Task 18 - L3-SPELL-SLOW-RUNTIME-SURVEY - Level 3 Slow Runtime Survey

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

### Task 19 - L3-SPELL-PROTECTION-FROM-ENERGY-RUNTIME-SURVEY - Level 3 Protection From Energy Runtime Survey

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

### Task 20 - L12G-FOLLOWUP-SHAPESHIFT-TRUE-FORM-RUNTIME - Shared Shape-Shifted True-Form Runtime State

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

### Task 21 - L12G-FOLLOWUP-MOONBEAM-SHAPESHIFT-AREA-SUPPRESSION - Moonbeam Shape-Shift Area Suppression Rider

Status: `blocked`

Depends on:

- Task 20.

Input:

- Task 20 shared shape-shifted true-form runtime owner.
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

### Task 22 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION - Druid Wild Shape D20 Statistic Projection

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

### Task 23 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME - Druid Wild Shape Shape-Shifting Runtime And Promoted Parity

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

### Task 24 - L12G-FOLLOWUP-WIZARD-EVOKER-EVOCATION-SAVANT - Wizard Evoker Evocation Savant Spellbook Projection

Status: `ready-for-research`

Depends on:

- Task 16.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/Wizard.md#Level 3: Evocation Savant`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current Wizard spell access, spell school/level facts, spellbook projection owners, subclass feature-grant projection, and character-creation support gates.

Output:

- Author and link the Evocation Savant class-feature Unit from `subclass_wizard_evoker`.
- Admit same-class Wizard 3 if still absent.
- Discover and finalize the two initial Wizard Evocation spellbook choices of level 2 or lower.
- Project the later one-spell Wizard Evocation spellbook grant whenever Wizard spell slot level access increases, deriving eligibility from existing Wizard Spell Access, spell school, spell level, and spell slot level facts rather than duplicating an Evoker spell roster.
- Update Unit claims/evidence/report artifacts and focused character-creation or Character Sheet tests for any supported subset.

Acceptance:

- Evocation Savant lands as supported, accepted-closed/runtime-detached, or further split into smaller executable tasks with concrete owners.
- No duplicate Evoker spell roster or parallel spellbook state is introduced.
- No authored identity runtime dispatch is introduced.
- Focused verification includes RAW/ubiquitous-language check, relevant Surface/character-creation tests, `pnpm unit-profile-coverage:check`, and promoted battle-runtime parity only if battle behavior changes.

### Task 25 - L12G-FOLLOWUP-WIZARD-EVOKER-POTENT-CANTRIP - Wizard Evoker Potent Cantrip Runtime Support

Status: `ready-for-research`

Depends on:

- Task 16.

Input:

- Local RAW under `.references/srd-5.2.1/Classes/Wizard.md#Level 3: Potent Cantrip`.
- `UBIQUITOUS_LANGUAGE.md`.
- Current cantrip damage profiles, spell procedure facts, selected class-feature facts, miss/save-success result handling, and promoted Quint/runtime parity owners.

Output:

- Author and link the Potent Cantrip class-feature Unit from `subclass_wizard_evoker`.
- Promote a cantrip damage profile where a damaging cantrip cast at a creature deals half cantrip damage on a missed Attack Roll or successful Saving Throw and suppresses additional cantrip effects.
- Admit the profile by spell procedure shape and selected class-feature facts rather than cantrip id, subclass id, name, or provenance section.
- Update Unit claims/evidence/report artifacts, deterministic admission/projection evidence, focused runtime tests, and promoted Quint/runtime parity for any supported subset.

Acceptance:

- Potent Cantrip lands as supported, accepted-closed/runtime-detached, or further split into smaller executable tasks with concrete owners.
- No authored identity runtime dispatch is introduced.
- The half-damage and no-additional-effect clauses stay colocated in one runtime owner.
- Focused verification includes RAW/ubiquitous-language check, relevant Surface/runtime tests, `pnpm unit-profile-coverage:check`, and promoted battle-runtime parity if battle behavior changes.

### Task 26 - L3-FOLLOWUP-HASTE-SURFACE-AUTHORING - Haste Surface Authoring And Restriction Shape

Status: `ready-for-research`

Input:

- Local RAW under `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Haste`.
- `UBIQUITOUS_LANGUAGE.md`.
- Existing Surface action restriction, spell ongoing/activation effect atoms, and the Task 17 survey note.

Output:

- Author `haste` Surface content only after the Surface schema can represent Haste losslessly.
- Extend the existing `grant_extra_action` restriction shape, rather than adding a parallel action-state field, to represent an allow-list where Attack is limited to one attack only.
- Add or reuse a typed operation for end-of-effect lethargy: Incapacitated plus Speed 0 until the end of the target's next turn.
- Preserve Magic Action casting, level-3 Spell Slot, 30-foot visible willing-creature targeting, caster-owned Concentration, doubled Speed, +2 Armor Class, Dexterity Saving Throw Advantage, restricted additional action, and lethargy source facts in authored Surface data.

Acceptance:

- `packages/surface/content/haste.dhall` and generated JSON are admitted by the Surface catalog without lossy prose-only placeholders.
- No runtime code branches on Haste authored identity.
- Follow-up runtime tasks remain blocked until the Surface record exposes typed facts.

### Task 27 - L3-FOLLOWUP-HASTE-POSITIVE-RUNTIME - Haste Positive Runtime Support

Status: `blocked`

Blocked on: `L3-FOLLOWUP-HASTE-SURFACE-AUTHORING`

Input:

- Authored Haste Surface record with typed positive-effect facts.
- Package-local promoted `packages/battle-runtime/battle-runtime.qnt`.
- Current spell invocation, concentration, scalar buff, roll-mode, movement, and action-resource reducers.

Output:

- Promote Haste's active positive effect through typed spell procedure support: Magic Action and level-3+ Spell Slot spend, caster-owned Concentration, known willing target admission, active doubled-Speed projection, +2 Armor Class projection, Dexterity Saving Throw Advantage, and one restricted extra action on each target turn.
- The extra action must allow only Attack with one attack only, Dash, Disengage, Hide, or Utilize.
- Update Unit claims/evidence/report artifacts only after deterministic admission/projection and focused runtime/parity evidence exist.

Acceptance:

- Haste lands as `supported-profile` or `profile-subset-supported` for the positive active effect, without the lethargy rider unless Task 28 is also complete.
- Focused runtime tests and promoted Quint/runtime parity cover resource spend, Concentration, active projections, turn-scoped action grant, restriction enforcement, and cleanup.
- No authored identity dispatch is introduced.

### Task 28 - L3-FOLLOWUP-HASTE-LETHARGY-RUNTIME - Haste Lethargy Runtime Support

Status: `blocked`

Blocked on: `L3-FOLLOWUP-HASTE-SURFACE-AUTHORING`, `L3-FOLLOWUP-HASTE-POSITIVE-RUNTIME`

Input:

- Authored Haste Surface record with typed lethargy facts.
- Promoted Haste positive active-effect lifecycle from Task 27.
- Current condition and Speed projection owners.

Output:

- Promote Haste's end rider: when the Haste spell effect ends for a target, remove the positive effect and apply source-owned lethargy that gives Incapacitated and Speed 0 until the end of the target's next turn.
- Preserve independent Incapacitated sources; do not use Incapacitated as an implicit Speed-0 shortcut.
- Cover concentration break, duration expiration, replacement/recast, and target-turn cleanup.

Acceptance:

- Haste can claim exact active-effect support only if Task 27 and this task both land.
- Focused runtime tests and promoted Quint/runtime parity cover end-of-effect lethargy lifecycle and cleanup.
- No companion AI/autonomous-control behavior or authored identity dispatch is introduced.
