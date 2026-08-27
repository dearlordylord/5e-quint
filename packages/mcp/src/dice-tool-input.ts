import { Match, Result, Schema } from "effect";

import {
  decodeToolArgs,
  mcpObjectJsonSchema,
  type ToolInputResult,
} from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0)),
);
export const MAX_DIE_SIZE = 100;
/** MCP work budgets; these are transport-safety limits, not D&D rules. */
export const MAX_DICE_PER_GROUP = 1_000;
export const MAX_TOTAL_DICE = 10_000;
/** Maximum number of groups accepted before aggregate dice work is evaluated. */
export const MAX_DICE_GROUPS_PER_CALL = MAX_TOTAL_DICE;
const DiceCountSchema = PositiveIntegerSchema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(MAX_DICE_PER_GROUP)),
).pipe(
  Schema.annotate({
    description:
      "Number of dice in this group; it must be a positive integer no greater than 1000 (an MCP work budget).",
  }),
);
const DieSizeSchema = PositiveIntegerSchema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(MAX_DIE_SIZE)),
).pipe(
  Schema.annotate({
    description:
      "Number of faces on each die; it must be a positive integer no greater than 100.",
  }),
);

export const DiceRollGroupSchema = Schema.Struct({
  dice: DiceCountSchema,
  dieSize: DieSizeSchema,
}).pipe(
  Schema.annotate({
    description:
      "One structured dice group. Groups are rolled in the order supplied.",
  }),
);

export const RollDiceArgsSchema = Schema.Struct({
  groups: Schema.NonEmptyArray(DiceRollGroupSchema).pipe(
    Schema.check(Schema.isMaxLength(MAX_DICE_GROUPS_PER_CALL)),
  ),
}).pipe(
  Schema.annotate({
    description: `An ordered, non-empty list of independent structured dice groups (at most ${MAX_DICE_GROUPS_PER_CALL} groups per call).`,
  }),
);

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
      Result.flatMap(
        decodeToolArgs(RollDiceArgsSchema, input.args, diceToolNames.rollDice),
        (args) =>
          Result.map(validateDiceRollBudget(args), (validatedArgs) => ({
            name: diceToolNames.rollDice,
            args: validatedArgs,
          })),
      ),
    ),
    Match.exhaustive,
  );
}

function validateDiceRollBudget(
  request: RollDiceRequest,
): ToolInputResult<RollDiceRequest> {
  let totalDice = 0;
  for (const group of request.groups) {
    // Subtract before adding so even an unusual future numeric representation
    // cannot overflow the accumulator before the budget rejection.
    if (group.dice > MAX_TOTAL_DICE - totalDice) {
      return Result.fail(
        errorContent("roll_dice exceeds the MCP total dice work budget.", {
          code: "DICE_ROLL_BUDGET_EXCEEDED",
          maxTotalDice: MAX_TOTAL_DICE,
          requestedTotalDice: totalDice + group.dice,
        }),
      );
    }
    totalDice += group.dice;
  }
  return Result.succeed(request);
}

export function isDiceToolName(name: string): name is DiceToolName {
  return DICE_TOOL_NAMES.some((toolName) => toolName === name);
}
