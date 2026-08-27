// KERNEL-COVERAGE: parity-witness SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
import {
  parseCharacterBuildMagicInitiateSpellAccesses,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Hp, resourceCount } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterSheetResources,
  characterSheetSpellAccessesForBuild,
  characterSheetSpellSlotSourceState,
  parseCharacterSheet,
  spendCharacterSheetSpellAccessFreeCast,
} from "./index.ts";
import {
  characterSheetId,
  armorClassBuild,
  completeLongRest,
  completeShortRest,
  rebuildCharacterSheetFixture,
  requireRight,
  unitLibrary,
  wizardBuild,
} from "./test-support.test-support.ts";

const magicInitiateSourceUnitId = authoredUnitId("feat_magic_initiate_wizard");
const magicInitiateLevelOneSpellId = authoredUnitId("mage_armor");

function magicInitiateWizardBuild(): CharacterBuild {
  return {
    ...wizardBuild({ wizardAdvancements: 0 }),
    background: authoredUnitId("background_sage"),
    magicInitiateSpellAccesses: [
      {
        featUnitId: magicInitiateSourceUnitId,
        spellcastingAbility: "cha",
        cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")],
        levelOneSpell: magicInitiateLevelOneSpellId,
      },
    ],
  };
}

function magicInitiateSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:synthetic-magic-initiate"),
      build: magicInitiateWizardBuild(),
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

describe("Character Sheet Spell Access free casts", () => {
  test("projects class-feature and Magic Initiate access from their canonical build sources", () => {
    const accesses = characterSheetSpellAccessesForBuild({
      build: magicInitiateWizardBuild(),
      unitLibrary,
    });

    expect(accesses).toEqual(
      expect.arrayContaining([
        {
          source: "magicInitiate",
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: authoredUnitId("fire_bolt"),
          spellcastingAbility: "cha",
          preparation: "learnedCantrip",
        },
        {
          source: "magicInitiate",
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
          spellcastingAbility: "cha",
          preparation: "alwaysPrepared",
        },
      ]),
    );

    const clericBuild: CharacterBuild = {
      ...armorClassBuild({
        startingClass: "class_cleric",
        advancements: ["class_cleric", "class_cleric"],
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_cleric"),
            unitId: authoredUnitId("subclass_cleric_life_domain"),
          },
        ],
      }),
      spellcasting: {
        sources: [
          {
            sourceUnitId: authoredUnitId("class_cleric"),
            spellcastingAbility: "wis",
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: ["holy_symbol"],
          },
        ],
        slotPools: {
          spellcasting: {
            kind: "spellcasting",
            slots: [{ spellLevel: 1, count: resourceCount(4) }],
          },
        },
      },
    };
    const classFeatureAccesses = characterSheetSpellAccessesForBuild({
      build: clericBuild,
      unitLibrary,
    });
    expect(classFeatureAccesses).toContainEqual({
      source: "classFeature",
      sourceUnitId: authoredUnitId("cleric_life_domain_spells"),
      spellId: authoredUnitId("bless"),
      spellcastingAbility: "wis",
      preparation: "alwaysPrepared",
    });
  });

  test("spends exactly one source-and-spell free cast without spending a Spell Slot", () => {
    const sheet = magicInitiateSheet();
    const slotsBefore = characterSheetSpellSlotSourceState(sheet);
    const spent = requireRight(
      spendCharacterSheetSpellAccessFreeCast({
        sheet,
        unitLibrary,
        resource: {
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
        },
      }),
    );

    expect(spent.resourceExpenditures).toContainEqual({
      tag: "spellAccessFreeCast",
      sourceUnitId: magicInitiateSourceUnitId,
      spellId: magicInitiateLevelOneSpellId,
      expended: resourceCount(1),
    });
    expect(characterSheetSpellSlotSourceState(spent)).toEqual(slotsBefore);
    expect(
      spendCharacterSheetSpellAccessFreeCast({
        sheet: spent,
        unitLibrary,
        resource: {
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Spell Access free cast is exhausted." },
    });
  });

  test("Short Rest preserves and Long Rest restores a spent free cast", () => {
    const spent = requireRight(
      spendCharacterSheetSpellAccessFreeCast({
        sheet: magicInitiateSheet(),
        unitLibrary,
        resource: {
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
        },
      }),
    );
    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );
    expect(shortRested.resourceExpenditures).toEqual(
      spent.resourceExpenditures,
    );
    const longRested = requireRight(
      completeLongRest({ sheet: shortRested, unitLibrary }),
    );
    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "spellAccessFreeCast",
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
          count: 1,
          expended: 0,
        }),
      ]),
    });
  });

  test("stored sheets round-trip the mandatory access and reject invalid access or expenditure keys", () => {
    const spent = requireRight(
      spendCharacterSheetSpellAccessFreeCast({
        sheet: magicInitiateSheet(),
        unitLibrary,
        resource: {
          sourceUnitId: magicInitiateSourceUnitId,
          spellId: magicInitiateLevelOneSpellId,
        },
      }),
    );
    expect(
      parseCharacterSheet(JSON.parse(JSON.stringify(spent)), unitLibrary),
    ).toMatchObject({ _tag: "Right", right: spent });

    const missingAccess = JSON.parse(JSON.stringify(spent));
    delete missingAccess.build.magicInitiateSpellAccesses;
    expect(parseCharacterSheet(missingAccess, unitLibrary)).toMatchObject({
      _tag: "Left",
      left: {
        message: "Character Build requires Magic Initiate Spell Accesses.",
      },
    });

    const invalidExpenditure = JSON.parse(JSON.stringify(spent));
    invalidExpenditure.resourceExpenditures[0].spellId =
      "synthetic_other_spell";
    expect(
      Result.isFailure(parseCharacterSheet(invalidExpenditure, unitLibrary)),
    ).toBe(true);

    const duplicateExpenditure = JSON.parse(JSON.stringify(spent));
    duplicateExpenditure.resourceExpenditures.push(
      duplicateExpenditure.resourceExpenditures[0],
    );
    expect(
      Result.isFailure(parseCharacterSheet(duplicateExpenditure, unitLibrary)),
    ).toBe(true);
  });

  test("stored reconstruction rejects duplicate and accepts distinct Magic Initiate spell lists", () => {
    const duplicateList = JSON.parse(JSON.stringify(magicInitiateSheet()));
    duplicateList.build.species = "species_human";
    duplicateList.build.features = [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "species_human_versatile",
        unitId: "feat_magic_initiate_wizard",
      },
    ];
    expect(parseCharacterSheet(duplicateList, unitLibrary)).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Character Build cannot acquire Magic Initiate more than once for the same spell list.",
        ),
      },
    });

    const distinctLists = JSON.parse(JSON.stringify(magicInitiateSheet()));
    distinctLists.build.species = "species_human";
    distinctLists.build.features = [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "species_human_versatile",
        unitId: "feat_magic_initiate_cleric",
      },
    ];
    distinctLists.build.magicInitiateSpellAccesses.push({
      featUnitId: "feat_magic_initiate_cleric",
      spellcastingAbility: "wis",
      cantrips: ["guidance", "sacred_flame"],
      levelOneSpell: "bless",
    });
    expect(parseCharacterSheet(distinctLists, unitLibrary)).toMatchObject({
      _tag: "Right",
    });
  });

  test("creation-owned parsing accumulates independent invalid access entries", () => {
    const build = magicInitiateWizardBuild();
    const parsed = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [
        {
          ...build.magicInitiateSpellAccesses[0],
          cantrips: ["synthetic_not_a_cantrip", "light"],
        },
        null,
      ],
      build,
      unitLibrary,
    });

    expect(Result.isFailure(parsed)).toBe(true);
    if (Result.isFailure(parsed)) {
      expect(parsed.failure.map((issue) => issue.index)).toEqual(
        expect.arrayContaining([0, 1]),
      );
    }
  });
});
