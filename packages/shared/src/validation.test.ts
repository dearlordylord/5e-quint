import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { traverseValidation } from "./validation.ts";

describe("traverseValidation", () => {
  test("returns an empty success without invoking the validator", () => {
    const indexes: number[] = [];

    const result = traverseValidation([], (value: number, index) => {
      indexes.push(index);
      return Result.succeed(value * 2);
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success).toEqual([]);
    expect(indexes).toEqual([]);
  });

  test("maps every value and forwards its stable input index", () => {
    const result = traverseValidation(
      ["first", "second", "third"],
      (value, index) => Result.succeed(`${index}:${value}`),
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success).toEqual(["0:first", "1:second", "2:third"]);
  });

  test("accumulates independent failures in input order", () => {
    const result = traverseValidation([1, 2, 3, 4], (value) =>
      value % 2 === 0
        ? Result.fail({ kind: "even", value })
        : Result.fail({ kind: "odd", value }),
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual([
      { kind: "odd", value: 1 },
      { kind: "even", value: 2 },
      { kind: "odd", value: 3 },
      { kind: "even", value: 4 },
    ]);
  });

  test("retains successful values while accumulating multiple failures", () => {
    const result = traverseValidation([1, 2, 3, 4, 5], (value) =>
      value === 2 || value === 5
        ? Result.fail(`invalid:${value}`)
        : Result.succeed(value * 10),
    );

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual(["invalid:2", "invalid:5"]);
  });
});
