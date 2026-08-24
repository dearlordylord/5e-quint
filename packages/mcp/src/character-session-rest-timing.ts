import type {
  CharacterSheetLongRestInterruption,
  CharacterSheetLongRestStartTiming,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { Either } from "effect";

import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";

export type LongRestCompletionToolInput = Omit<
  Extract<
    ApplyCharacterSessionOperationToolInput["operation"],
    { readonly kind: "completeLongRest" }
  >,
  "kind" | "timing"
>;

export type LongRestResumptionCompletionToolInput = Omit<
  LongRestCompletionToolInput,
  "restedTicks"
> & {
  readonly cumulativeRestedTicks: number;
};

export type RestBoundaryContext =
  | {
      readonly boundary: "interruption";
      readonly boundaryIndex: number;
      readonly previousCumulativeRestedTicks: number;
      readonly cumulativeRestedTicks: number;
    }
  | {
      readonly boundary: "completion";
      readonly previousCumulativeRestedTicks: number;
      readonly cumulativeRestedTicks: number;
    };

export function cumulativeRestBoundary(input: RestBoundaryContext) {
  if (input.cumulativeRestedTicks <= input.previousCumulativeRestedTicks) {
    return Either.left({
      issue:
        "Long Rest cumulativeRestedTicks must strictly increase at every boundary.",
      context: input,
    });
  }
  return Either.right({
    cumulativeRestedTicks: elapsedTimeTicks(input.cumulativeRestedTicks),
    elapsedSincePreviousBoundaryTicks: elapsedTimeTicks(
      input.cumulativeRestedTicks - input.previousCumulativeRestedTicks,
    ),
  });
}

export function longRestCompletionRestedTicks(
  completion:
    | LongRestCompletionToolInput
    | LongRestResumptionCompletionToolInput,
) {
  return "restedTicks" in completion
    ? elapsedTimeTicks(completion.restedTicks)
    : elapsedTimeTicks(completion.cumulativeRestedTicks);
}

export function longRestCompletionResultTicks(
  completion:
    | LongRestCompletionToolInput
    | LongRestResumptionCompletionToolInput,
) {
  return "restedTicks" in completion
    ? completion.restedTicks
    : completion.cumulativeRestedTicks;
}

export function longRestTimingFromTool(
  input:
    | { readonly tag: "noPriorLongRest" }
    | {
        readonly tag: "elapsedSinceLastLongRest";
        readonly elapsedTicks: number;
      },
): CharacterSheetLongRestStartTiming {
  return input.tag === "noPriorLongRest"
    ? input
    : {
        tag: "elapsedSinceLastLongRest",
        elapsedTicks: elapsedTimeTicks(input.elapsedTicks),
      };
}

export function longRestInterruptionFromTool(
  input:
    | "rollInitiative"
    | "castNonCantripSpell"
    | "takeDamage"
    | {
        readonly tag: "physicalExertion";
        readonly durationTicks: number;
      },
): CharacterSheetLongRestInterruption {
  return typeof input === "object"
    ? {
        tag: "physicalExertion",
        durationTicks: elapsedTimeTicks(input.durationTicks),
      }
    : input;
}
