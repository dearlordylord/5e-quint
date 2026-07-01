# L5 Progression Delta Audit

Task: `L5FULL-ACCOUNTING-AUDIT`

## Scope

This audit compares local SRD 5.2.1 class-table facts at class level 4 and
class level 5 for all 12 SRD classes. It names the source facts and existing
generic owners that already own progression, resources, Spell Access, Spell
Slots, Pact Slots, and character-battle handoff.

This is accounting pre-work only. It does not treat authored class, feature, or
spell identity as runtime dispatch, and it does not introduce implementation
tasks where the level-5 fact is already derivable from a generic owner.

Source facts are local SRD provenance from `.references/srd-5.2.1/Classes/`.
Generated coverage reports and owner-evidence files are structured input for
ownership mapping only. Runtime projections remain owned by Character Creation,
Character Sheet, character-battle handoff, battle runtime, or future durable
owners named below.

## Owner Map

| Progression fact | Existing owner decision |
| --- | --- |
| Proficiency Bonus `+2 -> +3` for all classes | `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS`, `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`, and `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` in `plans/rules-kernel-coverage/REPORT.md:128-131`. No class-specific duplicate Proficiency Bonus state. |
| Full-caster cantrip totals, prepared-spell totals, and ordinary Spell Slot totals | Character Creation class spellcasting support profiles in `plans/unit-profile-coverage/character-creation-owner-evidence.json`; Character Sheet slot owners `SHEET.SPELL_SLOTS.TABLE_DERIVATION`, `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`, and `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` in `plans/rules-kernel-coverage/REPORT.md:140-145`. |
| Paladin and Ranger prepared-spell totals and level-1/level-2 Spell Slot totals | Same Character Creation spellcasting and Character Sheet Spell Slot owners. Level 5 does not create spell-level-3 pressure for these two half-caster tables. |
| Warlock Eldritch Invocation count, prepared-spell total, Pact Slot count, and Pact Slot level | Invocation count is owned by `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` in `plans/rules-kernel-coverage/REPORT.md:113` and `warlock_eldritch_invocations` evidence in `plans/unit-profile-coverage/unit-evidence.jsonl:268-269`. Pact Magic prepared-spell, Pact Slot count, and Pact Slot level are owned by `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` in `plans/rules-kernel-coverage/REPORT.md:112` and the `warlock_pact_magic` claim/evidence in `plans/unit-profile-coverage/unit-claims.jsonl:92` and `plans/unit-profile-coverage/unit-evidence.jsonl:270,311`. |
| Weapon Mastery count changes and reselection | `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION`, `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT`, `SHEET.WEAPON_MASTERY.RESELECTION`, and `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION` in `plans/rules-kernel-coverage/REPORT.md:120-143`. |
| Feature resource caps and use-state transitions | `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` and `SHEET.FEATURE_RESOURCES.TRANSITIONS` in `plans/rules-kernel-coverage/REPORT.md:124-127`. Existing Unit claims/evidence own specific supported resources such as Bardic Inspiration, Font of Magic, Wild Shape, Lay On Hands, Slow Fall, and Pact Magic. |
| Wizard spellbook learning on level gain | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` in `plans/rules-kernel-coverage/REPORT.md:126`; SRD source at `.references/srd-5.2.1/Classes/Wizard.md:64`. |
| Character-to-battle projection and settlement of finalized level-5 facts | `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`, and `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` in `plans/rules-kernel-coverage/REPORT.md:129-131`. |

## Class Table Deltas

| Class | Source rows | Level-4 -> level-5 table deltas | Owner decision |
| --- | --- | --- | --- |
| Barbarian | `.references/srd-5.2.1/Classes/Barbarian.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grants: Extra Attack and Fast Movement. Rages stay `3`; Rage Damage stays `+2`; Weapon Mastery stays `3`. | Extra Attack and Fast Movement are row-accounted in `L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`; SDK task must decide scenario vs SDK closure. Proficiency Bonus is generic. No new Rage or Weapon Mastery task. |
| Bard | `.references/srd-5.2.1/Classes/Bard.md:39-40` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Font of Inspiration. Bardic Die `D6 -> D8`; Prepared Spells `7 -> 9`; level-3 Spell Slots `0 -> 2`. Cantrips stay `3`; level-1/level-2 slots stay `4/3`. | Font of Inspiration remains future Character Sheet resource-recovery owner before SDK. Bardic Die scaling is already part of `bard_bardic_inspiration` supported mechanics in `plans/unit-profile-coverage/unit-claims.jsonl:70`; do not duplicate it under Font. Spell Access and slots are generic. |
| Cleric | `.references/srd-5.2.1/Classes/Cleric.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Sear Undead. Prepared Spells `7 -> 9`; level-3 Spell Slots `0 -> 2`. Channel Divinity stays `2`; Cantrips stay `4`; level-1/level-2 slots stay `4/3`. | Sear Undead needs owner-boundary review before SDK admission. Channel Divinity and Spell Slot facts remain generic resource/spellcasting facts. |
| Druid | `.references/srd-5.2.1/Classes/Druid.md:35-36` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Wild Resurgence. Prepared Spells `7 -> 9`; level-3 Spell Slots `0 -> 2`. Wild Shape uses stay `2`; Cantrips stay `3`; level-1/level-2 slots stay `4/3`. | Wild Resurgence remains future Character Sheet resource-exchange owner before SDK. Spell Access and slots are generic. Wild Shape use count has no table delta. |
| Fighter | `.references/srd-5.2.1/Classes/Fighter.md:34-35` | Proficiency Bonus `+2 -> +3`. New level-5 feature grants: Extra Attack and Tactical Shift. Second Wind uses stay `3`; Weapon Mastery stays `4`. | Extra Attack is row-accounted as supported owner review. Tactical Shift needs owner-boundary review. Second Wind healing magnitude is formula-derived from Fighter level; do not duplicate it in level-5 state. |
| Monk | `.references/srd-5.2.1/Classes/Monk.md:35-36` | Proficiency Bonus `+2 -> +3`. New level-5 feature grants: Extra Attack and Stunning Strike. Martial Arts `1d6 -> 1d8`; Focus Points `4 -> 5`; Unarmored Movement stays `+10 ft.` | Extra Attack and Stunning Strike have existing SDK seed rows. Focus Points and Martial Arts die are generic class-feature/resource projections; Slow Fall magnitude is formula-derived from Monk level. |
| Paladin | `.references/srd-5.2.1/Classes/Paladin.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grants: Extra Attack and Faithful Steed. Prepared Spells `5 -> 6`; level-1 slots `3 -> 4`; level-2 slots `0 -> 2`. Channel Divinity stays `2`. | Extra Attack is row-accounted as supported owner review. Faithful Steed remains split Spell Access plus future companion-control owner before SDK. Spell Access and slots are generic; no level-3 spell pressure. |
| Ranger | `.references/srd-5.2.1/Classes/Ranger.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Extra Attack. Favored Enemy free casts `2 -> 3`; Prepared Spells `5 -> 6`; level-1 slots `3 -> 4`; level-2 slots `0 -> 2`. | Extra Attack is row-accounted as supported owner review. Favored Enemy is a retained `Hunter's Mark` cast-count resource; Spell Access and slots are generic; no level-3 spell pressure. |
| Rogue | `.references/srd-5.2.1/Classes/Rogue.md:39-40` | Proficiency Bonus `+2 -> +3`. New level-5 feature grants: Cunning Strike and Uncanny Dodge. Sneak Attack `2d6 -> 3d6`. | Cunning Strike has an existing SDK seed row; Uncanny Dodge is row-accounted as supported owner review. Sneak Attack damage scaling is the existing Sneak Attack owner, not new duplicate state. |
| Sorcerer | `.references/srd-5.2.1/Classes/Sorcerer.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Sorcerous Restoration. Sorcery Points `4 -> 5`; Prepared Spells `7 -> 9`; level-3 Spell Slots `0 -> 2`. Cantrips stay `5`; level-1/level-2 slots stay `4/3`. | Sorcerous Restoration has an existing SDK seed row. Sorcery Point cap and created-slot conversion remain `sorcerer_font_of_magic`/Character Sheet resource facts. Spell Access and slots are generic. |
| Warlock | `.references/srd-5.2.1/Classes/Warlock.md:38-39` | Proficiency Bonus `+2 -> +3`. No new class-feature grant in the table. Eldritch Invocations `3 -> 5`; Prepared Spells `5 -> 6`; Pact Slot Level `2 -> 3`. Cantrips stay `3`; Pact Slots stay `2`. | `warlock_eldritch_invocations` owns invocation count/progression. `warlock_pact_magic` owns prepared-spell, Pact Slot count, and Pact Slot level facts. Neither is battle/SDK behavior by itself. |
| Wizard | `.references/srd-5.2.1/Classes/Wizard.md:38-39` | Proficiency Bonus `+2 -> +3`. New level-5 feature grant: Memorize Spell. Prepared Spells `7 -> 9`; level-3 Spell Slots `0 -> 2`. Cantrips stay `4`; level-1/level-2 slots stay `4/3`. | Memorize Spell remains future Character Sheet prepared-spell replacement owner before SDK. Spellbook learning, Spell Access, and slots are generic owner facts. |

## Adjacent Level-Gated Source Facts

These facts are not all new class-table feature rows, but they change at level
5 and must remain visible to future reviewers.

| Source fact | Local SRD anchor | Owner decision |
| --- | --- | --- |
| Bardic Inspiration die becomes `d8` at Bard level 5. | `.references/srd-5.2.1/Classes/Bard.md:57` | Already included in `bard_bardic_inspiration` supported mechanics and selected-identity evidence; Font of Inspiration must not introduce a second Bardic Inspiration resource. |
| Fighter Second Wind healing uses `1d10 + Fighter level`, so level 5 changes the formula result from `1d10 + 4` to `1d10 + 5`. | `.references/srd-5.2.1/Classes/Fighter.md:62` | Existing `fighter_second_wind` owner derives this from Fighter level and the feature record. Tactical Shift must consume the existing Second Wind activation instead of adding another pool. |
| Druid Wild Shape Temporary Hit Points equal Druid level, so level 5 changes `4 -> 5`. | `.references/srd-5.2.1/Classes/Druid.md:95` | Existing `druid_wild_shape` projection owner derives this fact. Wild Resurgence must consume existing Wild Shape use-count and Spell Slot state. |
| Monk Slow Fall reduces fall damage by five times Monk level, so level 5 changes `20 -> 25`. | `.references/srd-5.2.1/Classes/Monk.md:116` | Existing `monk_slow_fall` supported owner derives the amount from Monk level. |
| Paladin Lay On Hands pool equals five times Paladin level, so level 5 changes `20 -> 25`. | `.references/srd-5.2.1/Classes/Paladin.md:58` | Existing `paladin_lay_on_hands` Character Sheet healing-resource owner derives the pool. Faithful Steed must not copy this resource state. |
| Sorcerer Font of Magic can create level-3 Spell Slots starting at Sorcerer level 5, with cost `5`. | `.references/srd-5.2.1/Classes/Sorcerer.md:87` and `.references/srd-5.2.1/Classes/Sorcerer.md:101` | Existing `sorcerer_font_of_magic` Character Sheet resource owner enforces cost, minimum Sorcerer level, and created-slot source state. |
| Wizard Arcane Recovery capacity is half Wizard level rounded up, so level 5 changes the recovery budget from `2` to `3` spell-slot levels. | `.references/srd-5.2.1/Classes/Wizard.md:98` | Character Sheet Spell Slot/resource transition owners should derive this from Wizard level; do not store a parallel recovery cap. |
| Wizard level gain adds two Wizard spells to the spellbook, each of a level for which the Wizard has Spell Slots; level 5 opens level-3 spellbook choices. | `.references/srd-5.2.1/Classes/Wizard.md:64` | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` remains the owner. |
| Druid Beast Shapes has no level-5 threshold; the most recent threshold was level 4. | `.references/srd-5.2.1/Classes/Druid.md:109` | No new level-5 Beast Shapes task. Existing Wild Shape known-form owners remain the authority. |

## Follow-Up Result

No new implementation task is required solely by this progression audit.

The required follow-up is accounting/linkage, already represented in the L5
Ralph queue:

- `L5FULL-CLOSE-01-LEVEL5-CLASS-TABLES` must close the twelve table summary
  rows as SDK-scope table-only rows after citing this audit.
- Supported feature rows remain in the owner-review or seed buckets of
  `plans/RALPH_L5_FULL_SRD_COMPLETION.md`.
- Future-owner and unresolved-owner rows remain split by their durable owner
  boundaries; no broad "finish level-5 progression" task should be created.

## Verification Notes

- RAW check: read the 12 local SRD class-table row pairs under
  `.references/srd-5.2.1/Classes/` and the adjacent feature anchors cited
  above.
- Ubiquitous-language check: read `UBIQUITOUS_LANGUAGE.md`; this audit uses
  Character Sheet, Spell Access, Spell Slot, Pact Slot, Pool, Proficiency Bonus,
  active occurrence, and runtime-detached owner language.
- Generated artifact discipline: no generated coverage artifact was hand-edited.
- Connascence review: level-derived facts are mapped to named generic owners
  rather than copied into per-class runtime state.
