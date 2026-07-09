import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, test } from "vitest";

import {
  verifyLevelNineRangerExpertiseBattleHandoff,
  verifyLevelNineRangerExpertiseSheetScenario,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

describe("MCP level 9 Ranger Expertise scenario", () => {
  test("creates a Ranger 9 character and verifies the durable Expertise sheet projection", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-nine-sheet-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelNineRangerExpertiseSheetScenario(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("starts battle from the Ranger 9 sheet and discovers returned acts", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "dnd-level-nine-battle-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelNineRangerExpertiseBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});
