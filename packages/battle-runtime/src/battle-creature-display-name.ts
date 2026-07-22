import { Schema } from "effect";

/** Authored creature label admitted for presentation output. */
export const BattleCreatureDisplayNameSchema =
  Schema.NonEmptyTrimmedString.annotations({
    identifier: "BattleCreatureDisplayName",
  });

export type BattleCreatureDisplayName =
  typeof BattleCreatureDisplayNameSchema.Type;
