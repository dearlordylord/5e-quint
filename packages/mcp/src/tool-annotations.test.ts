import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";

import { createDndMcpProtocolServer } from "./protocol-server.ts";
import {
  DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
} from "./tool-definition-contract.ts";

const expectedAnnotations = {
  create_play_session:
    NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  read_play_session: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  describe_mcp_workflow: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  list_stat_blocks: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  list_catalog_units: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  inspect_catalog_unit: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  create_character_draft:
    NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  discover_creation_holes: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  fill_creation_holes: IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  finalize_character: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  apply_character_session_operation:
    DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  list_characters: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  inspect_character_session: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  query_character_session: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  select_stat_block: IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  start_battle: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  battle_lifecycle: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  read_battle_state: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  discover_battle_acts: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  fill_battle_hole: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  resolve_battle_act: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  end_turn: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  end_battle: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  roll_dice: NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
} as const;
const expectedAnnotationByName = new Map(Object.entries(expectedAnnotations));

describe("MCP tool annotations", () => {
  test("tools/list publishes complete side-effect classifications for every tool", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "tool-annotations-test",
      version: "0.1.0",
    });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const listedTools = (await client.listTools()).tools;
      expect(listedTools.map((tool) => tool.name)).toEqual(
        Object.keys(expectedAnnotations),
      );
      for (const tool of listedTools) {
        expect(tool.annotations, tool.name).toEqual(
          expectedAnnotationByName.get(tool.name),
        );
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});
