import {
  DICE_GROUP_SEMANTIC_PROFILE,
  sampleDiceGroups,
  type DiceGroupSamplingFailure,
  type SampledDiceGroup,
} from "@drdice/dice";
import {
  SCHEMA_VERSION,
  SEQUENCE_PROFILE,
  initialize,
  randomSeed,
  type GeneratorState,
} from "@drdice/prng";
import { Effect, Result, Schema } from "effect";

import type { DiceRollGroup } from "./dice-tool-input.ts";

export const DICE_RANDOM_SOURCE = {
  diceGroupSemanticProfile: DICE_GROUP_SEMANTIC_PROFILE,
  prngSequenceProfile: SEQUENCE_PROFILE,
  stateSchemaVersion: SCHEMA_VERSION,
} as const;
const DiceSeedWordSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{8}$/u)),
);
export const DiceSeedSchema = Schema.Tuple([
  DiceSeedWordSchema,
  DiceSeedWordSchema,
  DiceSeedWordSchema,
  DiceSeedWordSchema,
]).pipe(
  Schema.check(
    Schema.makeFilter((words) => words.some((word) => word !== "00000000")),
  ),
  Schema.brand("DiceSeed"),
);
export type DiceSeed = typeof DiceSeedSchema.Type;
export const decodeDiceSeed = Schema.decodeUnknownResult(DiceSeedSchema);

export type DiceSamplingFailure = {
  readonly tag: "diceSamplingFailure";
  readonly reason: "samplingFailed";
  readonly message: string;
  readonly cause: DiceGroupSamplingFailure;
};

export type DiceSampling = {
  readonly groups: readonly [SampledDiceGroup, ...SampledDiceGroup[]];
};

export type DiceSamplingService = {
  sample(
    groups: readonly DiceRollGroup[],
  ): Effect.Effect<DiceSampling, DiceSamplingFailure>;
};

export function generatedDiceSeed(): DiceSeed {
  const decoded = decodeDiceSeed(randomSeed());
  if (Result.isFailure(decoded)) {
    throw new Error("@drdice/prng randomSeed violated its Seed contract.");
  }
  return decoded.success;
}

export function createDiceSamplingService(seed: DiceSeed): DiceSamplingService {
  const initialized = initialize(seed);
  if (!initialized.ok) {
    throw new Error(
      "A Dice Sampling Service received an invalid validated Seed.",
    );
  }
  let state: GeneratorState = initialized.value;

  return {
    sample(groups) {
      return Effect.suspend(
        (): Effect.Effect<DiceSampling, DiceSamplingFailure> => {
          const sampled = sampleDiceGroups(
            groups.map((group) => ({
              count: group.dice,
              sideCount: group.dieSize,
            })),
            state,
          );
          if (!sampled.ok) {
            return Effect.fail({
              tag: "diceSamplingFailure" as const,
              reason: "samplingFailed" as const,
              message:
                "The deterministic dice sampler could not complete the request.",
              cause: sampled,
            });
          }

          state = sampled.value.nextState;
          return Effect.succeed({
            groups: sampled.value.groups,
          } satisfies DiceSampling);
        },
      );
    },
  };
}
