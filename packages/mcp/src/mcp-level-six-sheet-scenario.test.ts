import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, test } from "vitest";

import {
  verifyLevelSixRogueExpertiseSheetScenario,
  verifyLevelSixRogueSteadyAimBattleHandoff,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

describe("MCP level 6 Rogue Expertise scenario", () => {
  test("creates a Rogue 6 character and verifies the durable Expertise sheet projection", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-six-sheet-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelSixRogueExpertiseSheetScenario(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("starts battle from the Rogue 6 sheet and resolves Steady Aim", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-six-battle-client",
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
});
