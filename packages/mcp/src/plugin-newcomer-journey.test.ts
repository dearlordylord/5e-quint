import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, test } from "vitest";

import { verifyCompleteNewcomerJourney } from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const COMPLETE_NEWCOMER_JOURNEY_TIMEOUT_MS = 150_000;

describe("SRD Play headless newcomer journey", () => {
  test(
    "discovers SRD content, creates a character, and returns from Battle",
    async () => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      const { server } = createDndMcpProtocolServer();
      const client = new Client({
        name: "srd-play-headless-newcomer",
        version: "0.1.0",
      });

      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        await verifyCompleteNewcomerJourney(client);
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    COMPLETE_NEWCOMER_JOURNEY_TIMEOUT_MS,
  );
});
