import { DieRollResult } from "@dnd/shared/types";
import { Effect, Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { diceToolNames, type DiceToolCall } from "./dice-tool-input.ts";
import {
  RollDiceOutputSchema,
  type RollDiceResult,
} from "./dice-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  DICE_RANDOM_SOURCE,
  type DiceSampling,
} from "./dice-sampling-service.ts";

export type DiceToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function handleDiceToolCall(
  root: McpPlaySessionRoot,
  call: DiceToolCall,
): DiceToolResult {
  return Match.value(call).pipe(
    Match.when({ name: diceToolNames.rollDice }, ({ args }) => {
      const sampled = Effect.runSync(
        Effect.either(root.diceSampling.sample(args.requestId, args.groups)),
      );
      return Either.isLeft(sampled)
        ? errorContent(sampled.left.message, {
            code: Match.value(sampled.left.reason).pipe(
              Match.when(
                "requestIdConflict",
                () => "DICE_REQUEST_ID_CONFLICT" as const,
              ),
              Match.when(
                "retentionLimitExceeded",
                () => "DICE_RETENTION_LIMIT_EXCEEDED" as const,
              ),
              Match.when(
                "samplingFailed",
                () => "DICE_SAMPLING_FAILED" as const,
              ),
              Match.exhaustive,
            ),
          })
        : schemaJsonContent(RollDiceOutputSchema, rollDice(sampled.right));
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
    requestId: sampling.requestId,
    disposition: sampling.disposition,
    randomSource: DICE_RANDOM_SOURCE,
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
