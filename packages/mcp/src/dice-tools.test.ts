import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import { Either, Random, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";
import { decodeDiceToolCall, RollDiceArgsSchema } from "./dice-tool-input.ts";
import { RollDiceOutputSchema } from "./dice-tool-output.ts";
import { handleDiceToolCall, rollDice } from "./dice-tools.ts";
import { mcpOutputJsonSchema } from "./schema-codec.ts";
import { jsonContentPayload } from "./tool-content.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const request = {
  groups: [
    { dice: 2, dieSize: 6 },
    { dice: 1, dieSize: 4 },
  ],
} as const;

describe("structured MCP bulk dice roller", () => {
  test("rejects empty groups and caller correlation/idempotency fields", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(RollDiceArgsSchema)({ groups: [] }),
      ),
    ).toBe(true);

    const decoded = decodeDiceToolCall({
      name: "roll_dice",
      args: { ...request, correlationId: "caller-supplied" },
    });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("returns ordered visible faces in each requested group", () => {
    const result = rollDice(request, Random.fixed([1, 2, 3]));

    expect(result.groups).toEqual([
      { dieSize: 6, results: [1, 2] },
      { dieSize: 4, results: [3] },
    ]);
    expect(result.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
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
      correlationId: "00000000-0000-4000-8000-000000000000",
      groups: [{ dieSize: 6, results: [1, 7] }],
    };
    expect(
      Either.isLeft(Schema.decodeUnknownEither(RollDiceOutputSchema)(invalid)),
    ).toBe(true);

    const validate = new AjvJsonSchemaValidator().getValidator(
      mcpOutputJsonSchema(RollDiceOutputSchema),
    );
    expect(validate(invalid).valid).toBe(false);
    const emptyResults = {
      correlationId: invalid.correlationId,
      groups: [{ dieSize: 6, results: [] }],
    };
    expect(validate(emptyResults).valid).toBe(false);
  });

  test("reproduces a seeded sequence while separate streams remain isolated", () => {
    const first = Random.make("dice-seed");
    const second = Random.make("dice-seed");

    const firstCall = rollDice(request, first);
    const secondCall = rollDice(request, first);
    const isolatedCall = rollDice(request, second);

    expect(firstCall.groups).toEqual(isolatedCall.groups);
    expect(secondCall.groups).not.toEqual(firstCall.groups);
    expect(secondCall.correlationId).not.toBe(firstCall.correlationId);
  });

  test("does not read or mutate Battle pending-fill state", () => {
    const services = createMcpApplicationServices();
    const root = createMcpPlaySessionRoot(
      services,
      services.configuredAdminMirrorSessionId,
      Random.fixed([1]),
    );
    const before = root.sessionStore.snapshot();
    const content = handleDiceToolCall(root, {
      name: "roll_dice",
      args: request,
    });

    expect(jsonContentPayload(content)).toMatchObject({
      groups: [
        { dieSize: 6, results: [1, 1] },
        { dieSize: 4, results: [1] },
      ],
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
        expect.arrayContaining(["playSessionId", "groups"]),
      );
      if (definition?.outputSchema === undefined) {
        throw new Error("roll_dice omitted outputSchema");
      }
      const validateOutput = new AjvJsonSchemaValidator().getValidator(
        definition.outputSchema as JsonSchemaType,
      );

      const created = await client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      const playSessionId = (
        created.structuredContent as {
          readonly playSessionId: string;
        }
      ).playSessionId;
      const valid = await client.callTool({
        name: "roll_dice",
        arguments: { playSessionId, groups: [{ dice: 2, dieSize: 6 }] },
      });
      expect(valid.isError).not.toBe(true);
      expect(validateOutput(valid.structuredContent).valid).toBe(true);

      const missingCorrelation = await client.callTool({
        name: "roll_dice",
        arguments: { playSessionId, groups: [{ dice: 1, dieSize: 4 }] },
      });
      expect(missingCorrelation.isError).not.toBe(true);

      const callerCorrelation = await client.callTool({
        name: "roll_dice",
        arguments: {
          playSessionId,
          groups: [{ dice: 1, dieSize: 4 }],
          correlationId: "00000000-0000-4000-8000-000000000000",
        },
      });
      expect(callerCorrelation.isError).toBe(true);

      for (const groups of [
        [],
        [{ dice: 0, dieSize: 6 }],
        [{ dice: 1.5, dieSize: 6 }],
        [{ dice: 1, dieSize: "six" }],
        [{ dice: 1, dieSize: 101 }],
      ]) {
        const invalid = await client.callTool({
          name: "roll_dice",
          arguments: { playSessionId, groups },
        });
        expect(invalid.isError).toBe(true);
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});
