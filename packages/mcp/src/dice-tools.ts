import { randomUUID } from "node:crypto";

import { DieRollResult } from "@dnd/shared/types";
import { Effect, Match, Random } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  diceToolNames,
  type DiceRollGroup,
  type DiceToolCall,
  type RollDiceRequest,
} from "./dice-tool-input.ts";
import {
  RollDiceOutputSchema,
  type RollDiceResult,
} from "./dice-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

export type DiceToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;

export function handleDiceToolCall(
  root: McpPlaySessionRoot,
  call: DiceToolCall,
): DiceToolResult {
  return Match.value(call).pipe(
    Match.when({ name: diceToolNames.rollDice }, ({ args }) =>
      schemaJsonContent(RollDiceOutputSchema, rollDice(args, root.random)),
    ),
    Match.exhaustive,
  );
}

/**
 * Roll the requested groups using the one Random stream owned by the caller's
 * Play Session. This function intentionally receives no Battle state and does
 * not construct a BattleFill; callers may copy these raw results into the
 * existing typed fill path when a live Runtime Hole requires them.
 */
export function rollDice(
  request: RollDiceRequest,
  random: Random.Random,
): RollDiceResult {
  return {
    correlationId: randomUUID(),
    groups: mapNonEmpty(request.groups, (group) => ({
      dice: group.dice,
      dieSize: group.dieSize,
      results: mapNonEmpty(drawGroup(group, random), (result) =>
        DieRollResult(result),
      ),
    })),
  };
}

function drawGroup(
  group: DiceRollGroup,
  random: Random.Random,
): readonly [number, ...number[]] {
  const values = Effect.runSync(
    Effect.withRandom(
      Effect.map(
        Effect.all({
          first: Random.nextIntBetween(1, group.dieSize + 1),
          rest: Effect.forEach(
            Array.from({ length: group.dice - 1 }, () => undefined),
            () => Random.nextIntBetween(1, group.dieSize + 1),
          ),
        }),
        ({ first, rest }) => {
          const nonEmptyValues: readonly [number, ...number[]] = [
            first,
            ...rest,
          ];
          return nonEmptyValues;
        },
      ),
      random,
    ),
  );
  return values;
}

function mapNonEmpty<A, B>(
  values: readonly [A, ...A[]],
  map: (value: A) => B,
): readonly [B, ...B[]] {
  const first = map(values[0]);
  const mapped: readonly [B, ...B[]] = [first, ...values.slice(1).map(map)];
  return mapped;
}
