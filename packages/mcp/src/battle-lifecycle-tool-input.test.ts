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
    expect(decoded.failure).toMatchObject({
      isError: true,
      content: [
        {
          text: expect.stringContaining('"code": "INVALID_ARGUMENTS"'),
        },
      ],
    });
  });
});
