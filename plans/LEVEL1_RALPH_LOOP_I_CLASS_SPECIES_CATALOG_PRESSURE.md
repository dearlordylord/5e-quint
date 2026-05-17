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
      "status": "done",
      "title": "Bard Knowledge Feature Catalog Pressure"
    },
    {
      "number": 5,
      "id": "L1I-BARBARIAN-LATER-FEATURES",
      "status": "done",
      "title": "Barbarian Later Feature Catalog Pressure"
    },
    {
      "number": 6,
      "id": "L1I-PALADIN-SMITE-STYLE-SURFACE",
      "status": "done",
      "title": "Paladin Smite And Fighting Style Surface Pressure"
    },
    {
      "number": 7,
      "id": "L1I-RANGER-LATER-FEATURES",
      "status": "done",
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
    },
    {
      "number": 12,
      "id": "L1I-BARD-JACK-OF-ALL-TRADES-PROFILE",
      "status": "ready-for-research",
      "title": "Bard Jack Of All Trades Ability Check Profile"
    },
    {
      "number": 13,
      "id": "L1I-WORDS-OF-CREATION-POWER-WORD-RIDER",
      "status": "blocked",
      "title": "Words Of Creation Power Word Rider Profile"
    },
    {
      "number": 14,
      "id": "L1I-BARBARIAN-DANGER-SENSE-ROLL-MODE",
      "status": "ready-for-research",
      "title": "Barbarian Danger Sense Saving Throw Roll-Mode Profile"
    },
    {
      "number": 15,
      "id": "L1I-PALADIN-SMITE-FREE-CAST-PROFILE",
      "status": "blocked",
      "title": "Paladin's Smite Free-Cast Spell Access Profile"
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
| 4 | L1I-BARD-KNOWLEDGE-FEATURES - Bard Knowledge Feature Catalog Pressure | done | 1 | closure artifact and unsupported-profile claims for Bard knowledge-feature records |
| 5 | L1I-BARBARIAN-LATER-FEATURES - Barbarian Later Feature Catalog Pressure | done | 1 | closure artifact and unsupported-profile claims for Barbarian later-feature records |
| 6 | L1I-PALADIN-SMITE-STYLE-SURFACE - Paladin Smite And Fighting Style Surface Pressure | done | 1 | closure artifact and unsupported-profile claims for Paladin Fighting Style and Paladin's Smite |
| 7 | L1I-RANGER-LATER-FEATURES - Ranger Later Feature Catalog Pressure | done | 1 | Ranger feature disposition without stealing D Favored Enemy work |
| 8 | L1I-MONK-BODY-AND-MIND - Monk Body And Mind Catalog Pressure | ready-for-research | 1 | Monk feature disposition without stealing D Martial Arts scaling |
| 9 | L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES - Warlock Wizard Knowledge Feature Catalog Pressure | ready-for-research | 1 | Warlock/Wizard knowledge-feature disposition without stealing D invocation work |
| 10 | L1I-SPECIES-TRAIT-PRESSURE-SPLIT - Species Trait Catalog Pressure Split | ready-for-research | 1 | split species traits into runtime-supported, runtime-detached, later-level, or follow-up lanes |
| 11 | L1I-DRUID-NATURES-WARD - Druid Nature's Ward Catalog Pressure | ready-for-research | 1 | Druid later feature disposition without stealing D Primal Order work |
| 12 | L1I-BARD-JACK-OF-ALL-TRADES-PROFILE - Bard Jack Of All Trades Ability Check Profile | ready-for-research | 4 | decide the smallest skill-proficiency-aware Ability Check half-Proficiency Bonus profile boundary |
| 13 | L1I-WORDS-OF-CREATION-POWER-WORD-RIDER - Words Of Creation Power Word Rider Profile | blocked | supported `power_word_heal` and `power_word_kill` spell invocation profiles | second-target rider support after host Power Word spells are promoted |
| 14 | L1I-BARBARIAN-DANGER-SENSE-ROLL-MODE - Barbarian Danger Sense Saving Throw Roll-Mode Profile | ready-for-research | 5 | decide the smallest passive Dexterity Saving Throw Advantage profile boundary |
| 15 | L1I-PALADIN-SMITE-FREE-CAST-PROFILE - Paladin's Smite Free-Cast Spell Access Profile | blocked | owner decision to expand Paladin battle support past level 1 | future Spell Access and class-feature free-cast support that reuses `divine_smite` |

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

Status: `done`

Units: `bard_bonus_proficiencies`, `bard_jack_of_all_trades`,
`bard_words_of_creation`.

Read Bard RAW and existing character/runtime owners. Close table/character facts
explicitly or create the smallest follow-up supported-profile task.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_BARD_KNOWLEDGE_FEATURES_CLOSURE.md`.
The three Bard knowledge-feature records are closed as explicit
`unsupported-profile` claims. `bard_bonus_proficiencies` is a College of Lore
subclass skill-proficiency choice owned by character creation/subclass
progression rather than a standalone promoted battle Unit profile.
`bard_jack_of_all_trades` and `bard_words_of_creation` remain visible as
future executable follow-ups in Tasks 12 and 13.

### Task 5 - L1I-BARBARIAN-LATER-FEATURES - Barbarian Later Feature Catalog Pressure

Status: `done`

Units: `barbarian_danger_sense`, `barbarian_primal_champion`.

Keep this later-level and non-D. If a runtime profile is appropriate, record a
new atomic follow-up rather than broadening this task.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_BARBARIAN_LATER_FEATURES_CLOSURE.md`.
The two Barbarian later-feature records are closed as explicit
`unsupported-profile` claims. `barbarian_danger_sense` remains visible as a
future executable follow-up in Task 14 because it is passive Dexterity Saving
Throw Advantage suppressed by Incapacitated. `barbarian_primal_champion` is a
level-20 durable Character Sheet Ability Score projection, not a standalone
promoted battle Unit profile.

### Task 6 - L1I-PALADIN-SMITE-STYLE-SURFACE - Paladin Smite And Fighting Style Surface Pressure

Status: `done`

Units: `paladin_fighting_style`, `paladin_paladins_smite`.

Do not duplicate D's Weapon Mastery or selected spell identity work. Decide
whether these are selection/grant containers, character facts, or need future
profile support.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_PALADIN_SMITE_STYLE_CLOSURE.md`.
Both Paladin level-2 records are closed as explicit `unsupported-profile`
claims. `paladin_fighting_style` is a selection-grant container: selected
Fighting Style feat Units own executable feat behavior, while Blessed Warrior
cantrip access and replacement belong to future Character Sheet Spell Access
and advancement owners. `paladin_paladins_smite` is Spell Access plus a
once-per-Long-Rest Divine Smite free-cast grant; `divine_smite` already owns
the supported after-hit damage invocation, and any future all-level Paladin
free-cast owner must reuse that spell procedure rather than duplicate selected
spell identity or D-owned Weapon Mastery work. Task 15 keeps that future
runtime work visible and blocked on the owner decision to expand Paladin battle
support past level 1.

### Task 7 - L1I-RANGER-LATER-FEATURES - Ranger Later Feature Catalog Pressure

Status: `done`

Units: `ranger_feral_senses`, `ranger_tireless`.

Do not touch `ranger_favored_enemy` or `hunters_mark`; D owns that accounting.
Classify only the listed later features.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_RANGER_LATER_FEATURES_CLOSURE.md`.
Both Ranger later-feature records are closed as explicit
`unsupported-profile` claims. `ranger_feral_senses` is a level-18 Blindsight
sense grant that belongs to a future sight/sense projection owner rather than a
standalone Ranger-only battle Unit profile. `ranger_tireless` is a level-10
two-part feature combining a Magic action Wisdom-derived Temporary Hit Points
resource with Short Rest Exhaustion reduction, so the partial authored action
shape is not claimed as a promoted battle Unit profile.

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

### Task 12 - L1I-BARD-JACK-OF-ALL-TRADES-PROFILE - Bard Jack Of All Trades Ability Check Profile

Status: `ready-for-research`

Unit: `bard_jack_of_all_trades`.

Follow-up from Task 4. Decide the smallest supported-profile owner for Jack of
All Trades' skill-proficiency-aware Ability Check half-Proficiency Bonus. The
profile must model the RAW gate that the Ability Check uses a skill proficiency
the Bard lacks and does not otherwise use Proficiency Bonus; do not admit the
existing generic `modify_roll_numeric` surface shape as a supported profile
until that gate is executable at the owning boundary.

### Task 13 - L1I-WORDS-OF-CREATION-POWER-WORD-RIDER - Words Of Creation Power Word Rider Profile

Status: `blocked`

Unit: `bard_words_of_creation`.

Blocked on supported spell invocation profiles for `power_word_heal` and
`power_word_kill`. Once those host spells are promoted, model Words of
Creation's second-target rider as spell-casting behavior attached to those
invocations. Do not duplicate the level-20 always-prepared spell access grant
as Bard feature runtime state.

### Task 14 - L1I-BARBARIAN-DANGER-SENSE-ROLL-MODE - Barbarian Danger Sense Saving Throw Roll-Mode Profile

Status: `ready-for-research`

Unit: `barbarian_danger_sense`.

Follow-up from Task 5. Decide the smallest supported-profile owner for Danger
Sense's passive Dexterity Saving Throw Advantage, including the RAW gate that
the Barbarian must not have the Incapacitated condition. Do not admit the
existing generic `modify_roll_advantage` surface shape as a supported profile
until the Saving Throw ability filter and condition suppression gate are
executable at the owning boundary.

### Task 15 - L1I-PALADIN-SMITE-FREE-CAST-PROFILE - Paladin's Smite Free-Cast Spell Access Profile

Status: `blocked`

Unit: `paladin_paladins_smite`.

Follow-up from Task 6. Blocked on an explicit owner decision to expand Paladin
battle support past level 1. If unblocked, decide the smallest supported
profile owner for Paladin's Smite Spell Access and its one-use Long Rest
class-feature free-cast resource. The owner must retain `paladin_paladins_smite`
as the source Unit and reuse the existing `divine_smite` after-hit spell
invocation procedure instead of duplicating selected spell identity or D-owned
Weapon Mastery work.
