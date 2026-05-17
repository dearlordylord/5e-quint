# Level 1 Ralph Loop I - Class And Species Catalog Pressure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1I-PRECHECK",
      "status": "done",
      "title": "Non-D Class Species Pressure Precheck"
    },
    {
      "number": 2,
      "id": "L1I-ABILITY-SCORE-IMPROVEMENT",
      "status": "done",
      "title": "Ability Score Improvement Authored Feature Closure"
    },
    {
      "number": 3,
      "id": "L1I-EPIC-BOON-CONTAINERS",
      "status": "done",
      "title": "Epic Boon Class Feature Container Closure"
    },
    {
      "number": 4,
      "id": "L1I-BARD-KNOWLEDGE-FEATURES",
      "status": "ready-for-research",
      "title": "Bard Knowledge Feature Catalog Pressure"
    },
    {
      "number": 5,
      "id": "L1I-BARBARIAN-LATER-FEATURES",
      "status": "ready-for-research",
      "title": "Barbarian Later Feature Catalog Pressure"
    },
    {
      "number": 6,
      "id": "L1I-PALADIN-SMITE-STYLE-SURFACE",
      "status": "ready-for-research",
      "title": "Paladin Smite And Fighting Style Surface Pressure"
    },
    {
      "number": 7,
      "id": "L1I-RANGER-LATER-FEATURES",
      "status": "ready-for-research",
      "title": "Ranger Later Feature Catalog Pressure"
    },
    {
      "number": 8,
      "id": "L1I-MONK-BODY-AND-MIND",
      "status": "ready-for-research",
      "title": "Monk Body And Mind Catalog Pressure"
    },
    {
      "number": 9,
      "id": "L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES",
      "status": "ready-for-research",
      "title": "Warlock Wizard Knowledge Feature Catalog Pressure"
    },
    {
      "number": 10,
      "id": "L1I-SPECIES-TRAIT-PRESSURE-SPLIT",
      "status": "ready-for-research",
      "title": "Species Trait Catalog Pressure Split"
    },
    {
      "number": 11,
      "id": "L1I-DRUID-NATURES-WARD",
      "status": "ready-for-research",
      "title": "Druid Nature's Ward Catalog Pressure"
    }
  ]
}
-->

This loop owns catalog-pressure triage for authored class-feature and
species-trait records that are absent from the installed Unit catalog and are
currently reported as `unsupported-widening-pressure` in
`plans/unit-profile-coverage/UNIT_REPORT.md`.

It must not take strict level-1 open-profile-accounting or selected-identity
work from D. If a task needs any D-owned Unit below, mark the task blocked or
record a follow-up instead of editing the D-owned surface.

D-owned exclusions: `wizard_arcane_recovery`, `fighter_fighting_style`,
`cleric_divine_order`, `druid_primal_order`, `rogue_expertise`,
`warlock_eldritch_invocations`, `barbarian_weapon_mastery`,
`fighter_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`,
`rogue_weapon_mastery`, `hunters_mark`, `ranger_favored_enemy`,
`bard_bardic_inspiration`, `monk_martial_arts`, `charm_person`,
`disguise_self`, `druidcraft`, `elementalism`, `illusory_script`, `message`,
`prestidigitation`, `thaumaturgy`, and `unseen_servant`.

Companion/familiar work is out of scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Every task
must leave review and decider artifacts. Reviewers should reject runtime
behavior added from catalog-pressure tasks unless the task explicitly narrows to
a supported profile and proves it from local SRD text.

## Owned Surface

Primary write scope:

- `plans/unit-profile-coverage/*CLASS_SPECIES*` or `*CATALOG_PRESSURE*`
  decision artifacts for the assigned Units;
- `plans/unit-profile-coverage/unit-claims.jsonl` only for the assigned Unit
  ids, if an explicit unsupported or supported profile disposition is needed;
- generated coverage artifacts under `plans/unit-profile-coverage/`;
- focused character/surface tests only if the task promotes a real supported
  profile rather than a closeout.

Avoid D plan files and D-owned selected identity files.

## Verification

Every task runs:

- relevant focused tests when code changes are made;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence.

## Task Table

| Order | Task | Status | Blocks On | Output |
| ---: | --- | --- | --- | --- |
| 1 | L1I-PRECHECK - Non-D Class Species Pressure Precheck | done | none | refreshed list of class/species authored pressure that excludes D-owned Units |
| 2 | L1I-ABILITY-SCORE-IMPROVEMENT - Ability Score Improvement Authored Feature Closure | done | 1 | ASI class-feature closure artifact and unsupported-profile claims |
| 3 | L1I-EPIC-BOON-CONTAINERS - Epic Boon Class Feature Container Closure | done | 1 | closure artifact and unsupported-profile claims for Epic Boon container records |
| 4 | L1I-BARD-KNOWLEDGE-FEATURES - Bard Knowledge Feature Catalog Pressure | ready-for-research | 1 | Bard feature disposition for non-D authored records |
| 5 | L1I-BARBARIAN-LATER-FEATURES - Barbarian Later Feature Catalog Pressure | ready-for-research | 1 | Barbarian feature disposition for non-D authored records |
| 6 | L1I-PALADIN-SMITE-STYLE-SURFACE - Paladin Smite And Fighting Style Surface Pressure | ready-for-research | 1 | Paladin feature disposition without stealing D container work |
| 7 | L1I-RANGER-LATER-FEATURES - Ranger Later Feature Catalog Pressure | ready-for-research | 1 | Ranger feature disposition without stealing D Favored Enemy work |
| 8 | L1I-MONK-BODY-AND-MIND - Monk Body And Mind Catalog Pressure | ready-for-research | 1 | Monk feature disposition without stealing D Martial Arts scaling |
| 9 | L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES - Warlock Wizard Knowledge Feature Catalog Pressure | ready-for-research | 1 | Warlock/Wizard knowledge-feature disposition without stealing D invocation work |
| 10 | L1I-SPECIES-TRAIT-PRESSURE-SPLIT - Species Trait Catalog Pressure Split | ready-for-research | 1 | split species traits into runtime-supported, runtime-detached, later-level, or follow-up lanes |
| 11 | L1I-DRUID-NATURES-WARD - Druid Nature's Ward Catalog Pressure | ready-for-research | 1 | Druid later feature disposition without stealing D Primal Order work |

### Task 1 - L1I-PRECHECK - Non-D Class Species Pressure Precheck

Status: `done`

Refresh the current class-feature/species-trait authored pressure from
`UNIT_REPORT.md`, `srd-unit-inventory.json`, and `unit-claims.jsonl`. Produce a
small decision artifact listing only Units this loop owns and explicitly
excluding D-owned Units.

Acceptance:

- no D-owned Unit is assigned to this loop;
- companion/familiar work is excluded;
- outputs name the exact Surface content records read.

Result: `plans/unit-profile-coverage/L1I_CLASS_SPECIES_CATALOG_PRESSURE_PRECHECK.md`.

### Task 2 - L1I-ABILITY-SCORE-IMPROVEMENT - Ability Score Improvement Authored Feature Closure

Status: `done`

Units: `barbarian_ability_score_improvement_l4`,
`bard_ability_score_improvement_l4`, `cleric_ability_score_improvement_l4`,
`druid_ability_score_improvement_l4`, `monk_ability_score_improvement_l4`,
`ranger_ability_score_improvement_l4`, `rogue_ability_score_improvement_l4`,
`sorcerer_ability_score_improvement_l4`,
`wizard_ability_score_improvement_l4`.

Decide whether these are character-creation facts, no promoted Unit profile,
or need a later supported character-advancement profile. Do not edit level-1 D
advancement/container tasks.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_ABILITY_SCORE_IMPROVEMENT_CLOSURE.md`.
The nine class-feature records are closed as selection-grant containers with no
standalone promoted battle Unit profile; selected feat Units and character
creation/advancement ability-score projection own downstream behavior.

### Task 3 - L1I-EPIC-BOON-CONTAINERS - Epic Boon Class Feature Container Closure

Status: `done`

Units: `bard_epic_boon`, `cleric_epic_boon`, `druid_epic_boon`,
`fighter_epic_boon`, `monk_epic_boon`, `paladin_epic_boon`.

Classify Epic Boon authored records as later-level selection containers or
route the selected boon execution to existing/future selected Unit profiles.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_EPIC_BOON_CLOSURE.md`.
The six class-feature records are closed as later-level feat-selection
containers with no standalone promoted battle Unit profile; selected feat
Units and level-19 character advancement own downstream behavior.

### Task 4 - L1I-BARD-KNOWLEDGE-FEATURES - Bard Knowledge Feature Catalog Pressure

Status: `ready-for-research`

Units: `bard_bonus_proficiencies`, `bard_jack_of_all_trades`,
`bard_words_of_creation`.

Read Bard RAW and existing character/runtime owners. Close table/character facts
explicitly or create the smallest follow-up supported-profile task.

### Task 5 - L1I-BARBARIAN-LATER-FEATURES - Barbarian Later Feature Catalog Pressure

Status: `ready-for-research`

Units: `barbarian_danger_sense`, `barbarian_primal_champion`.

Keep this later-level and non-D. If a runtime profile is appropriate, record a
new atomic follow-up rather than broadening this task.

### Task 6 - L1I-PALADIN-SMITE-STYLE-SURFACE - Paladin Smite And Fighting Style Surface Pressure

Status: `ready-for-research`

Units: `paladin_fighting_style`, `paladin_paladins_smite`.

Do not duplicate D's Weapon Mastery or selected spell identity work. Decide
whether these are selection/grant containers, character facts, or need future
profile support.

### Task 7 - L1I-RANGER-LATER-FEATURES - Ranger Later Feature Catalog Pressure

Status: `ready-for-research`

Units: `ranger_feral_senses`, `ranger_tireless`.

Do not touch `ranger_favored_enemy` or `hunters_mark`; D owns that accounting.
Classify only the listed later features.

### Task 8 - L1I-MONK-BODY-AND-MIND - Monk Body And Mind Catalog Pressure

Status: `ready-for-research`

Unit: `monk_body_and_mind`.

Do not touch `monk_martial_arts`; D owns that scaling. Classify this feature as
later-level, character fact, or future supported profile.

### Task 9 - L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES - Warlock Wizard Knowledge Feature Catalog Pressure

Status: `ready-for-research`

Units: `warlock_contact_patron`, `warlock_fiend_spells`, `wizard_scholar`.

Do not touch `warlock_eldritch_invocations` or `wizard_arcane_recovery`; D owns
those selected identity tasks. Classify the listed features only.

### Task 10 - L1I-SPECIES-TRAIT-PRESSURE-SPLIT - Species Trait Catalog Pressure Split

Status: `ready-for-research`

Units: `elf_darkvision`, `species_dragonborn_breath_weapon`,
`species_dragonborn_damage_resistance`, `species_dragonborn_darkvision`,
`dwarf_darkvision`, `dwarf_dwarven_resilience`,
`species_goliath_powerful_build`, `species_tiefling_darkvision`.

Split these into runtime-supported, character fact, runtime-detached sense, or
future widening follow-up lanes. Do not implement a broad species runtime in
this task.

### Task 11 - L1I-DRUID-NATURES-WARD - Druid Nature's Ward Catalog Pressure

Status: `ready-for-research`

Unit: `druid_natures_ward`.

Read Druid RAW and existing character/runtime owners. Classify Nature's Ward as
a later-level character fact, no promoted Unit profile, or future supported
profile. Do not touch `druid_primal_order`; D owns that selected identity work.
If the land-choice resistance table needs runtime or Surface widening, record
the smallest atomic follow-up rather than broadening this task.
