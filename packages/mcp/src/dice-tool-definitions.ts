import { mcpOutputJsonSchema } from "./schema-codec.ts";
import { RollDiceOutputSchema } from "./dice-tool-output.ts";
import {
  diceToolNames,
  DICE_TOOL_NAMES,
  rollDiceInputSchema,
  type DiceToolName,
} from "./dice-tool-input.ts";
import {
  NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export const diceToolDefinitions = [
  {
    name: diceToolNames.rollDice,
    description:
      "Roll an ordered, non-empty batch of structured dice groups and return visible raw faces. This independent roller never reads Battle Holes, derives modifiers or outcomes, or fills a Hole; copy its faces into an ordinary typed fill only when the current runtime Hole supplies the required facts.",
    inputSchema: rollDiceInputSchema,
    annotations: NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(RollDiceOutputSchema),
  },
] as const satisfies readonly ProtocolToolDefinition[];

export { DICE_TOOL_NAMES };
export type { DiceToolName };
