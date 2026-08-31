import { Schema } from "effect";

export const BattleRoundSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("PositiveInteger"),
  Schema.brand("Round"),
);
