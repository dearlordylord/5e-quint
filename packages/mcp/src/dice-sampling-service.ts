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
import { Effect, Either, Schema } from "effect";

import type { DiceRollGroup, DiceRollRequestId } from "./dice-tool-input.ts";

export const DICE_RANDOM_SOURCE = {
  diceGroupSemanticProfile: DICE_GROUP_SEMANTIC_PROFILE,
  prngSequenceProfile: SEQUENCE_PROFILE,
  stateSchemaVersion: SCHEMA_VERSION,
} as const;
export const MAX_RETAINED_DICE_SAMPLINGS_PER_PLAY_SESSION = 10_000;

const DiceSeedWordSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{8}$/u));
export const DiceSeedSchema = Schema.Tuple(
  DiceSeedWordSchema,
  DiceSeedWordSchema,
  DiceSeedWordSchema,
  DiceSeedWordSchema,
).pipe(
  Schema.filter((words) => words.some((word) => word !== "00000000")),
  Schema.brand("DiceSeed"),
);
export type DiceSeed = typeof DiceSeedSchema.Type;
export const decodeDiceSeed = Schema.decodeUnknownEither(DiceSeedSchema);

export type DiceSamplingFailure =
  | {
      readonly tag: "diceSamplingFailure";
      readonly reason: "requestIdConflict";
      readonly message: string;
    }
  | {
      readonly tag: "diceSamplingFailure";
      readonly reason: "retentionLimitExceeded";
      readonly message: string;
    }
  | {
      readonly tag: "diceSamplingFailure";
      readonly reason: "samplingFailed";
      readonly message: string;
      readonly cause: DiceGroupSamplingFailure;
    };

export type DiceSampling = {
  readonly requestId: DiceRollRequestId;
  readonly disposition: "sampled" | "replayed";
  readonly groups: readonly [SampledDiceGroup, ...SampledDiceGroup[]];
};

export type DiceSamplingService = {
  sample(
    requestId: DiceRollRequestId,
    groups: readonly DiceRollGroup[],
  ): Effect.Effect<DiceSampling, DiceSamplingFailure>;
};

type RetainedSampling = {
  readonly groups: readonly DiceRollGroup[];
  readonly sampledGroups: readonly [SampledDiceGroup, ...SampledDiceGroup[]];
};

export function generatedDiceSeed(): DiceSeed {
  const decoded = decodeDiceSeed(randomSeed());
  if (Either.isLeft(decoded)) {
    throw new Error("@drdice/prng randomSeed violated its Seed contract.");
  }
  return decoded.right;
}

export function createDiceSamplingService(seed: DiceSeed): DiceSamplingService {
  const initialized = initialize(seed);
  if (!initialized.ok) {
    throw new Error(
      "A Dice Sampling Service received an invalid validated Seed.",
    );
  }
  let state: GeneratorState = initialized.value;
  const retained = new Map<DiceRollRequestId, RetainedSampling>();

  return {
    sample(requestId, groups) {
      return Effect.suspend(
        (): Effect.Effect<DiceSampling, DiceSamplingFailure> => {
          const prior = retained.get(requestId);
          if (prior !== undefined) {
            return sameGroups(prior.groups, groups)
              ? Effect.succeed({
                  requestId,
                  disposition: "replayed" as const,
                  groups: prior.sampledGroups,
                } satisfies DiceSampling)
              : Effect.fail({
                  tag: "diceSamplingFailure" as const,
                  reason: "requestIdConflict" as const,
                  message:
                    "The dice requestId was already used with different groups.",
                });
          }

          if (retained.size >= MAX_RETAINED_DICE_SAMPLINGS_PER_PLAY_SESSION) {
            return Effect.fail({
              tag: "diceSamplingFailure" as const,
              reason: "retentionLimitExceeded" as const,
              message:
                "The Play Session has reached its retained dice sampling limit.",
            });
          }

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
          retained.set(requestId, {
            groups: groups.map((group) => ({ ...group })),
            sampledGroups: sampled.value.groups,
          });
          return Effect.succeed({
            requestId,
            disposition: "sampled" as const,
            groups: sampled.value.groups,
          } satisfies DiceSampling);
        },
      );
    },
  };
}

function sameGroups(
  left: readonly DiceRollGroup[],
  right: readonly DiceRollGroup[],
): boolean {
  return (
    left.length === right.length &&
    left.every((group, index) => {
      const candidate = right[index];
      return (
        group.dice === candidate?.dice && group.dieSize === candidate.dieSize
      );
    })
  );
}
