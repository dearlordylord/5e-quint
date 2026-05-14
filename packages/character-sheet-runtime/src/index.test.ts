import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
} from "@dnd/character-creation-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks, timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  applyLayOnHands,
  characterSheetArmorClassState,
  characterSheetHitDice,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellInvocation,
  characterSheetSpellSlots,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  characterSheetId,
  characterSheetTempHp,
  parseCharacterSheet,
  timePassed,
  type CharacterSheet,
  type CharacterSheetInput,
} from "./index.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.armor-class-base-formula
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spellbook-ritual-invocation

const build = armorClassBuild({ startingClass: "class_fighter" });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const layOnHandsSpendsHealingPoolTestName =
  "Lay On Hands spends one healing pool for HP restoration and Poisoned removal";
const layOnHandsRejectsDivergentPoolsTestName =
  "Lay On Hands cannot split HP and Poisoned costs across divergent pools";
const layOnHandsLongRestRecoveryTestName =
  "Long Rest restores the Lay On Hands healing pool";
const ritualAdeptAdmitsSpellbookRitualTestName =
  "admits Wizard Ritual Adept for a ritual-tagged Spell Definition in the spellbook";
const ritualAdeptRejectsPreparedOnlySpellTestName =
  "rejects Wizard Ritual Adept when a ritual spell is prepared but absent from the spellbook";
const ritualAdeptRejectsNonRitualSpellTestName =
  "rejects Wizard Ritual Adept for a spellbook spell without the Ritual tag";
const ritualAdeptRejectsMissingFeatureTestName =
  "rejects spellbook ritual invocation without a spellbook Ritual Access feature";

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions"> &
    Partial<Pick<CharacterSheetInput, "conditions">>,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    ...input,
  });
}

describe("Character Sheet runtime", () => {
  test("creates a fresh non-spellcasting Character Sheet at current HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(sheet.right.hitPoints).toEqual({
        tag: "positive",
        currentHp: 12,
        tempHp: 0,
      });
    }
  });

  test("stores Temporary Hit Points as in-play HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(5),
      unitLibrary,
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(characterSheetTempHp(sheet.right)).toBe(5);
    }
  });

  test("rejects contradictory positive and zero-HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 0, failures: 0 },
      },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects current HP above sheet maximum HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(13),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects stored sheets with malformed Character Build shape", () => {
    const sheet = parseCharacterSheet(
      {
        tag: "available",
        characterId: "character:test",
        build: {
          progression: {},
          background: "background_soldier",
          species: "species_orc",
          abilityScores: {},
          proficiencyChoices: [],
          features: [],
          equipment: {},
        },
        maximumHp: 12,
        hitPoints: { tag: "positive", currentHp: 12 },
        spentHitDice: [],
      },
      unitLibrary,
    );

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("round-trips stored Book of Shadows Spell Access through sheet parsing", () => {
    const bookOfShadows = {
      tag: "bookOfShadows",
      cantrips: ["fire_bolt", "spare_the_dying", "minor_illusion"],
      ritualSpells: ["detect_magic", "detect_poison_and_disease"],
      spellcastingFocus: "book_of_shadows",
    };
    const sheet = parseCharacterSheet(
      {
        tag: "available",
        characterId: "character:test",
        build: {
          ...armorClassBuild({ startingClass: "class_warlock" }),
          features: [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: "warlock_eldritch_invocations",
              invocationId: "pact_of_the_tome",
            },
          ],
          spellcasting: {
            sources: [
              {
                sourceUnitId: "class_warlock",
                spellcastingAbility: "cha",
                cantrips: [],
                spellbook: [],
                preparedSpells: [],
                spellcastingFocuses: ["arcane_focus"],
                bookOfShadows,
              },
            ],
            slotPools: {
              pactMagic: {
                kind: "pactMagic",
                slotLevel: 1,
                count: 1,
              },
            },
          },
        },
        maximumHp: 12,
        hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
        bookOfShadowsPresence: { tag: "notOnPerson" },
        conditions: [],
        spentHitDice: [],
        resourceExpenditures: [],
        spellSlotExpenditures: [],
        pactSlotExpenditure: { slotLevel: 1, count: 1, expended: 0 },
      },
      unitLibrary,
    );

    if (Either.isLeft(sheet)) {
      throw new Error(
        `Expected parsed sheet, got ${JSON.stringify(sheet.left)}`,
      );
    }
    expect(sheet.right.build.spellcasting?.sources[0]?.bookOfShadows).toEqual(
      bookOfShadows,
    );
    expect(sheet.right.bookOfShadowsPresence).toEqual({ tag: "notOnPerson" });
  });

  test("timePassed accumulates Stable recovery time before one hour can pass", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-round"),
      duration: requireRight(timeSpanDuration({ unit: "round", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      elapsedTicks: 1,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 1,
            },
          },
        },
      },
    });
  });

  test("timePassed asks for a Stable recovery roll at the one-hour boundary", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-roll"),
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
      holes: [
        {
          kind: "rolledDice",
          holeId: "character-sheet:character:stable-roll:stable-recovery-roll",
          label: "Stable recovery 1d4 hours",
        },
      ],
    });
  });

  test("timePassed reaches the Stable recovery roll boundary across multiple calls", () => {
    const firstHalfHour = timePassed({
      sheet: stableSheet("character:stable-halves"),
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });
    if (firstHalfHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHalfHour.tag}.`);
    }

    const secondHalfHour = timePassed({
      sheet: firstHalfHour.sheet,
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });

    expect(secondHalfHour).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
    });
  });

  test("timePassed rejects a Stable recovery roll before the one-hour boundary", () => {
    const sheet = stableSheet("character:stable-early-roll");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    expect(
      timePassed({
        sheet,
        duration: requireRight(
          timeSpanDuration({ unit: "minute", amount: 30 }),
        ),
        fills: [
          {
            kind: "rolledDice",
            holeId: awaitingRoll.holes[0].holeId,
            value: [{ results: [DieRollResult(1)] }],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("timePassed consumes a Stable recovery roll and recovers after the rolled duration", () => {
    const sheet = stableSheet("character:stable-recovery");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    const firstHour = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [
        {
          kind: "rolledDice",
          holeId: awaitingRoll.holes[0].holeId,
          value: [{ results: [DieRollResult(2)] }],
        },
      ],
    });

    expect(firstHour).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: { kind: "regains1HpAfter", remaining: 600 },
          },
        },
      },
    });
    if (firstHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHour.tag}.`);
    }

    expect(
      timePassed({
        sheet: firstHour.sheet,
        duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
        fills: [],
      }),
    ).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: { hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 } },
    });
  });

  test("derives default unarmored Armor Class from Dexterity", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("derives Barbarian Unarmored Defense and still allows Shield bonus", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          shield: true,
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(state)).toBe(15);
  });

  test("suppresses Monk Unarmored Defense while wielding a Shield", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_monk", shield: true }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("requires an Armor Class base choice when multiple class formulas apply", () => {
    const result = characterSheetArmorClassState({
      build: armorClassBuild({
        startingClass: "class_barbarian",
        advancements: ["class_monk"],
      }),
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects missing class-feature Units while deriving Armor Class base formulas", () => {
    const result = characterSheetArmorClassState({
      build: {
        ...armorClassBuild({ startingClass: "class_fighter" }),
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "class_fighter",
            unitId: "missing_unarmored_defense",
          },
        ],
      },
      unitLibrary,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { message: "Unknown Unit id: missing_unarmored_defense" },
    });
  });

  test("uses the selected Armor Class base formula for multiclass characters", () => {
    const monkState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "monk_unarmored_defense",
        },
      }),
    );
    const barbarianState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "barbarian_unarmored_defense",
        },
      }),
    );

    expect(monkState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(monkState)).toBe(15);
    expect(barbarianState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(barbarianState)).toBe(13);
  });

  test("uses worn armor instead of unarmored base formulas", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          armor: "armor_chain_mail",
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "armor",
      category: "heavy",
    });
    expect(currentArmorClass(state)).toBe(16);
  });

  test("Long Rest restores HP, Spell Slots, Pact Slots, and Arcane Recovery use", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:long-rest"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(12),
        currentHp: Hp(4),
        tempHp: Hp(3),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(2),
          },
        ],
        pactSlots: {
          slotLevel: spellSlotLevel(1),
          count: resourceCount(1),
          expended: resourceCount(1),
        },
        restFeatureUses: [
          {
            tag: "arcaneRecovery",
            usedSinceLongRest: true,
          },
        ],
      }),
    );

    const rested = requireRight(completeLongRest({ sheet }));

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 12,
      tempHp: 0,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1, spent: 0 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 0 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(rested.restFeatureUses).toEqual([]);
  });

  test(layOnHandsSpendsHealingPoolTestName, () => {
    const source = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin"),
        build: armorClassBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const target = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        maximumHp: Hp(10),
        currentHp: Hp(3),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    const result = requireRight(
      applyLayOnHands({
        source,
        target,
        unitLibrary,
        restoreHp: Hp(2),
        removePoisoned: true,
      }),
    );

    expect(result.target.hitPoints).toEqual({
      tag: "positive",
      currentHp: 5,
      tempHp: 0,
    });
    expect(result.target.conditions).toEqual([]);
    expect(characterSheetResources(result.source, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "paladin_lay_on_hands",
          count: 10,
          expended: 7,
        },
      ],
    });
  });

  test(layOnHandsRejectsDivergentPoolsTestName, () => {
    const target = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-self"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        maximumHp: Hp(12),
        currentHp: Hp(6),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    expect(
      applyLayOnHands({
        source: target,
        target,
        unitLibrary,
        restoreHp: Hp(1),
        removePoisoned: true,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Lay On Hands cannot spend more healing pool than remains.",
      },
    });
  });

  test(layOnHandsLongRestRecoveryTestName, () => {
    const source = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-rest"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        maximumHp: Hp(12),
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const spent = requireRight(
      applyLayOnHands({
        source,
        target: source,
        unitLibrary,
        restoreHp: Hp(4),
        removePoisoned: false,
      }),
    ).source;

    const rested = requireRight(completeLongRest({ sheet: spent }));

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "paladin_lay_on_hands",
          count: 5,
          expended: 0,
        },
      ],
    });
  });

  test("Long Rest restores the Favored Enemy Hunter's Mark free-cast pool", () => {
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:ranger-rest"),
        build: armorClassBuild({ startingClass: "class_ranger" }),
        maximumHp: Hp(12),
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

    const rested = requireRight(completeLongRest({ sheet: spent }));

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

  test("Short Rest restores Pact Slots without touching ordinary Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-pact"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
        pactSlots: {
          slotLevel: spellSlotLevel(1),
          count: resourceCount(1),
          expended: resourceCount(1),
        },
      }),
    );

    const rested = requireRight(completeShortRest({ sheet, unitLibrary }));

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
  });

  test("Short Rest spends Hit Dice to restore HP without touching Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(18),
        currentHp: Hp(7),
        tempHp: Hp(2),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 12,
      tempHp: 2,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 1 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 3, expended: 1 },
    ]);
  });

  test("Short Rest applies minimum healing to each spent Hit Die", () => {
    const lowConWizardBuild: CharacterBuild = {
      ...wizardBuild({ wizardAdvancements: 1 }),
      abilityScores: expectRight(
        abilityScoreAssignment({
          str: 13,
          dex: 14,
          con: 8,
          int: 16,
          wis: 12,
          cha: 10,
        }),
      ),
    };
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-minimum-hit-dice"),
        build: lowConWizardBuild,
        maximumHp: Hp(18),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
        ],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 9,
      tempHp: 0,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 2 },
    ]);
  });

  test("Short Rest rejects spending more Hit Dice than remain", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-spent-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 0 }),
        maximumHp: Hp(8),
        currentHp: Hp(4),
        tempHp: Hp(0),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Short Rest cannot spend more Hit Dice than remain." },
    });
  });

  test("Arcane Recovery refunds expended ordinary Spell Slots once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery"),
        build: wizardBuild({ wizardAdvancements: 3 }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(2),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
          ],
        },
      }),
    );

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 4, expended: 2 },
      { spellLevel: 2, count: 3, expended: 0 },
    ]);
    expect(rested.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(
      completeShortRest({
        sheet: rested,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery cannot be used again until a Long Rest.",
      },
    });
  });

  test("Arcane Recovery rejects refunds above its level budget", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery-budget"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(2) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery refund exceeds half Wizard level rounded up.",
      },
    });
  });

  test("rejects Arcane Recovery use state for sheets without the feature", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:arcane-recovery-non-owner"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      restFeatureUses: [
        {
          tag: "arcaneRecovery",
          usedSinceLongRest: true,
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      },
    });
  });

  test(ritualAdeptAdmitsSpellbookRitualTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-ritual",
      spellbook: ["detect_magic"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        tag: "spellbookRitual",
        spellId: "detect_magic",
        spellLevel: 1,
        spellcastingSourceUnitId: "class_wizard",
        featureUnitId: "wizard_ritual_adept",
        spellSlotCost: { kind: "none" },
        preparationRequirement: "not_required",
        requiredSpellAccess: "spellbook",
        additionalCastingTimeMinutes: 10,
        requiresReadingSpellbook: true,
      },
    });
    expect(characterSheetSpellSlots(sheet)).toEqual([
      { spellLevel: 1, count: 2, expended: 0 },
    ]);
  });

  test(ritualAdeptRejectsPreparedOnlySpellTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-prepared-not-book",
      spellbook: [],
      preparedSpells: ["detect_magic"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Wizard Ritual Adept requires the spell in the spellbook.",
      },
    });
  });

  test(ritualAdeptRejectsNonRitualSpellTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-non-ritual",
      spellbook: ["mage_armor"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "mage_armor",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Ritual spell invocation requires a ritual-tagged Spell Definition.",
      },
    });
  });

  test(ritualAdeptRejectsMissingFeatureTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:no-ritual-feature",
      spellbook: ["detect_magic"],
      startingClass: "class_fighter",
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spellbook ritual invocation requires a spellbook Ritual Access feature.",
      },
    });
  });
});

function stableSheet(characterIdText: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterIdText),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(0),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
      },
    }),
  );
}

function spellbookRitualSheet(input: {
  readonly characterIdText: string;
  readonly spellbook: readonly string[];
  readonly preparedSpells?: readonly string[];
  readonly startingClass?: string;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterIdText),
      build: {
        ...wizardBuild({ wizardAdvancements: 0 }),
        ...(input.startingClass === undefined
          ? {}
          : {
              progression: {
                startingClass: classUnitId(input.startingClass),
                advancements: [],
              },
            }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_wizard",
              spellcastingAbility: "int",
              cantrips: [],
              spellbook: input.spellbook,
              preparedSpells: input.preparedSpells ?? [],
              spellcastingFocuses: ["spellbook"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 1, count: 2 }],
            },
          },
        },
      },
      maximumHp: Hp(8),
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: string;
  readonly shield?: boolean;
}): CharacterBuild {
  const armorItemId =
    input.armor === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "armor",
          unitId: expectRight(characterEquipmentItemUnitId(input.armor)),
        });
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: expectRight(characterEquipmentItemUnitId("equipment_shield")),
        })
      : undefined;
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: input.armor }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function wizardBuild(input: {
  readonly wizardAdvancements: number;
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_wizard",
      advancements: Array.from(
        { length: input.wizardAdvancements },
        () => "class_wizard",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots:
            input.wizardAdvancements >= 3
              ? [
                  { spellLevel: 1, count: 4 },
                  { spellLevel: 2, count: 3 },
                ]
              : [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    ...wizardBuild({ wizardAdvancements: 0 }),
    spellcasting: {
      ...wizardBuild({ wizardAdvancements: 0 }).spellcasting!,
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
