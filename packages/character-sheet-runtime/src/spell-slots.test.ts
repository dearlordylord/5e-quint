// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.font-of-magic-slot-to-sorcery-points
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.font-of-magic-sorcery-points-to-spell-slot
import { describe, expect, test } from "vitest";
import {
  Hp,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  characterSheetId,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  completeLongRest,
  convertFontOfMagicSorceryPointsToSpellSlot,
  convertFontOfMagicSpellSlotToSorceryPoints,
  createFreshCharacterSheet,
  parseCharacterSheet,
  requireRight,
  resourceCount,
  sorcererFontOfMagicBuild,
  sorcererFontOfMagicSlotConversionGateTestName,
  sorcererFontOfMagicSlotConversionTestName,
  sorcererFontOfMagicSlotCreationGateTestName,
  sorcererFontOfMagicSlotCreationTestName,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
  warlockMagicalCunningBuild,
  wizardBuild,
} from "./test-support.ts";

describe("Character Sheet runtime / spell slots", () => {
  test("projects absent ordinary Spell Slot expenditure as zero against build capacity", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:wizard-zero-slots"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(characterSheetSpellSlotSourceState(sheet)).toEqual({
      ordinarySpellSlotExpenditures: [],
      createdSpellSlots: [],
    });
    expect(characterSheetSpellSlots(sheet)).toEqual([
      { spellLevel: 1, count: 3, expended: 0 },
    ]);
  });

  test("projects absent Pact Slot expenditure as zero against build capacity", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:warlock-zero-pact"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 0,
          pactSlotCount: 1,
          pactSlotLevel: 1,
        }),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(characterSheetPactSlots(sheet)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
  });

  test("rejects nonzero ordinary Spell Slot expenditure above build capacity", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:wizard-slot-over-capacity"),
      build: wizardBuild({ wizardAdvancements: 1 }),
      tempHp: Hp(0),
      unitLibrary,
      spellSlotExpenditures: [
        {
          spellLevel: spellSlotLevel(1),
          expended: resourceCount(4),
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message: "Spell Slot state does not match build capacity for level 1.",
      },
    });
  });

  test("rejects stored ordinary Spell Slot expenditure records with stale capacity keys", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-spell-slot-expenditure",
          build: wizardBuild({ wizardAdvancements: 1 }),
        }),
        spellSlotExpenditures: [{ spellLevel: 1, count: 3, expended: 0 }],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spell Slot expenditure state must contain exactly spell level and expended count.",
      },
    });
  });

  test("rejects stored created Spell Slot records with unsupported extra keys", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-created-spell-slot",
          build: wizardBuild({ wizardAdvancements: 1 }),
        }),
        createdSpellSlots: [
          { spellLevel: 2, count: 1, expended: 0, restoredBy: "longRest" },
        ],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Created Spell Slot state must contain exactly spell level, count, and expended count.",
      },
    });
  });

  test(sorcererFontOfMagicSlotConversionTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 2,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-convert"),
        build: sorcererBuild,
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(2), expended: resourceCount(1) },
        ],
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(3),
          },
        ],
      }),
    );

    const converted = requireRight(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    );

    expect(characterSheetSpellSlots(converted)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 2, expended: 2 },
    ]);
    expect(characterSheetResources(converted, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 3,
          expended: 1,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicSlotConversionGateTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild();
    const capped = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-capped"),
        build: sorcererBuild,
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [],
      }),
    );

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: capped,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion would exceed the Sorcery Point maximum.",
      },
    });

    const spentSlots = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-no-slot"),
        build: sorcererBuild,
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(3) },
        ],
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
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: spentSlots,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires an unexpended ordinary Spell Slot.",
      },
    });

    const wizard = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-wizard"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
        ],
      }),
    );

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: wizard,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires the Sorcerer Font of Magic feature.",
      },
    });
  });

  test(sorcererFontOfMagicSlotCreationTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 4,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create"),
        build: sorcererBuild,
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    expect(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-aggregate"),
        build: sorcererBuild,
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(3), expended: resourceCount(3) },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Spell Slot state does not match build capacity for level 3.",
      },
    });

    const created = requireRight(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    );

    expect(characterSheetSpellSlots(created)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 0 },
    ]);
    expect(characterSheetResources(created, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 5,
        }),
      ]),
    });

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: created,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires a Spell Slot source when ordinary and created Spell Slots are both available.",
      },
    });

    const createdSlotConverted = requireRight(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: created,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
        spellSlotSource: "created",
      }),
    );
    expect(characterSheetSpellSlotSourceState(createdSlotConverted)).toEqual({
      ordinarySpellSlotExpenditures: [],
      createdSpellSlots: [{ spellLevel: 3, count: 1, expended: 1 }],
    });
    expect(characterSheetSpellSlots(createdSlotConverted)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 1 },
    ]);
    expect(
      characterSheetResources(createdSlotConverted, unitLibrary),
    ).toMatchObject({
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

    if (
      !("spellSlotExpenditures" in created) ||
      !("createdSpellSlots" in created)
    ) {
      throw new Error(
        "Expected Font of Magic sheet to carry Spell Slot state.",
      );
    }
    const parsedWithExpendedCreatedSlot = requireRight(
      parseCharacterSheet(
        {
          ...created,
          createdSpellSlots: created.createdSpellSlots.map((slot) =>
            slot.spellLevel === spellSlotLevel(3)
              ? { ...slot, expended: resourceCount(1) }
              : slot,
          ),
        },
        unitLibrary,
      ),
    );
    if (
      !("spellSlotExpenditures" in parsedWithExpendedCreatedSlot) ||
      !("createdSpellSlots" in parsedWithExpendedCreatedSlot)
    ) {
      throw new Error(
        "Expected parsed Font of Magic sheet to carry Spell Slot state.",
      );
    }
    expect(parsedWithExpendedCreatedSlot.spellSlotExpenditures).toEqual([]);
    expect(parsedWithExpendedCreatedSlot.createdSpellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);
    expect(characterSheetSpellSlots(parsedWithExpendedCreatedSlot)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 1 },
    ]);

    const longRested = requireRight(
      completeLongRest({ sheet: created, unitLibrary }),
    );

    expect(characterSheetSpellSlots(longRested)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 2, expended: 0 },
    ]);
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

  test(sorcererFontOfMagicSlotCreationGateTestName, () => {
    const levelTwoSorcerer = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create-level"),
        build: sorcererFontOfMagicBuild(),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: levelTwoSorcerer,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires Sorcerer level 3 for a level 2 Spell Slot.",
      },
    });

    const lowPoints = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create-points"),
        build: sorcererFontOfMagicBuild({
          sorcererAdvancements: 2,
          spellSlots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 2 },
          ],
        }),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: lowPoints,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
      },
    });

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: lowPoints,
        unitLibrary,
        spellLevel: spellSlotLevel(6),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires a Creating Spell Slots table entry.",
      },
    });
  });
});
