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
      "status": "done",
      "title": "Monk Body And Mind Catalog Pressure"
    },
    {
      "number": 9,
      "id": "L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES",
      "status": "done",
      "title": "Warlock Wizard Knowledge Feature Catalog Pressure"
    },
    {
      "number": 10,
      "id": "L1I-SPECIES-TRAIT-PRESSURE-SPLIT",
      "status": "done",
      "title": "Species Trait Catalog Pressure Split"
    },
    {
      "number": 11,
      "id": "L1I-DRUID-NATURES-WARD",
      "status": "done",
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
    },
    {
      "number": 16,
      "id": "L1I-SPECIES-CHARACTER-ADMISSION-SLICE",
      "status": "ready-for-research",
      "title": "Non-Orc Species Character Admission Slice"
    },
    {
      "number": 17,
      "id": "L1I-DRAGONBORN-BREATH-WEAPON-PROFILE",
      "status": "blocked",
      "title": "Dragonborn Breath Weapon Feature Profile"
    },
    {
      "number": 18,
      "id": "L1I-SPECIES-PASSIVE-RESISTANCE-PROFILE",
      "status": "blocked",
      "title": "Species Passive Resistance Profile"
    },
    {
      "number": 19,
      "id": "L1I-SPECIES-CONDITION-ROLL-MODE-PROFILES",
      "status": "blocked",
      "title": "Species Condition Roll-Mode Profiles"
    },
    {
      "number": 20,
      "id": "L1I-DRUID-CIRCLE-LAND-SELECTION-SOURCE",
      "status": "blocked",
      "title": "Druid Circle Of The Land Long Rest Land Source Fact"
    },
    {
      "number": 21,
      "id": "L1I-DRUID-NATURES-WARD-PASSIVE-PROFILE",
      "status": "blocked",
      "title": "Druid Nature's Ward Passive Resistance And Condition Immunity Profile"
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
| 8 | L1I-MONK-BODY-AND-MIND - Monk Body And Mind Catalog Pressure | done | 1 | Monk feature disposition without stealing D Martial Arts scaling |
| 9 | L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES - Warlock Wizard Knowledge Feature Catalog Pressure | done | 1 | Warlock/Wizard knowledge-feature disposition without stealing D invocation work |
| 10 | L1I-SPECIES-TRAIT-PRESSURE-SPLIT - Species Trait Catalog Pressure Split | done | 1 | species trait split artifact and unsupported-profile claims for eight species trait records |
| 11 | L1I-DRUID-NATURES-WARD - Druid Nature's Ward Catalog Pressure | done | 1 | Druid later feature disposition without stealing D Primal Order work |
| 12 | L1I-BARD-JACK-OF-ALL-TRADES-PROFILE - Bard Jack Of All Trades Ability Check Profile | ready-for-research | 4 | decide the smallest skill-proficiency-aware Ability Check half-Proficiency Bonus profile boundary |
| 13 | L1I-WORDS-OF-CREATION-POWER-WORD-RIDER - Words Of Creation Power Word Rider Profile | blocked | supported `power_word_heal` and `power_word_kill` spell invocation profiles | second-target rider support after host Power Word spells are promoted |
| 14 | L1I-BARBARIAN-DANGER-SENSE-ROLL-MODE - Barbarian Danger Sense Saving Throw Roll-Mode Profile | ready-for-research | 5 | decide the smallest passive Dexterity Saving Throw Advantage profile boundary |
| 15 | L1I-PALADIN-SMITE-FREE-CAST-PROFILE - Paladin's Smite Free-Cast Spell Access Profile | blocked | owner decision to expand Paladin battle support past level 1 | future Spell Access and class-feature free-cast support that reuses `divine_smite` |
| 16 | L1I-SPECIES-CHARACTER-ADMISSION-SLICE - Non-Orc Species Character Admission Slice | ready-for-research | 10 | smallest character-creation admission slice for Elf, Dragonborn, Dwarf, Goliath, and Tiefling species before runtime relies on their trait refs |
| 17 | L1I-DRAGONBORN-BREATH-WEAPON-PROFILE - Dragonborn Breath Weapon Feature Profile | blocked | 16 | future species attack-replacement profile that reuses one Draconic Ancestry source fact for Breath Weapon and Damage Resistance |
| 18 | L1I-SPECIES-PASSIVE-RESISTANCE-PROFILE - Species Passive Resistance Profile | blocked | 16 | future target-side passive Resistance profile for character-derived species traits without duplicating Stat Block or active-effect resistance state |
| 19 | L1I-SPECIES-CONDITION-ROLL-MODE-PROFILES - Species Condition Roll-Mode Profiles | blocked | 14, 16 | future condition-scoped Ability Check and Saving Throw roll-mode support for Powerful Build and Dwarven Resilience |
| 20 | L1I-DRUID-CIRCLE-LAND-SELECTION-SOURCE - Druid Circle Of The Land Long Rest Land Source Fact | blocked | owner decision to expand Druid Circle of the Land subclass/later-level support | one Long Rest land-choice source fact shared by Circle Spells, Nature's Ward, and Nature's Sanctuary |
| 21 | L1I-DRUID-NATURES-WARD-PASSIVE-PROFILE - Druid Nature's Ward Passive Resistance And Condition Immunity Profile | blocked | 18, 20 | future Nature's Ward passive target-side profile that reads the selected land source fact without duplicating Resistance state |

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

Status: `done`

Unit: `monk_body_and_mind`.

Do not touch `monk_martial_arts`; D owns that scaling. Classify this feature as
later-level, character fact, or future supported profile.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_MONK_BODY_AND_MIND_CLOSURE.md`.
`monk_body_and_mind` is closed as an explicit `unsupported-profile` claim. Body
and Mind is a level-20 durable Character Sheet ability-score projection:
Dexterity and Wisdom each increase by 4, capped at 25. It is not a standalone
promoted battle Unit profile, and the task does not touch D-owned
`monk_martial_arts` scaling.

### Task 9 - L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES - Warlock Wizard Knowledge Feature Catalog Pressure

Status: `done`

Units: `warlock_contact_patron`, `warlock_fiend_spells`, `wizard_scholar`.

Do not touch `warlock_eldritch_invocations` or `wizard_arcane_recovery`; D owns
those selected identity tasks. Classify the listed features only.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_WARLOCK_WIZARD_KNOWLEDGE_FEATURES_CLOSURE.md`.
The three Warlock/Wizard knowledge-feature records are closed as explicit
`unsupported-profile` claims. `warlock_contact_patron` is a level-9 Spell
Access and once-per-Long-Rest Contact Other Plane no-slot cast whose
feature-scoped automatic Intelligence Saving Throw success needs a future
feature-scoped spell-invocation override owner. `warlock_fiend_spells` is a
level-3 subclass Spell Access progression whose authored record currently
carries only the level-3 grants, not the level-5, level-7, and level-9
threshold rows. `wizard_scholar` is a level-2 build-time Expertise choice
constrained to six skills in which the Wizard already has proficiency; future
support should reuse the existing owned-skill Expertise path with that
constrained filter rather than create a Wizard-only proficiency adapter.

### Task 10 - L1I-SPECIES-TRAIT-PRESSURE-SPLIT - Species Trait Catalog Pressure Split

Status: `done`

Units: `elf_darkvision`, `species_dragonborn_breath_weapon`,
`species_dragonborn_damage_resistance`, `species_dragonborn_darkvision`,
`dwarf_darkvision`, `dwarf_dwarven_resilience`,
`species_goliath_powerful_build`, `species_tiefling_darkvision`.

Split these into runtime-supported, character fact, runtime-detached sense, or
future widening follow-up lanes. Do not implement a broad species runtime in
this task.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_SPECIES_TRAIT_PRESSURE_SPLIT.md`.
All eight species-trait records are closed with `unsupported-profile` claims.
The four Darkvision Units are runtime-detached sense facts. Dragonborn Breath
Weapon remains a future attack-replacement feature profile. Dragonborn Damage
Resistance and Dwarven Resilience preserve future passive target-side
Resistance ownership without reusing generic active-effect resistance as a
species profile. Powerful Build splits into durable carrying-capacity character
projection plus future Grappled escape roll-mode support. Follow-up Tasks 16-19
preserve the executable lanes without adding a broad species runtime here.

### Task 11 - L1I-DRUID-NATURES-WARD - Druid Nature's Ward Catalog Pressure

Status: `done`

Unit: `druid_natures_ward`.

Read Druid RAW and existing character/runtime owners. Classify Nature's Ward as
a later-level character fact, no promoted Unit profile, or future supported
profile. Do not touch `druid_primal_order`; D owns that selected identity work.
If the land-choice resistance table needs runtime or Surface widening, record
the smallest atomic follow-up rather than broadening this task.

Result:
`plans/unit-profile-coverage/L1I_CLASS_SPECIES_DRUID_NATURES_WARD_CLOSURE.md`.
Nature's Ward is closed with an `unsupported-profile` claim. The feature is a
level-10 Circle of the Land subclass feature that grants Poisoned condition
immunity plus Resistance derived from the Circle Spells land choice. No
standalone Unit profile is promoted until one Circle of the Land land-choice
source fact and a passive target-side Resistance/condition-immunity projection
exist. Follow-up Tasks 20-21 preserve that executable lane without touching
D-owned `druid_primal_order`.

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

### Task 16 - L1I-SPECIES-CHARACTER-ADMISSION-SLICE - Non-Orc Species Character Admission Slice

Status: `ready-for-research`

Follow-up from Task 10. Decide and implement the smallest character-creation
admission slice that can retain Elf, Dragonborn, Dwarf, Goliath, and Tiefling
species source facts and trait Unit refs in finalized CharacterBuilds. Keep
provenance on the authored SRD Surface records, avoid duplicating derived
combat projections, and do not add promoted battle behavior in this slice.

### Task 17 - L1I-DRAGONBORN-BREATH-WEAPON-PROFILE - Dragonborn Breath Weapon Feature Profile

Status: `blocked`

Blocked on Task 16 so non-Orc species traits can reach character-derived
creature facts. Model Breath Weapon only after one Draconic Ancestry source fact
can supply both Breath Weapon damage type and Dragonborn Damage Resistance.
The profile must compose Attack-action attack replacement, Cone/Line area
membership, Dexterity Saving Throw half damage, character-level dice scaling,
and Proficiency Bonus Long Rest resource tracking without installing a broad
species runtime.

### Task 18 - L1I-SPECIES-PASSIVE-RESISTANCE-PROFILE - Species Passive Resistance Profile

Status: `blocked`

Blocked on Task 16 so character-derived species traits can reach target-side
damage projection. Decide the smallest passive Resistance profile for
`species_dragonborn_damage_resistance` and the Poison Resistance half of
`dwarf_dwarven_resilience`. Do not duplicate Stat Block resistances, active
spell effects, or active feature state. Keep the target-side boundary reusable
for later character-derived class-feature Resistance such as Nature's Ward
without adding Druid state here. Dragonborn resistance must reuse the same
Draconic Ancestry source fact as Task 17, and Dwarven Resilience's saving throw
Advantage remains owned by Task 19.

### Task 19 - L1I-SPECIES-CONDITION-ROLL-MODE-PROFILES - Species Condition Roll-Mode Profiles

Status: `blocked`

Blocked on Tasks 14 and 16 so the roll-mode owner and non-Orc species admission
surface are available first. Decide the condition-scoped roll-mode profile
family for `dwarf_dwarven_resilience` saving throw Advantage to avoid or end
Poisoned and `species_goliath_powerful_build` Ability Check Advantage to end
Grappled. Reuse the generic roll-mode boundary from Danger Sense if it lands;
do not create species-specific roll-mode adapters.

### Task 20 - L1I-DRUID-CIRCLE-LAND-SELECTION-SOURCE - Druid Circle Of The Land Long Rest Land Source Fact

Status: `blocked`

Blocked on an explicit owner decision to expand Druid Circle of the Land
subclass/later-level support beyond this level-1 creation slice. When
unblocked, model the Long Rest arid, polar, temperate, or tropical land choice
as one character-owned source fact shared by Circle Spells, Nature's Ward, and
Nature's Sanctuary. Do not store separate derived spell-list, Resistance, or
Sanctuary state per feature, and do not reuse D-owned `druid_primal_order`
selected-identity work.

### Task 21 - L1I-DRUID-NATURES-WARD-PASSIVE-PROFILE - Druid Nature's Ward Passive Resistance And Condition Immunity Profile

Status: `blocked`

Blocked on Task 20's Circle of the Land selected-land source fact and Task 18's
target-side passive Resistance boundary. Once both are available, promote
Nature's Ward as one passive class-feature profile that projects Poisoned
condition immunity and the Nature's Ward table's derived Resistance together.
Do not admit only the condition-immunity half, do not widen `DamageTypeRef`
with a Druid-only adapter, and do not duplicate Stat Block, active-effect, or
Character Sheet Resistance state.
