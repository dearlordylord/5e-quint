import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import Ajv2020 from "ajv/dist/2020.js";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  Hp,
  build,
  characterSheetId,
  createFreshCharacterSheet,
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
  freshCharacterSheetProjection,
  isFreshSpellcastingCharacterSheet,
  parseFreshCharacterSheet,
} from "./index.ts";
import { freshCharacterSheetFromParsedState } from "./fresh-character-sheet.ts";

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

    if (Result.isFailure(result)) {
      throw new Error(
        `Valid fresh fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }

    const zeroReduction: 0 = result.success.hitPointMaximumReduction;
    const noConditions: readonly [] = result.success.conditions;
    expect([zeroReduction, noConditions]).toEqual([0, []]);

    const projection = freshCharacterSheetProjection(result.success);
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
      Result.isSuccess(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })(projection),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })({ ...projection, displayName: "presentation must stay outside" }),
      ),
    ).toBe(true);
    const projectionSchema = Schema.toStandardJSONSchemaV1(
      FreshCharacterSheetProjectionSchema,
    )["~standard"].jsonSchema.output({ target: "draft-2020-12" });
    expect(JSON.stringify(projectionSchema)).toContain('"minItems":1');
  });

  test("parses a fresh nonspellcasting sheet and rejects retained play state", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:parsed-fresh-nonspellcaster"),
      build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    });
    if (Result.isFailure(result)) {
      throw new Error(
        `Valid nonspellcasting fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }

    const parsed = freshCharacterSheetFromParsedState(result.success);
    expect(parsed).toHaveProperty("_tag", "Success");
    if (Result.isSuccess(parsed)) {
      expect(parsed.success.conditions).toEqual([]);
      expect(parsed.success.hitPointMaximumReduction).toBe(0);
    }

    expect(
      parseFreshCharacterSheet(
        JSON.parse(JSON.stringify(result.success)),
        unitLibrary,
      ),
    ).toEqual(Result.succeed(result.success));

    expect(
      freshCharacterSheetFromParsedState({
        ...result.success,
        conditions: ["blinded"],
      }),
    ).toEqual(
      Result.fail("Fresh Character Sheet requires unspent initial play state."),
    );
  });

  test("parses a fresh spellcasting sheet and rejects spent spell slots", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:parsed-fresh-spellcaster"),
      build: wizardBuild({ wizardAdvancements: 0 }),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    });
    if (Result.isFailure(result)) {
      throw new Error(
        `Valid spellcasting fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }
    if (!isFreshSpellcastingCharacterSheet(result.success)) {
      throw new Error(
        "Expected the parsed fixture to retain spellcasting state.",
      );
    }

    const parsed = freshCharacterSheetFromParsedState(result.success);
    expect(parsed).toHaveProperty("_tag", "Success");
    if (Result.isSuccess(parsed)) {
      expect(parsed.success.spellSlotExpenditures).toEqual([]);
      expect(parsed.success.createdSpellSlots).toEqual([]);
      expect(parsed.success.pactSlotExpenditure).toBeUndefined();
    }

    expect(
      freshCharacterSheetFromParsedState({
        ...result.success,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
        ],
      }),
    ).toEqual(
      Result.fail("Fresh Character Sheet requires unspent initial play state."),
    );
  });

  test("rejects a valid stored sheet whose current HP is already depleted", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:depleted"),
      build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;

    expect(
      parseFreshCharacterSheet(
        {
          ...result.success,
          hitPoints: { ...result.success.hitPoints, currentHp: 1 },
        },
        unitLibrary,
      ),
    ).toEqual(
      Result.fail({
        tag: "characterSheetIssue",
        message: "Fresh Character Sheet requires full current Hit Points.",
      }),
    );
  });

  test("propagates malformed stored input through the fresh-sheet boundary", () => {
    expect(parseFreshCharacterSheet(null, unitLibrary)).toEqual(
      Result.fail({
        tag: "characterSheetIssue",
        message: "Expected Character Sheet.",
      }),
    );
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
      Result.fail([
        { code: "hitPointStateInvalid" },
        { code: "spellSlotStateUnexpected" },
        { code: "pactSlotStateUnexpected" },
        { code: "wildShapeKnownFormsUnexpected" },
      ]),
    );
    if (Result.isFailure(result)) {
      expect(characterSheetConstructionIssuesSummary(result.failure)).toBe(
        "hitPointStateInvalid; spellSlotStateUnexpected; pactSlotStateUnexpected; wildShapeKnownFormsUnexpected",
      );
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(CharacterSheetConstructionIssuesSchema, {
            onExcessProperty: "error",
          })(result.failure),
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

    if (Result.isFailure(result)) {
      throw new Error(
        `Valid fresh Druid fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }
    if (!isFreshSpellcastingCharacterSheet(result.success)) {
      throw new Error("Expected a spellcasting fresh Character Sheet.");
    }
    const ordinaryExpenditures: readonly [] =
      result.success.spellSlotExpenditures;
    const createdSlots: readonly [] = result.success.createdSpellSlots;
    expect([ordinaryExpenditures, createdSlots]).toEqual([[], []]);
    expect(result.success.pactSlotExpenditure).toBeUndefined();

    const spentPactSlot = {
      ...result.success,
      pactSlotExpenditure: { expended: resourceCount(1) },
    };
    expect(freshCharacterSheetFromParsedState(spentPactSlot)).toEqual(
      Result.fail("Fresh Character Sheet requires unspent initial play state."),
    );
    const projection = freshCharacterSheetProjection(result.success);
    const serialized: unknown = JSON.parse(JSON.stringify(projection));
    expect(serialized).not.toHaveProperty("bookOfShadowsPresence");
    expect(serialized).not.toHaveProperty("pactSlotExpenditure");
    const schema = Schema.toStandardJSONSchemaV1(
      FreshCharacterSheetProjectionSchema,
    )["~standard"].jsonSchema.output({ target: "draft-2020-12" });
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(serialized)).toBe(true);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })(serialized),
      ),
    ).toBe(true);

    const nullPresence: unknown = JSON.parse(
      JSON.stringify({ ...projection, bookOfShadowsPresence: null }),
    );
    expect(validate(nullPresence)).toBe(false);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })(nullPresence),
      ),
    ).toBe(true);

    const nullPactExpenditure: unknown = JSON.parse(
      JSON.stringify({ ...projection, pactSlotExpenditure: null }),
    );
    expect(validate(nullPactExpenditure)).toBe(false);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })(nullPactExpenditure),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        parseFreshCharacterSheet(
          { ...result.success, pactSlotExpenditure: null },
          unitLibrary,
        ),
      ),
    ).toBe(true);
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

    if (Result.isFailure(result)) {
      throw new Error(
        `Valid fresh Druid fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }
    expect(freshCharacterSheetProjection(result.success)).toMatchObject({
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownForms: {
        statBlockIds: druidLevelFiveWildShapeFixtureKnownFormStatBlockIds,
      },
    });
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
          onExcessProperty: "error",
        })({
          ...freshCharacterSheetProjection(result.success),
          druidWildShapeKnownForms: { statBlockIds: [] },
        }),
      ),
    ).toBe(true);
  });

  test("rejects empty or duplicate known-form ids at the projection boundary", () => {
    const result = createFreshCharacterSheet({
      characterId: characterSheetId("character:fresh-druid-schema-boundary"),
      build: druidCircleLandBuild({ druidLevel: 5 }),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      druidCircleLand: { land: "temperate" },
      druidWildShapeKnownFormStatBlockIds:
        druidLevelFiveWildShapeFixtureKnownFormStatBlockIds,
    });
    if (Result.isFailure(result)) {
      throw new Error(
        `Valid fresh Druid fixture must construct: ${JSON.stringify(result.failure)}`,
      );
    }
    const projection = freshCharacterSheetProjection(result.success);
    const knownForms = projection.druidWildShapeKnownForms;
    expect(knownForms).toBeDefined();
    if (knownForms === undefined) return;
    const decodeProjection = (statBlockIds: readonly string[]) =>
      Schema.decodeUnknownResult(FreshCharacterSheetProjectionSchema, {
        onExcessProperty: "error",
      })({
        ...projection,
        druidWildShapeKnownForms: { statBlockIds },
      });
    expect(Result.isFailure(decodeProjection([]))).toBe(true);
    const firstKnownForm = knownForms.statBlockIds[0];
    expect(firstKnownForm).toBeDefined();
    if (firstKnownForm === undefined) return;
    expect(
      Result.isFailure(decodeProjection([firstKnownForm, firstKnownForm])),
    ).toBe(true);
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
      Result.fail([
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
    if (Result.isFailure(result)) {
      expect(characterSheetConstructionIssuesSummary(result.failure)).toBe(
        "wildShapeKnownFormWrongCreatureType: stat_block_goblin_warrior; wildShapeKnownFormUnavailable: stat_block_missing",
      );
    }
  });
});
