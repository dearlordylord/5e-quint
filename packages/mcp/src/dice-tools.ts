import { DieRollResult } from "@dnd/shared/types";
import { Effect, Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { diceToolNames, type DiceToolCall } from "./dice-tool-input.ts";
import {
  RollDiceOutputSchema,
  type RollDiceResult,
} from "./dice-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import type { DiceSampling } from "./dice-sampling-service.ts";

export type DiceToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export type DiceToolExecution = {
  readonly content: DiceToolResult;
  readonly commandRetention: "retain" | "skip";
};

export function handleDiceToolCall(
  root: McpPlaySessionRoot,
  call: DiceToolCall,
): DiceToolResult {
  return executeDiceToolCall(root, call).content;
}

export function executeDiceToolCall(
  root: McpPlaySessionRoot,
  call: DiceToolCall,
): DiceToolExecution {
  return Match.value(call).pipe(
    Match.when({ name: diceToolNames.rollDice }, ({ args }) => {
      const sampled = Effect.runSync(
        Effect.result(root.diceSampling.sample(args.groups)),
      );
      if (Result.isFailure(sampled)) {
        return {
          content: errorContent(sampled.failure.message, {
            code: "DICE_SAMPLING_FAILED",
          }),
          commandRetention: "skip" as const,
        };
      }
      return {
        content: schemaJsonContent(
          RollDiceOutputSchema,
          rollDice(sampled.success),
        ),
        commandRetention: "retain" as const,
      };
    }),
    Match.exhaustive,
  );
}

/**
 * Roll the requested groups using the one Random stream owned by the caller's
 * Play Session. This function intentionally receives no Battle state and does
 * not construct a BattleFill; callers may copy these raw results into the
 * existing typed fill path when a live Runtime Hole requires them.
 */
export function rollDice(sampling: DiceSampling): RollDiceResult {
  return {
    groups: mapNonEmpty(sampling.groups, (group) => ({
      dieSize: group.sideCount,
      results: mapNonEmpty(group.faces, (result) => DieRollResult(result)),
    })),
  };
}

function mapNonEmpty<A, B>(
  values: readonly [A, ...A[]],
  map: (value: A) => B,
): readonly [B, ...B[]] {
  const first = map(values[0]);
  const mapped: readonly [B, ...B[]] = [first, ...values.slice(1).map(map)];
  return mapped;
}
