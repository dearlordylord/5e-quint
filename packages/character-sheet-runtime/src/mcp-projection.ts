import { Schema } from "effect";

const JsonRecordSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});

const CharacterSheetHitPointsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("positive"),
    currentHp: Schema.Number,
    tempHp: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("knockedOut"),
    tempHp: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("zero"),
    lifecycle: Schema.Unknown,
    tempHp: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
);

const CharacterSheetCommonSchema = {
  tag: Schema.Literal("available"),
  characterId: Schema.String,
  build: JsonRecordSchema,
  hitPointMaximumReduction: Schema.Number,
  exhaustionLevel: Schema.Literal(0, 1, 2, 3, 4, 5, 6),
  hitPoints: CharacterSheetHitPointsSchema,
  conditions: Schema.Array(Schema.String),
  spentHitDice: Schema.Array(Schema.Unknown),
  restFeatureUses: Schema.Array(Schema.Unknown),
  resourceExpenditures: Schema.Array(Schema.Unknown),
  heroicInspiration: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("none") }),
    Schema.Struct({ tag: Schema.Literal("available") }),
  ),
  companion: Schema.Unknown,
  druidWildShapeKnownForms: Schema.optionalWith(Schema.Unknown, {
    exact: true,
  }),
  druidCircleLand: Schema.optionalWith(Schema.Unknown, { exact: true }),
  fiendishResilience: Schema.optionalWith(Schema.Unknown, { exact: true }),
} as const;

/**
 * The MCP wire projection of the canonical Character Sheet. The runtime owns
 * the source state; this schema only describes its JSON boundary shape.
 */
export const CharacterSheetMcpProjectionSchema = Schema.Union(
  Schema.Struct({
    ...CharacterSheetCommonSchema,
    bookOfShadowsPresence: Schema.optionalWith(Schema.Unknown, {
      exact: true,
    }),
    spellSlotExpenditures: Schema.Array(Schema.Unknown),
    createdSpellSlots: Schema.Array(Schema.Unknown),
    pactSlotExpenditure: Schema.optionalWith(Schema.Unknown, {
      exact: true,
    }),
  }),
  Schema.Struct(CharacterSheetCommonSchema),
);

export type CharacterSheetMcpProjection = Schema.Schema.Type<
  typeof CharacterSheetMcpProjectionSchema
>;
