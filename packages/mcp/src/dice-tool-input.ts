import { Either, Match, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
);
const DiceCountSchema = PositiveIntegerSchema.annotations({
  description: "Number of dice in this group; it must be a positive integer.",
});
const DieSizeSchema = PositiveIntegerSchema.annotations({
  description: "Number of faces on each die; it must be a positive integer.",
});

export const DiceRollGroupSchema = Schema.Struct({
  dice: DiceCountSchema,
  dieSize: DieSizeSchema,
}).annotations({
  description:
    "One structured dice group. Groups are rolled in the order supplied.",
});

export const RollDiceArgsSchema = Schema.Struct({
  groups: Schema.NonEmptyArray(DiceRollGroupSchema),
}).annotations({
  description:
    "An ordered, non-empty list of independent structured dice groups.",
});

export const rollDiceInputSchema = mcpObjectJsonSchema(RollDiceArgsSchema);

export const diceToolNames = {
  rollDice: "roll_dice",
} as const;
export const DICE_TOOL_NAMES = [diceToolNames.rollDice] as const;
export type DiceToolName = (typeof DICE_TOOL_NAMES)[number];

export type DiceRollGroup = typeof DiceRollGroupSchema.Type;
export type RollDiceRequest = typeof RollDiceArgsSchema.Type;

export type DiceToolCall = {
  readonly name: typeof diceToolNames.rollDice;
  readonly args: RollDiceRequest;
};

export function decodeDiceToolCall(input: {
  readonly name: DiceToolName;
  readonly args: unknown;
}): ToolInputResult<DiceToolCall> {
  return Match.value(input.name).pipe(
    Match.when(diceToolNames.rollDice, () =>
      Either.map(
        decodeToolArgs(RollDiceArgsSchema, input.args, diceToolNames.rollDice),
        (args) => ({
          name: diceToolNames.rollDice,
          args,
        }),
      ),
    ),
    Match.exhaustive,
  );
}

export function isDiceToolName(name: string): name is DiceToolName {
  return DICE_TOOL_NAMES.some((toolName) => toolName === name);
}
