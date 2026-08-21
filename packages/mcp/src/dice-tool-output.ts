import { Schema } from "effect";

import { MAX_DIE_SIZE } from "./dice-tool-input.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
);
const DieSizeSchema = PositiveIntegerSchema.pipe(
  Schema.lessThanOrEqualTo(MAX_DIE_SIZE),
);
const DieRollResultSchema = PositiveIntegerSchema.annotations({
  description: "A visible raw face in the inclusive range 1..dieSize.",
});
const DiceRollGroupOutputBaseSchema = Schema.Struct({
  dieSize: DieSizeSchema,
  results: Schema.NonEmptyArray(DieRollResultSchema),
});

const dieSizeBranches = Array.from({ length: MAX_DIE_SIZE }, (_, index) => {
  const dieSize = index + 1;
  return {
    type: "object",
    properties: {
      dieSize: { const: dieSize },
      results: {
        type: "array",
        items: {
          type: "integer",
          minimum: 1,
          maximum: dieSize,
        },
        minItems: 1,
      },
    },
    required: ["dieSize", "results"],
    additionalProperties: false,
  } as const;
});

export const DiceRollGroupOutputSchema = DiceRollGroupOutputBaseSchema.pipe(
  Schema.filter(
    (group) =>
      group.results.every((result) => result >= 1 && result <= group.dieSize),
    {
      description:
        "an ordered non-empty group whose visible faces are within dieSize",
      jsonSchema: { oneOf: dieSizeBranches },
    },
  ),
).annotations({
  description:
    "One ordered dice group and its visible raw faces. The result count is the number of returned faces, so no duplicate count can disagree with it.",
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
