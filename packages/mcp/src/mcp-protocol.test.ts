import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";

import {
  verifyAgentConversationScenarios,
  verifyBaselineVertical,
  verifyLevelFiveWizardFireballBattleHandoff,
  verifyLevelFourWizardVertical,
  verifyLevelSixRogueSteadyAimBattleHandoff,
  verifyLevelThreeWizardVertical,
  verifyToolContract,
  verifyWidthVertical,
  verifyWizardIceKnifeBattleHandoff,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createMcpCompositionRoot } from "./composition-root.ts";
import { contentToolDefinitions } from "./content-tools.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const FULL_ACCEPTANCE_TEST_TIMEOUT_MS = 90_000;

describe("MCP protocol server", () => {
  test("rejects calls outside the advertised tool definitions", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer(createMcpCompositionRoot(), [
      contentToolDefinitions[0],
    ]);
    const client = new Client({ name: "scoped-client", version: "0.1.0" });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(
        ["describe_mcp_workflow"],
      );
      const hiddenCall = await client.callTool({
        name: "create_character_draft",
        arguments: {},
      });
      expect(hiddenCall.isError).toBe(true);
      expect(hiddenCall.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            {
              error:
                "Tool is not advertised by this MCP server: create_character_draft",
            },
            null,
            2,
          ),
        },
      ]);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });

  test("keeps the LLM drivability scenarios documented", () => {
    verifyAgentConversationScenarios();
  });

  test(
    "runs the full acceptance client over in-memory MCP",
    async () => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const { server } = createDndMcpProtocolServer();
      const client = new Client({
        name: "dnd-in-memory-acceptance-client",
        version: "0.1.0",
      });

      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);

        await verifyToolContract(client);
        await verifyBaselineVertical(client);
        await verifyWidthVertical(client);
        await verifyLevelThreeWizardVertical(client);
        await verifyLevelFourWizardVertical(client);
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    FULL_ACCEPTANCE_TEST_TIMEOUT_MS,
  );

  test("runs the level 5 Wizard Fireball acceptance client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-five-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelFiveWizardFireballBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("runs the level 6 Rogue Steady Aim acceptance client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-six-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelSixRogueSteadyAimBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("runs the Wizard Ice Knife battle handoff client over in-memory MCP", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-ice-knife-protocol-acceptance-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyWizardIceKnifeBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});
