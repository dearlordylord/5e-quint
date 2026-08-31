import { Effect, Random } from "effect";
import type * as Context from "effect/Context";

export type DiceRandomService = Context.Service.Shape<typeof Random.Random>;

export const fixedRandom = (
  values: readonly [number, ...number[]],
): DiceRandomService => {
  let index = 0;
  const nextDoubleUnsafe = () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
  return {
    nextDoubleUnsafe,
    nextIntUnsafe: () =>
      Math.floor(
        nextDoubleUnsafe() *
          (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1),
      ) + Number.MIN_SAFE_INTEGER,
  };
};

export const seededRandom = (seed: string): DiceRandomService =>
  Effect.runSync(
    Effect.gen(function* () {
      return yield* Random.Random;
    }).pipe(Random.withSeed(seed)),
  );
