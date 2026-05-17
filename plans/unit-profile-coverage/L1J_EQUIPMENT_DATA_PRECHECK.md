# L1J Equipment Data Precheck

Task: L1J-PRECHECK.

## Inputs Read

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- Authored Surface equipment records under `packages/surface/content/`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapons as table facts with category, melee/ranged
classification, damage, Weapon Properties, one Mastery Property, weight, and
cost. The same section defines armor and Shield table facts with Armor Category,
Armor Class, Strength, Stealth, weight, cost, and don/doff timing.

Project language keeps Weapon Property, Mastery Property, and Weapon Mastery as
different concepts. L1J owns authored equipment table-data closure and Unit
coverage accounting for armor, weapons, and Shield. It does not own attack
resolution, inventory simulation, armor-wearing workflows, Weapon Mastery
selection containers, selected weapon identity, or selected Mastery Property
execution.

## Decision

L1J owns 51 SRD-provenance authored Surface equipment rows:

- 40 authored armor/weapon rows absent from the installed Unit catalog and
  already classified by the generated report as `non-runtime-authored-data`.
- 11 installed armor/weapon/Shield rows whose existing unsupported Unit claims
  should use the same non-runtime authored-data closure language if the report
  still presents them as unassigned equipment pressure.

All 51 records have SRD 5.2.1 provenance, point at `Equipment#Weapons` or
`Equipment#Armor`, and have no executable mechanics payload.

## Owned Rows By Follow-Up Task

| Task | Rows | Decision |
| --- | --- | --- |
| L1J-LIGHT-MEDIUM-ARMOR-DATA | `armor_breastplate`, `armor_chain_shirt`, `armor_half_plate_armor`, `armor_hide_armor`, `armor_leather`, `armor_padded_armor`, `armor_scale_mail`, `armor_studded_leather_armor` | Close as authored armor data absent from the Unit catalog. |
| L1J-HEAVY-ARMOR-DATA | `armor_plate`, `armor_ring_mail`, `armor_splint_armor` | Close as authored armor data absent from the Unit catalog. |
| L1J-SIMPLE-MELEE-WEAPON-DATA | `weapon_greatclub`, `weapon_handaxe`, `weapon_light_hammer`, `weapon_mace`, `weapon_sickle` | Close as authored weapon data absent from the Unit catalog. |
| L1J-MARTIAL-MELEE-WEAPON-DATA | `weapon_battleaxe`, `weapon_greatsword`, `weapon_maul`, `weapon_morningstar`, `weapon_rapier`, `weapon_scimitar`, `weapon_war_pick`, `weapon_warhammer` | Close as authored weapon data absent from the Unit catalog. |
| L1J-POLEARM-REACH-WEAPON-DATA | `weapon_glaive`, `weapon_halberd`, `weapon_lance`, `weapon_pike`, `weapon_trident`, `weapon_whip` | Close as authored weapon data absent from the Unit catalog. Do not implement Reach or Mastery behavior. |
| L1J-RANGED-WEAPON-DATA | `weapon_blowgun`, `weapon_hand_crossbow`, `weapon_heavy_crossbow`, `weapon_light_crossbow`, `weapon_longbow`, `weapon_sling` | Close as authored weapon data absent from the Unit catalog. |
| L1J-THROWN-FINESSE-WEAPON-DATA | `weapon_dart`, `weapon_javelin` | Close as authored weapon data absent from the Unit catalog. Installed thrown/finesse weapons belong to the installed-row alignment task below. |
| L1J-FIREARM-EXOTIC-WEAPON-DATA | `weapon_musket`, `weapon_pistol` | Close as authored weapon data absent from the Unit catalog. Do not introduce firearm combat behavior. |
| L1J-INSTALLED-EQUIPMENT-ROW-ALIGNMENT | `armor_chain_mail`, `equipment_shield`, `weapon_club`, `weapon_dagger`, `weapon_flail`, `weapon_greataxe`, `weapon_longsword`, `weapon_quarterstaff`, `weapon_shortbow`, `weapon_shortsword`, `weapon_spear` | Align installed unsupported Unit claim wording with non-runtime authored-data closure if still needed. |

## Exclusions

These rows and behaviors are outside L1J:

- Weapon Mastery class-feature containers: `barbarian_weapon_mastery`,
  `fighter_weapon_mastery`, `paladin_weapon_mastery`,
  `ranger_weapon_mastery`, and `rogue_weapon_mastery`.
- Weapon Mastery selected-identity and reselection profiles:
  `character-creation.weapon-mastery-choice` and
  `character-sheet.weapon-mastery-reselection`.
- Selected Mastery Property execution Units: `mastery_cleave`,
  `mastery_sap`, and `mastery_topple`.
- Level-1 class Starting Equipment rows in `srd-unit-inventory.json`; those are
  class-container-owned character-creation facts with owner evidence present.
- Magic item armor, weapon, ammunition, and Shield templates; those remain in
  the future magic item profile intake lane.
- Spells and features that affect Armor Class or weapon attacks, such as
  `mage_armor`, `shield`, `shield_of_faith`, Fighting Style Defense, and
  Unarmored Defense.

## Plan Notes

`weapon_shortbow` is already installed in the Unit catalog with an unsupported
profile claim. It should be handled with the installed-row alignment batch, not
with the absent-catalog ranged-weapon closure batch, unless the plan owner wants
Task 7 to carry a mixed absent/installed row set explicitly.

The phrase "any thrown/finesse rows not closed by Tasks 4-7" should not sweep in
installed rows such as `weapon_dagger` or `weapon_spear`; those belong to the
installed-row alignment batch.

## Reviewer Loop

RAW/ubiquitous-language pass: the rows trace to SRD Equipment weapon and armor
tables, and the artifact uses project terms for Armor Category, Weapon Property,
Mastery Property, Weapon Mastery, Holding/Wielding, and Shield.

Architecture/domain pass: this artifact adds no runtime state and does not
duplicate equipment data into a new executable model. It references row
identities already present in generated coverage artifacts and authored Surface
records.

Connascence pass: row names must change together with authored Surface Unit ids
and generated coverage artifacts. The coupling is localized in the owned-row
table above; later tasks should update the generated report rather than copying
these rows into parallel runtime data.

Code-review pass: no code, schema, generated JSON, or authored Dhall data was
changed by this precheck artifact.
