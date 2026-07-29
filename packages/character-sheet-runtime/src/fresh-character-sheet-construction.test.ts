import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  Hp,
  build,
  characterSheetId,
  druidCircleLandBuild,
  druidLevelFiveWildShapeFixtureKnownFormStatBlockIds,
  resourceCount,
  unitLibrary,
  wizardBuild,
} from "./test-support.test-support.ts";
import {
  FreshCharacterSheetProjectionSchema,
  CharacterSheetConstructionIssuesSchema,
  characterSheetConstructionIssuesSummary,
  createFreshCharacterSheet,
  freshCharacterSheetProjection,
  isFreshSpellcastingCharacterSheet,
} from "./index.ts";

describe("fresh Character Sheet construction", () => {
  test("returns freshness-narrowed facts with one spelling for empty state", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:fresh"),
      build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    });

    if (Either.isLeft(result)) {
      throw new Error(
        `Valid fresh fixture must construct: ${JSON.stringify(result.left)}`,
      );
    }

    const zeroReduction: 0 = result.right.hitPointMaximumReduction;
    const noConditions: readonly [] = result.right.conditions;
    expect([zeroReduction, noConditions]).toEqual([0, []]);

    const projection = freshCharacterSheetProjection(result.right);
    expect(projection).toMatchObject({
      hitPointMaximumReduction: 0,
      exhaustionLevel: 0,
      hitPoints: { tag: "positive", currentHp: 11, tempHp: 0 },
      conditions: [],
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      heroicInspiration: { tag: "none" },
      companion: { tag: "none" },
    });
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })(projection),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })({ ...projection, displayName: "presentation must stay outside" }),
      ),
    ).toBe(true);
  });

  test("accumulates independent HP, Spell Slot, Pact Slot, and feature-input issues", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:invalid-fresh-state"),
      build,
      positiveHpUnconscious: { tag: "knockedOut" },
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlotExpenditures: [],
      pactSlots: { expended: resourceCount(0) },
      druidWildShapeKnownFormStatBlockIds: [
        authoredStatBlockId("stat_block_rat"),
      ],
    });

    expect(result).toEqual(
      Either.left([
        { code: "hitPointStateInvalid" },
        { code: "spellSlotStateUnexpected" },
        { code: "pactSlotStateUnexpected" },
        { code: "wildShapeKnownFormsUnexpected" },
      ]),
    );
    if (Either.isLeft(result)) {
      expect(characterSheetConstructionIssuesSummary(result.left)).toBe(
        "hitPointStateInvalid; spellSlotStateUnexpected; pactSlotStateUnexpected; wildShapeKnownFormsUnexpected",
      );
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(CharacterSheetConstructionIssuesSchema, {
            onExcessProperty: "error",
          })(result.left),
        ),
      ).toBe(true);
    }
  });

  test("narrows fresh spellcasting expenditure state", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:fresh-spellcaster"),
      build: wizardBuild({ wizardAdvancements: 0 }),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    });

    if (Either.isLeft(result)) {
      throw new Error(
        `Valid fresh Druid fixture must construct: ${JSON.stringify(result.left)}`,
      );
    }
    if (!isFreshSpellcastingCharacterSheet(result.right)) {
      throw new Error("Expected a spellcasting fresh Character Sheet.");
    }
    const ordinaryExpenditures: readonly [] =
      result.right.spellSlotExpenditures;
    const createdSlots: readonly [] = result.right.createdSpellSlots;
    const pactExpenditure: undefined = result.right.pactSlotExpenditure;
    expect([ordinaryExpenditures, createdSlots, pactExpenditure]).toEqual([
      [],
      [],
      undefined,
    ]);
  });

  test("projects a valid fresh Druid roster through the nonempty schema", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:fresh-druid"),
      build: druidCircleLandBuild({ druidLevel: 5 }),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownFormStatBlockIds:
        druidLevelFiveWildShapeFixtureKnownFormStatBlockIds,
    });

    if (Either.isLeft(result)) {
      throw new Error(
        `Valid fresh Druid fixture must construct: ${JSON.stringify(result.left)}`,
      );
    }
    expect(freshCharacterSheetProjection(result.right)).toMatchObject({
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownForms: {
        statBlockIds: druidLevelFiveWildShapeFixtureKnownFormStatBlockIds,
      },
    });
  });

  test("returns one flat issue per independently invalid Wild Shape form", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:invalid-known-forms"),
      build: druidCircleLandBuild({ druidLevel: 5 }),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownFormStatBlockIds: [
        authoredStatBlockId("stat_block_rat"),
        authoredStatBlockId("stat_block_riding_horse"),
        authoredStatBlockId("stat_block_spider"),
        authoredStatBlockId("stat_block_wolf"),
        authoredStatBlockId("stat_block_goblin_warrior"),
        authoredStatBlockId("stat_block_missing"),
      ],
    });

    expect(result).toEqual(
      Either.left([
        {
          code: "wildShapeKnownFormWrongCreatureType",
          statBlockId: authoredStatBlockId("stat_block_goblin_warrior"),
        },
        {
          code: "wildShapeKnownFormUnavailable",
          statBlockId: authoredStatBlockId("stat_block_missing"),
        },
      ]),
    );
    if (Either.isLeft(result)) {
      expect(characterSheetConstructionIssuesSummary(result.left)).toBe(
        "wildShapeKnownFormWrongCreatureType: stat_block_goblin_warrior; wildShapeKnownFormUnavailable: stat_block_missing",
      );
    }
  });
});
