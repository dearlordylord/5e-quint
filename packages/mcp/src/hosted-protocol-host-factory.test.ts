import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Result, Schema } from "effect";
import { describe, expect, test, vi } from "vitest";

import { createMcpApplicationServices, toolDefinitions } from "./server.ts";
import * as toolSurfaceModule from "./chatgpt/tool-surface.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import {
  createDndMcpProtocolServer,
  createHostedMcpProtocolHostFactory,
} from "./protocol-server.ts";
import { decodePrincipalId } from "./play-session-access.ts";
import { PlaySessionIdSchema } from "./play-session.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import { contentToolDefinitions } from "./content-tools.ts";

const applicationServices = createMcpApplicationServices();

function repository() {
  const opened = openSqlitePlaySessionRepository(
    ":memory:",
    applicationServices,
  );
  assert(Result.isSuccess(opened));
  return opened.success;
}

function identity(name: string) {
  const decoded = decodePrincipalId(`principal:${name}`);
  assert(Result.isSuccess(decoded));
  return { tag: "authenticated", principalId: decoded.success } as const;
}

async function connect(
  host: ReturnType<ReturnType<typeof createHostedMcpProtocolHostFactory>>,
) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "factory-test", version: "0.1.0" });
  await host.server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await Promise.all([client.close(), host.server.close()]);
    },
  };
}

const surfaces = [
  "regular",
  "chatgpt",
] as const satisfies readonly McpToolSurface[];

describe("hosted protocol host factory", () => {
  test.each(surfaces)(
    "preserves exact %s wire advertisement and prepares once",
    async (toolSurface) => {
      const store = repository();
      const sharing = vi.spyOn(
        toolSurfaceModule,
        "shareToolDefinitionsForSurface",
      );
      const definitions =
        toolSurface === "chatgpt"
          ? toolSurfaceModule.chatGptExecutionToolDefinitions
          : toolDefinitions;
      const reference = await connect(
        createDndMcpProtocolServer(
          applicationServices,
          toolSurface === "chatgpt" ? [contentToolDefinitions[0]] : definitions,
          {
            playSessionRepository: store,
            requestIdentity: identity("reference"),
            toolSurface,
          },
        ),
      );
      const expectedWire = JSON.stringify(
        (await reference.client.listTools()).tools,
      );
      await reference.close();
      sharing.mockClear();
      const factory = createHostedMcpProtocolHostFactory({
        applicationServices,
        playSessionRepository: store,
        toolSurface,
      });
      expect(sharing).toHaveBeenCalledTimes(1);
      const firstHost = factory(identity("first"));
      const secondHost = factory(identity("second"));
      expect(firstHost.server).not.toBe(secondHost.server);
      expect(firstHost.playSessions).not.toBe(secondHost.playSessions);
      const first = await connect(firstHost);
      const second = await connect(secondHost);
      try {
        const listed = await first.client.listTools();
        expect(JSON.stringify(listed.tools)).toBe(expectedWire);
        assert(listed.tools[0]);
        listed.tools[0].inputSchema.properties = {
          tampered: { type: "string" },
        };
        expect(JSON.stringify((await second.client.listTools()).tools)).toBe(
          expectedWire,
        );
        expect(JSON.stringify((await first.client.listTools()).tools)).toBe(
          expectedWire,
        );
        const read = await second.client.callTool({
          name: "describe_mcp_workflow",
          arguments: {},
        });
        expect(read.isError).not.toBe(true);
        expect(sharing).toHaveBeenCalledTimes(1);
      } finally {
        await Promise.all([first.close(), second.close()]);
        sharing.mockRestore();
        store.close();
      }
    },
  );

  test("isolates authenticated and anonymous access and survives another host closing", async () => {
    const store = repository();
    const factory = createHostedMcpProtocolHostFactory({
      applicationServices,
      playSessionRepository: store,
      toolSurface: "regular",
    });
    const first = await connect(factory(identity("owner")));
    const second = await connect(factory(identity("other")));
    const anonymous = await connect(
      factory({
        tag: "hostedAnonymous",
        authentication: { tag: "unavailable" },
      }),
    );
    try {
      const created = await first.client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(created.isError).not.toBe(true);
      const createdSession = Schema.decodeUnknownResult(
        Schema.Struct({ playSessionId: PlaySessionIdSchema }),
      )(created.structuredContent);
      assert(Result.isSuccess(createdSession));
      const { playSessionId } = createdSession.success;
      const own = await first.client.callTool({
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(own.isError).not.toBe(true);
      const denied = await second.client.callTool({
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(denied.isError).toBe(true);
      const anonymousDenied = await anonymous.client.callTool({
        name: "read_play_session",
        arguments: { playSessionId },
      });
      expect(anonymousDenied.isError).toBe(true);
      await first.close();
      const secondCreated = await second.client.callTool({
        name: "create_play_session",
        arguments: {},
      });
      expect(secondCreated.isError).not.toBe(true);
      const recovered = await connect(factory(identity("owner")));
      try {
        const read = await recovered.client.callTool({
          name: "read_play_session",
          arguments: { playSessionId },
        });
        expect(read.isError).not.toBe(true);
      } finally {
        await recovered.close();
      }
    } finally {
      await Promise.all([first.close(), second.close(), anonymous.close()]);
      store.close();
    }
  });

  test("keeps custom regular definitions fresh across caller mutation", async () => {
    const source = contentToolDefinitions[0];
    assert(source);
    const custom = {
      ...source,
      inputSchema: {
        type: "object" as const,
        properties: { synthetic: { type: "string", description: "first" } },
      },
    };
    const services = createMcpApplicationServices();
    const first = await connect(createDndMcpProtocolServer(services, [custom]));
    try {
      const firstWire = structuredClone((await first.client.listTools()).tools);
      expect(
        firstWire.find((tool) => tool.name === source.name)?.inputSchema,
      ).toEqual(custom.inputSchema);
      custom.inputSchema.properties.synthetic.description = "second";
      const second = await connect(
        createDndMcpProtocolServer(services, [custom]),
      );
      try {
        const secondWire = (await second.client.listTools()).tools;
        expect(
          secondWire.find((tool) => tool.name === source.name)?.inputSchema,
        ).toEqual(custom.inputSchema);
        expect(secondWire).not.toEqual(firstWire);
      } finally {
        await second.close();
      }
    } finally {
      await first.close();
    }
  });
});
