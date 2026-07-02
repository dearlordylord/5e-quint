# Seed-Present Audit: Migrated First Batch

Task: L12-SH39-SEED-PRESENT-AUDIT-FIRST-BATCH

This note records the first migrated seed-present audit batch. It is a scoped
review of the rows migrated by Tasks 17-23, not a new inventory denominator and
not a broad relabeling of all seed-present rows.

## Inputs Checked

- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Classes/Monk.md`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`

## Batch Result

All selected rows are already classified by the generated seed migration audit
as `already legal creation path`, with `sourceBuildPath:
legal-creation-draft-finalize`, `usesRealSheetBattleHandoff: true`, and
`wholeWidthSourceLifecycleProof: true`.

| Row | Existing scenario | Audit result |
| --- | --- | --- |
| `srd521:classes/barbarian:level-1:class-feature-grant:barbarian_rage` | Barbarian Rage projects from a level-1 sheet, spends a use, and applies damage and Resistance riders | No action needed. The scenario uses `createLegalSourceCharacterFixture` with battle handoff and asserts creation holes are closed, sheet build equality, Pool spend, Bonus Action spend, weapon damage bonus, and Resistance. |
| `srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration` | Bardic Inspiration grants a level-1 d6 die, spends a Charisma-derived use, and spends the Bonus Action | No action needed. The scenario uses legal creation, real sheet-to-battle handoff, target selection, Pool spend, Bonus Action spend, and d6 effect projection. |
| `srd521:classes/fighter:level-1:class-feature-grant:fighter_second_wind` | Fighter Second Wind heals through sheet projection and spends one Bonus Action use | No action needed. The scenario uses legal creation with battle handoff and asserts healing, Bonus Action spend, remaining uses, and no repeat act after use spending. |
| `srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts` | Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike using the Martial Arts die and Dexterity | Focused fixture update applied. The scenario uses legal creation with battle handoff and now includes the weapon loadout preference required by the legal creation seam; it asserts the character unit reference, Bonus Action Unarmed Strike damage, and Bonus Action spend. |
| `srd521:classes/rogue:level-1:class-feature-grant:rogue_sneak_attack` | Rogue Sneak Attack projects as a level-1 Dagger damage rider and records once-per-turn use | No action needed. The scenario uses legal creation, constructs a real battle from sheets, asserts ally-position evidence, Dagger damage-rider shape, damage, and once-per-turn use recording. |
| `srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery` | Sorcerer Innate Sorcery spends a use for one minute and projects Sorcerer spell bonuses | No action needed. The scenario uses legal creation with battle handoff and asserts origin unit refs, Pool spend, Bonus Action spend, one-minute duration, Spell Save DC increase, and spell Attack Roll Advantage. |
| `srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_burning_hands` | Sorcerer Burning Hands resolves from a level-1 sheet, applies Fire damage, and spends a spell slot | No action needed. The scenario uses legal Sorcerer creation, asserts prepared spell access, builds a real battle from the sheet, and asserts self-origin Cone Saving Throw shape, Fire damage, action spend, and Spell Slot spend. |

## Scope Notes

- The Wizard Burning Hands row shares the same spell runtime helper and is
  present in the current inventory context, but it is not counted as part of
  this migrated batch because Task 23 migrated the Sorcerer Burning Hands seed.
- The checked `.references/srd-5.2.1/Spells/Descriptions-A-D.md` file did not
  contain a Burning Hands spell-description entry. This audit therefore relies
  on the Sorcerer spell-list RAW anchor for the selected row and on the already
  authored `burning_hands` Surface unit for runtime projection evidence; it does
  not add new Burning Hands RAW claims from outside the local corpus.
- No follow-up task is needed for these seven selected rows. Remaining
  seed-present groups are intentionally left to L12-SH40-REMAINING-BATCH-SPLIT.
