import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { decodeBattleLifecycleArgs } from "./battle-lifecycle-tool-input.ts";

describe("battle lifecycle tool input", () => {
  test("reports malformed operation arguments at the public boundary", () => {
    const decoded = decodeBattleLifecycleArgs({
      operation: { kind: "unknown" },
    });

    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isSuccess(decoded)) return;
    expect(decoded.failure.isError).toBe(true);
    expect(
      JSON.parse(decoded.failure.content[0]?.text ?? "null"),
    ).toMatchObject({
      details: { code: "INVALID_ARGUMENTS" },
    });
  });
});
