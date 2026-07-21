import { Schema } from "effect";

export const BattleRoundSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("PositiveInteger"),
  Schema.brand("Round"),
);
