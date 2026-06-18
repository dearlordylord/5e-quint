# Ralph L5 Lane B: Spell-Level 3 Authored Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-B01-ANIMATE-DEAD",
      "status": "done",
      "title": "Close Animate Dead authored spell pressure"
    },
    {
      "number": 2,
      "id": "L5-B02-BEACON-OF-HOPE",
      "status": "done",
      "title": "Close Beacon of Hope authored spell pressure"
    },
    {
      "number": 3,
      "id": "L5-B03-CALL-LIGHTNING",
      "status": "done",
      "title": "Close Call Lightning authored spell pressure"
    },
    {
      "number": 4,
      "id": "L5-B04-CREATE-FOOD-AND-WATER",
      "status": "done",
      "title": "Close Create Food and Water authored spell pressure"
    },
    {
      "number": 5,
      "id": "L5-B05-DAYLIGHT",
      "status": "ready-for-research",
      "title": "Close Daylight authored spell pressure"
    },
    {
      "number": 6,
      "id": "L5-B06-FEAR",
      "status": "ready-for-research",
      "title": "Close Fear authored spell pressure"
    },
    {
      "number": 7,
      "id": "L5-B07-MAJOR-IMAGE",
      "status": "ready-for-research",
      "title": "Close Major Image authored spell pressure"
    },
    {
      "number": 8,
      "id": "L5-B08-PROTECTION-FROM-ENERGY",
      "status": "ready-for-research",
      "title": "Close Protection from Energy authored spell pressure"
    },
    {
      "number": 9,
      "id": "L5-B09-SPIRIT-GUARDIANS",
      "status": "ready-for-research",
      "title": "Close Spirit Guardians authored spell pressure"
    },
    {
      "number": 10,
      "id": "L5-B10-STINKING-CLOUD",
      "status": "ready-for-research",
      "title": "Close Stinking Cloud authored spell pressure"
    },
    {
      "number": 11,
      "id": "L5-B11-VAMPIRIC-TOUCH",
      "status": "ready-for-research",
      "title": "Close Vampiric Touch authored spell pressure"
    },
    {
      "number": 12,
      "id": "L5-B12-WIND-WALL",
      "status": "ready-for-research",
      "title": "Close Wind Wall authored spell pressure"
    }
  ]
}
-->

## Lane Scope

This lane closes the spell-level-3 identities that already have authored SRD
Surface records but are not installed or owner-classified for the character
level 5 frontier.

The output for each task is either supported catalog admission with
checker-visible owner evidence, or a precise table-only or
battle-runtime-detached owner statement. Do not author missing spell records in
this lane; those are Lane C and Lane D.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/L3_PROTECTION_FROM_ENERGY_RUNTIME_SURVEY.md`
- `packages/surface/content/*.json`
- `packages/surface/content/*.dhall`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- If RAW is ambiguous or a task requires a modeling choice the SRD does not
  prescribe, do not silently choose; document the proposed assumption in
  `ASSUMPTIONS.md` or stop for owner direction.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- One task equals one unique spell Unit identity. Class-list rows are evidence
  for that Unit, not separate implementation tasks.
- Do not install an authored spell into the catalog until its owner boundary is
  explicit and checker-readable.
- Runtime behavior must be admitted by parsed shape, support-profile readers,
  typed procedure facts, and explicit runtime state; do not dispatch on spell
  id/name/provenance section.
- If the spell belongs outside battle runtime, close it with a precise
  runtime-detached owner statement instead of a vague unsupported label.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L5-B01-ANIMATE-DEAD - Close Animate Dead authored spell pressure | done | none | Closed as a runtime-detached companion-control boundary. |
| 2 | L5-B02-BEACON-OF-HOPE - Close Beacon of Hope authored spell pressure | done | none | Closed outside the promoted battle runtime active spell-effect boundary. |
| 3 | L5-B03-CALL-LIGHTNING - Close Call Lightning authored spell pressure | done | none | Closed outside the promoted battle runtime active storm spell-effect and table/spatial weather boundary. |
| 4 | L5-B04-CREATE-FOOD-AND-WATER - Close Create Food and Water authored spell pressure | done | none | Closed as runtime-detached table inventory and survival ownership. |
| 5 | L5-B05-DAYLIGHT - Close Daylight authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 6 | L5-B06-FEAR - Close Fear authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 7 | L5-B07-MAJOR-IMAGE - Close Major Image authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 8 | L5-B08-PROTECTION-FROM-ENERGY - Close Protection from Energy authored spell pressure | ready-for-research | none | Preserve target-shape repair plus runtime admission prerequisite from `plans/unit-profile-coverage/L3_PROTECTION_FROM_ENERGY_RUNTIME_SURVEY.md`. |
| 9 | L5-B09-SPIRIT-GUARDIANS - Close Spirit Guardians authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 10 | L5-B10-STINKING-CLOUD - Close Stinking Cloud authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 11 | L5-B11-VAMPIRIC-TOUCH - Close Vampiric Touch authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |
| 12 | L5-B12-WIND-WALL - Close Wind Wall authored spell pressure | ready-for-research | none | Independent authored spell pressure row. |

## Shared Verification

- RAW and ubiquitous-language check: read the listed spell description, class
  spell-list anchors, and `UBIQUITOUS_LANGUAGE.md` before closing the Unit.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- Run focused tests/typechecks for any touched owner package.
- If battle-runtime behavior changes, update the relevant QNT/spec first and
  run the focused MBT only after code changes are complete, one MBT run at a
  time per `AGENTS.md`.
- If a unit task changes coverage inputs, run
  `pnpm unit-profile-coverage:check --write` locally. Shared generated
  inventory/matrix refresh is owned by
  `plans/RALPH_L5_POST_LANE_GENERATED_COVERAGE_FINALIZATION.md` after all four
  lanes merge; individual unit-task agents should not hand-resolve cross-lane
  generated artifact conflicts.
- `pnpm unit-profile-coverage:check`
- `git diff --check`

## Task Details

### Task 1 - L5-B01-ANIMATE-DEAD

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `animate_dead`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:134`
- `.references/srd-5.2.1/Classes/Cleric.md:204`
- `.references/srd-5.2.1/Classes/Wizard.md:237`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Review the authored record against RAW and decide whether to admit it with
  owner evidence or close it as runtime-detached with a precise owner.

Acceptance:

- `animate_dead` leaves `catalog-authored-review-required` in the generated
  level 1-7 audit.

Result:

- `animate_dead` is recorded as `unsupported-profile` and
  `catalog-only/dead-for-now` with a `companion-control-boundary` closure.
- The runtime-detached owner is the future reanimated companion
  lifecycle/control owner for Skeleton/Zombie creation, command fan-out,
  default behavior, control expiry, reassertion, and stat-block execution.

Verification:

- Shared lane verification.

### Task 2 - L5-B02-BEACON-OF-HOPE

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `beacon_of_hope`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:451`
- `.references/srd-5.2.1/Classes/Cleric.md:205`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Classify healing, Saving Throw Advantage, and Death Saving Throw Advantage
  ownership and either admit the spell with evidence or close the
  battle-runtime-detached boundary.

Acceptance:

- `beacon_of_hope` leaves `catalog-authored-review-required`.

Result:

- `beacon_of_hope` is recorded as `unsupported-profile` and
  `catalog-only/dead-for-now` with an `outside-battle-runtime` closure.
- The future owner is an active spell-effect owner that carries selected targets
  and Concentration expiry, maximizes later healing received by affected
  targets, and projects Advantage on Wisdom Saving Throws and Death Saving
  Throws without authored-identity dispatch.

Verification:

- Shared lane verification.

### Task 3 - L5-B03-CALL-LIGHTNING

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `call_lightning`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:625`
- `.references/srd-5.2.1/Classes/Druid.md:253`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for persistent storm state, repeated action damage, and
  outdoor/storm-size table facts.

Acceptance:

- `call_lightning` leaves `catalog-authored-review-required`.

Result:

- `call_lightning` is recorded as `unsupported-profile` and
  `catalog-only/dead-for-now` with an `outside-battle-runtime` closure.
- The future owner is an active storm Spell Effect owner that carries the cloud
  occurrence, Concentration expiry, retained slot level and Spell Save DC,
  later Magic Action repeats, selected points under the cloud, and repeated
  Dexterity Saving Throw Lightning damage without authored-identity dispatch.
- Table/spatial weather ownership supplies visibility, under-cloud area
  membership, outdoor-in-a-storm state, existing storm control, and the storm
  damage bonus rather than duplicating map or weather state inside generic
  Spell Invocation reducers.

Verification:

- Shared lane verification.

### Task 4 - L5-B04-CREATE-FOOD-AND-WATER

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `create_food_and_water`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1200`
- `.references/srd-5.2.1/Classes/Cleric.md:208`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Close the food/water creation effect as table inventory/survival ownership or
  admit it if a typed owner already exists.

Acceptance:

- `create_food_and_water` leaves `catalog-authored-review-required`.

Result:

- `create_food_and_water` is recorded as `unsupported-profile` and
  `catalog-only/dead-for-now` with an
  `outside-runtime-presentation-exploration` closure.
- The runtime-detached owner is a future table inventory and survival
  adjudication owner for created provision quantities, ground/container
  placement, holder/location state, food spoilage after 24 hours, later
  consumption, and clean-water/nourishing-food effects on malnutrition and
  dehydration.

Verification:

- Shared lane verification.

### Task 5 - L5-B05-DAYLIGHT

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `daylight`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1337`
- `.references/srd-5.2.1/Classes/Cleric.md:209`
- `.references/srd-5.2.1/Classes/Druid.md:255`
- `.references/srd-5.2.1/Classes/Sorcerer.md:303`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for light area, object targeting, Illumination, and overlap
  with magical Darkness.

Acceptance:

- `daylight` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 6 - L5-B06-FEAR

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `fear`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:268`
- `.references/srd-5.2.1/Classes/Bard.md:220`
- `.references/srd-5.2.1/Classes/Sorcerer.md:305`
- `.references/srd-5.2.1/Classes/Warlock.md:382`
- `.references/srd-5.2.1/Classes/Wizard.md:243`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for cone targeting, Wisdom Saving Throw, frightened state,
  forced movement/drop behavior, and repeat Saving Throw timing.

Acceptance:

- `fear` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 7 - L5-B07-MAJOR-IMAGE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `major_image`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:153`
- `.references/srd-5.2.1/Classes/Bard.md:223`
- `.references/srd-5.2.1/Classes/Sorcerer.md:312`
- `.references/srd-5.2.1/Classes/Warlock.md:387`
- `.references/srd-5.2.1/Classes/Wizard.md:252`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Close or admit image/illusion ownership without treating table perception or
  illusion believability as battle-state duplicates.

Acceptance:

- `major_image` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 8 - L5-B08-PROTECTION-FROM-ENERGY

Status: `ready-for-research`

Depends on:

- merged L17 mining audit
- plans/unit-profile-coverage/L3_PROTECTION_FROM_ENERGY_RUNTIME_SURVEY.md

Unit:

- `protection_from_energy`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:894`
- `.references/srd-5.2.1/Classes/Cleric.md:215`
- `.references/srd-5.2.1/Classes/Druid.md:259`
- `.references/srd-5.2.1/Classes/Sorcerer.md:313`
- `.references/srd-5.2.1/Classes/Wizard.md:255`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Preserve the survey's ordered prerequisite: repair the target shape for one
  willing touched creature, then admit chosen damage type Resistance and
  Concentration duration only through typed runtime facts.

Acceptance:

- `protection_from_energy` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 9 - L5-B09-SPIRIT-GUARDIANS

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `spirit_guardians`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:495`
- `.references/srd-5.2.1/Classes/Cleric.md:220`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for aura area, Saving Throw/damage timing, speed reduction,
  and chosen unaffected creatures.

Acceptance:

- `spirit_guardians` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 10 - L5-B10-STINKING-CLOUD

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `stinking_cloud`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:544`
- `.references/srd-5.2.1/Classes/Bard.md:231`
- `.references/srd-5.2.1/Classes/Sorcerer.md:316`
- `.references/srd-5.2.1/Classes/Wizard.md:261`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for area persistence, Heavily Obscured gas, Constitution
  Saving Throw, Poisoned condition, action/Bonus Action loss, and wind
  dispersal.

Acceptance:

- `stinking_cloud` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 11 - L5-B11-VAMPIRIC-TOUCH

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `vampiric_touch`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1075`
- `.references/srd-5.2.1/Classes/Sorcerer.md:318`
- `.references/srd-5.2.1/Classes/Warlock.md:390`
- `.references/srd-5.2.1/Classes/Wizard.md:264`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for repeated spell attack, necrotic damage, and healing
  derived from damage dealt.

Acceptance:

- `vampiric_touch` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.

### Task 12 - L5-B12-WIND-WALL

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `wind_wall`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1313`
- `.references/srd-5.2.1/Classes/Druid.md:265`

Current state:

- Authored record exists; catalog state is `not-installed`.
- Mining disposition is `catalog-authored-review-required`.

Output:

- Decide the owner for line geometry, damage on creation, ranged projectile
  blocking, and gas/fog dispersal.

Acceptance:

- `wind_wall` leaves `catalog-authored-review-required`.

Verification:

- Shared lane verification.
