import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, test } from "vitest";

import {
  verifyAgentConversationScenarios,
  verifyBaselineVertical,
  verifyToolContract,
  verifyWidthVertical,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

describe("MCP protocol server", () => {
  test("keeps the LLM drivability scenarios documented", () => {
    verifyAgentConversationScenarios();
  });

  test("runs the full acceptance client over in-memory MCP", async () => {
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
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});
