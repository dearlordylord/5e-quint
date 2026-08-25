import { describe, expect, test } from "vitest";

import {
  publicMcpHttpMethod,
  publicMcpOutcome,
} from "./public-service-operations.ts";

describe("public MCP operational projection", () => {
  test("bounds attacker-controlled HTTP methods", () => {
    expect(publicMcpHttpMethod("GET")).toBe("GET");
    expect(publicMcpHttpMethod("POST")).toBe("POST");
    expect(publicMcpHttpMethod("SYNTHETIC-UNBOUNDED-METHOD")).toBe("OTHER");
  });

  test("projects typed limit diagnostics without retaining result content", async () => {
    await expect(
      publicMcpOutcome(
        Response.json({
          result: {
            isError: true,
            structuredContent: {
              details: {
                code: "PLAY_SESSION_LIMIT_EXCEEDED",
                reason: "requestRateExceeded",
                privateContent: "must-not-be-projected",
              },
            },
          },
        }),
      ),
    ).resolves.toEqual({
      outcome: "limited",
      diagnostic: {
        code: "PLAY_SESSION_LIMIT_EXCEEDED",
        reason: "requestRateExceeded",
      },
    });
    await expect(
      publicMcpOutcome(
        Response.json({
          result: {
            isError: false,
            structuredContent: {
              code: "USER_AUTHORED_VALUE",
              reason: "privateReason",
              nested: { isError: true },
            },
          },
        }),
      ),
    ).resolves.toEqual({ outcome: "accepted" });
  });
});
