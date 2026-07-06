# L6 Progression Delta Audit

Task: `L6FULL-CLOSE-01-LEVEL6-CLASS-TABLES`

## Scope

This audit compares local SRD 5.2.1 class-table facts at class level 5 and
class level 6 for all 12 SRD classes. It records the owner boundary for the
level-6 table row itself and for each executable progression fact exposed by
the table columns.

This is accounting only. The class-table summary rows remain non-runtime source
and navigation rows. They do not get support profiles, owner-evidence rows, or
runtime state. Executable consequences stay with narrower class container,
feature grant, spell-access, Spell Slot, Pact Slot, mastery, resource, or
character-sheet owners.

Source facts are local SRD provenance from `.references/srd-5.2.1/Classes/`.
Generated coverage reports and owner-evidence files are structured input for
ownership mapping only. Runtime projections remain owned by Character Creation,
Character Sheet, character-battle handoff, battle runtime, or future durable
owners named by the level-6 feature rows.

## Generated Closure State

The generated inventory already classifies every level-6 class-table row as:

- `rowKind`: `class-table-summary`
- `characterCreationOwnership.state`: `non-runtime-table-summary`
- `characterCreationOwnership.owner`: `not-applicable`
- `finalDisposition`: `non-runtime`
- `candidateUnitId`: the installed class container Unit

The checker-owned evidence boundary is:

> The feature table summarizes level progression; narrower class trait,
> feature, spell-access, mastery, and equipment rows own executable evidence.

This audit preserves that closure for the twelve level-6 table rows. It must
not be replaced by runtime support evidence for the class container Unit.

## Owner Map

| Progression fact | Existing owner decision |
| --- | --- |
| Proficiency Bonus stays `+3` for all classes | No level-6 delta. Proficiency Bonus remains owned by `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` in `plans/rules-kernel-coverage/REPORT.md:128`; do not store it again on table rows. |
| Full-caster cantrip totals, prepared-spell totals, and ordinary Spell Slot totals | Character Creation class spellcasting support profiles and Character Sheet owners `SHEET.SPELL_SLOTS.TABLE_DERIVATION`, `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`, and `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` in `plans/rules-kernel-coverage/REPORT.md:140-145`. |
| Paladin and Ranger prepared-spell totals and level-1/level-2 Spell Slot totals | Same Character Creation spellcasting and Character Sheet Spell Slot owners. Level 6 does not create spell-level-3 pressure for these half-caster tables. |
| Warlock prepared-spell total, Pact Slot count, and Pact Slot level | `warlock_pact_magic` owns Pact Magic advancement in `plans/unit-profile-coverage/unit-claims.jsonl` and `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` in `plans/rules-kernel-coverage/REPORT.md:112`. |
| Warlock Eldritch Invocation count | No level-6 delta. `warlock_eldritch_invocations` remains the invocation choice/progression owner through `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` in `plans/rules-kernel-coverage/REPORT.md:113`. |
| Weapon Mastery counts and reselection | No level-6 delta. Weapon Mastery remains owned by `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION`, `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT`, `SHEET.WEAPON_MASTERY.RESELECTION`, and `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION` in `plans/rules-kernel-coverage/REPORT.md:120-143`. |
| Feature resource caps and use-state transitions | Character Creation and Character Sheet owners `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` and `SHEET.FEATURE_RESOURCES.TRANSITIONS` in `plans/rules-kernel-coverage/REPORT.md:124-127`. Specific supported resource owners include Bardic Inspiration, Cleric Channel Divinity, Druid Wild Shape, Paladin Channel Divinity, Sorcerer Font of Magic, and Warlock Pact Magic claims/evidence. |
| Ranger Roving | Already supported by the `ranger_roving` feature row and battle-runtime evidence in `plans/unit-profile-coverage/unit-claims.jsonl` and `plans/unit-profile-coverage/unit-evidence.jsonl`; the Ranger table row must not duplicate it. |
| Rogue Expertise repeated grant | Already supported by the `rogue_expertise` feature row and character-creation evidence in `plans/unit-profile-coverage/unit-claims.jsonl` and `plans/unit-profile-coverage/unit-evidence.jsonl`; the Rogue table row must not duplicate it. |
| Future or unresolved level-6 feature grants | The individual feature rows own those decisions: Fighter Ability Score Improvement was closed by Task 16 as a not-installed repeated ASI grant occurrence; Barbarian Mindless Rage was closed by Task 17 as a not-installed active Rage condition-immunity and enter-rage cleanup owner boundary; Bard Magical Discoveries was closed by Task 18 as a not-installed future-owner-before-SDK spell-access selection boundary; Cleric Blessed Healer was closed by Task 19 as a not-installed future-owner-before-SDK spell healing rider boundary; Druid Natural Recovery, Monk Empowered Strikes/Wholeness of Body, Paladin Aura of Protection, Sorcerer Elemental Affinity, Warlock Dark One's Own Luck, and Wizard Sculpt Spells were closed by Tasks 20-26 as not-installed future-owner-before-SDK boundaries. Table rows stay closed while those narrower future owners remain outside this L6 full accounting pass. |

## Class Table Deltas

| Class | Source rows | Level-5 -> level-6 table deltas | Owner decision |
| --- | --- | --- | --- |
| Barbarian | `.references/srd-5.2.1/Classes/Barbarian.md:39-40` | New level-6 feature grant: Subclass feature. Rages `3 -> 4`. Proficiency Bonus, Rage Damage, and Weapon Mastery stay unchanged. | Task 17 closes `barbarian_mindless_rage` as a not-installed future active Rage condition-immunity and enter-rage cleanup owner boundary. Rage use-count scaling belongs to the generic class-feature resource projection owner, while `barbarian_rage` owns battle activation; neither belongs to the table row. |
| Bard | `.references/srd-5.2.1/Classes/Bard.md:40-41` | New level-6 feature grant: Subclass feature. Prepared Spells `9 -> 10`; level-3 Spell Slots `2 -> 3`. Proficiency Bonus, Bardic Die, Cantrips, and level-1/level-2 slots stay unchanged. | Task 18 closes `bard_magical_discoveries` as a not-installed future-owner-before-SDK Magical Discoveries spell-access selection boundary. Class-table Spell Access and Spell Slot counts stay with the generic class spellcasting owners; selected Magical Discoveries Spell Definition invocation remains owned by spell profiles. |
| Cleric | `.references/srd-5.2.1/Classes/Cleric.md:39-40` | New level-6 feature grant: Subclass feature. Channel Divinity `2 -> 3`; Prepared Spells `9 -> 10`; level-3 Spell Slots `2 -> 3`. Proficiency Bonus, Cantrips, and level-1/level-2 slots stay unchanged. | Task 19 closes `cleric_blessed_healer` as a not-installed future-owner-before-SDK spell healing rider boundary. Channel Divinity scaling is the existing Channel Divinity resource owner; Spell Access and slots are generic. |
| Druid | `.references/srd-5.2.1/Classes/Druid.md:36-37` | New level-6 feature grant: Subclass feature. Wild Shape `2 -> 3`; Prepared Spells `9 -> 10`; level-3 Spell Slots `2 -> 3`. Proficiency Bonus, Cantrips, and level-1/level-2 slots stay unchanged. | Subclass feature is the `druid_natural_recovery` row owned by Task 20. Wild Shape scaling is the existing Wild Shape resource owner; Spell Access and slots are generic. |
| Fighter | `.references/srd-5.2.1/Classes/Fighter.md:35-36` | New level-6 feature grant: Ability Score Improvement. Proficiency Bonus, Second Wind, and Weapon Mastery stay unchanged. | Task 16 closes `fighter_ability_score_improvement_l6` as a not-installed repeated ASI grant occurrence until a catalog-backed repeated-grant model can admit the second ASI without duplicating the level-4 ASI rule text or installing incomplete Fighter 6 progression. Table row stays non-runtime. |
| Monk | `.references/srd-5.2.1/Classes/Monk.md:36-37` | New level-6 feature grants: Empowered Strikes and Subclass feature. Focus Points `5 -> 6`; Unarmored Movement `+10 ft. -> +15 ft.`. Proficiency Bonus and Martial Arts die stay unchanged. | Empowered Strikes and Wholeness of Body are narrower rows owned by Tasks 21-22. Focus Points belong to the Focus/resource owner; Unarmored Movement scaling belongs to `monk_unarmored_movement`. |
| Paladin | `.references/srd-5.2.1/Classes/Paladin.md:39-40` | New level-6 feature grant: Aura of Protection. Proficiency Bonus, Channel Divinity, Prepared Spells, and level-1/level-2 slots stay unchanged. | Task 23 closes `paladin_aura_of_protection` as a not-installed future-owner-before-SDK passive aura and Saving Throw modifier boundary. Existing Paladin level/Charisma facts, Incapacitated condition state, and save procedure owners stay canonical; future support must consume table/spatial aura-membership witnesses without duplicating aura, position, ability, condition, or Saving Throw state. Table row stays non-runtime. |
| Ranger | `.references/srd-5.2.1/Classes/Ranger.md:39-40` | New level-6 feature grant: Roving. Proficiency Bonus, Favored Enemy, Prepared Spells, and level-1/level-2 slots stay unchanged. | `ranger_roving` already owns supported runtime evidence. Favored Enemy and spell facts stay with their existing owners. |
| Rogue | `.references/srd-5.2.1/Classes/Rogue.md:40-41` | New level-6 repeated feature grant: Expertise. Proficiency Bonus and Sneak Attack stay unchanged. | `rogue_expertise` already owns the level-6 character-creation grant from the single authored feature record. Sneak Attack scaling has no level-6 delta. |
| Sorcerer | `.references/srd-5.2.1/Classes/Sorcerer.md:39-40` | New level-6 feature grant: Subclass feature. Sorcery Points `5 -> 6`; Prepared Spells `9 -> 10`; level-3 Spell Slots `2 -> 3`. Proficiency Bonus, Cantrips, and level-1/level-2 slots stay unchanged. | Task 24 closes `sorcerer_elemental_affinity` as a not-installed future-owner-before-SDK selected damage-affinity boundary. Existing Font of Magic/Sorcery Point, Spell Access, Spell Slot, spell damage, character ability, and damage adjustment owners stay canonical; future support must consume one selected damage-type source fact for both passive Resistance and one-roll spell damage Charisma modifier without duplicating spell or damage state. |
| Warlock | `.references/srd-5.2.1/Classes/Warlock.md:39-40` | New level-6 feature grant: Subclass feature. Prepared Spells `6 -> 7`. Proficiency Bonus, Eldritch Invocations, Cantrips, Pact Slots, and Pact Slot Level stay unchanged. | Task 25 closes `warlock_dark_ones_own_luck` as a not-installed future-owner-before-SDK reactionless Ability Check and Saving Throw d10 modifier boundary. Prepared-spell progression is `warlock_pact_magic`; invocation facts have no level-6 delta. |
| Wizard | `.references/srd-5.2.1/Classes/Wizard.md:39-40` | New level-6 feature grant: Subclass feature. Prepared Spells `9 -> 10`; level-3 Spell Slots `2 -> 3`. Proficiency Bonus, Cantrips, and level-1/level-2 slots stay unchanged. | Task 26 closes `wizard_sculpt_spells` as a not-installed future-owner-before-SDK selected area spell save-damage exemption boundary. Spellbook learning, Spell Access, Spell Slots, spell school, effective spell level, affected-creature or area witnesses, caster sight, Saving Throw, and save-damage owners stay canonical; future support must consume typed facts without duplicating state or authored-identity dispatch. |

## Closure Result

No implementation task is required solely by a level-6 class-table summary row.

The required accounting result is:

- all twelve level-6 class-table rows stay `non-runtime-table-summary`;
- executable feature grants stay on their individual level-6 feature rows;
- spellcasting, Pact Magic, resources, Weapon Mastery, Proficiency Bonus,
  Sneak Attack, and movement/resource scaling are derived by their existing
  generic owners;
- table rows do not contribute runtime support for narrower progression or
  runtime rows.

## Future Follow-up Queue

Tasks 23-26 close `paladin_aura_of_protection`,
`sorcerer_elemental_affinity`, `warlock_dark_ones_own_luck`, and
`wizard_sculpt_spells` as `future-owner-before-SDK` boundaries, matching the
L6 follow-up pattern. Tasks 54-57 in
`plans/RALPH_L5_EXTENSION_L6_HORIZONTAL_SLICE.md` record the future owners:

| Task | Status | Depends on | Notes |
| --- | --- | --- | --- |
| `L6-FOLLOWUP-PALADIN-AURA-OF-PROTECTION-SAVE-BONUS` - Promote Paladin Aura of Protection passive aura and Saving Throw modifier | `future-follow-up` | `L6FULL-OWN-07-PALADIN-AURA-OF-PROTECTION` | Future battle-runtime and character-battle owner for selected Paladin Aura of Protection Emanation membership, inactive-while-Incapacitated gating, Charisma-modifier minimum +1 Saving Throw bonus projection, and overlapping Paladin aura choice; parked outside this L6 full accounting pass. |
| `L6-FOLLOWUP-SORCERER-ELEMENTAL-AFFINITY-DAMAGE` - Promote Sorcerer Elemental Affinity damage affinity | `future-follow-up` | `L6FULL-OWN-08-SORCERER-ELEMENTAL-AFFINITY` | Future character-sheet and battle-runtime owner for selected Draconic Sorcery Elemental Affinity damage type, passive Resistance, and one-roll spell damage Charisma modifier; parked outside this L6 full accounting pass. |
| `L6-FOLLOWUP-WARLOCK-DARK-ONES-OWN-LUCK-D20-MODIFIER` - Promote Warlock Dark One's Own Luck Ability Check and Saving Throw d10 modifier | `future-follow-up` | `L6FULL-OWN-09-WARLOCK-DARK-ONES-OWN-LUCK` | Future character-sheet and runtime owner for selected Fiend Patron Dark One's Own Luck Long Rest resource and reactionless Ability Check and Saving Throw 1d10 modifier; parked outside this L6 full accounting pass. |
| `L6-FOLLOWUP-WIZARD-SCULPT-SPELLS-SAVE-DAMAGE-EXEMPTION` - Promote Wizard Sculpt Spells selected area spell save-damage exemption | `future-follow-up` | `L6FULL-OWN-10-WIZARD-SCULPT-SPELLS` | Future battle-runtime owner for selected Sculpt Spells protected-creature choices, automatic Saving Throw success, and successful-save half-damage replacement; parked outside this L6 full accounting pass. |

## Verification Notes

- RAW check: read the 12 local SRD class-table row pairs under
  `.references/srd-5.2.1/Classes/` and the level-gain procedure in
  `.references/srd-5.2.1/Character-Creation.md:329-336`.
- Ubiquitous-language check: read `UBIQUITOUS_LANGUAGE.md`; this audit uses
  Character Sheet, Spell Access, Spell Slot, Pact Slot, Pool, Proficiency
  Bonus, Weapon Mastery, Expertise, and runtime-detached owner language.
- Generated artifact discipline: no generated coverage artifact should be
  hand-edited for this closure; use `pnpm unit-profile-coverage:check --write`
  to refresh generated files if the checker output changes.
- Connascence review: level-derived facts are mapped to named generic owners
  or narrower feature rows instead of copied into table-row runtime state.
