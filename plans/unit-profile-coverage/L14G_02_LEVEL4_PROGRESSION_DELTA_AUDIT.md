# L14G-02 Level 4 Progression Delta Audit

Task: `L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT`

## Scope

This audit compares local SRD 5.2.1 class-table facts at class level 3 and
class level 4 for all 12 SRD classes. It names source facts and existing
generic owners. It does not treat authored class, feature, or spell identity as
runtime dispatch.

Source facts are local SRD provenance from `.references/srd-5.2.1/Classes/`.
Generated coverage reports and owner-evidence files were used only as
structured input for ownership mapping. Runtime projections remain owned by the
character-creation, Character Sheet, character-battle handoff, and battle
runtime owners named below.

## Owner Map

| Progression fact | Existing owner |
| --- | --- |
| Level-4 Ability Score Improvement feature grant | `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION`; selected feat Units and Character Sheet ability-score facts own behavior. Existing installed ASI Unit claims close as `selection-grant-container` in `plans/unit-profile-coverage/unit-claims.jsonl:79-89`. |
| Missing Fighter, Paladin, and Warlock ASI authored records | Existing lane `L14G-01-LEVEL4-ASI-CATALOG-SOURCE`, not a new follow-up from this audit. |
| Monk Slow Fall level-4 feature | Existing lane `L14G-03-MONK-SLOW-FALL-TRIAGE`, not a new follow-up from this audit. |
| Cantrip, prepared-spell, and ordinary Spell Slot totals from class spellcasting tables | Character Creation class spellcasting support profiles in `plans/unit-profile-coverage/character-creation-owner-evidence.json:3034-3149`; Character Sheet slot owners `SHEET.SPELL_SLOTS.TABLE_DERIVATION` and `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` in `plans/rules-kernel-coverage/REPORT.md:137-138`. |
| Subclass/class-feature prepared Spell Access | `SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION` in `plans/rules-kernel-coverage/REPORT.md:142`. |
| Warlock Pact Magic cantrip, prepared-spell, Pact Slot count, and Pact Slot level progression | `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` in `plans/rules-kernel-coverage/REPORT.md:110` and `warlock_pact_magic` claim in `plans/unit-profile-coverage/unit-claims.jsonl:73`. |
| Weapon Mastery count changes and later reselection | `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT`, `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION`, `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION`, and `SHEET.WEAPON_MASTERY.RESELECTION` in `plans/rules-kernel-coverage/REPORT.md:118-119` and `plans/rules-kernel-coverage/REPORT.md:139-140`. |
| Feature resource caps and use-state transitions | `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` and `SHEET.FEATURE_RESOURCES.TRANSITIONS` in `plans/rules-kernel-coverage/REPORT.md:122` and `plans/rules-kernel-coverage/REPORT.md:125`. |
| Wizard spellbook learning on level gain | `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION` in `plans/rules-kernel-coverage/REPORT.md:124`; SRD source at `.references/srd-5.2.1/Classes/Wizard.md:68`. |
| Druid Wild Shape known-form roster thresholds | Existing `druid_wild_shape` owner: `character-creation.class-feature-resource-projection`, `character-sheet.class-feature-use-count-resource`, and `unit-feature.druid-wild-shape-known-form` in `plans/unit-profile-coverage/unit-claims.jsonl:100`; source at `.references/srd-5.2.1/Classes/Druid.md:103-114`. |
| Character-to-battle projection and settlement of finalized level-4 facts | `CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION`, `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`, and `CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS` in `plans/rules-kernel-coverage/REPORT.md:127-129`. |

## Class Table Deltas

| Class | Source rows | Level-3 -> level-4 table deltas | Existing owner decision |
| --- | --- | --- | --- |
| Barbarian | `.references/srd-5.2.1/Classes/Barbarian.md:33-38` | New level-4 feature grant: Ability Score Improvement. Weapon Mastery count `2 -> 3`. Rages stay `3`; Rage Damage stays `+2`; Proficiency Bonus stays `+2`. | ASI is the generic selection-grant container. Weapon Mastery count is owned by the class-level advancement and reselection owners. No new task. |
| Bard | `.references/srd-5.2.1/Classes/Bard.md:34-39` | New level-4 feature grant: Ability Score Improvement. Cantrips `2 -> 3`; Prepared Spells `6 -> 7`; level-2 Spell Slots `2 -> 3`. Bardic Die stays `D6`; level-1 Spell Slots stay `4`. | ASI is the generic selection-grant container. Spell Access and slot capacity are owned by class spellcasting and Character Sheet spell-slot owners. No new task. |
| Cleric | `.references/srd-5.2.1/Classes/Cleric.md:33-38` | New level-4 feature grant: Ability Score Improvement. Cantrips `3 -> 4`; Prepared Spells `6 -> 7`; level-2 Spell Slots `2 -> 3`. Channel Divinity stays `2`; level-1 Spell Slots stay `4`. | ASI is the generic selection-grant container. Spell Access, slot capacity, and Channel Divinity resource facts are already under generic spellcasting/resource owners. No new task. |
| Druid | `.references/srd-5.2.1/Classes/Druid.md:30-35` | New level-4 feature grant: Ability Score Improvement. Cantrips `2 -> 3`; Prepared Spells `6 -> 7`; level-2 Spell Slots `2 -> 3`. Wild Shape uses stay `2`; level-1 Spell Slots stay `4`. | ASI is the generic selection-grant container. Spell Access and slot capacity are owned by generic spellcasting owners. Wild Shape use count is unchanged in the main class table. No new task. |
| Fighter | `.references/srd-5.2.1/Classes/Fighter.md:29-34` | New level-4 feature grant: Ability Score Improvement. Second Wind uses `2 -> 3`; Weapon Mastery count `3 -> 4`. Proficiency Bonus stays `+2`. | Second Wind resource cap is owned by feature-resource projection and Character Sheet transitions; Weapon Mastery by class-level advancement and reselection. The missing Fighter ASI record is already `L14G-01`, not a new audit task. |
| Monk | `.references/srd-5.2.1/Classes/Monk.md:30-35` | New level-4 feature grants: Ability Score Improvement and Slow Fall. Focus Points `3 -> 4`. Martial Arts stays `1d6`; Unarmored Movement stays `+10 ft.` | Focus Points are owned by Monk's Focus resource projection and Character Sheet feature-resource transitions. ASI is already installed as a selection-grant container. Slow Fall is already `L14G-03`. |
| Paladin | `.references/srd-5.2.1/Classes/Paladin.md:33-38` | New level-4 feature grant: Ability Score Improvement. Prepared Spells `4 -> 5`. Channel Divinity stays `2`; level-1 Spell Slots stay `3`. | Prepared Spell Access and slots are already generic spellcasting facts. The missing Paladin ASI record is already `L14G-01`, not a new audit task. |
| Ranger | `.references/srd-5.2.1/Classes/Ranger.md:33-38` | New level-4 feature grant: Ability Score Improvement. Prepared Spells `4 -> 5`. Favored Enemy stays `2`; level-1 Spell Slots stay `3`. | Prepared Spell Access and slots are already generic spellcasting facts. Favored Enemy free-cast count has no level-4 change. No new task. |
| Rogue | `.references/srd-5.2.1/Classes/Rogue.md:34-39` | New level-4 feature grant: Ability Score Improvement. Sneak Attack stays `2d6`. | ASI is the generic selection-grant container. Sneak Attack has no level-4 table delta. No new task. |
| Sorcerer | `.references/srd-5.2.1/Classes/Sorcerer.md:33-38` | New level-4 feature grant: Ability Score Improvement. Sorcery Points `3 -> 4`; Cantrips `4 -> 5`; Prepared Spells `6 -> 7`; level-2 Spell Slots `2 -> 3`. Level-1 Spell Slots stay `4`. | Sorcery Points are owned by Font of Magic resource projection and Character Sheet feature-resource transitions. Spell Access and slots are generic class spellcasting facts. No new task. |
| Warlock | `.references/srd-5.2.1/Classes/Warlock.md:33-38` | New level-4 feature grant: Ability Score Improvement. Cantrips `2 -> 3`; Prepared Spells `4 -> 5`. Eldritch Invocations stay `3`; Pact Magic Spell Slots stay `2`; Pact Slot Level stays `2`. | Pact Magic progression owns cantrip/prepared-spell/Pact Slot facts; invocation count has no level-4 change. The missing Warlock ASI record is already `L14G-01`, not a new audit task. |
| Wizard | `.references/srd-5.2.1/Classes/Wizard.md:33-38` | New level-4 feature grant: Ability Score Improvement. Cantrips `3 -> 4`; Prepared Spells `6 -> 7`; level-2 Spell Slots `2 -> 3`. Level-1 Spell Slots stay `4`. | Spell Access and slots are generic class spellcasting facts. ASI is the generic selection-grant container. No new task. |

## Adjacent Level-Gated Source Facts

These are not new class-table columns, but they are level-gated source facts
that affect level-4 progression and should stay visible to future reviewers.

| Source fact | Local SRD anchor | Owner decision |
| --- | --- | --- |
| Druid Beast Shapes threshold at Druid level 4: Known Forms `4 -> 6`, Max CR `1/4 -> 1/2`, Fly Speed remains `No`. | `.references/srd-5.2.1/Classes/Druid.md:103-114` | Already covered by `druid_wild_shape` character-creation and Character Sheet known-form owners; existing deferred Wild Shape battle follow-ups remain unchanged. |
| Wizard level gain adds two Wizard spells to the spellbook, each of a level for which the Wizard has Spell Slots. | `.references/srd-5.2.1/Classes/Wizard.md:64-68` | Already covered by `CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION`. |
| Paladin Lay On Hands pool is level-derived, not a class-table column: pool equals five times Paladin level, so the pool changes `15 -> 20` from Paladin level 3 to level 4. | `.references/srd-5.2.1/Classes/Paladin.md:58-64` | Already covered by `character-sheet.healing-resource-action` and `SHEET.FEATURE_RESOURCES.TRANSITIONS`. No class-specific runtime dispatch is needed. |
| Formula-based effect magnitudes such as Fighter Second Wind healing `1d10 + Fighter level` (`1d10 + 3 -> 1d10 + 4`), Druid Wild Shape Temporary Hit Points equal to Druid level (`3 -> 4`), and Monk Slow Fall reduction equal to five times Monk level (`n/a -> 20` at feature acquisition) are derived from their feature rules rather than duplicated beside table rows. | `.references/srd-5.2.1/Classes/Fighter.md:62-68`, `.references/srd-5.2.1/Classes/Druid.md:117-123`, `.references/srd-5.2.1/Classes/Monk.md:116-118` | Existing feature owners derive these facts from class level and feature records. Slow Fall still needs the existing `L14G-03` boundary/runtime decision before promotion. |

## Follow-Up Result

No new implementation follow-up task is required by this audit.

Existing tasks remain the correct planning owners:

- `L14G-01-LEVEL4-ASI-CATALOG-SOURCE`: still owns missing Fighter, Paladin,
  and Warlock ASI authored records plus checker-readable closure evidence.
- `L14G-03-MONK-SLOW-FALL-TRIAGE`: still owns the Slow Fall boundary versus
  promoted runtime decision.
- `L14G-04-MCP-LEVEL14-SCENARIO-GATE`: unchanged. It may consume the audited
  generic owners, but this audit does not add scenario requirements.
- `L14G-05-GATE-CONSOLIDATION`: remains blocked until lanes 1, 3, and 4 also
  land.

## Verification Notes

- RAW check: read the 12 local SRD class tables under
  `.references/srd-5.2.1/Classes/` and the adjacent Druid, Wizard, Paladin,
  Fighter, and Monk feature anchors cited above.
- Ubiquitous-language check: read `UBIQUITOUS_LANGUAGE.md`; the audit uses the
  repo terms Character Sheet, Spell Access, Spell Slot, Pact Slot, Weapon
  Mastery, Pool, and Ability Score Improvement.
- Generated artifact discipline: no generated coverage artifact was hand-edited.
- Connascence review: table deltas are cited from one SRD source row per class
  and mapped to named generic owners instead of duplicating counts in runtime
  state.
