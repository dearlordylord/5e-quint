import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { Effect, Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";
import {
  decodeDiceToolCall,
  decodeDiceRollRequestId,
  MAX_DICE_PER_GROUP,
  MAX_DICE_GROUPS_PER_CALL,
  MAX_TOTAL_DICE,
  RollDiceArgsSchema,
  rollDiceInputSchema,
} from "./dice-tool-input.ts";
import { RollDiceOutputSchema } from "./dice-tool-output.ts";
import { handleDiceToolCall, rollDice } from "./dice-tools.ts";
import {
  createDiceSamplingService,
  decodeDiceSeed,
} from "./dice-sampling-service.ts";
import { mcpOutputJsonSchema } from "./schema-codec.ts";
import { jsonContentPayload } from "./tool-content.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { fixedRandom, seededRandom } from "./dice-random-test-support.ts";

const request = {
  requestId: requireDiceRollRequestId("00000000-0000-4000-8000-000000000001"),
  groups: [
    { dice: 2, dieSize: 6 },
    { dice: 1, dieSize: 4 },
  ],
} as const;

describe("structured MCP bulk dice roller", () => {
  test("rejects empty groups and requires a caller idempotency key", () => {
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(RollDiceArgsSchema)({
          requestId: request.requestId,
          groups: [],
        }),
      ),
    ).toBe(true);

    const decoded = decodeDiceToolCall({
      name: "roll_dice",
      args: { groups: request.groups },
    });
    expect(Result.isFailure(decoded)).toBe(true);
  });

  test("enforces bounded per-group and aggregate work before allocation", () => {
    const validateInput = new AjvJsonSchemaValidator().getValidator(
      ajvJsonSchema(rollDiceInputSchema),
    );
    const tooManyInOneGroup = {
      requestId: request.requestId,
      groups: [{ dice: MAX_DICE_PER_GROUP + 1, dieSize: 6 }],
    };
    expect(validateInput(tooManyInOneGroup).valid).toBe(false);
    expect(
      Result.isFailure(
        decodeDiceToolCall({ name: "roll_dice", args: tooManyInOneGroup }),
      ),
    ).toBe(true);

    const atPerGroupBoundary = {
      requestId: request.requestId,
      groups: [{ dice: MAX_DICE_PER_GROUP, dieSize: 6 }],
    };
    expect(validateInput(atPerGroupBoundary).valid).toBe(true);
    expect(
      Result.isSuccess(
        decodeDiceToolCall({ name: "roll_dice", args: atPerGroupBoundary }),
      ),
    ).toBe(true);

    const atAggregateBoundary = {
      requestId: request.requestId,
      groups: Array.from({ length: 10 }, () => ({
        dice: MAX_DICE_PER_GROUP,
        dieSize: 6,
      })),
    };
    expect(
      Result.isSuccess(
        decodeDiceToolCall({ name: "roll_dice", args: atAggregateBoundary }),
      ),
    ).toBe(true);
    const overAggregateBoundary = {
      requestId: request.requestId,
      groups: [
        ...Array.from({ length: MAX_TOTAL_DICE / MAX_DICE_PER_GROUP }, () => ({
          dice: MAX_DICE_PER_GROUP,
          dieSize: 6,
        })),
        { dice: 1, dieSize: 6 },
      ],
    };
    expect(
      Result.isFailure(
        decodeDiceToolCall({ name: "roll_dice", args: overAggregateBoundary }),
      ),
    ).toBe(true);
    const tooManyGroups = {
      requestId: request.requestId,
      groups: Array.from({ length: MAX_DICE_GROUPS_PER_CALL + 1 }, () => ({
        dice: 1,
        dieSize: 1,
      })),
    };
    expect(validateInput(tooManyGroups).valid).toBe(false);
    expect(
      Result.isFailure(
        decodeDiceToolCall({ name: "roll_dice", args: tooManyGroups }),
      ),
    ).toBe(true);
  });

  test("returns ordered visible faces in each requested group", () => {
    const service = createDiceSamplingService(
      requireDiceSeed(["00000001", "00000002", "00000003", "00000004"]),
    );
    const sampled = Effect.runSync(
      service.sample(request.requestId, request.groups),
    );
    const result = rollDice(sampled);

    expect(result.requestId).toBe(request.requestId);
    expect(result.disposition).toBe("sampled");
    for (const [index, group] of result.groups.entries()) {
      expect(group.results).toHaveLength(request.groups[index]?.dice);
      for (const face of group.results) {
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(group.dieSize);
      }
    }
  });

  test("rejects invalid range at both Effect and emitted AJV schemas", () => {
    const invalid = {
      requestId: request.requestId,
      disposition: "sampled",
      randomSource: {
        diceGroupSemanticProfile:
          "dice-groups-v1/ordered-atomic-rejection-5-blocks-x-5-attempts",
        prngSequenceProfile: "xoshiro128ss-1.1/warmup16-msb-chunk-rejection-2",
        stateSchemaVersion: 1,
      },
      groups: [{ dieSize: 6, results: [1, 7] }],
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(RollDiceOutputSchema))(
          invalid,
        ),
      ),
    ).toBe(true);

    const validate = new AjvJsonSchemaValidator().getValidator(
      mcpOutputJsonSchema(RollDiceOutputSchema),
    );
    expect(validate(invalid).valid).toBe(false);
    const emptyResults = {
      ...invalid,
      groups: [{ dieSize: 6, results: [] }],
    };
    expect(validate(emptyResults).valid).toBe(false);
  });

  test("reproduces a seeded sequence and makes request ids idempotent", () => {
    const seed = requireDiceSeed([
      "00000001",
      "00000002",
      "00000003",
      "00000004",
    ]);
    const first = createDiceSamplingService(seed);
    const second = createDiceSamplingService(seed);
    const firstCall = Effect.runSync(
      first.sample(request.requestId, request.groups),
    );
    const repeatedCall = Effect.runSync(
      first.sample(request.requestId, request.groups),
    );
    const isolatedCall = Effect.runSync(
      second.sample(request.requestId, request.groups),
    );

    expect(firstCall.groups).toEqual(isolatedCall.groups);
    expect(repeatedCall.groups).toEqual(firstCall.groups);
    expect(repeatedCall.disposition).toBe("replayed");
    expect(
      Result.isFailure(
        Effect.runSync(
          Effect.result(
            first.sample(request.requestId, [{ dice: 1, dieSize: 20 }]),
          ),
        ),
      ),
    ).toBe(true);
    const nextRequestId = requireDiceRollRequestId(
      "00000000-0000-4000-8000-000000000002",
    );
    const afterConflict = Effect.runSync(
      first.sample(nextRequestId, request.groups),
    );
    Effect.runSync(second.sample(request.requestId, request.groups));
    const withoutConflict = Effect.runSync(
      second.sample(nextRequestId, request.groups),
    );
    expect(afterConflict.groups).toEqual(withoutConflict.groups);
  });

  test("does not read or mutate Battle pending-fill state", () => {
    const services = createMcpApplicationServices();
    const root = createMcpPlaySessionRoot(
      services,
      services.configuredAdminMirrorSessionId,
      requireDiceSeed(["00000001", "00000002", "00000003", "00000004"]),
    );
    const before = root.sessionStore.snapshot();
    const content = handleDiceToolCall(root, {
      name: "roll_dice",
      args: request,
    });

    expect(jsonContentPayload(content)).toMatchObject({
      requestId: request.requestId,
      disposition: "sampled",
    });
    expect(root.sessionStore.snapshot()).toEqual(before);
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("is advertised and validated through the real in-memory MCP protocol", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({ name: "dice-protocol-test", version: "0.1.0" });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const listed = await client.listTools();
      const definition = listed.tools.find((tool) => tool.name === "roll_dice");
      expect(definition).toBeDefined();
      expect(definition?.inputSchema.required).toEqual(
        expect.arrayContaining(["requestId", "groups"]),
      );
      if (definition?.outputSchema === undefined) {
        throw new Error("roll_dice omitted outputSchema");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        ajvJsonSchema(definition.outputSchema),
      );

      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      if (
        !isJsonObject(created.structuredContent) ||
        typeof created.structuredContent.playSessionId !== "string"
      ) {
        throw new Error("create_play_session returned no Play Session id.");
      }
      const playSessionId = created.structuredContent.playSessionId;
      const guestAccessGrant = creationGuestAccessGrant(
        created.structuredContent,
      );
      const valid = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          guestAccessGrant,
          requestId: "00000000-0000-4000-8000-000000000010",
          groups: [{ dice: 2, dieSize: 6 }],
        },
      });
      expect(valid.isError, JSON.stringify(valid)).not.toBe(true);
      expect(validateOutput(valid.structuredContent).valid).toBe(true);

      const repeated = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          guestAccessGrant,
          requestId: "00000000-0000-4000-8000-000000000010",
          groups: [{ dice: 2, dieSize: 6 }],
        },
      });
      expect(repeated.isError).not.toBe(true);
      expect(repeated.structuredContent).toMatchObject({
        operation: { result: { disposition: "replayed" } },
      });

      const conflictingRequest = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          guestAccessGrant,
          requestId: "00000000-0000-4000-8000-000000000010",
          groups: [{ dice: 1, dieSize: 4 }],
        },
      });
      expect(conflictingRequest.isError).toBe(true);

      for (const groups of [
        [],
        [{ dice: 0, dieSize: 6 }],
        [{ dice: 1.5, dieSize: 6 }],
        [{ dice: 1, dieSize: "six" }],
        [{ dice: 1, dieSize: 101 }],
        [{ dice: MAX_DICE_PER_GROUP + 1, dieSize: 6 }],
      ]) {
        const invalid = await client.callTool({
          name: "roll_dice",
          arguments: {
            playSessionId,
            guestAccessGrant,
            requestId: "00000000-0000-4000-8000-000000000011",
            groups,
          },
        });
        expect(invalid.isError).toBe(true);
      }

      const aggregateBudget = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          guestAccessGrant,
          requestId: "00000000-0000-4000-8000-000000000012",
          groups: [
            ...Array.from(
              { length: MAX_TOTAL_DICE / MAX_DICE_PER_GROUP },
              () => ({ dice: MAX_DICE_PER_GROUP, dieSize: 6 }),
            ),
            { dice: 1, dieSize: 6 },
          ],
        },
      });
      expect(aggregateBudget.isError).toBe(true);
      expect(aggregateBudget.structuredContent).toMatchObject({
        operation: {
          result: { details: { code: "DICE_ROLL_BUDGET_EXCEEDED" } },
        },
      });
      const groupBudget = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          guestAccessGrant,
          requestId: "00000000-0000-4000-8000-000000000013",
          groups: Array.from({ length: MAX_DICE_GROUPS_PER_CALL + 1 }, () => ({
            dice: 1,
            dieSize: 1,
          })),
        },
      });
      expect(groupBudget.isError).toBe(true);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});

function creationGuestAccessGrant(
  creation: Readonly<Record<string, unknown>>,
): string {
  if (!isJsonObject(creation.operation)) {
    throw new Error("create_play_session omitted its operation.");
  }
  const result = creation.operation.result;
  if (!isJsonObject(result) || !isJsonObject(result.access)) {
    throw new Error("create_play_session omitted its access result.");
  }
  const grant = result.access.guestAccessGrant;
  if (typeof grant !== "string") {
    throw new Error("create_play_session omitted its guest access grant.");
  }
  return grant;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ajvJsonSchema(schema: unknown): JsonSchemaType {
  if (!isJsonObject(schema)) {
    throw new Error("Expected an MCP JSON Schema object.");
  }
  // The MCP client has already protocol-decoded this object as a JSON Schema;
  // the assertion only bridges the SDK's readonly tool type to AJV's mutable alias.
  return schema as JsonSchemaType;
}

function requireDiceRollRequestId(input: string) {
  const decoded = decodeDiceRollRequestId(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
  return decoded.success;
}

function requireDiceSeed(input: readonly [string, string, string, string]) {
  const decoded = decodeDiceSeed(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
  return decoded.success;
}
