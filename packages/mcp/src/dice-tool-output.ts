import { Schema } from "effect";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
);
const DieRollResultSchema = PositiveIntegerSchema.annotations({
  description: "A visible raw face in the inclusive range 1..dieSize.",
});

export const DiceRollGroupOutputSchema = Schema.Struct({
  dice: PositiveIntegerSchema,
  dieSize: PositiveIntegerSchema,
  results: Schema.NonEmptyArray(DieRollResultSchema),
}).annotations({
  description:
    "One ordered dice group and its visible raw faces. Results are not interpreted.",
});

export const RollDiceOutputSchema = Schema.Struct({
  correlationId: Schema.UUID.annotations({
    description:
      "A server-generated per-call correlation value. It is not retained as history or accepted as an idempotency key.",
  }),
  groups: Schema.NonEmptyArray(DiceRollGroupOutputSchema),
}).annotations({
  description:
    "Raw faces for each requested group in input order. The roller performs no rule interpretation or automatic fill.",
});

export type RollDiceResult = typeof RollDiceOutputSchema.Type;
