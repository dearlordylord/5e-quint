import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  ElapsedTimeDurationValueSchema,
  InitiativeDurationValueSchema,
} from "./schema-base.ts";
import {
  CastingTimeSchema,
  ReanimationReassertWindowSchema,
} from "./schema-spell.ts";

describe("Surface elapsed duration schemas", () => {
  test("rejects fractional duration values at the content boundary", () => {
    const decoded = Schema.decodeUnknownEither(ElapsedTimeDurationValueSchema)({
      unit: "minute",
      amount: 1.5,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("keeps round durations out of elapsed-time values", () => {
    const elapsed = Schema.decodeUnknownEither(ElapsedTimeDurationValueSchema)({
      unit: "round",
      amount: 1,
    });
    const initiative = Schema.decodeUnknownEither(
      InitiativeDurationValueSchema,
    )({
      unit: "round",
      amount: 1,
    });

    expect(Either.isLeft(elapsed)).toBe(true);
    expect(Either.isRight(initiative)).toBe(true);
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
    const decoded = Schema.decodeUnknownEither(ReanimationReassertWindowSchema)({
      hours: 24.5,
      maxReassertPerCast: 1,
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});
