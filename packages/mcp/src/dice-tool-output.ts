import { Schema } from "effect";

import { DiceRollRequestIdSchema, MAX_DIE_SIZE } from "./dice-tool-input.ts";
import { DICE_RANDOM_SOURCE } from "./dice-sampling-service.ts";

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
  requestId: DiceRollRequestIdSchema.annotations({
    description: "The caller-supplied idempotency key for this sampling.",
  }),
  disposition: Schema.Literal("sampled", "replayed"),
  randomSource: Schema.Struct({
    diceGroupSemanticProfile: Schema.Literal(
      DICE_RANDOM_SOURCE.diceGroupSemanticProfile,
    ),
    prngSequenceProfile: Schema.Literal(DICE_RANDOM_SOURCE.prngSequenceProfile),
    stateSchemaVersion: Schema.Literal(DICE_RANDOM_SOURCE.stateSchemaVersion),
  }).annotations({
    description:
      "Deterministic non-cryptographic sampling identities for replay and compatibility checks; these are not proof of wagering-grade fairness.",
  }),
  groups: Schema.NonEmptyArray(DiceRollGroupOutputSchema),
}).annotations({
  description:
    "Raw faces for each requested group in input order. The roller performs no rule interpretation or automatic fill.",
});

export type RollDiceResult = typeof RollDiceOutputSchema.Type;
export const decodeRollDiceResult =
  Schema.decodeUnknownEither(RollDiceOutputSchema);
