import { Schema } from "effect";

/** Authored creature label admitted for presentation output. */
export const BattleCreatureDisplayNameSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
  Schema.annotate({ identifier: "BattleCreatureDisplayName" }),
);

export type BattleCreatureDisplayName =
  typeof BattleCreatureDisplayNameSchema.Type;
