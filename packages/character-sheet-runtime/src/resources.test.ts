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
import type { CharacterSheetResourceExpenditure } from "./index.ts";
import type { CharacterBuild } from "./test-support.ts";
import {
  DieRollResult,
  DRUID_WILD_SHAPE_UNIT_ID,
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
  prayerOfHealingClericBuild,
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
  warlockMagicalCunningBuild,
  wizardBuild,
} from "./test-support.ts";

const monksFocusShortRestRecoveryTestName =
  "Short Rest restores the Monk Focus Point use pool";

type OverCapacityResourceCase = {
  readonly name: string;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly string[];
  readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
};

describe("Character Sheet runtime / resources", () => {
  test("projects omitted class-feature resource expenditures as zero from build-derived capacity", () => {
    const cases = [
      {
        sheet: requireRight(
          createFreshCharacterSheet({
            characterId: characterSheetId("character:resource-zero-paladin"),
            build: armorClassBuild({ startingClass: "class_paladin" }),
            currentHp: Hp(6),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
        resource: {
          unitId: "paladin_lay_on_hands",
          count: 5,
          expended: 0,
        },
      },
      {
        sheet: requireRight(
          createFreshCharacterSheet({
            characterId: characterSheetId("character:resource-zero-ranger"),
            build: armorClassBuild({ startingClass: "class_ranger" }),
            currentHp: Hp(8),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
        resource: {
          unitId: "ranger_favored_enemy",
          count: 2,
          expended: 0,
        },
      },
      {
        sheet: requireRight(
          createFreshCharacterSheet({
            characterId: characterSheetId("character:resource-zero-druid"),
            build: armorClassBuild({
              startingClass: "class_druid",
              advancements: ["class_druid"],
            }),
            currentHp: Hp(12),
            tempHp: Hp(0),
            unitLibrary,
            druidWildShapeKnownFormStatBlockIds: [
              "stat_block_rat",
              "stat_block_riding_horse",
              "stat_block_spider",
              "stat_block_wolf",
            ],
          }),
        ),
        resource: {
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 0,
        },
      },
      {
        sheet: requireRight(
          createFreshCharacterSheet({
            characterId: characterSheetId("character:resource-zero-monk"),
            build: armorClassBuild({
              startingClass: "class_monk",
              advancements: ["class_monk"],
            }),
            currentHp: Hp(12),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
        resource: {
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 0,
        },
      },
      {
        sheet: requireRight(
          createFreshCharacterSheet({
            characterId: characterSheetId("character:resource-zero-sorcerer"),
            build: sorcererFontOfMagicBuild(),
            currentHp: Hp(10),
            tempHp: Hp(0),
            unitLibrary,
          }),
        ),
        resource: {
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 2,
          expended: 0,
        },
      },
    ];

    for (const { sheet, resource } of cases) {
      expect(characterSheetResources(sheet, unitLibrary)).toMatchObject({
        _tag: "Right",
        right: expect.arrayContaining([expect.objectContaining(resource)]),
      });
      expect(sheet.resourceExpenditures).toEqual([]);
    }
  });

  const overCapacityResourceCases = [
    {
      name: "Lay On Hands healing pool",
      build: armorClassBuild({ startingClass: "class_paladin" }),
      resourceExpenditures: [
        { tag: "layOnHandsHealingPool", expended: resourceCount(6) },
      ],
    },
    {
      name: "Favored Enemy free cast pool",
      build: armorClassBuild({ startingClass: "class_ranger" }),
      resourceExpenditures: [
        {
          tag: "favoredEnemyHuntersMarkFreeCasts",
          expended: resourceCount(3),
        },
      ],
    },
    {
      name: "Paladin's Smite free cast pool",
      build: armorClassBuild({
        startingClass: "class_paladin",
        advancements: ["class_paladin"],
      }),
      resourceExpenditures: [
        {
          tag: "paladinsSmiteDivineSmiteFreeCast",
          expended: resourceCount(2),
        },
      ],
    },
    {
      name: "Wild Shape use-count pool",
      build: armorClassBuild({
        startingClass: "class_druid",
        advancements: ["class_druid"],
      }),
      druidWildShapeKnownFormStatBlockIds: [
        "stat_block_rat",
        "stat_block_riding_horse",
        "stat_block_spider",
        "stat_block_wolf",
      ],
      resourceExpenditures: [
        {
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          expended: resourceCount(3),
        },
      ],
    },
    {
      name: "Monk Focus use-count pool",
      build: armorClassBuild({
        startingClass: "class_monk",
        advancements: ["class_monk"],
      }),
      resourceExpenditures: [
        {
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          expended: resourceCount(3),
        },
      ],
    },
    {
      name: "Font of Magic Sorcery Point pool",
      build: sorcererFontOfMagicBuild(),
      resourceExpenditures: [
        {
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          expended: resourceCount(3),
        },
      ],
    },
  ] satisfies readonly OverCapacityResourceCase[];

  test.each(overCapacityResourceCases)(
    "rejects over-capacity $name expenditure",
    (input) => {
      const sheet = createFreshCharacterSheet({
        characterId: characterSheetId(`character:over-capacity-${input.name}`),
        build: input.build,
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
        ...(input.druidWildShapeKnownFormStatBlockIds === undefined
          ? {}
          : {
              druidWildShapeKnownFormStatBlockIds:
                input.druidWildShapeKnownFormStatBlockIds,
            }),
        resourceExpenditures: input.resourceExpenditures,
      });

      expect(sheet).toMatchObject({
        _tag: "Left",
        left: {
          message:
            "Character Sheet resource expenditure cannot exceed build resource capacity.",
        },
      });
    },
  );

  test.each([
    {
      name: "Arcane Recovery",
      build: wizardBuild({ wizardAdvancements: 0 }),
      extraStoredFields: {
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
      },
      use: {
        tag: "arcaneRecovery",
        usedSinceLongRest: true,
        count: 1,
      },
      message:
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
    },
    {
      name: "Magical Cunning",
      build: warlockMagicalCunningBuild({
        warlockAdvancements: 1,
        pactSlotCount: 1,
        pactSlotLevel: 1,
      }),
      extraStoredFields: {
        pactSlotExpenditure: { expended: 0 },
      },
      use: {
        tag: "magicalCunning",
        usedSinceLongRest: true,
        count: 1,
      },
      message:
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
    },
    {
      name: "Uncanny Metabolism",
      build: armorClassBuild({
        startingClass: "class_monk",
        advancements: ["class_monk"],
      }),
      extraStoredFields: {},
      use: {
        tag: "uncannyMetabolism",
        usedSinceLongRest: true,
        count: 1,
      },
      message:
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
    },
    {
      name: "Sorcerous Restoration",
      build: sorcererFontOfMagicBuild({ sorcererAdvancements: 4 }),
      extraStoredFields: {
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
      },
      use: {
        tag: "sorcerousRestoration",
        usedSinceLongRest: true,
        count: 1,
      },
      message:
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
    },
    {
      name: "spell recipient rest lockout",
      build: prayerOfHealingClericBuild(),
      extraStoredFields: {
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
      },
      use: {
        tag: "spellRecipientRestLockout",
        spellId: "prayer_of_healing",
        usedSinceLongRest: true,
        count: 1,
      },
      message:
        "Spell recipient rest lockout state must contain exactly tag, spell Unit id, and Long Rest use flag.",
    },
  ])("rejects stored $name rest use records with extra keys", (input) => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: `character:stale-rest-${input.name}`,
          build: input.build,
        }),
        ...input.extraStoredFields,
        restFeatureUses: [input.use],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: { message: input.message },
    });
  });

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
        currentHp: Hp(10),
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
        currentHp: Hp(17),
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
        currentHp: Hp(12),
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
        currentHp: Hp(27),
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
        currentHp: Hp(22),
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

    expect(characterSheetCurrentHp(capped)).toBe(33);
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
      currentHp: Hp(10),
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
