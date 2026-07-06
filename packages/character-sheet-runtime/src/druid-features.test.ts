// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.druid-circle-land-spell-access
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-CIRCLE-LAND-SPELL-ACCESS druid_circle_of_the_land_spells
import { describe, expect, test } from "vitest";
import {
  DRUID_WILD_SHAPE_UNIT_ID,
  Either,
  Hp,
  armorClassBuild,
  characterBuildResources,
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
  characterSheetId,
  characterSheetResources,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet,
  druidCircleLandBuild,
  druidCircleLandSpellAccessBookOfShadowsDuplicateTestName,
  druidCircleLandSpellAccessProjectionTestName,
  druidCircleLandSpellAccessSelectedLandGateTestName,
  druidCircleLandSpellcastingSourceGateTestName,
  druidWarlockCircleLandBookBuild,
  druidWildShapeFixtureKnownFormStatBlockIds,
  druidWildShapeShortRestRecoveryTestName,
  parseCharacterSheet,
  requireRight,
  resourceCount,
  storedAvailableSheetInput,
  unitLibrary,
} from "./test-support.ts";

describe("Character Sheet runtime / druid features", () => {
  test(druidCircleLandSpellAccessProjectionTestName, () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:druid-land-temperate"),
        build: druidCircleLandBuild({ druidLevel: 5 }),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds: [
          ...druidWildShapeFixtureKnownFormStatBlockIds,
          "stat_block_cat",
          "stat_block_frog",
        ],
        druidCircleLand: { land: "temperate" },
      }),
    );

    expect(
      characterSheetDruidCircleLandPreparedSpellAccess({
        sheet,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        land: "temperate",
        druidLevel: 5,
        spellcastingSourceUnitId: "class_druid",
        spellIds: ["misty_step", "shocking_grasp", "sleep", "lightning_bolt"],
      },
    });

    const rested = requireRight(
      completeLongRest({
        sheet,
        unitLibrary,
        druidCircleLandChoice: "arid",
      }),
    );

    expect(rested.druidCircleLand).toEqual({ land: "arid" });
    expect(
      characterSheetDruidCircleLandPreparedSpellAccess({
        sheet: rested,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        land: "arid",
        spellIds: ["blur", "burning_hands", "fire_bolt", "fireball"],
      },
    });
  });

  test(druidCircleLandSpellAccessSelectedLandGateTestName, () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:druid-land-missing"),
      build: druidCircleLandBuild({ druidLevel: 3 }),
      currentHp: Hp(18),
      tempHp: Hp(0),
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds:
        druidWildShapeFixtureKnownFormStatBlockIds,
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message: "Circle of the Land requires selected land state.",
      },
    });
  });

  test(druidCircleLandSpellcastingSourceGateTestName, () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:druid-land-no-spellcasting"),
      build: {
        ...armorClassBuild({
          startingClass: "class_druid",
          advancements: ["class_druid", "class_druid"],
        }),
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "class_druid",
            unitId: "subclass_druid_circle_of_the_land",
          },
        ],
      },
      currentHp: Hp(18),
      tempHp: Hp(0),
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds:
        druidWildShapeFixtureKnownFormStatBlockIds,
      druidCircleLand: { land: "arid" },
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Circle of the Land selected land requires Druid spellcasting source.",
      },
    });
  });

  test(druidCircleLandSpellAccessBookOfShadowsDuplicateTestName, () => {
    const polarSheet = requireRight(
      parseCharacterSheet(
        {
          ...storedAvailableSheetInput({
            characterId: "character:druid-land-book-spell-long-rest",
            build: druidWarlockCircleLandBookBuild(),
          }),
          druidWildShapeKnownForms: {
            statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
          },
          druidCircleLand: { land: "polar" },
          spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
          pactSlotExpenditure: { expended: 0 },
          bookOfShadowsPresence: { tag: "onPerson" },
        },
        unitLibrary,
      ),
    );

    expect(
      completeLongRest({
        sheet: polarSheet,
        unitLibrary,
        druidCircleLandChoice: "arid",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      },
    });

    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:druid-land-duplicate-book-spell",
          build: druidWarlockCircleLandBookBuild(),
        }),
        druidWildShapeKnownForms: {
          statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
        },
        druidCircleLand: { land: "arid" },
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
        pactSlotExpenditure: { expended: 0 },
        bookOfShadowsPresence: { tag: "onPerson" },
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      },
    });
  });

  test(druidWildShapeShortRestRecoveryTestName, () => {
    const druidBuild = armorClassBuild({
      startingClass: "class_druid",
      advancements: ["class_druid"],
    });
    expect(characterBuildResources(druidBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          resource: expect.objectContaining({ kind: "use_count" }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:druid-wild-shape-rest"),
        build: druidBuild,
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds:
          druidWildShapeFixtureKnownFormStatBlockIds,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: DRUID_WILD_SHAPE_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      Either.isLeft(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            "character:druid-wild-shape-missing-forms",
          ),
          build: druidBuild,
          currentHp: Hp(15),
          tempHp: Hp(0),
          unitLibrary,
        }),
      ),
    ).toBe(true);
    expect(characterSheetDruidWildShapeKnownForms(spent)).toEqual({
      statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
    });
    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 2,
          resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 },
        }),
      ]),
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(characterSheetDruidWildShapeKnownForms(shortRested)).toEqual({
      statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
    });
    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 1,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({
        sheet: shortRested,
        unitLibrary,
        druidWildShapeKnownFormReplacement: {
          replaceStatBlockId: "stat_block_rat",
          selectedStatBlockId: "stat_block_cat",
        },
      }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetDruidWildShapeKnownForms(longRested)).toEqual({
      statBlockIds: [
        "stat_block_cat",
        "stat_block_riding_horse",
        "stat_block_spider",
        "stat_block_wolf",
      ],
    });
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });
});
