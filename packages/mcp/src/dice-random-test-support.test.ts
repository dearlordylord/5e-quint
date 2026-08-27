import { Effect, Random } from "effect";
import { describe, expect, test } from "vitest";

import { fixedRandom, seededRandom } from "./dice-random-test-support.ts";

describe("dice random test support", () => {
  test("fixed service drives Effect doubles and half-open dice integers", () => {
    const random = fixedRandom([0, 1 / 6, 1 / 2]);
    const result = Effect.runSync(
      Effect.all({
        double: Random.next,
        d6: Random.nextIntBetween(1, 7, { halfOpen: true }),
        d4: Random.nextIntBetween(1, 5, { halfOpen: true }),
      }).pipe(Effect.provideService(Random.Random, random)),
    );

    expect(result).toEqual({ double: 0, d6: 2, d4: 3 });
  });

  test("fixed service exposes the corresponding safe integer", () => {
    const random = fixedRandom([0]);

    const result = Effect.runSync(
      Random.nextInt.pipe(Effect.provideService(Random.Random, random)),
    );

    expect(result).toBe(Number.MIN_SAFE_INTEGER);
  });

  test("seeded services repeat independently while each stream advances", () => {
    const first = seededRandom("dice-seed");
    const second = seededRandom("dice-seed");
    const program = Effect.all([Random.next, Random.nextInt]);

    const firstValues = Effect.runSync(
      program.pipe(Effect.provideService(Random.Random, first)),
    );
    const continuedValues = Effect.runSync(
      program.pipe(Effect.provideService(Random.Random, first)),
    );
    const isolatedValues = Effect.runSync(
      program.pipe(Effect.provideService(Random.Random, second)),
    );

    expect(isolatedValues).toEqual(firstValues);
    expect(continuedValues).not.toEqual(firstValues);
  });
});
