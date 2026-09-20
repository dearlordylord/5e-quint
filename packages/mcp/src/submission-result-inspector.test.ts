import reviewPolicyJson from "../../../plugins/dnd-srd-oracle/publication/review-policy.json" with { type: "json" };
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { decodeSubmissionReviewPolicy } from "./submission-gate-policy.ts";
import { inspectSubmissionResult } from "./submission-result-inspector.ts";
import {
  buildAdvertisedToolDefinitions,
  buildCanonicalToolDefinitions,
  createDndMcpProtocolServer,
} from "./protocol-server.ts";
import { submissionResultReviewScope } from "./submission-surface-scanner.ts";

const decodedPolicy = decodeSubmissionReviewPolicy(reviewPolicyJson);
if (Result.isFailure(decodedPolicy)) {
  throw new Error(decodedPolicy.failure);
}
const policy = decodedPolicy.success;
const reviewScope = submissionResultReviewScope(
  buildCanonicalToolDefinitions(undefined, "hosted"),
  policy,
  buildAdvertisedToolDefinitions(undefined, "hosted"),
);

describe("submission representative-result inspector", () => {
  test("finds secrets and high-risk values recursively in structured and text content", () => {
    const issues = inspectSubmissionResult({
      tool: "synthetic_result",
      policy,
      reviewScope,
      result: {
        content: [
          {
            text: JSON.stringify({
              guestAccessGrant: `guest-access:${"a".repeat(64)}`,
              unreviewedCorrelation: "00000000-0000-4000-8000-000000000001",
              observed: "2026-09-19T20:00:00.000Z",
              contact: "person@example.test",
            }),
          },
        ],
      },
    });
    expect(new Set(issues.map((issue) => issue.code))).toEqual(
      new Set([
        "RESULT_AUTHORIZATION_SECRET",
        "RESULT_UNREVIEWED_IDENTIFIER",
        "RESULT_UNREVIEWED_TIMESTAMP",
        "RESULT_PERSONAL_DATA",
      ]),
    );
  });

  test("finds credentials, timestamps, and diagnostics embedded in raw prose", () => {
    const issues = inspectSubmissionResult({
      tool: "synthetic_result",
      policy,
      reviewScope,
      result: {
        content: [
          {
            text: "Failure at 2026-09-19T20:00:00.000Z: sk-abcdefghijklmnop stack trace at handler (/srv/app.ts:4:2)",
          },
        ],
      },
    });
    expect(new Set(issues.map((issue) => issue.code))).toEqual(
      new Set([
        "RESULT_AUTHORIZATION_SECRET",
        "RESULT_UNREVIEWED_TIMESTAMP",
        "RESULT_DIAGNOSTIC",
      ]),
    );
  });

  test("does not confuse a public OAuth resource challenge with a bearer credential", () => {
    expect(
      inspectSubmissionResult({
        tool: "create_play_session",
        policy,
        reviewScope,
        result: {
          isError: true,
          _meta: {
            "mcp/www_authenticate": [
              'Bearer resource_metadata="https://oracle.invalid/.well-known/oauth-protected-resource"',
            ],
          },
        },
      }),
    ).toEqual([]);
  });

  test("does not apply name-based approvals outside a validated envelope", () => {
    expect(
      inspectSubmissionResult({
        tool: "create_play_session",
        policy,
        reviewScope,
        result: {
          playSessionId: "play-session:00000000-0000-4000-8000-000000000001",
          groups: [{ dieSize: 20, results: [12] }],
        },
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "RESULT_UNREVIEWED_IDENTIFIER" }),
    );
  });

  test("rejects representative results that are not JSON objects", () => {
    expect(
      inspectSubmissionResult({
        tool: "synthetic_result",
        policy,
        reviewScope,
        result: { content: undefined },
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "RESULT_SCHEMA_MISMATCH",
        path: "/",
      }),
    );
  });

  test("inspects representative real success and failure envelopes", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "submission-result-inspector",
      version: "0.1.0",
    });
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(
        inspectSubmissionResult({
          tool: "create_play_session",
          result: created,
          policy,
          reviewScope,
        }),
      ).toEqual([]);
      expect(
        inspectSubmissionResult({
          tool: "create_play_session",
          result: {
            ...created,
            structuredContent: {
              ...(created.structuredContent as Record<string, unknown>),
              debug: {
                playSessionId:
                  "play-session:00000000-0000-4000-8000-000000000999",
              },
            },
          },
          policy,
          reviewScope,
        }),
      ).toContainEqual(
        expect.objectContaining({ code: "RESULT_SCHEMA_MISMATCH" }),
      );
      expect(
        inspectSubmissionResult({
          tool: "create_play_session",
          result: {
            ...created,
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ...(created.structuredContent as Record<string, unknown>),
                  debug: {
                    playSessionId:
                      "play-session:00000000-0000-4000-8000-000000000998",
                  },
                }),
              },
            ],
          },
          policy,
          reviewScope,
        }),
      ).toContainEqual(
        expect.objectContaining({
          code: "RESULT_SCHEMA_MISMATCH",
          path: "/content/0/text/json",
        }),
      );
      const playSessionId = playSessionIdFrom(created.structuredContent);
      const invalidRoll = await client.callTool({
        name: "roll_dice",
        arguments: { playSessionId, groups: [] },
      });
      expect(
        inspectSubmissionResult({
          tool: "roll_dice",
          result: invalidRoll,
          policy,
          reviewScope,
        }),
      ).toEqual([]);
      expect(
        inspectSubmissionResult({
          tool: "roll_dice",
          result: {
            ...invalidRoll,
            structuredContent: {
              ...(invalidRoll.structuredContent as Record<string, unknown>),
              debug: {
                playSessionId:
                  "play-session:00000000-0000-4000-8000-000000000997",
              },
            },
          },
          policy,
          reviewScope,
        }),
      ).toContainEqual(
        expect.objectContaining({ code: "RESULT_SCHEMA_MISMATCH" }),
      );
      for (const call of [
        {
          name: "roll_dice",
          arguments: { playSessionId, groups: [{ dice: 1, dieSize: 20 }] },
        },
        {
          name: "read_play_session",
          arguments: { playSessionId },
        },
      ] as const) {
        const result = await client.callTool(call);
        expect(
          inspectSubmissionResult({
            tool: call.name,
            result,
            policy,
            reviewScope,
          }),
        ).toEqual([]);
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});

function playSessionIdFrom(value: unknown): string {
  if (
    typeof value !== "object" ||
    value === null ||
    !("playSessionId" in value) ||
    typeof value.playSessionId !== "string"
  ) {
    throw new Error("Representative creation omitted its Play Session id.");
  }
  return value.playSessionId;
}
