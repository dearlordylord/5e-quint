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
  save_play_session:
    NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  list_saved_play_sessions: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  delete_saved_play_session:
    DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
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
const expectedTitles = {
  create_play_session: "Create Play Session",
  read_play_session: "Read Play Session",
  save_play_session: "Save Play Session",
  list_saved_play_sessions: "List Saved Play Sessions",
  delete_saved_play_session: "Delete Saved Play Session",
  describe_mcp_workflow: "Describe MCP Workflow",
  list_stat_blocks: "List Stat Blocks",
  list_catalog_units: "List Catalog Units",
  inspect_catalog_unit: "Inspect Catalog Unit",
  create_character_draft: "Create Character Draft",
  discover_creation_holes: "Discover Creation Holes",
  fill_creation_holes: "Fill Creation Holes",
  finalize_character: "Finalize Character",
  apply_character_session_operation: "Apply Character Operation",
  list_characters: "List Characters",
  inspect_character_session: "Inspect Character Session",
  query_character_session: "Query Character Session",
  select_stat_block: "Select Stat Block",
  start_battle: "Start Battle",
  battle_lifecycle: "Update Battle Lifecycle",
  read_battle_state: "Read Battle State",
  discover_battle_acts: "Discover Battle Acts",
  fill_battle_hole: "Fill Battle Hole",
  resolve_battle_act: "Resolve Battle Act",
  end_turn: "End Turn",
  end_battle: "End Battle",
  roll_dice: "Roll Dice",
} as const;
const expectedTitleByName = new Map(Object.entries(expectedTitles));

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
        Object.keys(expectedAnnotations).filter(
          (name) =>
            name !== "save_play_session" &&
            name !== "list_saved_play_sessions" &&
            name !== "delete_saved_play_session",
        ),
      );
      expect(new Set(listedTools.map((tool) => tool.title)).size).toBe(
        listedTools.length,
      );
      for (const tool of listedTools) {
        expect(tool.title, tool.name).toBe(expectedTitleByName.get(tool.name));
        expect(tool.title?.trim().length ?? 0, tool.name).toBeGreaterThan(0);
        expect(tool.annotations, tool.name).toEqual(
          expectedAnnotationByName.get(tool.name),
        );
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  });
});
