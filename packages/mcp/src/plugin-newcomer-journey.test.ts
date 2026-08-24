import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";

import { verifyCompleteNewcomerJourney } from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const COMPLETE_NEWCOMER_JOURNEY_TIMEOUT_MS = 150_000;

describe("SRD Play headless newcomer journey", () => {
  test(
    "complete-newcomer-journey",
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
        const journey = await verifyCompleteNewcomerJourney(client);
        expect(journey.shortRestHealing).toEqual({
          currentHp: 10,
          spentHitDice: 1,
        });
      } finally {
        await Promise.allSettled([client.close(), server.close()]);
      }
    },
    COMPLETE_NEWCOMER_JOURNEY_TIMEOUT_MS,
  );
});
