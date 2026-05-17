# L1I Class Species Catalog Pressure Precheck

Task 1 refreshed the class-feature and species-trait catalog-pressure boundary
for Loop I. No runtime behavior, rule model, Unit claim, or generated coverage
artifact changed.

## Source Artifacts

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `UBIQUITOUS_LANGUAGE.md`
- the Surface content records named below

## Decision

`UNIT_REPORT.md` reports 37 authored SRD Surface records with
`unsupported-widening-pressure`: 29 `class_feature` records and 8
`species_trait` records. `unit-claims.jsonl` has no claim rows for these 37
Unit ids, so none is already closed by a supported, subset-supported, or
unsupported profile claim. `srd-unit-inventory.json` still reports zero missing
level-1 class containers and 100% accepted level-1 battle-readiness rows, so
this loop should stay focused on authored catalog-pressure triage rather than
reopening level-1 container accounting.

Assign the loop-owned records below. Do not assign any D-owned Unit to Loop I.
No companion, familiar, steed, or summoned-helper record appears in the assigned
class/species pressure list.

## Loop-Owned Assignments

### Task 2 - L1I-ABILITY-SCORE-IMPROVEMENT

- `barbarian_ability_score_improvement_l4` -
  `packages/surface/content/barbarian_ability_score_improvement_l4.json`
- `bard_ability_score_improvement_l4` -
  `packages/surface/content/bard_ability_score_improvement_l4.json`
- `cleric_ability_score_improvement_l4` -
  `packages/surface/content/cleric_ability_score_improvement_l4.json`
- `druid_ability_score_improvement_l4` -
  `packages/surface/content/druid_ability_score_improvement_l4.json`
- `monk_ability_score_improvement_l4` -
  `packages/surface/content/monk_ability_score_improvement_l4.json`
- `ranger_ability_score_improvement_l4` -
  `packages/surface/content/ranger_ability_score_improvement_l4.json`
- `rogue_ability_score_improvement_l4` -
  `packages/surface/content/rogue_ability_score_improvement_l4.json`
- `sorcerer_ability_score_improvement_l4` -
  `packages/surface/content/sorcerer_ability_score_improvement_l4.json`
- `wizard_ability_score_improvement_l4` -
  `packages/surface/content/wizard_ability_score_improvement_l4.json`

### Task 3 - L1I-EPIC-BOON-CONTAINERS

- `bard_epic_boon` - `packages/surface/content/bard_epic_boon.json`
- `cleric_epic_boon` - `packages/surface/content/cleric_epic_boon.json`
- `druid_epic_boon` - `packages/surface/content/druid_epic_boon.json`
- `fighter_epic_boon` - `packages/surface/content/fighter_epic_boon.json`
- `monk_epic_boon` - `packages/surface/content/monk_epic_boon.json`
- `paladin_epic_boon` - `packages/surface/content/paladin_epic_boon.json`

### Task 4 - L1I-BARD-KNOWLEDGE-FEATURES

- `bard_bonus_proficiencies` -
  `packages/surface/content/bard_bonus_proficiencies.json`
- `bard_jack_of_all_trades` -
  `packages/surface/content/bard_jack_of_all_trades.json`
- `bard_words_of_creation` -
  `packages/surface/content/bard_words_of_creation.json`

### Task 5 - L1I-BARBARIAN-LATER-FEATURES

- `barbarian_danger_sense` -
  `packages/surface/content/barbarian_danger_sense.json`
- `barbarian_primal_champion` -
  `packages/surface/content/barbarian_primal_champion.json`

### Task 6 - L1I-PALADIN-SMITE-STYLE-SURFACE

- `paladin_fighting_style` -
  `packages/surface/content/paladin_fighting_style.json`
- `paladin_paladins_smite` -
  `packages/surface/content/paladin_paladins_smite.json`

### Task 7 - L1I-RANGER-LATER-FEATURES

- `ranger_feral_senses` -
  `packages/surface/content/ranger_feral_senses.json`
- `ranger_tireless` - `packages/surface/content/ranger_tireless.json`

### Task 8 - L1I-MONK-BODY-AND-MIND

- `monk_body_and_mind` -
  `packages/surface/content/monk_body_and_mind.json`

### Task 9 - L1I-WARLOCK-WIZARD-KNOWLEDGE-FEATURES

- `warlock_contact_patron` -
  `packages/surface/content/warlock_contact_patron.json`
- `warlock_fiend_spells` -
  `packages/surface/content/warlock_fiend_spells.json`
- `wizard_scholar` - `packages/surface/content/wizard_scholar.json`

### Task 10 - L1I-SPECIES-TRAIT-PRESSURE-SPLIT

- `elf_darkvision` - `packages/surface/content/darkvision_elf.json`
- `species_dragonborn_breath_weapon` -
  `packages/surface/content/species_dragonborn_breath_weapon.json`
- `species_dragonborn_damage_resistance` -
  `packages/surface/content/species_dragonborn_damage_resistance.json`
- `species_dragonborn_darkvision` -
  `packages/surface/content/species_dragonborn_darkvision.json`
- `dwarf_darkvision` -
  `packages/surface/content/species_dwarf_darkvision.json`
- `dwarf_dwarven_resilience` -
  `packages/surface/content/species_dwarf_dwarven_resilience.json`
- `species_goliath_powerful_build` -
  `packages/surface/content/species_goliath_powerful_build.json`
- `species_tiefling_darkvision` -
  `packages/surface/content/species_tiefling_darkvision.json`

### Task 11 - L1I-DRUID-NATURES-WARD

- `druid_natures_ward` -
  `packages/surface/content/druid_natures_ward.json`

`druid_natures_ward` is non-D class-feature catalog pressure from the same
generated report slice, but it was not named by the original Tasks 2-10. Assign
it to the Druid later-feature task before implementation work.

## Explicit D-Owned Exclusions

The plan-level D-owned exclusions remain out of Loop I:

- class and class-feature Units:
  `wizard_arcane_recovery`, `fighter_fighting_style`, `cleric_divine_order`,
  `druid_primal_order`, `rogue_expertise`, `warlock_eldritch_invocations`,
  `ranger_favored_enemy`, `bard_bardic_inspiration`, and
  `monk_martial_arts`
- Weapon Mastery Units:
  `barbarian_weapon_mastery`, `fighter_weapon_mastery`,
  `paladin_weapon_mastery`, `ranger_weapon_mastery`, and
  `rogue_weapon_mastery`
- spell Units:
  `hunters_mark`, `charm_person`, `disguise_self`, `druidcraft`,
  `elementalism`, `illusory_script`, `message`, `prestidigitation`,
  `thaumaturgy`, and `unseen_servant`

None of those D-owned ids appears in the 37 loop-owned
`unsupported-widening-pressure` class/species rows read from `UNIT_REPORT.md`.
The D-owned ids with `unit-claims.jsonl` rows already have supported or
subset-supported profile claims owned outside this loop.

## Companion And Familiar Exclusion

Companion/familiar work remains excluded. The assigned class/species Surface
records above do not contain familiar, companion, steed, or summoned-helper
content. Spell-side helper pressure such as `find_familiar`, `find_steed`,
`summon_dragon`, and `unseen_servant` is not part of this class/species catalog
pressure loop.

## RAW And Vocabulary Check

No new D&D rule behavior was modeled. The Surface records read above already
carry SRD 5.2.1 provenance sections, and future implementation tasks must read
those local SRD sections before making profile, runtime, or closure decisions.
The vocabulary check used `UBIQUITOUS_LANGUAGE.md` terms for Unit, class
feature, species trait, Spell Access, companion, familiar, and runtime
ownership boundaries.

## Review Notes

- Round 1: source refresh found 37 class/species pressure rows, not the 36 rows
  currently covered by the original Tasks 2-10; `druid_natures_ward` needed a
  plan row.
- Round 2: D-owned exclusions and companion/familiar exclusions remain clean;
  no assigned Unit is D-owned or helper-companion work.
