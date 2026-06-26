// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-long-rest-use-state
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-point-pool-resource
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS monk_uncanny_metabolism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS sorcerer_font_of_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A10-SORCERER-SORCEROUS-RESTORATION sorcerer_sorcerous_restoration
import { describe, expect, test } from "vitest";
import {
  DieRollResult,
  Hp,
  MONK_MARTIAL_ARTS_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  MONK_UNCANNY_METABOLISM_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  SRD_SORCERY_POINTS_POOL_ID,
  armorClassBuild,
  characterBuildResources,
  characterSheetCurrentHp,
  characterSheetId,
  characterSheetMonkUncannyMetabolismUseState,
  characterSheetMonksFocusSaveDc,
  characterSheetResources,
  characterSheetTempHp,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet,
  parseCharacterSheet,
  requireRight,
  resourceCount,
  sorcererFontOfMagicBuild,
  sorcererFontOfMagicLongRestRecoveryTestName,
  sorcererSorcerousRestorationShortRestRecoveryTestName,
  storedAvailableSheetInput,
  uncannyMetabolismInitiativeGatesTestName,
  uncannyMetabolismInitiativeRecoveryTestName,
  uncannyMetabolismLongRestUseStateTestName,
  uncannyMetabolismRejectsUnownedUseStateTestName,
  unitLibrary,
  useMonkUncannyMetabolismWhenRollingInitiative,
} from "./test-support.ts";

const monksFocusShortRestRecoveryTestName =
  "Short Rest restores the Monk Focus Point use pool";

describe("Character Sheet runtime / resources", () => {
  test.each([
    {
      name: "tagged",
      expenditure: {
        tag: "layOnHandsHealingPool",
        count: 5,
        expended: 0,
      },
      message:
        "Character Sheet tagged resource expenditure must contain exactly tag and expended count.",
    },
    {
      name: "use-count",
      expenditure: {
        tag: "useCountResource",
        unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
        count: 1,
        expended: 0,
      },
      message:
        "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    },
    {
      name: "point-pool",
      expenditure: {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        count: 2,
        expended: 0,
      },
      message:
        "Character Sheet keyed resource expenditure must contain exactly tag, Unit id, and expended count.",
    },
  ])("rejects stored $name resource expenditure records with extra keys", ({
    expenditure,
    message,
  }) => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: `character:stale-${expenditure.tag}`,
          build: armorClassBuild({ startingClass: "class_paladin" }),
        }),
        resourceExpenditures: [expenditure],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: { message },
    });
  });

  test("Long Rest restores the Favored Enemy Hunter's Mark free-cast pool", () => {
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:ranger-rest"),
        build: armorClassBuild({ startingClass: "class_ranger" }),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "favoredEnemyHuntersMarkFreeCasts",
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "ranger_favored_enemy",
          count: 2,
          expended: 1,
        },
      ],
    });

    const rested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "ranger_favored_enemy",
          count: 2,
          expended: 0,
        },
      ],
    });
  });

  test("Long Rest restores the Paladin's Smite Divine Smite free-cast pool", () => {
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-smite-rest"),
        build: armorClassBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        currentHp: Hp(20),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "paladinsSmiteDivineSmiteFreeCast",
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          unitId: "paladin_paladins_smite",
          count: 1,
          expended: 1,
        }),
      ]),
    });

    const rested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          unitId: "paladin_paladins_smite",
          count: 1,
          expended: 0,
        }),
      ]),
    });
  });

  test(monksFocusShortRestRecoveryTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk"],
    });
    expect(characterBuildResources(monkBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          resource: expect.objectContaining({ kind: "use_count" }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-focus-rest"),
        build: monkBuild,
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 2,
          resetCadence: { kind: "short_or_long_rest" },
        }),
      ]),
    });
    expect(characterSheetMonksFocusSaveDc(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: { unitId: MONK_MONKS_FOCUS_UNIT_ID, dc: 13 },
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicLongRestRecoveryTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild();
    expect(characterBuildResources(sorcererBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          resource: expect.objectContaining({
            kind: "point_pool",
            poolId: SRD_SORCERY_POINTS_POOL_ID,
          }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-rest"),
        build: sorcererBuild,
        currentHp: Hp(14),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          resource: expect.objectContaining({
            kind: "point_pool",
            poolId: SRD_SORCERY_POINTS_POOL_ID,
          }),
          count: 2,
          expended: 2,
          resetCadence: { kind: "long_rest" },
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });

  test(sorcererSorcerousRestorationShortRestRecoveryTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 4,
    });
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          "character:sorcerer-sorcerous-restoration",
        ),
        build: sorcererBuild,
        currentHp: Hp(28),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(4),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 4,
          resetCadence: { kind: "long_rest" },
        }),
      ]),
    });

    const shortRested = requireRight(
      completeShortRest({
        sheet: spent,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(2),
        },
      }),
    );

    expect(shortRested.resourceExpenditures).toEqual([
      {
        tag: "pointPoolResource",
        unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        expended: resourceCount(2),
      },
    ]);
    expect(shortRested.restFeatureUses).toEqual([
      { tag: "sorcerousRestoration", usedSinceLongRest: true },
    ]);
    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 2,
        }),
      ]),
    });

    expect(
      completeShortRest({
        sheet: shortRested,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(1),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Sorcerous Restoration cannot be used again until a Long Rest.",
      },
    });
    expect(
      completeShortRest({
        sheet: spent,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(3),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Sorcerous Restoration cannot recover more than half Sorcerer level rounded down.",
      },
    });

    const lowerLevelSpent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          "character:sorcerer-no-sorcerous-restoration",
        ),
        build: sorcererFontOfMagicBuild({ sorcererAdvancements: 3 }),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet: lowerLevelSpent,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(1),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Sorcerous Restoration requires the Sorcerer level 5 feature.",
      },
    });

    const longRested = requireRight(
      completeLongRest({ sheet: shortRested, unitLibrary }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(longRested.restFeatureUses).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 0,
        }),
      ]),
    });
  });

  test(uncannyMetabolismLongRestUseStateTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk"],
    });
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-used"),
        build: monkBuild,
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        restFeatureUses: [
          {
            tag: "uncannyMetabolism",
            usedSinceLongRest: true,
          },
        ],
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      characterSheetMonkUncannyMetabolismUseState(spent, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
        trigger: "roll_initiative",
        optional: true,
        oncePerLongRestUse: {
          resetCadence: { kind: "long_rest" },
        },
        focusRecovery: {
          resourceUnitId: MONK_MONKS_FOCUS_UNIT_ID,
          recoversAllExpended: true,
        },
        healing: {
          target: "self",
          martialArtsDieSourceUnitId: MONK_MARTIAL_ARTS_UNIT_ID,
          martialArtsDie: {
            dice: 1,
            dieSize: 6,
          },
          monkLevelBonus: 2,
        },
        usedSinceLongRest: true,
      },
    });
    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 2,
        }),
      ]),
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(shortRested.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          expended: 0,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: shortRested, unitLibrary }),
    );

    expect(longRested.restFeatureUses).toEqual([]);
    expect(
      characterSheetMonkUncannyMetabolismUseState(longRested, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
        usedSinceLongRest: false,
      },
    });
  });

  test(uncannyMetabolismInitiativeRecoveryTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk", "class_monk", "class_monk", "class_monk"],
    });
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-initiative"),
        build: monkBuild,
        currentHp: Hp(10),
        tempHp: Hp(3),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(5),
          },
        ],
      }),
    );

    const recovered = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: spent,
        unitLibrary,
        martialArtsRoll: DieRollResult(7),
      }),
    );

    expect(characterSheetCurrentHp(recovered)).toBe(22);
    expect(characterSheetTempHp(recovered)).toBe(3);
    expect(recovered.resourceExpenditures).toEqual([]);
    expect(recovered.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
    expect(
      characterSheetMonkUncannyMetabolismUseState(recovered, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        healing: {
          martialArtsDie: { dice: 1, dieSize: 8 },
          monkLevelBonus: 5,
        },
        usedSinceLongRest: true,
      },
    });
    expect(characterSheetResources(recovered, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 5,
          expended: 0,
        }),
      ]),
    });

    const nearMaximum = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-cap"),
        build: monkBuild,
        currentHp: Hp(28),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const capped = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: nearMaximum,
        unitLibrary,
        martialArtsRoll: DieRollResult(8),
      }),
    );

    expect(characterSheetCurrentHp(capped)).toBe(30);
    expect(capped.resourceExpenditures).toEqual([]);
    expect(capped.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
  });

  test(uncannyMetabolismInitiativeGatesTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk", "class_monk", "class_monk", "class_monk"],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-gates"),
        build: monkBuild,
        currentHp: Hp(20),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet,
        unitLibrary,
        martialArtsRoll: DieRollResult(9),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Uncanny Metabolism Martial Arts die roll must be within d8.",
      },
    });

    const used = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet,
        unitLibrary,
        martialArtsRoll: DieRollResult(4),
      }),
    );
    expect(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: used,
        unitLibrary,
        martialArtsRoll: DieRollResult(4),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Uncanny Metabolism cannot be used again until a Long Rest.",
      },
    });
  });

  test(uncannyMetabolismRejectsUnownedUseStateTestName, () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:unowned-uncanny-metabolism"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      restFeatureUses: [
        {
          tag: "uncannyMetabolism",
          usedSinceLongRest: true,
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Uncanny Metabolism rest feature use requires the Monk Uncanny Metabolism feature.",
      },
    });
  });
});
