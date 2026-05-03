import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { TimeSpanDurationValueSchema } from "./schema-base.ts";
import {
  CastingTimeSchema,
  ReanimationReassertWindowSchema,
} from "./schema-spell.ts";

describe("Surface time-span duration schemas", () => {
  test("rejects fractional duration values at the content boundary", () => {
    const decoded = Schema.decodeUnknownEither(TimeSpanDurationValueSchema)({
      unit: "minute",
      amount: 1.5,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("accepts round as an authored time-span unit", () => {
    const decoded = Schema.decodeUnknownEither(TimeSpanDurationValueSchema)({
      unit: "round",
      amount: 1,
    });

    expect(Either.isRight(decoded)).toBe(true);
  });

  test("rejects seconds as authored game-language duration units", () => {
    const decoded = Schema.decodeUnknownEither(TimeSpanDurationValueSchema)({
      unit: "second",
      amount: 6,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("rejects fractional extended casting times", () => {
    const decoded = Schema.decodeUnknownEither(CastingTimeSchema)({
      kind: "minutes",
      amount: 1.5,
      ritual: false,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("rejects fractional reanimation reassertion windows", () => {
    const decoded = Schema.decodeUnknownEither(ReanimationReassertWindowSchema)(
      {
        hours: 24.5,
        maxReassertPerCast: 1,
      },
    );

    expect(Either.isLeft(decoded)).toBe(true);
  });
});
