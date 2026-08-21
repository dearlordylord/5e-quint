import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, test } from "vitest";

import {
  LEVEL_TEN_FIGHTER_CHARACTER_CREATION_SUPPORT_PROFILE,
  verifyLevelTenFighterChampionBattleHandoff,
  verifyLevelTenFighterChampionSheetScenario,
} from "../test-support/mcp-acceptance-scenarios.ts";
import { createMcpApplicationServices } from "./composition-root.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

describe("MCP level 10 Fighter Champion scenario", () => {
  test("creates a Fighter 10 Champion character and verifies the durable sheet projection", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer(
      createMcpApplicationServices({
        characterCreationSupportProfile:
          LEVEL_TEN_FIGHTER_CHARACTER_CREATION_SUPPORT_PROFILE,
      }),
    );
    const client = new Client({
      name: "dnd-level-ten-sheet-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelTenFighterChampionSheetScenario(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("starts battle from the Fighter 10 Champion sheet and discovers returned acts", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer(
      createMcpApplicationServices({
        characterCreationSupportProfile:
          LEVEL_TEN_FIGHTER_CHARACTER_CREATION_SUPPORT_PROFILE,
      }),
    );
    const client = new Client({
      name: "dnd-level-ten-battle-client",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      await verifyLevelTenFighterChampionBattleHandoff(client);
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);
});
